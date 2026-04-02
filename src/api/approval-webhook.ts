import { z } from "zod";

import { ApprovalResolver } from "../services/approval/approval-resolver.js";

const ApprovalWebhookPayloadSchema = z.object({
  runId: z.string().min(1),
  decision: z.enum(["approve", "reject", "request_revision"]),
  source: z.string().min(1).optional(),
  actor: z.string().min(1).optional(),
});

export type ApprovalWebhookPayload = z.infer<typeof ApprovalWebhookPayloadSchema>;

export interface ApprovalWebhookResponse {
  ok: boolean;
  runId?: string;
  status?: string;
  nextAction?: "resume_execution" | "none";
  errors: string[];
  warnings: string[];
}

const approvalResolver = new ApprovalResolver();

/**
 * Handles a local approval callback payload and resolves the associated run.
 */
export const handleApprovalWebhook = async (
  payload: unknown,
): Promise<ApprovalWebhookResponse> => {
  const parsedPayload = ApprovalWebhookPayloadSchema.safeParse(payload);

  if (!parsedPayload.success) {
    return {
      ok: false,
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
        runId: resolution.runId,
        status: resolution.newStatus,
        nextAction: resolution.resumeExecution ? "resume_execution" : "none",
        errors: [],
        warnings: resolution.warnings,
      }
    : {
        ok: false,
        runId: resolution.runId,
        status: resolution.newStatus,
        errors: resolution.errors,
        warnings: resolution.warnings,
      };
};
