import { z } from "zod";

import { ExecutionAgent } from "../agents/execution.agent.js";
import { logger } from "../core/logger.js";
import { InMemoryReplayStore } from "../security/replay-store.js";
import {
  logWebhookAccepted,
  logWebhookRejected,
  logWebhookVerificationFailure,
} from "../security/security-audit-log.js";
import { verifyWebhookRequest } from "../security/webhook-signature.js";

export const ExecutionWebhookPayloadSchema = z.object({
  runId: z.string().min(1),
  target: z.enum(["local"]).optional().default("local"),
  source: z.enum(["manual", "approval_webhook", "system"]).optional(),
  actor: z.string().min(1).optional(),
});

export type ExecutionWebhookPayload = z.infer<typeof ExecutionWebhookPayloadSchema>;

export interface ExecutionWebhookRequest {
  rawBody: string;
  headers: Record<string, string | undefined>;
}

export interface ExecutionWebhookResponse {
  ok: boolean;
  statusCode: 200 | 400 | 401 | 409 | 422 | 500;
  runId: string;
  target: string;
  source?: string;
  actor?: string;
  status: "executed" | "failed";
  publishedPath?: string;
  filesWritten: string[];
  warnings: string[];
  errors: string[];
}

const executionAgent = new ExecutionAgent();
export const executionWebhookReplayStore = new InMemoryReplayStore(getReplayTtlSeconds());

/**
 * Handles a signed execution callback payload and delegates to the execution agent.
 */
export const handleExecutionWebhook = async (
  request: ExecutionWebhookRequest,
): Promise<ExecutionWebhookResponse> => {
  logger.info("Execution webhook received.", {
    payloadType: typeof request.rawBody,
  });

  const verification = await verifyWebhookRequest({
    rawBody: request.rawBody,
    headers: request.headers,
    replayStore: executionWebhookReplayStore,
  });

  if (!verification.ok) {
    if (verification.statusCode === 500) {
      logWebhookVerificationFailure({
        webhookType: "execution",
        errorClass: verification.code,
      });
    } else {
      logWebhookRejected({
        webhookType: "execution",
        code: verification.code,
        reason: verification.message,
      });
    }

    return {
      ok: false,
      statusCode: verification.statusCode,
      runId: "unknown",
      target: "local",
      status: "failed",
      filesWritten: [],
      warnings: [],
      errors: [verification.message],
    };
  }

  logWebhookAccepted({
    webhookType: "execution",
    webhookId: verification.metadata.webhookId,
    nonce: verification.metadata.nonce,
  });

  let payload: unknown;
  try {
    payload = JSON.parse(request.rawBody) as unknown;
  } catch {
    return {
      ok: false,
      statusCode: 422,
      runId: "unknown",
      target: "local",
      status: "failed",
      filesWritten: [],
      warnings: [],
      errors: ["root: Invalid JSON payload."],
    };
  }

  const parsedPayload = ExecutionWebhookPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    const errors = parsedPayload.error.issues.map(
      (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`,
    );

    logger.error("Execution webhook validation failed.", {
      errors,
    });

    return {
      ok: false,
      statusCode: 422,
      runId: getFallbackRunId(payload),
      target: getFallbackTarget(payload),
      status: "failed",
      filesWritten: [],
      warnings: [],
      errors,
    };
  }

  logger.info("Execution webhook payload validated.", {
    runId: parsedPayload.data.runId,
    target: parsedPayload.data.target,
    source: parsedPayload.data.source,
  });

  logger.info("Execution webhook requesting execution.", {
    runId: parsedPayload.data.runId,
    target: parsedPayload.data.target,
  });

  const executionResult = await executionAgent.execute({
    runId: parsedPayload.data.runId,
    target: parsedPayload.data.target,
  });

  logger.info("Execution webhook received execution result.", {
    runId: executionResult.runId,
    target: executionResult.target,
    status: executionResult.status,
  });

  return executionResult.publishedPath === undefined
    ? {
        ok: executionResult.ok,
        statusCode: executionResult.ok ? 200 : 422,
        runId: executionResult.runId,
        target: executionResult.target,
        ...(parsedPayload.data.source ? { source: parsedPayload.data.source } : {}),
        ...(parsedPayload.data.actor ? { actor: parsedPayload.data.actor } : {}),
        status: executionResult.status,
        filesWritten: executionResult.filesWritten,
        warnings: executionResult.warnings,
        errors: executionResult.errors,
      }
    : {
        ok: executionResult.ok,
        statusCode: executionResult.ok ? 200 : 422,
        runId: executionResult.runId,
        target: executionResult.target,
        ...(parsedPayload.data.source ? { source: parsedPayload.data.source } : {}),
        ...(parsedPayload.data.actor ? { actor: parsedPayload.data.actor } : {}),
        status: executionResult.status,
        publishedPath: executionResult.publishedPath,
        filesWritten: executionResult.filesWritten,
        warnings: executionResult.warnings,
        errors: executionResult.errors,
      };
};

const getFallbackRunId = (payload: unknown): string => {
  if (payload && typeof payload === "object" && "runId" in payload && typeof payload.runId === "string") {
    return payload.runId;
  }

  return "unknown";
};

const getFallbackTarget = (payload: unknown): string => {
  if (payload && typeof payload === "object" && "target" in payload && typeof payload.target === "string") {
    return payload.target;
  }

  return "local";
};

function getReplayTtlSeconds(): number {
  const replayTtlRaw = process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS;

  if (!replayTtlRaw || replayTtlRaw.trim().length === 0) {
    return 600;
  }

  const replayTtl = Number(replayTtlRaw);

  if (!Number.isInteger(replayTtl) || replayTtl <= 0) {
    return 600;
  }

  return replayTtl;
}
