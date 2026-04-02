import { z } from "zod";

import { ExecutionAgent } from "../agents/execution.agent.js";
import { logger } from "../core/logger.js";

export const ExecutionWebhookPayloadSchema = z.object({
  runId: z.string().min(1),
  target: z.enum(["local"]).optional().default("local"),
  source: z.enum(["manual", "approval_webhook", "system"]).optional(),
  actor: z.string().min(1).optional(),
});

export type ExecutionWebhookPayload = z.infer<typeof ExecutionWebhookPayloadSchema>;

export interface ExecutionWebhookResponse {
  ok: boolean;
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

/**
 * Handles a local execution callback payload and delegates to the execution agent.
 */
export const handleExecutionWebhook = async (
  payload: unknown,
): Promise<ExecutionWebhookResponse> => {
  logger.info("Execution webhook received.", {
    payloadType: typeof payload,
  });

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
