import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { AssistantRuntimeResult } from "./assistant-runtime.js";
import { DeliverableStore } from "../../core/deliverable-store.js";
import { SemanticMemoryIndexer } from "../../memory/semantic-memory-indexer.js";
import type { TaskCategoryId } from "../../types/task-category.types.js";
import type {
  DeliverableApprovalRoutingPolicy,
  DeliverableOutputPolicy,
  DeliverableRecord,
  DeliverableStatus,
  DeliverableType,
} from "../../types/deliverable.types.js";
import type { RunRecord } from "../../types/run.types.js";
import { DeliverableLifecycleService } from "./deliverable-lifecycle.js";
import { OutputPathResolver } from "./output-path-resolver.js";

export interface RecordAssistantDeliverableInput {
  assistant: AssistantRuntimeResult;
  sourceCommand: "assistant" | "assistant-start" | "assistant-shell" | "assistant-ui";
  shellSessionId?: string;
  shellSessionLabel?: string;
  turnIndex?: number;
  autoSubmitForApproval?: boolean;
}

export interface RecordPublishedDeliverableInput {
  run: RunRecord;
  publishedPath: string;
  filesWritten: string[];
}

export class DeliverableRecorder {
  constructor(
    private readonly store = new DeliverableStore(),
    private readonly outputPathResolver = new OutputPathResolver(),
    private readonly lifecycleService = new DeliverableLifecycleService(),
    private readonly semanticMemoryIndexer = new SemanticMemoryIndexer(),
  ) {}

  async recordAssistantResult(input: RecordAssistantDeliverableInput): Promise<DeliverableRecord | undefined> {
    const assistant = input.assistant;

    if (!assistant.executionPolicy.deliverablePersistenceAllowed) {
      return undefined;
    }

    if (assistant.execution === "advisory" && assistant.ok && assistant.advisory) {
      if (input.autoSubmitForApproval) {
        assistant.warnings.push("Advisory mode ignored autoSubmitForApproval because advisory runs do not submit deliverables automatically.");
      }

      const routing = await this.outputPathResolver.resolve({
        ...(assistant.brandContext.selectedBrandId
          ? { brandId: assistant.brandContext.selectedBrandId }
          : {}),
        clientId: assistant.clientId,
      });
      await this.outputPathResolver.ensureDirectories(routing);

      const deliverableId = randomUUID();
      const timestamp = new Date().toISOString();
      const outputPath = path.join(routing.drafts, `${sanitizeFileSegment(deliverableId)}.md`);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, this.renderAdvisoryDraft(assistant), "utf-8");

      const record = this.buildRecord({
        deliverableId,
        timestamp,
        status: "draft",
        title: assistant.advisory.summary,
        summary: assistant.advisory.response,
        outputPath,
        outputFiles: [outputPath],
        approvalRequired: false,
        approvalPolicy: this.buildApprovalPolicy(false, assistant),
        outputPolicy: this.buildOutputPolicy(routing, assistant),
        assistant,
        metadata: {
          sourceCommand: input.sourceCommand,
          promptMetadata: assistant.promptMetadata,
          shellSessionId: input.shellSessionId,
          shellSessionLabel: input.shellSessionLabel,
          turnIndex: input.turnIndex,
          brandVoice: assistant.brandContext.voice,
          brandContentRules: assistant.brandContext.contentRules,
        },
      });

      const saved = await this.store.save(record);
      await this.safeIndexDeliverable(saved, assistant);
      return saved;
    }

