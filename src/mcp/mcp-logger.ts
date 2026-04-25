/**
 * MCP Logger — structured execution log for all MCP and BEL tool calls.
 *
 * Keeps an in-memory ring buffer (last 500 entries) and emits
 * structured JSON to stdout for ingestion by any log aggregator.
 * Also appends each entry as a JSON line to logs/bel-execution.log.
 */

import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const LOGS_DIR = join(process.cwd(), "logs");
const LOG_FILE = join(LOGS_DIR, "bel-execution.log");

// Ensure logs directory exists on module load
try {
  if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true });
  }
} catch {
  // Silent
}

export interface McpExecutionLogEntry {
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Unique task ID */
  taskId: string;
  /** Agent that initiated the task */
  agentId: string;
  /** Raw task description */
  task: string;
  /** Tool that handled the request */
  tool: string;
  /** Whether the task was approved by policy */
  approved: boolean;
  /** Whether the result was successful */
  ok: boolean;
  /** Abbreviated output (max 500 chars to keep logs compact) */
  output?: string | undefined;
  /** Error message if not ok */
  error?: string | undefined;
  /** Execution latency in milliseconds */
  latencyMs: number;
}

const MAX_BUFFER = 500;
const logBuffer: McpExecutionLogEntry[] = [];

export function logExecution(entry: McpExecutionLogEntry): void {
  const safe: McpExecutionLogEntry = {
    ...entry,
    ...(entry.output !== undefined ? { output: String(entry.output).slice(0, 500) } : {}),
  };

  logBuffer.push(safe);
  if (logBuffer.length > MAX_BUFFER) {
    logBuffer.shift();
  }

  console.log("[MCP-LOG]", JSON.stringify(safe));

  try {
    appendFileSync(LOG_FILE, JSON.stringify(safe) + "\n", "utf-8");
  } catch {
    // Silent — don't break execution if file write fails
  }
}

export function getRecentLogs(limit = 50): McpExecutionLogEntry[] {
  return logBuffer.slice(-Math.min(limit, MAX_BUFFER));
}

export function clearLogs(): void {
  logBuffer.length = 0;
}
