import path from "node:path";
import { runWorkflow } from "../browser-agent/run-workflow.js";
import { createLoginExportConfigJob } from "../browser-agent/login-export-config.js";
import { createSanityConfigCaptureJob } from "../browser-agent/workflows/sanity-config-capture.js";
import {
  runLoginSessionCapture,
  type LoginSessionCaptureResult,
} from "../browser-agent/workflows/login-session-capture.js";
import type { WorkflowJobDefinition } from "../browser-agent/workflow-types.js";
import { runLocalAgentTask, type LocalAgentResult } from "../local-agent/local-agent.js";

export interface BrowserAgentCommandInput {
  workflow?: string | undefined;
  mode?: string | undefined;
  startUrl?: string | undefined;
  loginUrl?: string | undefined;
  configUrl?: string | undefined;
  allowedDomains?: string | undefined;
  targetFields?: string | undefined;
  sessionFile?: string | undefined;
  outputPrefix?: string | undefined;
  maxSteps?: string | undefined;
  maxRetries?: string | undefined;
  authSelector?: string | undefined;
  loginTimeout?: string | undefined;
  validateOnly?: boolean | undefined;
  postAgent?: boolean | undefined;
  postAgentTarget?: string | undefined;
  json?: boolean;
}

export interface BrowserAgentCommandResult {
  ok: boolean;
  command: "browser-agent";
  workflow: string;
  stepCount: number;
  extractedFields: Record<string, string>;
  filesWritten: string[];
  errors: string[];
  durationMs: number;
  // login-session-capture specific
  sessionFile?: string | undefined;
  authenticated?: boolean | undefined;
  method?: string | undefined;
  // local-agent post-processing
  localAgentResult?: LocalAgentResult | undefined;
}

export class BrowserAgentCommand {
  async run(input: BrowserAgentCommandInput = {}): Promise<BrowserAgentCommandResult> {
    // Route to login-session-capture workflow
    if (input.workflow === "login-session-capture") {
      return this.runLoginCapture(input);
    }

    return this.runExtract(input);
  }

  private async runLoginCapture(input: BrowserAgentCommandInput): Promise<BrowserAgentCommandResult> {
    try {
      const loginUrl = input.loginUrl || input.startUrl;
      if (!loginUrl) {
        throw new Error("--login-url (or --start-url) is required for login-session-capture.");
      }
      if (!input.allowedDomains) {
        throw new Error("--allowed-domains is required (comma-separated).");
      }

      const result = await runLoginSessionCapture({
        loginUrl,
        allowedDomains: input.allowedDomains.split(",").map((d) => d.trim()),
        sessionFile: input.sessionFile ?? "",
        authSelector: input.authSelector,
        loginTimeoutSeconds: input.loginTimeout ? parseInt(input.loginTimeout, 10) : undefined,
        validateOnly: input.validateOnly,
      });

      const output: BrowserAgentCommandResult = {
        ok: result.ok,
        command: "browser-agent",
        workflow: result.workflow,
        stepCount: 0,
        extractedFields: {},
        filesWritten: result.sessionFile && result.authenticated ? [result.sessionFile] : [],
        errors: result.errors,
        durationMs: result.durationMs,
        sessionFile: result.sessionFile,
        authenticated: result.authenticated,
        method: result.method,
      };

      if (input.json === true) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        this.renderLoginHuman(result);
      }

      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      const output: BrowserAgentCommandResult = {
        ok: false,
        command: "browser-agent",
        workflow: "login-session-capture",
        stepCount: 0,
        extractedFields: {},
        filesWritten: [],
        errors: [message],
        durationMs: 0,
      };

      if (input.json === true) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log("BROWSER AGENT — LOGIN SESSION CAPTURE");
        console.log("=====================================");
        console.log(`Status: fail`);
        console.log(`Error: ${message}`);
      }

