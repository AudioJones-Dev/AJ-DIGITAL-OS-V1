/**
 * MCP Bridge — routes an approved MCP task to the correct tool implementation.
 *
 * Acts as a single dispatch surface so the execution adapter and the BEL
 * controller do not need to know about individual tool modules.
 */

import type { McpTaskType } from "./mcp-execution-adapter.js";
import { runFilesystemTool } from "./mcp-tools/filesystem-tool.js";
import { runBrowserTool, type BrowserParams } from "./mcp-tools/browser-tool.js";
import { runShellTool } from "./mcp-tools/shell-tool.js";

export interface BridgeRequest {
  taskType: McpTaskType | "browser_task";
  task: string;
  targetPath?: string | undefined;
  command?: string | undefined;
  browserParams?: BrowserParams | undefined;
}

export interface BridgeResult {
  ok: boolean;
  output?: unknown | undefined;
  error?: string | undefined;
}

export async function dispatchToTool(req: BridgeRequest): Promise<BridgeResult> {
  if (req.taskType === "list_directory") {
    return runFilesystemTool({ op: "list_files", dirPath: req.targetPath ?? "c:\\dev\\aj-digital-os" });
  }

  if (req.taskType === "read_file") {
    if (!req.targetPath) return { ok: false, error: "targetPath is required for read_file." };
    return runFilesystemTool({ op: "read_file", filePath: req.targetPath });
  }

  if (req.taskType === "run_safe_command") {
    if (!req.command) return { ok: false, error: "command is required for run_safe_command." };
    const r = await runShellTool({ command: req.command });
    return { ok: r.ok, ...(r.output !== undefined ? { output: r.output } : {}), ...(r.error !== undefined ? { error: r.error } : {}) };
  }

  if (req.taskType === "browser_task") {
    if (!req.browserParams) return { ok: false, error: "browserParams are required for browser_task." };
    return runBrowserTool(req.browserParams);
  }

  // write_file is intentionally not wired — read-only policy for now.
  if (req.taskType === "write_file") {
    return { ok: false, error: "write_file is not permitted via MCP bridge." };
  }

  return { ok: false, error: `Unhandled taskType: ${req.taskType as string}` };
}
