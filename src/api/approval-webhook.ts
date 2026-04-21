import { z } from "zod";

import { ApprovalResolver } from "../services/approval/approval-resolver.js";
import { InMemoryReplayStore } from "../security/replay-store.js";
import {
  logWebhookAccepted,
  logWebhookRejected,
  logWebhookVerificationFailure,
} from "../security/security-audit-log.js";
import { verifyWebhookRequest } from "../security/webhook-signature.js";

const ApprovalWebhookPayloadSchema = z.object({
  runId: z.string().min(1),
  decision: z.enum(["approve", "reject", "request_revision"]),
  source: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
});

export type ApprovalWebhookPayload = z.infer<typeof ApprovalWebhookPayloadSchema>;

export interface ApprovalWebhookRequest {
  rawBody: string;
  headers: Record<string, string | undefined>;
}

export interface ApprovalWebhookResponse {
  ok: boolean;
  statusCode: 200 | 400 | 401 | 409 | 422 | 500;
  runId?: string;
  status?: string;
  nextAction?: "resume_execution" | "none";
  errors: string[];
  warnings: string[];
}

const approvalResolver = new ApprovalResolver();
export const approvalWebhookReplayStore = new InMemoryReplayStore(getReplayTtlSeconds());

/**
 * Handles a signed approval callback payload and resolves the associated run.
 */
export const handleApprovalWebhook = async (
  request: ApprovalWebhookRequest,
): Promise<ApprovalWebhookResponse> => {
  const verification = await verifyWebhookRequest({
    rawBody: request.rawBody,
    headers: request.headers,
    replayStore: approvalWebhookReplayStore,
  });

  if (!verification.ok) {
    if (verification.statusCode === 500) {
      logWebhookVerificationFailure({
        webhookType: "approval",
        errorClass: verification.code,
      });
    } else {
      logWebhookRejected({
        webhookType: "approval",
        code: verification.code,
        reason: verification.message,
      });
    }

    return {
      ok: false,
      statusCode: verification.statusCode,
      errors: [verification.message],
      warnings: [],
    };
  }

  logWebhookAccepted({
    webhookType: "approval",
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
      errors: ["root: Invalid JSON payload."],
      warnings: [],
    };
  }

  const parsedPayload = ApprovalWebhookPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return {
      ok: false,
      statusCode: 422,
      errors: parsedPayload.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`),
      warnings: [],
    };
  }

  const resolverInput: ApprovalWebhookPayload = {
    runId: parsedPayload.data.runId,
    decision: parsedPayload.data.decision,
  };

  if (parsedPayload.data.actor) {
    resolverInput.actor = parsedPayload.data.actor;
  }

  if (parsedPayload.data.source) {
    resolverInput.source = parsedPayload.data.source;
  }

  const resolution = await approvalResolver.resolve({
    runId: resolverInput.runId,
    decision: resolverInput.decision,
    ...(resolverInput.actor ? { actor: resolverInput.actor } : {}),
  });

  return resolution.ok
    ? {
        ok: true,
        statusCode: 200,
        runId: resolution.runId,
        status: resolution.newStatus,
        nextAction: resolution.resumeExecution ? "resume_execution" : "none",
        errors: [],
        warnings: resolution.warnings,
      }
    : {
        ok: false,
        statusCode: 422,
        runId: resolution.runId,
        status: resolution.newStatus,
        errors: resolution.errors,
        warnings: resolution.warnings,
      };
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