    if (assistant.execution === "orchestrated" && assistant.orchestration) {
      const routing = await this.outputPathResolver.resolve({
        ...(assistant.brandContext.selectedBrandId
          ? { brandId: assistant.brandContext.selectedBrandId }
          : {}),
        clientId: assistant.clientId,
      });
      await this.outputPathResolver.ensureDirectories(routing);

      const timestamp = new Date().toISOString();
      const approvalRequired = assistant.orchestration.approvalRequired;
      const record = this.buildRecord({
        deliverableId: randomUUID(),
        timestamp,
        status: assistant.ok ? "draft" : "failed",
        title: assistant.task,
        summary: this.buildOrchestrationSummary(assistant),
        approvalRequired,
        approvalPolicy: this.buildApprovalPolicy(approvalRequired, assistant),
        outputPolicy: this.buildOutputPolicy(routing, assistant),
        assistant,
        runId: assistant.orchestration.runId,
        metadata: {
          sourceCommand: input.sourceCommand,
          promptMetadata: assistant.promptMetadata,
          approvalStatus: assistant.orchestration.approvalStatus,
          shellSessionId: input.shellSessionId,
          shellSessionLabel: input.shellSessionLabel,
          turnIndex: input.turnIndex,
          brandVoice: assistant.brandContext.voice,
          brandContentRules: assistant.brandContext.contentRules,
          brandOutputDirectories: assistant.brandContext.outputDirectories,
        },
      });
      const saved = await this.store.save(record);
      if (!assistant.ok || !input.autoSubmitForApproval) {
        await this.safeIndexDeliverable(saved, assistant);
        return saved;
      }

      const submission = await this.lifecycleService.submitForApproval({
        deliverableId: saved.deliverableId,
        actor: "system",
        notes: "Auto-submitted for approval by the assistant runtime.",
      });
      if (!submission.ok) {
        assistant.warnings.push(...submission.errors);
        await this.safeIndexDeliverable(saved, assistant);
        return saved;
      }

      if (submission.deliverable) {
        await this.safeIndexDeliverable(submission.deliverable, assistant);
      }
      return submission.deliverable ?? saved;
    }

