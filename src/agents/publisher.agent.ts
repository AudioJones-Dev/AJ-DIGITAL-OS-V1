import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { logger } from "../core/logger.js";
import { RunManager } from "../core/run-manager.js";
import { DeliverableRecorder } from "../services/runtime/deliverable-recorder.js";
import { OutputPathResolver } from "../services/runtime/output-path-resolver.js";
import type { RunRecord } from "../types/run.types.js";
import type { WorkflowAsset, WorkflowExecutionResult } from "../types/workflow.types.js";
import {
  EnforcementBlockedError,
  executeWithEnforcement,
} from "../security/permissions/enforced-execution.js";
import { resolveAgentContext } from "../security/agents/agent-registry.js";
import type { ApprovalContext } from "../security/permissions/approval-gate.js";
import type { PermissionLevel } from "../security/permissions/permission-levels.js";

export interface PublisherInput {
  runId: string;
  target?: "local";
  enforcement?: PublisherEnforcementContext | undefined;
}

export interface PublisherEnforcementContext {
  agentId: string;
  permissionLevel: PermissionLevel;
  approval?: ApprovalContext | undefined;
}

export interface PublisherResult {
  ok: boolean;
  agent: "publisher";
  runId: string;
  clientId?: string;
  status: "executed" | "failed";
  publishedPath?: string;
  filesWritten: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Final local execution agent that writes approved workflow outputs to disk.
 */
export class PublisherAgent {
  constructor(
    private readonly runManager = new RunManager(),
    private readonly deliverableRecorder = new DeliverableRecorder(),
    private readonly outputPathResolver = new OutputPathResolver(),
  ) {}

