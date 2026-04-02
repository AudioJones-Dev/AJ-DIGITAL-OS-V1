import { ExecutionAgent } from "../../agents/execution.agent.js";
import { logger } from "../../core/logger.js";
import { RunStore } from "../../core/run-store.js";
import type { RunRecord, RunStatus } from "../../types/run.types.js";
import type { PublishTarget } from "../publishing/publish-router.js";

export type ExecutionResumeMode = "manual" | "auto";
export type ExecutionResumeSource = "approval_resolver" | "execution_webhook" | "system";

export interface ExecutionResumerInput {
  runId: string;
  target?: PublishTarget;
  mode?: ExecutionResumeMode;
  source?: ExecutionResumeSource;
  actor?: string;
}

export interface ExecutionResumerResult {
  ok: boolean;
  runId: string;
  clientId?: string;
  target: string;
  mode: string;
  source?: string;
  actor?: string;
  resumed: boolean;
  status: "executed" | "failed" | "skipped";
  publishedPath?: string;
  filesWritten: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Service-level policy layer for resuming approved runs into execution.
 */
export class ExecutionResumer {
  constructor(
    private readonly runStore = new RunStore(),
    private readonly executionAgent = new ExecutionAgent(),
  ) {}

  /**
   * Resumes an approved run when policy allows it.
   */
  async resume(input: ExecutionResumerInput): Promise<ExecutionResumerResult> {
    const target = input.target ?? "local";
    const mode = input.mode ?? "manual";

    logger.info("Execution resume requested.", {
      runId: input.runId,
      target,
      mode,
      source: input.source,
    });

    try {
      const run = await this.loadRun(input.runId);
      logger.info("Execution resume loaded run.", {
        runId: run.runId,
        status: run.status,
      });

      if (!run.workflowResult) {
        logger.error("Execution resume missing workflow result.", {
          runId: run.runId,
        });

        return this.buildFailedResult(
          input.runId,
          run.clientId,
          target,
          mode,
          input.source,
          input.actor,
          `Run \"${run.runId}\" does not contain a persisted workflow result.`,
        );
      }

      const resumableDecision = this.isResumable(run);
      logger.info("Execution resume evaluated run state.", {
        runId: run.runId,
        status: run.status,
        resumable: resumableDecision.resumable,
      });

      if (!resumableDecision.resumable) {
        logger.warn("Execution resume skipped.", {
          runId: run.runId,
          reason: resumableDecision.reason,
        });

        return this.buildSkippedResult(
          run,
          target,
          mode,
          input.source,
          input.actor,
          resumableDecision.reason,
        );
      }

      if (mode === "auto" && !this.canAutoResume(run, target)) {
        logger.warn("Execution auto-resume blocked by policy.", {
          runId: run.runId,
          target,
        });

        return this.buildSkippedResult(
          run,
          target,
          mode,
          input.source,
          input.actor,
          "Auto-resume policy does not permit this run yet.",
        );
      }

      logger.info("Execution resume delegating to execution agent.", {
        runId: run.runId,
        target,
        mode,
      });

      const executionResult = await this.executionAgent.execute({
        runId: run.runId,
        target,
      });

      logger.info("Execution resume received execution result.", {
        runId: executionResult.runId,
        status: executionResult.status,
        target: executionResult.target,
      });

      const baseResult = {
        ok: executionResult.ok,
        runId: executionResult.runId,
        ...(executionResult.clientId ? { clientId: executionResult.clientId } : {}),
        target: executionResult.target,
        mode,
        ...(input.source ? { source: input.source } : {}),
        ...(input.actor ? { actor: input.actor } : {}),
        resumed: true,
        status: executionResult.ok ? "executed" as const : "failed" as const,
        filesWritten: executionResult.filesWritten,
        warnings: executionResult.warnings,
        errors: executionResult.errors,
      };

      return executionResult.publishedPath === undefined
        ? baseResult
        : {
            ...baseResult,
            publishedPath: executionResult.publishedPath,
          };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown execution resume error.";
      logger.error("Execution resume failed.", {
        runId: input.runId,
        target,
        mode,
        error: message,
      });

      return this.buildFailedResult(
        input.runId,
        undefined,
        target,
        mode,
        input.source,
        input.actor,
        message,
      );
    }
  }

  private async loadRun(runId: string): Promise<RunRecord> {
    const run = await this.runStore.get(runId);

    if (!run) {
      throw new Error(`Run \"${runId}\" was not found.`);
    }

    return run;
  }

  private isResumable(run: RunRecord): { resumable: boolean; reason: string } {
    switch (run.status) {
      case "approved":
        return { resumable: true, reason: "Run is approved and may resume execution." };
      case "executed":
        return { resumable: false, reason: "Run has already been executed." };
      case "rejected":
        return { resumable: false, reason: "Run was rejected and cannot resume." };
      case "revision_requested":
        return { resumable: false, reason: "Run requires revision before execution." };
      case "pending_approval":
        return { resumable: false, reason: "Run is still pending approval." };
      default:
        return { resumable: false, reason: this.getNonResumableReason(run.status) };
    }
  }

  private canAutoResume(run: RunRecord, target: PublishTarget): boolean {
    void target;
    return run.status === "approved";
  }

  private buildSkippedResult(
    run: RunRecord,
    target: PublishTarget,
    mode: ExecutionResumeMode,
    source: ExecutionResumeSource | undefined,
    actor: string | undefined,
    reason: string,
  ): ExecutionResumerResult {
    return {
      ok: true,
      runId: run.runId,
      clientId: run.clientId,
      target,
      mode,
      ...(source ? { source } : {}),
      ...(actor ? { actor } : {}),
      resumed: false,
      status: "skipped",
      filesWritten: run.publishedFiles ?? [],
      warnings: [reason],
      errors: [],
      ...(run.publishedPath ? { publishedPath: run.publishedPath } : {}),
    };
  }

  private buildFailedResult(
    runId: string,
    clientId: string | undefined,
    target: PublishTarget,
    mode: ExecutionResumeMode,
    source: ExecutionResumeSource | undefined,
    actor: string | undefined,
    error: string,
  ): ExecutionResumerResult {
    return {
      ok: false,
      runId,
      ...(clientId ? { clientId } : {}),
      target,
      mode,
      ...(source ? { source } : {}),
      ...(actor ? { actor } : {}),
      resumed: false,
      status: "failed",
      filesWritten: [],
      warnings: [],
      errors: [error],
    };
  }

  private getNonResumableReason(status: RunStatus): string {
    switch (status) {
      case "queued":
        return "Run has not started execution planning yet.";
      case "context_loaded":
        return "Run is still assembling context.";
      case "in_progress":
        return "Run is still being generated.";
      case "draft_complete":
        return "Run draft is complete but not yet validated for execution.";
      case "validation_passed":
        return "Run passed validation but has not been approved yet.";
      case "validation_failed":
        return "Run failed validation and cannot resume.";
      case "logged":
        return "Run is already post-execution and logged.";
      case "closed":
        return "Run is closed and cannot resume.";
      case "pending_approval":
      case "approved":
      case "rejected":
      case "revision_requested":
      case "executed":
        return "Run is not resumable from its current state.";
    }
  }
}