    return undefined;
  }

  async recordPublishedRun(input: RecordPublishedDeliverableInput): Promise<DeliverableRecord> {
    const timestamp = new Date().toISOString();
    const routing = await this.outputPathResolver.resolve({
      clientId: input.run.clientId,
    });
    await this.outputPathResolver.ensureDirectories(routing);

    const existing = await this.store.getLatestByRunId(input.run.runId);
    if (existing) {
      const updated = await this.store.update(existing.deliverableId, (current) => ({
        ...current,
        status: "published",
        outputPath: input.publishedPath,
        outputFiles: input.filesWritten,
        updatedAt: timestamp,
        publishedAt: timestamp,
        outputPolicy: this.buildOutputPolicy(routing),
        approvalRequired: current.approvalRequired,
        approvalPolicy: current.approvalPolicy,
        ...(routing.brandId ? { brandId: routing.brandId } : {}),
        ...(routing.brandName ? { brandName: routing.brandName } : {}),
        metadata: {
          ...current.metadata,
          publishTarget: "local",
        },
      }));
      await this.safeIndexDeliverable(updated);
      return updated;
    }

    const fallbackRecord = this.buildRunRecord({
      deliverableId: randomUUID(),
      timestamp,
      status: "published",
      run: input.run,
      outputPath: input.publishedPath,
      outputFiles: input.filesWritten,
      outputPolicy: this.buildOutputPolicy(routing),
      approvalRequired: input.run.approvalRequired,
      approvalPolicy: this.buildApprovalPolicy(input.run.approvalRequired),
      ...(routing.brandId ? { brandId: routing.brandId } : {}),
      ...(routing.brandName ? { brandName: routing.brandName } : {}),
    });

    const saved = await this.store.save(fallbackRecord);
    await this.safeIndexDeliverable(saved);
    return saved;
  }

  private buildRecord(input: {
    deliverableId: string;
    timestamp: string;
    status: DeliverableStatus;
    title: string;
    summary: string;
    outputPath?: string;
    outputFiles?: string[];
    approvalRequired: boolean;
    approvalPolicy: DeliverableApprovalRoutingPolicy;
    outputPolicy: DeliverableOutputPolicy;
    assistant: AssistantRuntimeResult;
    runId?: string;
    metadata: Record<string, unknown>;
  }): DeliverableRecord {
    return {
      deliverableId: input.deliverableId,
      ...(input.assistant.brandContext.selectedBrandId ? { brandId: input.assistant.brandContext.selectedBrandId } : {}),
      ...(input.assistant.brandContext.brandName ? { brandName: input.assistant.brandContext.brandName } : {}),
      clientId: input.assistant.clientId,
      ...(input.runId ? { runId: input.runId } : {}),
      workflowId: input.assistant.workflowMatch.workflowId ?? "assistant.advisory.v1",
      taskType: input.assistant.workflowMatch.taskType ?? "classification",
      deliverableType: this.resolveDeliverableType(
        input.assistant.workflowMatch.taskType,
        input.assistant.execution,
      ),
      status: input.status,
      categoryId: this.resolveCategoryId(input.assistant.workflowMatch.taskType, input.assistant.execution),
      title: this.trimValue(input.title, 140) || "Untitled deliverable",
      summary: input.summary,
      outputPolicy: input.outputPolicy,
      ...(input.outputPath ? { outputPath: input.outputPath } : {}),
      outputFiles: input.outputFiles ?? [],
      approvalRequired: input.approvalRequired,
      approvalPolicy: input.approvalPolicy,
      createdAt: input.timestamp,
      updatedAt: input.timestamp,
      metadata: {
        assistantMode: input.assistant.mode,
        executionPolicy: input.assistant.executionPolicy,
        ...(input.assistant.agentProfile ? { agentProfile: input.assistant.agentProfile } : {}),
        ...(input.assistant.modelProfile ? { modelProfile: input.assistant.modelProfile } : {}),
        ...(input.assistant.conversation ? { conversation: input.assistant.conversation } : {}),
        ...(input.assistant.stitchedContext ? { stitchedContext: input.assistant.stitchedContext } : {}),
        brandManifestPath: input.assistant.brandContext.manifestPath,
        brandOutputDirectories: input.assistant.brandContext.outputDirectories,
        brandApprovalPolicy: input.assistant.brandContext.approvalPolicy,
        brandPublishPolicy: input.assistant.brandContext.publishPolicy,
        route: input.assistant.route,
        warnings: input.assistant.warnings,
        errors: input.assistant.errors,
        ...input.metadata,
      },
    };
  }

  private buildRunRecord(input: {
    deliverableId: string;
    timestamp: string;
    status: DeliverableStatus;
    run: RunRecord;
    outputPath?: string;
    outputFiles: string[];
    outputPolicy: DeliverableOutputPolicy;
    approvalRequired: boolean;
    approvalPolicy: DeliverableApprovalRoutingPolicy;
    brandId?: string;
    brandName?: string;
  }): DeliverableRecord {
    return {
      deliverableId: input.deliverableId,
      ...(input.brandId ? { brandId: input.brandId } : {}),
      ...(input.brandName ? { brandName: input.brandName } : {}),
      clientId: input.run.clientId,
      runId: input.run.runId,
      workflowId: input.run.workflowId,
      taskType: input.run.taskType,
      deliverableType: this.resolveDeliverableType(input.run.taskType, "orchestrated"),
      status: input.status,
      categoryId: this.resolveCategoryId(input.run.taskType, "orchestrated"),
      title: this.trimValue(input.run.workflowResult?.summary ?? input.run.workflowId, 140) || input.run.workflowId,
      summary: input.run.workflowResult?.summary ?? "",
      outputPolicy: input.outputPolicy,
      ...(input.outputPath ? { outputPath: input.outputPath } : {}),
      outputFiles: input.outputFiles,
      approvalRequired: input.approvalRequired,
      approvalPolicy: input.approvalPolicy,
      createdAt: input.timestamp,
      updatedAt: input.timestamp,
      ...(input.status === "published" ? { publishedAt: input.timestamp } : {}),
      metadata: {
        warnings: input.run.warnings,
        errors: input.run.errors,
      },
    };
  }

  private buildOutputPolicy(
    routing: Awaited<ReturnType<OutputPathResolver["resolve"]>>,
    assistant?: AssistantRuntimeResult,
  ): DeliverableOutputPolicy {
    return {
      draftsPath: routing.drafts,
      pendingPath: routing.pending,
      approvedPath: routing.approved,
      publishedPath: routing.published,
      publishTarget: assistant?.brandContext.publishPolicy?.defaultTarget ?? "local",
    };
  }

  private buildApprovalPolicy(
    approvalRequired: boolean,
    assistant?: AssistantRuntimeResult,
  ): DeliverableApprovalRoutingPolicy {
    return {
      approvalRequired,
      approvalMode: approvalRequired
        ? (assistant?.brandContext.approvalPolicy?.mode ?? "existing_run_lifecycle")
        : "not_required",
      approverRoles: approvalRequired
        ? (assistant?.brandContext.approvalPolicy?.approverRoles ?? ["operator"])
        : [],
      approverChannels: approvalRequired
        ? (assistant?.brandContext.approvalPolicy?.approverChannels ?? ["terminal"])
        : [],
    };
  }

  private buildOrchestrationSummary(assistant: AssistantRuntimeResult): string {
    if (!assistant.orchestration) {
      return assistant.task;
    }

    return [
      `Run ${assistant.orchestration.runId} created for workflow ${assistant.orchestration.workflowId}.`,
      `Approval status: ${assistant.orchestration.approvalStatus}.`,
    ].join(" ");
  }

  private renderAdvisoryDraft(assistant: AssistantRuntimeResult): string {
    const advisory = assistant.advisory;
    if (!advisory) {
      return "";
    }

    return [
      `# ${advisory.summary || "Assistant Draft"}`,
      "",
      advisory.response,
      "",
      "## Next Steps",
      ...(advisory.nextSteps.length > 0 ? advisory.nextSteps.map((step) => `- ${step}`) : ["- None"]),
      "",
      "## Risks",
      ...(advisory.risks.length > 0 ? advisory.risks.map((risk) => `- ${risk}`) : ["- None"]),
      "",
      `Mode: ${assistant.mode}`,
      `Route: ${assistant.route.provider}/${assistant.route.model}`,
      `Brand: ${assistant.brandContext.brandName ?? assistant.brandContext.selectedBrandId ?? "-"}`,
      "",
    ].join("\n");
  }

  private resolveDeliverableType(
    taskType: string | undefined,
    execution: AssistantRuntimeResult["execution"],
  ): DeliverableType {
    switch (taskType) {
      case "authority_blog":
        return "blog_post";
      case "transcript_to_content":
        return "transcript_package";
      case "classification":
        return execution === "advisory" ? "ops_brief" : "custom";
      default:
        return execution === "advisory" ? "ops_brief" : "custom";
    }
  }

  private resolveCategoryId(
    taskType: string | undefined,
    execution: AssistantRuntimeResult["execution"],
  ): TaskCategoryId {
    switch (taskType) {
      case "authority_blog":
      case "transcript_to_content":
        return "content";
      case "classification":
        return execution === "advisory" ? "ops" : "review";
      default:
        return execution === "advisory" ? "ops" : "review";
    }
  }

  private trimValue(value: string, maxLength: number): string {
    const trimmed = value.trim();
    if (trimmed.length <= maxLength) {
      return trimmed;
    }

    return `${trimmed.slice(0, maxLength - 3).trimEnd()}...`;
  }

  private async safeIndexDeliverable(
    deliverable: DeliverableRecord,
    assistant?: AssistantRuntimeResult,
  ): Promise<void> {
    try {
      await this.semanticMemoryIndexer.indexDeliverable(deliverable);
    } catch (error) {
      assistant?.warnings.push(
        `Semantic memory indexing failed for deliverable "${deliverable.deliverableId}": ${error instanceof Error ? error.message : "Unknown error."}`,
      );
    }
  }
}

const sanitizeFileSegment = (value: string): string => value.replace(/[^a-zA-Z0-9-_]/g, "_");
