import {
  ApprovalResolver,
  type ResolveApprovalResult,
} from "../services/approval/approval-resolver.js";
import type { ApprovalDecision } from "../types/run.types.js";

export interface ApproveRunCommandInput {
  runId: string;
  decision: ApprovalDecision;
  actor?: string;
  source?: "manual" | "terminal" | "system";
  json?: boolean;
}

export interface ApproveRunCommandResult {
  ok: boolean;
  command: "approve-run";
  runId: string;
  decision: ApprovalDecision;
  rendered: boolean;
  result?: ResolveApprovalResult;
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing command for resolving a single run approval decision.
 */
export class ApproveRunCommand {
  constructor(private readonly approvalResolver = new ApprovalResolver()) {}

  /**
   * Validates input, resolves approval, and renders the result.
   */
  async run(input: ApproveRunCommandInput): Promise<ApproveRunCommandResult> {
    const runId = input.runId.trim();
    const decision = input.decision;

    if (runId.length === 0) {
      const error = "A non-empty runId is required.";
      if (input.json === true) {
        console.log(JSON.stringify({ ok: false, runId: input.runId, decision, errors: [error] }, null, 2));
      } else {
        console.log("AJ DIGITAL OS APPROVE RUN");
        console.log("=========================");
        console.log(error);
      }

      return {
        ok: false,
        command: "approve-run",
        runId: input.runId,
        decision,
        rendered: true,
        warnings: [],
        errors: [error],
      };
    }

    if (!this.isApprovalDecision(decision)) {
      const error = `Invalid decision \"${String(decision)}\".`;
      if (input.json === true) {
        console.log(JSON.stringify({ ok: false, runId, decision, errors: [error] }, null, 2));
      } else {
        console.log("AJ DIGITAL OS APPROVE RUN");
        console.log("=========================");
        console.log(error);
      }

      return {
        ok: false,
        command: "approve-run",
        runId,
        decision,
        rendered: true,
        warnings: [],
        errors: [error],
      };
    }

    const result = await this.approvalResolver.resolve({
      runId,
      decision,
      ...(input.actor ? { actor: input.actor } : {}),
    });

    if (input.json === true) {
      this.printJson(result);
    } else {
      this.renderHumanResult(runId, decision, result);
    }

    return {
      ok: result.ok,
      command: "approve-run",
      runId,
      decision,
      rendered: true,
      result,
      warnings: result.warnings,
      errors: result.errors,
    };
  }

  private renderHumanResult(
    runId: string,
    decision: ApprovalDecision,
    result: ResolveApprovalResult,
  ): void {
    console.log("AJ DIGITAL OS APPROVE RUN");
    console.log("=========================");
    console.log(`Run ID: ${runId}`);
    console.log(`Decision: ${decision}`);
    console.log(`Previous Status: ${result.previousStatus}`);
    console.log(`New Status: ${result.newStatus}`);
    console.log(`Approval Status: ${result.approvalStatus}`);
    console.log(`Resume Execution: ${result.resumeExecution}`);

    this.renderWarnings(result.warnings);
    this.renderErrors(result.errors);
  }

  private renderWarnings(warnings: string[]): void {
    console.log("");
    console.log("Warnings");

    if (warnings.length === 0) {
      console.log("- None");
      return;
    }

    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  private renderErrors(errors: string[]): void {
    console.log("");
    console.log("Errors");

    if (errors.length === 0) {
      console.log("- None");
      return;
    }

    for (const error of errors) {
      console.log(`- ${error}`);
    }
  }

  private printJson(result: ResolveApprovalResult): void {
    console.log(JSON.stringify(result, null, 2));
  }

  private isApprovalDecision(value: string): value is ApprovalDecision {
    return value === "approve" || value === "reject" || value === "request_revision";
  }
}
