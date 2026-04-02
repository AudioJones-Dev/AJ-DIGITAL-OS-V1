import {
  ExecutionResumer,
  type ExecutionResumerInput,
  type ExecutionResumerResult,
  type ExecutionResumeSource,
} from "../services/execution/execution-resumer.js";
import type { ExecutionTarget } from "../services/execution/execution-policy.js";

export type ResumeRunMode = "manual" | "auto";

export interface ResumeRunCommandInput {
  runId: string;
  target?: ExecutionTarget;
  mode?: ResumeRunMode;
  source?: string;
  actor?: string;
  json?: boolean;
}

export interface ResumeRunCommandResult {
  ok: boolean;
  command: "resume-run";
  runId: string;
  target: string;
  mode: ResumeRunMode;
  rendered: boolean;
  result?: ExecutionResumerResult;
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing command for resuming a single run through the execution resumer.
 */
export class ResumeRunCommand {
  constructor(private readonly executionResumer = new ExecutionResumer()) {}

  /**
   * Validates input, triggers resume, and renders the result.
   */
  async run(input: ResumeRunCommandInput): Promise<ResumeRunCommandResult> {
    const runId = input.runId.trim();
    const target = input.target ?? "local";
    const mode = input.mode ?? "manual";

    if (runId.length === 0) {
      const error = "A non-empty runId is required.";
      if (input.json === true) {
        console.log(JSON.stringify({ ok: false, runId: input.runId, target, mode, errors: [error] }, null, 2));
      } else {
        console.log("AJ DIGITAL OS RESUME RUN");
        console.log("========================");
        console.log(error);
      }

      return {
        ok: false,
        command: "resume-run",
        runId: input.runId,
        target,
        mode,
        rendered: true,
        warnings: [],
        errors: [error],
      };
    }

    try {
      const resumerInput: ExecutionResumerInput = {
        runId,
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

      const result = await this.executionResumer.resume(resumerInput);

      if (input.json === true) {
        this.printJson(result);
      } else {
        this.renderHumanResult(result, runId, target, mode);
      }

      return {
        ok: result.ok,
        command: "resume-run",
        runId,
        target,
        mode,
        rendered: true,
        result,
        warnings: [],
        errors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error.";
      if (input.json === true) {
        console.log(JSON.stringify({ ok: false, runId, target, mode, errors: [message] }, null, 2));
      } else {
        console.log("AJ DIGITAL OS RESUME RUN");
        console.log("========================");
        console.log(`Run ID: ${runId}`);
        console.log(message);
      }

      return {
        ok: false,
        command: "resume-run",
        runId,
        target,
        mode,
        rendered: true,
        warnings: [],
        errors: [message],
      };
    }
  }

  private renderHumanResult(
    result: ExecutionResumerResult,
    runId: string,
    target: string,
    mode: ResumeRunMode,
  ): void {
    console.log("AJ DIGITAL OS RESUME RUN");
    console.log("========================");
    console.log(`Run ID: ${runId}`);
    console.log(`Target: ${target}`);
    console.log(`Mode: ${mode}`);
    console.log(`Resumed: ${result.resumed}`);
    console.log(`Status: ${result.status}`);

    console.log("");
    console.log("Published Path");
    console.log(`- ${result.publishedPath ?? "-"}`);

    this.renderFilesWritten(result.filesWritten);
    this.renderWarnings(result.warnings);
    this.renderErrors(result.errors);
  }

  private renderFilesWritten(filesWritten: string[]): void {
    console.log("");
    console.log("Files Written");

    if (filesWritten.length === 0) {
      console.log("- None");
      return;
    }

    for (const file of filesWritten) {
      console.log(`- ${file}`);
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

  private printJson(result: ExecutionResumerResult): void {
    console.log(JSON.stringify(result, null, 2));
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