  /**
   * Publishes the approved run outputs to deterministic local storage.
   */
  async publish(input: PublisherInput): Promise<PublisherResult> {
    const target = input.target ?? "local";

    if (target !== "local") {
      return {
        ok: false,
        agent: "publisher",
        runId: input.runId,
        status: "failed",
        filesWritten: [],
        warnings: [],
        errors: [`Unsupported publish target \"${target}\".`],
      };
    }

    try {
      logger.info("Publisher loading run.", { runId: input.runId });
      const run = await this.loadRun(input.runId);
      this.assertExecutableRun(run);

      logger.info("Publisher starting execution.", {
        runId: run.runId,
        workflowId: run.workflowId,
      });

      const enforcement = this.resolveEnforcement(input.enforcement);

      const outputDirectory = await this.resolveOutputDirectory(run);
      await this.enforcedMutation({
        agentId: enforcement.agentId,
        permissionLevel: enforcement.permissionLevel,
        approval: enforcement.approval,
        clientId: run.clientId ?? null,
        target: outputDirectory,
        actionType: "write_file",
      }, async () => {
        await mkdir(outputDirectory, { recursive: true });
      });

      const filesWritten = await this.writeArtifacts(
        outputDirectory,
        run.taskType,
        run.workflowResult,
        {
          agentId: enforcement.agentId,
          permissionLevel: enforcement.permissionLevel,
          approval: enforcement.approval,
          clientId: run.clientId ?? null,
        },
      );
      logger.info("Publisher wrote artifacts.", {
        runId: run.runId,
        filesWritten,
      });

      const executedRun = await this.runManager.markExecuted(run.runId, {
        publishedPath: outputDirectory,
        publishedFiles: filesWritten,
      });
      logger.info("Publisher updated run status.", {
        runId: executedRun.runId,
        status: executedRun.status,
      });

      logger.info("Publisher completed execution.", {
        runId: executedRun.runId,
        publishedPath: outputDirectory,
      });
      try {
        await this.deliverableRecorder.recordPublishedRun({
          run: executedRun,
          publishedPath: outputDirectory,
          filesWritten,
        });
      } catch (error) {
        logger.warn("Deliverable registry persistence failed after publish.", {
          runId: executedRun.runId,
          error: error instanceof Error ? error.message : "Unknown deliverable registry error.",
        });
      }

      return {
        ok: true,
        agent: "publisher",
        runId: executedRun.runId,
        clientId: executedRun.clientId,
        status: "executed",
        publishedPath: outputDirectory,
        filesWritten,
        warnings: [],
        errors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown publish error.";
      logger.error("Publisher failed.", {
        runId: input.runId,
        error: message,
      });

      return {
        ok: false,
        agent: "publisher",
        runId: input.runId,
        status: "failed",
        filesWritten: [],
        warnings: [],
        errors: [message],
      };
    }
  }

  private async loadRun(runId: string): Promise<RunRecord> {
    const run = await this.runManager.getRun(runId);

    if (!run) {
      throw new Error(`Run \"${runId}\" was not found.`);
    }

    return run;
  }

  private assertExecutableRun(run: RunRecord): asserts run is RunRecord & { workflowResult: WorkflowExecutionResult } {
    if (run.status !== "approved") {
      throw new Error(`Run \"${run.runId}\" is not executable from status \"${run.status}\".`);
    }

    if (!run.workflowResult) {
      throw new Error(`Run \"${run.runId}\" does not contain a persisted workflow result.`);
    }
  }

  private async resolveOutputDirectory(run: RunRecord): Promise<string> {
    const outputPaths = await this.outputPathResolver.resolve({
      clientId: run.clientId,
    });
    // Ensure this mutating directory preparation path can be gated by caller-level enforcement.
    await this.outputPathResolver.ensureDirectories(outputPaths);
    return path.join(outputPaths.published, this.sanitizeSegment(run.runId));
  }

  private async writeArtifacts(
    outputDirectory: string,
    taskType: string,
    workflowResult: WorkflowExecutionResult,
    context: {
      agentId: string;
      permissionLevel: PermissionLevel;
      approval?: ApprovalContext | undefined;
      clientId?: string | null | undefined;
    },
  ): Promise<string[]> {
    const filesWritten: string[] = [];
    const usedFileNames = new Set<string>();

    for (const asset of workflowResult.assets) {
      const fileName = this.mapAssetToFilename(taskType, asset);
      if (!fileName) {
        continue;
      }

      const uniqueFileName = this.ensureUniqueFilename(fileName, usedFileNames);
      const filePath = path.join(outputDirectory, uniqueFileName);
      await this.enforcedMutation({
        agentId: context.agentId,
        permissionLevel: context.permissionLevel,
        approval: context.approval,
        clientId: context.clientId,
        target: filePath,
        actionType: "write_file",
      }, async () => {
        await writeFile(filePath, this.normalizeText(asset.value), "utf-8");
      });
      filesWritten.push(filePath);
      logger.info("Publisher wrote file.", {
        filePath,
        assetType: asset.type,
      });
    }

    if (taskType === "transcript_to_content") {
      const summaryPath = path.join(outputDirectory, "summary.md");
      await this.enforcedMutation({
        agentId: context.agentId,
        permissionLevel: context.permissionLevel,
        approval: context.approval,
        clientId: context.clientId,
        target: summaryPath,
        actionType: "write_file",
      }, async () => {
        await writeFile(summaryPath, this.normalizeText(workflowResult.summary), "utf-8");
      });
      filesWritten.push(summaryPath);
      logger.info("Publisher wrote file.", {
        filePath: summaryPath,
        assetType: "summary",
      });
    }

    if (filesWritten.length === 0) {
      throw new Error(`Run \"${workflowResult.workflowId}\" did not contain any publishable assets.`);
    }

    return filesWritten;
  }

  private mapAssetToFilename(taskType: string, asset: WorkflowAsset): string | undefined {
    switch (asset.type) {
      case "title":
        return taskType === "transcript_to_content" ? "titles.txt" : "title.txt";
      case "outline":
        return "outline.md";
      case "blog_draft":
        return "blog-draft.md";
      case "cta":
        return taskType === "transcript_to_content" ? "captions.txt" : "cta.txt";
      case "seo_notes":
        return "seo-notes.md";
      case "hook_set":
        return "hooks.txt";
      case "caption_set":
        return "captions.txt";
    }
  }

  private ensureUniqueFilename(fileName: string, usedFileNames: Set<string>): string {
    if (!usedFileNames.has(fileName)) {
      usedFileNames.add(fileName);
      return fileName;
    }

    const extension = path.extname(fileName);
    const baseName = path.basename(fileName, extension);
    let counter = 2;

    while (usedFileNames.has(`${baseName}-${counter}${extension}`)) {
      counter += 1;
    }

    const nextFileName = `${baseName}-${counter}${extension}`;
    usedFileNames.add(nextFileName);
    return nextFileName;
  }

  private normalizeText(value: string): string {
    return value.replace(/\r?\n/g, "\n");
  }

  private sanitizeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9-_]/g, "_");
  }

  private resolveEnforcement(
    context: PublisherEnforcementContext | undefined,
  ): PublisherEnforcementContext {
    const registryContext = resolveAgentContext(context?.agentId ?? "publisher-agent");

    return {
      agentId: context?.agentId ?? registryContext.agentId,
      permissionLevel: context?.permissionLevel ?? registryContext.permissionLevel,
      ...(context?.approval !== undefined ? { approval: context.approval } : {}),
    };
  }

  private async enforcedMutation(
    context: {
      agentId: string;
      permissionLevel: PermissionLevel;
      approval?: ApprovalContext | undefined;
      clientId?: string | null | undefined;
      target: string;
      actionType: string;
    },
    execute: () => Promise<void>,
  ): Promise<void> {
    try {
      const enforced = await executeWithEnforcement(
        {
          agentId: context.agentId,
          actionType: context.actionType,
          target: context.target,
          ...(context.clientId !== undefined ? { clientId: context.clientId } : {}),
        },
        {
          permissionLevel: context.permissionLevel,
          ...(context.approval !== undefined ? { approval: context.approval } : {}),
        },
        async () => {
          await execute();
          return { ok: true };
        },
      );

      if (enforced.status === "approval_required") {
        throw new Error(`Publisher mutation requires approval: ${enforced.enforcement.reason}`);
      }
    } catch (err: unknown) {
      if (err instanceof EnforcementBlockedError) {
        throw new Error(`Publisher mutation blocked: ${err.message}`);
      }
      throw err;
    }
  }
}
