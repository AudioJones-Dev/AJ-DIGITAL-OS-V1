/**
 * MCP Logger — structured execution log for all MCP and BEL tool calls.
 *
 * Keeps an in-memory ring buffer (last 500 entries) and emits
 * structured JSON to stdout for ingestion by any log aggregator.
 */

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
}

export function getRecentLogs(limit = 50): McpExecutionLogEntry[] {
  return logBuffer.slice(-Math.min(limit, MAX_BUFFER));
}

export function clearLogs(): void {
  logBuffer.length = 0;
}