      return output;
    }
  }

  private async runExtract(input: BrowserAgentCommandInput): Promise<BrowserAgentCommandResult> {
    try {
      this.validateRequired(input);

      const overrides: Partial<WorkflowJobDefinition> = {
        allowedDomains: input.allowedDomains ? input.allowedDomains.split(",").map((d) => d.trim()) : [],
        targetFields: input.targetFields ? input.targetFields.split(",").map((f) => f.trim()) : [],
      };
      if (input.mode === "direct" || input.mode === "agent") overrides.mode = input.mode;
      if (input.startUrl !== undefined) overrides.startUrl = input.startUrl;
      if (input.configUrl !== undefined) overrides.configUrl = input.configUrl;
      if (input.sessionFile !== undefined) overrides.sessionFile = input.sessionFile;
      if (input.outputPrefix !== undefined) overrides.outputPrefix = input.outputPrefix;
      if (input.maxSteps !== undefined) overrides.maxSteps = parseInt(input.maxSteps, 10);
      if (input.maxRetries !== undefined) overrides.maxRetries = parseInt(input.maxRetries, 10);
      if (input.authSelector !== undefined) overrides.authSelector = input.authSelector;

      const job = input.workflow === "sanity-config-capture"
        ? createSanityConfigCaptureJob(overrides)
        : createLoginExportConfigJob(overrides);

      const result = await runWorkflow(job);

      const output: BrowserAgentCommandResult = {
        ok: result.ok,
        command: "browser-agent",
        workflow: result.workflow,
        stepCount: result.stepCount,
        extractedFields: result.extractedFields,
        filesWritten: result.filesWritten,
        errors: result.errors,
        durationMs: result.durationMs,
      };

      // Post-extraction: optionally route through local agent for validated config
      if (input.postAgent && result.ok && Object.keys(result.extractedFields).length > 0) {
        const agentResult = await this.runPostAgent(result.extractedFields, job, input.postAgentTarget);
        output.localAgentResult = agentResult;
        if (agentResult.filesWritten.length > 0) {
          output.filesWritten.push(...agentResult.filesWritten);
        }
      }

      if (input.json === true) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        this.renderHuman(output);
      }

      return output;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown browser agent error.";
      const output: BrowserAgentCommandResult = {
        ok: false,
        command: "browser-agent",
        workflow: input.workflow ?? "login-export-config",
        stepCount: 0,
        extractedFields: {},
        filesWritten: [],
        errors: [message],
        durationMs: 0,
      };

      if (input.json === true) {
        console.log(JSON.stringify(output, null, 2));
      } else {
        console.log("BROWSER AGENT");
        console.log("=============");
        console.log(`Status: fail`);
        console.log(`Error: ${message}`);
      }

      return output;
    }
  }

  private validateRequired(input: BrowserAgentCommandInput): void {
    if (!input.startUrl) {
      throw new Error("--start-url is required.");
    }
    if (!input.configUrl) {
      throw new Error("--config-url is required.");
    }
    if (!input.allowedDomains) {
      throw new Error("--allowed-domains is required (comma-separated).");
    }
    if (!input.targetFields) {
      throw new Error("--target-fields is required (comma-separated).");
    }
  }

  private async runPostAgent(
    extractedFields: Record<string, string>,
    job: WorkflowJobDefinition,
    targetOverride?: string | undefined,
  ): Promise<LocalAgentResult> {
    const outputBase = path.resolve("output", "configs");
    const target = targetOverride ?? path.join(outputBase, `${job.outputPrefix}.env`);

    return runLocalAgentTask({
      task: `Generate validated config from ${job.name} extraction`,
      outputTargets: [target],
      context: { extractedFields },
    });
  }

  private renderHuman(result: BrowserAgentCommandResult): void {
    console.log("BROWSER AGENT");
    console.log("=============");
    console.log(`Status: ${result.ok ? "pass" : "fail"}`);
    console.log(`Workflow: ${result.workflow}`);
    console.log(`Steps: ${result.stepCount}`);
    console.log(`Duration: ${(result.durationMs / 1000).toFixed(1)}s`);
    console.log(`Fields Extracted: ${Object.keys(result.extractedFields).length}`);

    if (Object.keys(result.extractedFields).length > 0) {
      console.log("");
      console.log("Extracted Fields");
      for (const [key, value] of Object.entries(result.extractedFields)) {
        console.log(`  ${key}: ${value.slice(0, 80)}`);
      }
    }

    if (result.filesWritten.length > 0) {
      console.log("");
      console.log("Files Written");
      for (const file of result.filesWritten) {
        console.log(`  ${file}`);
      }
    }

    if (result.errors.length > 0) {
      console.log("");
      console.log("Errors");
      for (const err of result.errors) {
        console.log(`  - ${err}`);
      }
    }
  }

  private renderLoginHuman(result: LoginSessionCaptureResult): void {
    console.log("BROWSER AGENT — LOGIN SESSION CAPTURE");
    console.log("=====================================");
    console.log(`Status: ${result.ok ? "pass" : "fail"}`);
    console.log(`Authenticated: ${result.authenticated}`);
    console.log(`Method: ${result.method}`);
    console.log(`Session File: ${result.sessionFile}`);
    console.log(`Duration: ${(result.durationMs / 1000).toFixed(1)}s`);

    if (result.errors.length > 0) {
      console.log("");
      console.log("Errors");
      for (const err of result.errors) {
        console.log(`  - ${err}`);
      }
    }
  }
}
