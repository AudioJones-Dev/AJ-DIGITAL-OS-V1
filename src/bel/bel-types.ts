/**
 * BEL (Browser Execution Layer) — shared types.
 */

export type BelToolName = "filesystem" | "browser" | "shell";

export type BelTaskStatus = "pending" | "running" | "completed" | "failed" | "blocked";

export interface BelTaskRequest {
  /** Unique task ID (caller-supplied or generated). */
  taskId: string;
  /** Agent identifier that initiated the task. */
  agentId: string;
  /** Natural-language task description forwarded from the control plane. */
  task: string;
  /** Tool to invoke directly (optional — BEL can auto-route). */
  tool?: BelToolName | undefined;
  /** Typed tool parameters. */
  params?: Record<string, unknown> | undefined;
  /** Named session to attach to (optional). */
  sessionName?: string | undefined;
  /** If true, validate and plan but do not execute. */
  dryRun?: boolean | undefined;
}

export interface BelTaskResult {
  taskId: string;
  agentId: string;
  tool: BelToolName | null;
  status: BelTaskStatus;
  output?: unknown | undefined;
  error?: string | undefined;
  dryRun: boolean;
  latencyMs: number;
  timestamp: string;
}

export interface BelSession {
  sessionId: string;
  agentId: string;
  sessionName: string;
  createdAt: string;
  lastUsedAt: string;
  /** Opaque state blob held by the browser tool (page handle, etc.). */
  browserState?: unknown;
}

export interface BelExecutionLog {
  taskId: string;
  agentId: string;
  task: string;
  tool: BelToolName | null;
  status: BelTaskStatus;
  output?: unknown;
  error?: string;
  timestamp: string;
  latencyMs: number;
}
