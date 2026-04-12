import { z } from "zod";

import { ApprovalAgent } from "./approval.agent.js";
import { logger } from "../core/logger.js";
import { RunManager } from "../core/run-manager.js";
import { validateContext, validateWorkflowResult, type ValidationReport } from "../core/validator.js";
import { retrieveRelevantMemorySummary } from "../memory/memory-retriever.js";
import { buildPrompt } from "../prompt/prompt-builder.js";
import { createProviderRegistry } from "../providers/index.js";
import { resolveModelRoute } from "../routing/model-router.js";
import { ApprovalPacketSchema, type ApprovalPacket } from "../schemas/approval-packet.schema.js";
import { RunTracker } from "../services/observability/run-tracker.js";
import type { AgentResponse } from "../types/agent.types.js";
import type { WorkflowExecutionResult, WorkflowModelRuntime } from "../types/workflow.types.js";
import { loadContextBundle } from "./context-loader.agent.js";
import { createDefaultWorkflowRegistry } from "../workflows/workflow-registry.js";

const OrchestratorInputSchema = z.object({
  taskType: z.string().min(1),
  objective: z.string().min(1),
  clientId: z.string().min(1),
  approvalRequired: z.boolean().default(true),
  sourceMaterials: z.array(z.record(z.unknown())).default([]),
  constraints: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({}),
});

export type OrchestratorInput = z.infer<typeof OrchestratorInputSchema>;

export interface OrchestratorOutput {
  runId: string;
  workflowId: string;
  status: string;
  approvalRequired: boolean;
  approvalStatus: string;
  approval?: {
    status: "pending" | "approved" | "rejected";
    messageId?: number;
  };
  workflowResult: WorkflowExecutionResult;
  validation: ValidationReport;
  warnings: string[];
  errors: string[];
}

const registry = createDefaultWorkflowRegistry();
const runManager = new RunManager();
const runTracker = new RunTracker();
const approvalAgent = new ApprovalAgent();
const providerRegistry = createProviderRegistry();

/**
 * Starter orchestrator that resolves a workflow, loads context, validates output, and pauses for approval when required.
 */
