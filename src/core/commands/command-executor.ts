/**
 * Operating Core — Command Executor v1
 *
 * Wraps any handler with the cross-cutting concerns:
 *   schema validation → idempotency check → policy → record start →
 *   handler → system event → metrics → record success/failure.
 *
 * Attribution is fired only when the handler emits it; the executor never
 * forces attribution.
 */

import { validateSchema } from "../schemas/schema-registry.js";
import {
  checkIdempotency,
  recordCommandFailure,
  recordCommandStart,
  recordCommandSuccess,
} from "../idempotency/idempotency-store.js";
import { hashCommand } from "../idempotency/idempotency-utils.js";
import { evaluateActionRisk } from "../policy/policy-engine.js";
import { appendSystemEvent } from "../events/event-ledger.js";
import { incrementMetric } from "../observability/metrics-store.js";
import type { CommandEnvelope } from "./command-envelope.js";
import type { IdempotencyRecord } from "../idempotency/idempotency-types.js";
import type { PolicyEvaluation } from "../policy/policy-types.js";

export interface ExecuteCommandResult<TResult> {
  ok: boolean;
  status: "executed" | "idempotent_hit" | "blocked" | "approval_required" | "failed";
  result?: TResult;
  prior?: IdempotencyRecord;
  policy?: PolicyEvaluation;
  error?: string;
}

export type CommandHandler<TPayload, TResult> = (
  envelope: CommandEnvelope<TPayload>,
) => Promise<TResult> | TResult;

export interface ExecuteCommandOptions {
  /** Skip the policy check (system-internal commands). Defaults to false. */
  skipPolicy?: boolean;
}

export async function executeCommand<TPayload extends Record<string, unknown>, TResult>(
  envelope: CommandEnvelope<TPayload>,
  handler: CommandHandler<TPayload, TResult>,
  options: ExecuteCommandOptions = {},
): Promise<ExecuteCommandResult<TResult>> {
  // 1. Validate envelope schema
  const validation = validateSchema("CommandEnvelope", envelope);
  if (!validation.valid) {
    incrementMetric("policy_block_count");
    return {
      ok: false,
      status: "failed",
      error: `Invalid envelope: ${validation.errors?.join("; ") ?? "unknown"}`,
    };
  }

  // 2. Idempotency check
  const commandHash = hashCommand({
    commandType: envelope.commandType,
    payload: envelope.payload,
    tenantId: envelope.tenantId,
  });

  const idempCheck = checkIdempotency(envelope.idempotencyKey, commandHash);
  if (idempCheck.status === "hit") {
    return {
      ok: true,
      status: "idempotent_hit",
      ...(idempCheck.record ? { prior: idempCheck.record } : {}),
    };
  }
  if (idempCheck.status === "conflict") {
    incrementMetric("policy_block_count");
    return {
      ok: false,
      status: "blocked",
      ...(idempCheck.record ? { prior: idempCheck.record } : {}),
      error: "Idempotency conflict: same key, different payload hash",
    };
  }

  // 3. Policy
  if (!options.skipPolicy) {
    const policy = evaluateActionRisk(
      envelope.commandType,
      envelope.environment,
      envelope.tenantId,
    );
    if (policy.decision === "block") {
      incrementMetric("policy_block_count");
      appendSystemEvent({
        eventType: "policy_block",
        category: "policy",
        environment: envelope.environment,
        ...(envelope.tenantId !== undefined ? { tenantId: envelope.tenantId } : {}),
        actorId: envelope.actorId,
        actorType: envelope.actorType,
        payload: { commandType: envelope.commandType, reason: policy.reason, risk: policy.risk },
        ...(envelope.correlationId !== undefined ? { correlationId: envelope.correlationId } : {}),
        causationId: envelope.commandId,
      });
      return {
        ok: false,
        status: "blocked",
        policy: { decision: policy.decision, reason: policy.reason },
        error: `Policy blocked: ${policy.reason}`,
      };
    }
    if (policy.decision === "approval_required") {
      incrementMetric("approval_required_count");
      appendSystemEvent({
        eventType: "approval_required",
        category: "approval",
        environment: envelope.environment,
        ...(envelope.tenantId !== undefined ? { tenantId: envelope.tenantId } : {}),
        actorId: envelope.actorId,
        actorType: envelope.actorType,
        payload: { commandType: envelope.commandType, reason: policy.reason, risk: policy.risk },
        ...(envelope.correlationId !== undefined ? { correlationId: envelope.correlationId } : {}),
        causationId: envelope.commandId,
      });
      return {
        ok: false,
        status: "approval_required",
        policy: { decision: policy.decision, reason: policy.reason },
      };
    }
    incrementMetric("policy_allow_count");
  }

  // 4. Record start
  recordCommandStart(envelope.idempotencyKey, commandHash, envelope.commandType, {
    ...(envelope.tenantId !== undefined ? { tenantId: envelope.tenantId } : {}),
    actorId: envelope.actorId,
  });

  // 5. Execute handler
  try {
    const result = await handler(envelope);

    // 6. System event
    appendSystemEvent({
      eventType: `${envelope.commandType}_executed`,
      category: "decision",
      environment: envelope.environment,
      ...(envelope.tenantId !== undefined ? { tenantId: envelope.tenantId } : {}),
      actorId: envelope.actorId,
      actorType: envelope.actorType,
      payload: { commandType: envelope.commandType, commandId: envelope.commandId },
      ...(envelope.correlationId !== undefined ? { correlationId: envelope.correlationId } : {}),
      causationId: envelope.commandId,
    });

    // 7. Record success
    recordCommandSuccess(envelope.idempotencyKey);

    return { ok: true, status: "executed", result };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    appendSystemEvent({
      eventType: `${envelope.commandType}_failed`,
      category: "error",
      environment: envelope.environment,
      ...(envelope.tenantId !== undefined ? { tenantId: envelope.tenantId } : {}),
      actorId: envelope.actorId,
      actorType: envelope.actorType,
      payload: { commandType: envelope.commandType, error: message },
      ...(envelope.correlationId !== undefined ? { correlationId: envelope.correlationId } : {}),
      causationId: envelope.commandId,
    });
    try {
      recordCommandFailure(envelope.idempotencyKey);
    } catch {
      // best-effort; record may have been purged
    }
    return { ok: false, status: "failed", error: message };
  }
}
