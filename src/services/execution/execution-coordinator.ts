import { logger } from "../../core/logger.js";
import { RunStore } from "../../core/run-store.js";
import type { RunRecord } from "../../types/run.types.js";
import {
  ExecutionPolicy,
  type ExecutionMode,
  type ExecutionPolicyDecision,
  type ExecutionPolicyResult,
  type ExecutionTarget,
} from "./execution-policy.js";
import {
  ExecutionResumer,
  type ExecutionResumeSource,
  type ExecutionResumerInput,
  type ExecutionResumerResult,
} from "./execution-resumer.js";

export interface ExecutionCoordinatorInput {
  runId: string;
  target?: ExecutionTarget;
  mode?: ExecutionMode;
  source?: string;
  actor?: string;
}

export interface ExecutionCoordinatorResult {
  ok: boolean;
  runId: string;
  clientId?: string;
  target: string;
  mode: string;
  decision: "allow" | "skip" | "deny";
  status: "executed" | "failed" | "skipped" | "denied";
  policy: {
    reasons: string[];
    warnings: string[];
  };
  publishedPath?: string;
  filesWritten: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Orchestrates policy-driven post-approval execution flow for a run.
 */
export class ExecutionCoordinator {
  constructor(
    private readonly runStore = new RunStore(),
    private readonly executionPolicy = new ExecutionPolicy(),
    private readonly executionResumer = new ExecutionResumer(),
  ) {}

  /**
   * Executes the full policy and resume flow for a run.
   */
  async execute(input: ExecutionCoordinatorInput): Promise<ExecutionCoordinatorResult> {
    const target = input.target ?? "local";
    const mode = input.mode ?? "manual";

    logger.info("Execution coordinator invoked.", {
      runId: input.runId,
      target,
      mode,
      source: input.source,
    });

    try {
      const run = await this.loadRun(input.runId);
      logger.info("Execution coordinator loaded run.", {
        runId: run.runId,
        status: run.status,
      });

      const policy = this.evaluatePolicy(run, target, mode);
      logger.info("Execution coordinator evaluated policy.", {
        runId: run.runId,
        decision: policy.decision,
        allowed: policy.allowed,
      });

      switch (policy.decision) {
        case "deny":
          return this.handleDeny(run, target, mode, policy);
        case "skip":
          return this.handleSkip(run, target, mode, policy);
        case "allow": {
          logger.info("Execution coordinator triggering execution resumer.", {
            runId: run.runId,
            target,
            mode,
          });

          const resumerInput: ExecutionResumerInput = {
            runId: run.runId,
            target,
            mode,
          };

          const normalizedSource = toExecutionResumeSource(input.source);
          if (normalizedSource) {
            resumerInput.source = normalizedSource;
          }

          if (input.actor) {
            resumerInput.actor = input.actor;
          }

          const resumerResult = await this.executionResumer.resume(resumerInput);
          const result = this.handleAllow(run, policy, resumerResult);
          logger.info("Execution coordinator completed allowed flow.", {
            runId: result.runId,
            decision: result.decision,
            status: result.status,
          });

          return result;
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown execution coordination error.";
      logger.error("Execution coordinator failed.", {
        runId: input.runId,
        target,
        mode,
        error: message,
      });

      return {
        ok: false,
        runId: input.runId,
        target,
        mode,
        decision: "deny",
        status: "failed",
        policy: {
          reasons: [message],
          warnings: [],
        },
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

  private evaluatePolicy(
    run: RunRecord,
    target: ExecutionTarget,
    mode: ExecutionMode,
  ): ExecutionPolicyResult {
    return this.executionPolicy.evaluate({
      run,
      target,
      mode,
    });
  }

  private handleDeny(
    run: RunRecord,
    target: ExecutionTarget,
    mode: ExecutionMode,
    policy: ExecutionPolicyResult,
  ): ExecutionCoordinatorResult {
    return {
      ok: false,
      runId: run.runId,
      clientId: run.clientId,
      target,
      mode,
      decision: "deny",
      status: "denied",
      policy: {
        reasons: policy.reasons,
        warnings: policy.warnings,
      },
      filesWritten: [],
      warnings: policy.warnings,
      errors: policy.reasons,
    };
  }

  private handleSkip(
    run: RunRecord,
    target: ExecutionTarget,
    mode: ExecutionMode,
    policy: ExecutionPolicyResult,
  ): ExecutionCoordinatorResult {
    return {
      ok: true,
      runId: run.runId,
      clientId: run.clientId,
      target,
      mode,
      decision: "skip",
      status: "skipped",
      policy: {
        reasons: policy.reasons,
        warnings: policy.warnings,
      },
      ...(run.publishedPath ? { publishedPath: run.publishedPath } : {}),
      filesWritten: run.publishedFiles ?? [],
      warnings: [...policy.warnings, ...policy.reasons],
      errors: [],
    };
  }

  private handleAllow(
    run: RunRecord,
    policy: ExecutionPolicyResult,
    resumerResult: ExecutionResumerResult,
  ): ExecutionCoordinatorResult {
    const baseResult = {
      ok: resumerResult.ok,
      runId: resumerResult.runId,
      clientId: run.clientId,
      target: resumerResult.target,
      mode: resumerResult.mode,
      decision: "allow" as const,
      status: resumerResult.status === "executed" ? "executed" as const : "failed" as const,
      policy: {
        reasons: policy.reasons,
        warnings: policy.warnings,
      },
      filesWritten: resumerResult.filesWritten,
      warnings: [...policy.warnings, ...resumerResult.warnings],
      errors: resumerResult.errors,
    };

    return resumerResult.publishedPath === undefined
      ? baseResult
      : {
          ...baseResult,
          publishedPath: resumerResult.publishedPath,
        };
  }
}

const toExecutionResumeSource = (source: string | undefined): ExecutionResumeSource | undefined => {
  switch (source) {
    case "approval_resolver":
    case "execution_webhook":
    case "system":
      return source;
    default:
      return undefined;
  }
};
