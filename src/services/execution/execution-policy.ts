import type { RunRecord } from "../../types/run.types.js";

export type ExecutionTarget = "local";
export type ExecutionMode = "manual" | "auto";
export type ExecutionPolicyDecision = "allow" | "skip" | "deny";

export interface ExecutionPolicyInput {
  run: RunRecord;
  target?: ExecutionTarget;
  mode?: ExecutionMode;
}

export interface ExecutionPolicyResult {
  allowed: boolean;
  decision: ExecutionPolicyDecision;
  target: string;
  mode: string;
  reasons: string[];
  warnings: string[];
  retryEligible: boolean;
  autoExecutionAllowed: boolean;
}

/**
 * Pure policy evaluator for post-approval execution decisions.
 */
export class ExecutionPolicy {
  /**
   * Evaluates whether a run may execute for the requested target and mode.
   */
  evaluate(input: ExecutionPolicyInput): ExecutionPolicyResult {
    const target = input.target ?? "local";
    const mode = input.mode ?? "manual";
    const retryEligible = this.isRetryEligible(input.run);

    if (!this.isSupportedTarget(target)) {
      return this.buildDenyResult(target, mode, retryEligible, [
        `Execution target \"${target}\" is not supported.`,
      ]);
    }

    if (!this.isAllowedWorkflow(input.run)) {
      return this.buildDenyResult(target, mode, retryEligible, [
        `Workflow \"${input.run.workflowId}\" is not allowed for execution policy.`,
      ]);
    }

    const autoExecutionAllowed = this.isAutoExecutionAllowed(input.run, target);
    if (mode === "auto" && !autoExecutionAllowed) {
      return this.buildDenyResult(target, mode, retryEligible, [
        `Auto execution is not allowed for run \"${input.run.runId}\" on target \"${target}\".`,
      ]);
    }

    return this.evaluateRunStatus(input.run, target, mode, retryEligible, autoExecutionAllowed);
  }

  private isSupportedTarget(target: string): target is ExecutionTarget {
    return target === "local";
  }

  private isAllowedWorkflow(run: RunRecord): boolean {
    return this.getWorkflowCategory(run) !== undefined;
  }

  private isAutoExecutionAllowed(run: RunRecord, target: ExecutionTarget): boolean {
    const workflowCategory = this.getWorkflowCategory(run);
    if (!workflowCategory) {
      return false;
    }

    return run.status === "approved" && target === "local";
  }

  private isRetryEligible(run: RunRecord): boolean {
    switch (run.status) {
      case "approved":
        return true;
      case "executed":
      case "rejected":
      case "revision_requested":
        return false;
      default:
        return false;
    }
  }

  private evaluateRunStatus(
    run: RunRecord,
    target: ExecutionTarget,
    mode: ExecutionMode,
    retryEligible: boolean,
    autoExecutionAllowed: boolean,
  ): ExecutionPolicyResult {
    switch (run.status) {
      case "approved":
        return this.buildAllowResult(target, mode, retryEligible, autoExecutionAllowed, [
          "Run is approved and eligible for execution.",
        ]);
      case "executed":
        return this.buildSkipResult(target, mode, retryEligible, autoExecutionAllowed, [
          "Run has already been executed.",
        ]);
      case "rejected":
        return this.buildSkipResult(target, mode, retryEligible, autoExecutionAllowed, [
          "Run was rejected and should not execute.",
        ]);
      case "revision_requested":
        return this.buildSkipResult(target, mode, retryEligible, autoExecutionAllowed, [
          "Run requires revision before execution.",
        ]);
      case "pending_approval":
        return this.buildDenyResult(target, mode, retryEligible, [
          "Run is still pending approval.",
        ]);
      case "queued":
        return this.buildDenyResult(target, mode, retryEligible, [
          "Run is still queued and cannot execute yet.",
        ]);
      case "context_loaded":
        return this.buildDenyResult(target, mode, retryEligible, [
          "Run is still assembling context and cannot execute yet.",
        ]);
      case "in_progress":
        return this.buildDenyResult(target, mode, retryEligible, [
          "Run is still in progress and cannot execute yet.",
        ]);
      case "draft_complete":
        return this.buildDenyResult(target, mode, retryEligible, [
          "Run draft is complete but has not passed all execution gates.",
        ]);
      case "validation_passed":
        return this.buildDenyResult(target, mode, retryEligible, [
          "Run passed validation but has not been approved yet.",
        ]);
      case "validation_failed":
        return this.buildDenyResult(target, mode, retryEligible, [
          "Run failed validation and cannot execute.",
        ]);
      case "logged":
        return this.buildDenyResult(target, mode, retryEligible, [
          "Run is already post-execution and logged.",
        ]);
      case "closed":
        return this.buildDenyResult(target, mode, retryEligible, [
          "Run is closed and cannot execute.",
        ]);
    }
  }

  private getWorkflowCategory(run: RunRecord): "blog_authority" | "transcript_to_content" | undefined {
    if (
      run.workflowId === "blog-authority" ||
      run.taskType === "blog_generation" ||
      run.taskType === "authority_blog"
    ) {
      return "blog_authority";
    }

    if (
      run.workflowId === "workflow.transcript_to_content.v1" ||
      run.taskType === "transcript_to_content"
    ) {
      return "transcript_to_content";
    }

    return undefined;
  }

  private buildAllowResult(
    target: ExecutionTarget,
    mode: ExecutionMode,
    retryEligible: boolean,
    autoExecutionAllowed: boolean,
    reasons: string[],
  ): ExecutionPolicyResult {
    return {
      allowed: true,
      decision: "allow",
      target,
      mode,
      reasons,
      warnings: [],
      retryEligible,
      autoExecutionAllowed,
    };
  }

  private buildSkipResult(
    target: ExecutionTarget,
    mode: ExecutionMode,
    retryEligible: boolean,
    autoExecutionAllowed: boolean,
    reasons: string[],
  ): ExecutionPolicyResult {
    return {
      allowed: false,
      decision: "skip",
      target,
      mode,
      reasons,
      warnings: [],
      retryEligible,
      autoExecutionAllowed,
    };
  }

  private buildDenyResult(
    target: string,
    mode: string,
    retryEligible: boolean,
    reasons: string[],
  ): ExecutionPolicyResult {
    return {
      allowed: false,
      decision: "deny",
      target,
      mode,
      reasons,
      warnings: [],
      retryEligible,
      autoExecutionAllowed: false,
    };
  }
}
