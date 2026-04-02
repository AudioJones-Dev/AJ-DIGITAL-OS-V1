import { logger } from "../core/logger.js";
import { RunStore } from "../core/run-store.js";
import { PublishRouter, type PublishTarget } from "../services/publishing/publish-router.js";
import type { RunRecord } from "../types/run.types.js";

export interface ExecutionAgentInput {
  runId: string;
  target?: PublishTarget;
}

export interface ExecutionAgentResult {
  ok: boolean;
  agent: "execution";
  runId: string;
  clientId?: string;
  target: string;
  status: "executed" | "failed";
  publishedPath?: string;
  filesWritten: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Central policy gate for post-approval execution handoff.
 */
export class ExecutionAgent {
  constructor(
    private readonly runStore = new RunStore(),
    private readonly publishRouter = new PublishRouter(),
  ) {}

  /**
   * Executes an approved run through the publish router.
   */
  async execute(input: ExecutionAgentInput): Promise<ExecutionAgentResult> {
    const target = this.resolveTarget(input.target);
    logger.info("Execution requested.", {
      runId: input.runId,
      target,
    });

    try {
      const run = await this.loadRun(input.runId);
      logger.info("Execution run loaded.", {
        runId: run.runId,
        status: run.status,
      });

      this.assertExecutableRun(run);
      logger.info("Execution target selected.", {
        runId: run.runId,
        target,
      });

      logger.info("Execution invoking publish router.", {
        runId: run.runId,
        target,
      });
      const routerResult = await this.publishRouter.route({
        runId: run.runId,
        target,
      });

      logger.info("Execution received router result.", {
        runId: run.runId,
        target: routerResult.target,
        status: routerResult.status,
      });

      const result = this.normalizeRouterResult(run, routerResult, target);
      logger.info(result.ok ? "Execution completed." : "Execution failed.", {
        runId: result.runId,
        target: result.target,
        status: result.status,
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown execution error.";
      logger.error("Execution failed before routing completed.", {
        runId: input.runId,
        target,
        error: message,
      });

      return {
        ok: false,
        agent: "execution",
        runId: input.runId,
        target,
        status: "failed",
        filesWritten: [],
        warnings: [],
        errors: [message],
      };
    }
  }

  private async loadRun(runId: string): Promise<RunRecord> {
    const run = await this.runStore.get(runId);

    if (!run) {
      throw new Error(`Run \"${runId}\" was not found.`);
    }

    return run;
  }

  private assertExecutableRun(run: RunRecord): asserts run is RunRecord & { workflowResult: NonNullable<RunRecord["workflowResult"]> } {
    if (!run.workflowResult) {
      throw new Error(`Run \"${run.runId}\" does not contain a persisted workflow result.`);
    }

    if (run.status !== "approved") {
      throw new Error(`Run \"${run.runId}\" is not executable from status \"${run.status}\".`);
    }
  }

  private resolveTarget(target?: PublishTarget): PublishTarget {
    return target ?? "local";
  }

  private normalizeRouterResult(
    run: RunRecord,
    routerResult: Awaited<ReturnType<PublishRouter["route"]>>,
    target: PublishTarget,
  ): ExecutionAgentResult {
    return routerResult.publishedPath === undefined
      ? {
          ok: routerResult.ok,
          agent: "execution",
          runId: routerResult.runId,
          clientId: run.clientId,
          target,
          status: routerResult.ok ? "executed" : "failed",
          filesWritten: routerResult.filesWritten,
          warnings: routerResult.warnings,
          errors: routerResult.errors,
        }
      : {
          ok: routerResult.ok,
          agent: "execution",
          runId: routerResult.runId,
          clientId: run.clientId,
          target,
          status: routerResult.ok ? "executed" : "failed",
          publishedPath: routerResult.publishedPath,
          filesWritten: routerResult.filesWritten,
          warnings: routerResult.warnings,
          errors: routerResult.errors,
        };
  }
}
