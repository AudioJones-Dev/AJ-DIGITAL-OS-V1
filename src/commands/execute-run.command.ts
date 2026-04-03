import {
  ExecutionCoordinator,
  type ExecutionCoordinatorResult,
} from "../services/execution/execution-coordinator.js";
import type { ExecutionMode, ExecutionTarget } from "../services/execution/execution-policy.js";

export interface ExecuteRunCommandInput {
  runId: string;
  target?: ExecutionTarget;
  mode?: ExecutionMode;
  source?: string;
  actor?: string;
  json?: boolean;
}

export interface ExecuteRunCommandResult {
  ok: boolean;
  command: "execute-run";
  runId: string;
  target: string;
  mode: string;
  rendered: boolean;
  result?: ExecutionCoordinatorResult;
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing command for executing a single run through the coordinator.
 */
export class ExecuteRunCommand {
  constructor(private readonly executionCoordinator = new ExecutionCoordinator()) {}

  /**
   * Validates input, triggers execution, and renders the result.
   */
  async run(input: ExecuteRunCommandInput): Promise<ExecuteRunCommandResult> {
    const runId = input.runId.trim();
    const target = input.target ?? "local";
    const mode = input.mode ?? "manual";

    if (runId.length === 0) {
      const error = "A non-empty runId is required.";
      if (input.json === true) {
        console.log(JSON.stringify({ ok: false, runId: input.runId, target, mode, errors: [error] }, null, 2));
      } else {
        console.log("AJ DIGITAL OS EXECUTE RUN");
        console.log("=========================");
        console.log(error);
      }

      return {
        ok: false,
        command: "execute-run",
        runId: input.runId,
        target,
        mode,
        rendered: true,
        warnings: [],
        errors: [error],
      };
    }

    const result = await this.executionCoordinator.execute({
      runId,
      target,
      mode,
      ...(input.source ? { source: input.source } : {}),
      ...(input.actor ? { actor: input.actor } : {}),
    });

    if (input.json === true) {
      this.printJson(result);
    } else {
      this.renderHumanResult(result);
    }

    return {
      ok: result.ok,
      command: "execute-run",
      runId,
      target,
      mode,
      rendered: true,
      result,
      warnings: result.warnings,
      errors: result.errors,
    };
  }

  private renderHumanResult(result: ExecutionCoordinatorResult): void {
    console.log("AJ DIGITAL OS EXECUTE RUN");
    console.log("=========================");
    console.log(`Run ID: ${result.runId}`);
    console.log(`Target: ${result.target}`);
    console.log(`Mode: ${result.mode}`);
    console.log(`Decision: ${result.decision}`);
    console.log(`Status: ${result.status}`);

    this.renderPolicySection(result);
    this.renderOutputSection(result);
    this.renderWarnings(result.warnings);
    this.renderErrors(result.errors);

    if (result.ok) {
      console.log("");
      console.log("Run executed successfully.");
      console.log("Inspect:");
      console.log(`  aj-digital-os run-summary --runId ${result.runId}`);
    }
  }

  private renderPolicySection(result: ExecutionCoordinatorResult): void {
    console.log("");
    console.log("Policy");
    console.log("- Reasons:");

    if (result.policy.reasons.length === 0) {
      console.log("  - None");
    } else {
      for (const reason of result.policy.reasons) {
        console.log(`  - ${reason}`);
      }
    }

    console.log("- Warnings:");
    if (result.policy.warnings.length === 0) {
      console.log("  - None");
      return;
    }

    for (const warning of result.policy.warnings) {
      console.log(`  - ${warning}`);
    }
  }

  private renderOutputSection(result: ExecutionCoordinatorResult): void {
    console.log("");
    console.log("Output");
    console.log(`- Published Path: ${result.publishedPath ?? "-"}`);
    console.log("- Files:");

    if (result.filesWritten.length === 0) {
      console.log("  - None");
      return;
    }

    for (const file of result.filesWritten) {
      console.log(`  - ${file}`);
    }
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

  private printJson(result: ExecutionCoordinatorResult): void {
    console.log(JSON.stringify(result, null, 2));
  }
}
