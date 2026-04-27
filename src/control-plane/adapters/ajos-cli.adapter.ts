import { spawn } from "node:child_process";

import type { CliExecutionResult } from "../types/control-plane.types.js";

interface CliCommandDefinition {
  commandId: "ops-dashboard" | "ops-pending" | "ops-track";
  baseArgs: string[];
  requiresRunId: boolean;
}

const CLI_COMMANDS: Record<CliExecutionResult["commandId"], CliCommandDefinition> = {
  "ops-dashboard": {
    commandId: "ops-dashboard",
    baseArgs: ["dashboard"],
    requiresRunId: false,
  },
  "ops-pending": {
    commandId: "ops-pending",
    baseArgs: ["list-pending-approvals"],
    requiresRunId: false,
  },
  "ops-track": {
    commandId: "ops-track",
    baseArgs: ["track-run"],
    requiresRunId: true,
  },
};

export class AjOsCliAdapter {
  async execute(commandId: CliExecutionResult["commandId"], runId?: string): Promise<CliExecutionResult> {
    const definition = CLI_COMMANDS[commandId];
    if (!definition) {
      throw new Error(`Command is not allowed: ${commandId}`);
    }

    if (definition.requiresRunId && (!runId || runId.trim().length === 0)) {
      throw new Error("runId is required for ops-track.");
    }

    const jsonArgs = this.buildArgs(definition, runId, true);
    const startedAt = Date.now();
    const jsonAttempt = await this.runProcess(commandId, jsonArgs, true, startedAt);

    if (jsonAttempt.ok) {
      return jsonAttempt;
    }

    const fallbackArgs = this.buildArgs(definition, runId, false);
    return this.runProcess(commandId, fallbackArgs, false, startedAt);
  }

  private buildArgs(definition: CliCommandDefinition, runId: string | undefined, withJson: boolean): string[] {
    const args = [...definition.baseArgs];

    if (definition.requiresRunId) {
      args.push("--runId", runId!.trim());
    }

    if (withJson) {
      args.push("--json");
    }

    return args;
  }

  private runProcess(
    commandId: CliExecutionResult["commandId"],
    cliArgs: string[],
    usedJsonMode: boolean,
    startedAt: number,
  ): Promise<CliExecutionResult> {
    return new Promise((resolve) => {
      const child = spawn("npm", ["run", "cli", "--", ...cliArgs], {
        cwd: process.cwd(),
        env: process.env,
        shell: false,
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (chunk: Buffer | string) => {
        stdout += chunk.toString();
      });

      child.stderr.on("data", (chunk: Buffer | string) => {
        stderr += chunk.toString();
      });

      child.on("close", (code) => {
        const durationMs = Date.now() - startedAt;
        resolve({
          ok: code === 0,
          commandId,
          stdout: stdout.trim(),
          stderr: stderr.trim(),
          exitCode: typeof code === "number" ? code : 1,
          durationMs,
          usedJsonMode,
        });
      });

      child.on("error", (error) => {
        const durationMs = Date.now() - startedAt;
        resolve({
          ok: false,
          commandId,
          stdout: stdout.trim(),
          stderr: `${stderr}\n${error.message}`.trim(),
          exitCode: 1,
          durationMs,
          usedJsonMode,
        });
      });
    });
  }
}