export const orchestrateTask = async (
  input: unknown,
): Promise<AgentResponse<OrchestratorOutput>> => {
  const parsedInput = OrchestratorInputSchema.safeParse(input);

  if (!parsedInput.success) {
    return {
      ok: false,
      agent: "orchestrator",
      warnings: [],
      errors: parsedInput.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`),
    };
  }

  try {
    const approvalRequired = resolveApprovalRequirement(parsedInput.data);
    const workflow = registry.resolveByTaskType(parsedInput.data.taskType);
    const run = await runManager.createRun({
      workflowId: workflow.id,
      taskType: parsedInput.data.taskType,
      clientId: parsedInput.data.clientId,
      approvalRequired,
    });

    const contextResponse = await loadContextBundle({
      runId: run.runId,
      taskType: parsedInput.data.taskType,
      objective: parsedInput.data.objective,
      clientId: parsedInput.data.clientId,
      sourceMaterials: parsedInput.data.sourceMaterials,
      constraints: {
        ...parsedInput.data.constraints,
        requireApproval: approvalRequired,
      },
      metadata: parsedInput.data.metadata,
    });

    if (!contextResponse.ok || !contextResponse.output) {
      return {
        ok: false,
        agent: "orchestrator",
        warnings: contextResponse.warnings,
        errors: contextResponse.errors,
      };
    }

    await runManager.updateStatus(run.runId, "context_loaded");

    const contextValidation = validateContext(contextResponse.output);
    if (!contextValidation.ok) {
      await runManager.updateStatus(run.runId, "validation_failed", {
        warnings: contextValidation.warnings,
        errors: contextValidation.errors,
      });

      return {
        ok: false,
        agent: "orchestrator",
        warnings: contextValidation.warnings,
        errors: contextValidation.errors,
      };
    }

    const orchestrationWarnings = [...contextValidation.warnings];
    let workflowModelRuntime: WorkflowModelRuntime | undefined;

    try {
      const outputContract = buildOutputContract(parsedInput.data.taskType);
      const memorySummary = await retrieveRelevantMemorySummary(parsedInput.data.objective);
      const builtPrompt = buildPrompt({
        clientId: parsedInput.data.clientId,
        workflowId: workflow.id,
        objective: parsedInput.data.objective,
        sourceMaterials: parsedInput.data.sourceMaterials,
        clientConstraints: parsedInput.data.constraints,
        memorySummary,
        ...(outputContract ? { outputContract } : {}),
      });
      const route = resolveModelRoute(parsedInput.data.taskType);
      const provider = providerRegistry.get(route.provider);
      const routeMetadata = {
        taskType: parsedInput.data.taskType,
        provider: provider.name,
        model: route.model,
        reason: route.reason,
        promptMetadata: builtPrompt.metadata,
        promptPreview: {
          systemLength: builtPrompt.system.length,
          userLength: builtPrompt.user.length,
        },
      };

      logger.info("Model route selected.", {
        runId: run.runId,
        ...routeMetadata,
      });

      if (workflow.id === "workflow.transcript_to_content.v1" || workflow.id === "blog-authority") {
        workflowModelRuntime = {
          provider,
          providerName: provider.name,
          model: route.model,
          system: builtPrompt.system,
          user: builtPrompt.user,
          metadata: {
            runId: run.runId,
            taskType: parsedInput.data.taskType,
            workflowId: workflow.id,
          },
          onEvent: async (event) => {
            try {
              await runTracker.trackModelExecutionEvent(
                run.runId,
                event.type,
                {
                  provider: provider.name,
                  model: route.model,
                  workflowId: workflow.id,
                  ...(event.metadata ?? {}),
                },
                event.message,
              );
            } catch (error) {
              logger.warn("Failed to record model execution event.", {
                runId: run.runId,
                type: event.type,
                error: error instanceof Error ? error.message : "Unknown model execution event error.",
              });
            }
          },
        };
      }

      try {
        await runTracker.trackModelRouteSelected(run.runId, routeMetadata);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown routing event error.";
        orchestrationWarnings.push(`Model routing event could not be recorded: ${message}`);
        logger.warn("Failed to record model route event.", {
          runId: run.runId,
          error: message,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown model routing error.";
      orchestrationWarnings.push(`Model routing metadata unavailable: ${message}`);
      logger.warn("Model routing metadata unavailable.", {
        runId: run.runId,
        error: message,
      });
    }

    await runManager.updateStatus(run.runId, "in_progress", {
      warnings: orchestrationWarnings,
    });

    const workflowResult = await workflow.execute(contextResponse.output, workflowModelRuntime);
    await runManager.updateStatus(run.runId, "draft_complete", {
      warnings: workflowResult.warnings,
      workflowResult,
    });

    const validation = validateWorkflowResult(workflowResult);
    const validatedRun = await runManager.updateStatus(
      run.runId,
      validation.ok ? "validation_passed" : "validation_failed",
      {
        warnings: [...orchestrationWarnings, ...validation.warnings],
        errors: validation.errors,
      },
    );

    const mergedWarnings = [...orchestrationWarnings, ...validation.warnings];

    if (!validation.ok) {
      return {
        ok: false,
        agent: "orchestrator",
        warnings: mergedWarnings,
        errors: validation.errors,
        output: {
          runId: validatedRun.runId,
          workflowId: validatedRun.workflowId,
          status: validatedRun.status,
          approvalRequired: validatedRun.approvalRequired,
          approvalStatus: validatedRun.approvalStatus,
          workflowResult,
          validation,
          warnings: mergedWarnings,
          errors: validation.errors,
        },
      };
    }

    if (contextResponse.output.constraints.requireApproval === true) {
      const approvalPacket = buildApprovalPacket(validatedRun.runId, workflow.id, validatedRun.clientId, workflowResult, validation);
      logger.info("Approval packet created.", {
        runId: approvalPacket.runId,
        workflowId: approvalPacket.workflowId,
      });

      const approvalResponse = await approvalAgent.requestApproval(approvalPacket);
      logger.info("Approval request sent.", {
        runId: approvalPacket.runId,
        messageId: approvalResponse.messageId,
      });

      const pendingDetails = {
        warnings: [...mergedWarnings, ...approvalResponse.warnings],
        errors: approvalResponse.errors,
        workflowResult,
        ...(approvalResponse.messageId === undefined ? {} : { approvalMessageId: approvalResponse.messageId }),
      };

      const pendingRun = await runManager.markPendingApproval(validatedRun.runId, pendingDetails);
      logger.info("Run moved to pending approval.", {
        runId: pendingRun.runId,
        status: pendingRun.status,
        messageId: pendingRun.approvalMessageId,
      });

      return {
        ok: approvalResponse.errors.length === 0,
        agent: "orchestrator",
        warnings: [...mergedWarnings, ...approvalResponse.warnings],
        errors: approvalResponse.errors,
        output: {
          runId: pendingRun.runId,
          workflowId: pendingRun.workflowId,
          status: pendingRun.status,
          approvalRequired: pendingRun.approvalRequired,
          approvalStatus: pendingRun.approvalStatus,
          approval: approvalResponse.messageId === undefined
            ? { status: approvalResponse.status }
            : { status: approvalResponse.status, messageId: approvalResponse.messageId },
          workflowResult,
          validation,
          warnings: [...mergedWarnings, ...approvalResponse.warnings],
          errors: approvalResponse.errors,
        },
      };
    }

    return {
      ok: true,
      agent: "orchestrator",
      warnings: mergedWarnings,
      errors: [],
      output: {
        runId: validatedRun.runId,
        workflowId: validatedRun.workflowId,
        status: validatedRun.status,
        approvalRequired: validatedRun.approvalRequired,
        approvalStatus: validatedRun.approvalStatus,
        workflowResult,
        validation,
        warnings: mergedWarnings,
        errors: [],
      },
    };
  } catch (error) {
    return {
      ok: false,
      agent: "orchestrator",
      warnings: [],
      errors: [error instanceof Error ? error.message : "Unknown orchestration error."],
    };
  }
};

const buildOutputContract = (taskType: string): string | undefined => {
  switch (taskType) {
    case "transcript_to_content":
      return [
        "Output contract: return strict JSON with keys `summary`, `hooks`, `titles`, and `captions`.",
        "`summary` must be a string.",
        "`hooks`, `titles`, and `captions` must each be arrays of strings.",
        "Do not include markdown fences or extra commentary.",
      ].join(" ");
    case "blog_generation":
    case "authority_blog":
      return [
        "Output contract: return strict JSON with keys `summary`, `title`, `outline`, `blogDraft`, `cta`, `seoNotes`, and `hookSet`.",
        "`summary`, `title`, `blogDraft`, and `cta` must be strings.",
        "`outline`, `seoNotes`, and `hookSet` must each be arrays of strings.",
        "Keep the response focused on those fields only and do not include markdown fences or extra commentary.",
      ].join(" ");
    default:
      return undefined;
  }
};

const resolveApprovalRequirement = (input: OrchestratorInput): boolean => {
  const constraintValue = input.constraints.requireApproval;
  return typeof constraintValue === "boolean" ? constraintValue : input.approvalRequired;
};

const buildApprovalPacket = (
  runId: string,
  workflowId: string,
  clientId: string,
  workflowResult: WorkflowExecutionResult,
  validation: ValidationReport,
): ApprovalPacket => {
  const titleAsset = workflowResult.assets.find((asset) => asset.type === "title")?.value;
  const preview = selectArtifactPreview(workflowResult);
  const packet = ApprovalPacketSchema.parse({
    runId,
    workflowId,
    clientId,
    title: titleAsset ?? `${workflowResult.taskType} approval`,
    summary: workflowResult.summary,
    artifactPreview: preview.slice(0, 1200),
    decisionOptions: ["approve", "reject", "request_revision"],
    riskFlags: validation.warnings,
    createdAt: new Date().toISOString(),
  });

  return packet;
};

const selectArtifactPreview = (workflowResult: WorkflowExecutionResult): string => {
  const preferredTypes: WorkflowExecutionResult["assets"][number]["type"][] = ["blog_draft", "title"];

  for (const assetType of preferredTypes) {
    const asset = workflowResult.assets.find((candidate) => candidate.type === assetType);
    if (asset?.value) {
      return asset.value;
    }
  }

  return workflowResult.assets[0]?.value ?? workflowResult.summary;
};
