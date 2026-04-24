/**
 * Shell Tool — limited allow-listed command execution.
 *
 * Only commands present in ALLOWED_COMMANDS may be executed.
 * Any attempt to pass additional args or pipe characters is rejected.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const TAG = "[SHELL-TOOL]";

export interface ShellParams {
  command: string;
}

export interface ShellResult {
  ok: boolean;
  output?: string | undefined;
  error?: string | undefined;
  exitCode?: number | undefined;
}

// Strictly allowed commands — exact match required.
const ALLOWED_COMMANDS: ReadonlySet<string> = new Set([
  "git status",
  "git diff",
  "npm run build",
  "npm test",
  "docker compose ps",
]);

const BLOCKED_TOKENS = [
  ";", "&&", "||", "|", "`", "$(",
  "rm ", "del ", "rmdir", "format", "shutdown",
  "setx", "netsh", ">", "<", ">>",
];

function isAllowed(command: string): boolean {
  const trimmed = command.trim().toLowerCase();
  return ALLOWED_COMMANDS.has(trimmed);
}

function hasBlockedToken(command: string): boolean {
  return BLOCKED_TOKENS.some((t) => command.includes(t));
}

export async function runShellTool(params: ShellParams): Promise<ShellResult> {
  const command = params.command.trim();

  if (hasBlockedToken(command)) {
    return { ok: false, error: "Command contains a blocked token." };
  }

  if (!isAllowed(command)) {
    return {
      ok: false,
      error: `Command not in allowlist. Permitted: ${[...ALLOWED_COMMANDS].join(", ")}`,
    };
  }

  const [bin, ...args] = command.split(/\s+/);

  if (!bin) {
    return { ok: false, error: "Empty command." };
  }

  console.log(`${TAG} Executing: ${command}`);

  try {
    const { stdout, stderr } = await execFileAsync(bin, args, {
      timeout: 30_000,
      cwd: "c:\\dev\\aj-digital-os",
    });
    return { ok: true, output: stdout + (stderr ? `\n[stderr] ${stderr}` : ""), exitCode: 0 };
  } catch (err: unknown) {
    const e = err as NodeJS.ErrnoException & { code?: number; stdout?: string; stderr?: string };
    return {
      ok: false,
      ...(e.stdout != null ? { output: e.stdout } : {}),
      error: e.stderr ?? e.message,
      exitCode: typeof e.code === "number" ? e.code : 1,
    };
  }
}
