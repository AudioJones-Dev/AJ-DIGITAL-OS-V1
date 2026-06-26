import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface SmokeCommand {
  name: string;
  args: string[];
  expectedOutput: string;
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");
const cliPath = resolve(repoRoot, "dist", "cli.js");
const runtimeDir = mkdtempSync(resolve(tmpdir(), "aj-digital-os-cli-smoke-"));

const commands: SmokeCommand[] = [
  {
    name: "help",
    args: ["help", "--json"],
    expectedOutput: "\"commands\"",
  },
  {
    name: "dashboard",
    args: ["dashboard", "--json"],
    expectedOutput: "\"totalRuns\"",
  },
  {
    name: "list-pending-approvals",
    args: ["list-pending-approvals", "--json"],
    expectedOutput: "\"totalPending\"",
  },
  {
    name: "list-approved-runs",
    args: ["list-approved-runs", "--json"],
    expectedOutput: "\"totalApproved\"",
  },
  {
    name: "run-summary",
    args: ["run-summary", "--runId", "cli-smoke-missing-run", "--json"],
    expectedOutput: "\"runId\"",
  },
];

try {
  for (const command of commands) {
    const result = spawnSync(process.execPath, [cliPath, ...command.args], {
      cwd: repoRoot,
      encoding: "utf-8",
      env: {
        ...process.env,
        AJ_RUNTIME_DIR: runtimeDir,
      },
    });

    if (result.status !== 0) {
      throw new Error(
        `${command.name} exited ${result.status ?? "unknown"}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
      );
    }

    if (!result.stdout.includes(command.expectedOutput)) {
      throw new Error(
        `${command.name} output did not include ${command.expectedOutput}\nSTDOUT:\n${result.stdout}\nSTDERR:\n${result.stderr}`,
      );
    }

    console.log(`[smoke] ${command.name} ok`);
  }

  console.log(`[smoke] ${commands.length} CLI commands passed`);
} finally {
  rmSync(runtimeDir, { recursive: true, force: true });
}
