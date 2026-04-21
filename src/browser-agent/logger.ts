export type LogLevel = "info" | "warn" | "error" | "step" | "result";

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  workflow: string;
  message: string;
  data?: Record<string, unknown> | undefined;
}

export class WorkflowLogger {
  private readonly workflowName: string;
  private readonly entries: LogEntry[] = [];

  constructor(workflowName: string) {
    this.workflowName = workflowName;
  }

  info(message: string, data?: Record<string, unknown>): void {
    this.log("info", message, data);
  }

  warn(message: string, data?: Record<string, unknown>): void {
    this.log("warn", message, data);
  }

  error(message: string, data?: Record<string, unknown>): void {
    this.log("error", message, data);
  }

  step(stepNumber: number, action: string, detail?: string): void {
    const message = detail ? `Step ${stepNumber}: ${action} — ${detail}` : `Step ${stepNumber}: ${action}`;
    this.log("step", message);
  }

  result(message: string, data?: Record<string, unknown>): void {
    this.log("result", message, data);
  }

  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  private log(level: LogLevel, message: string, data?: Record<string, unknown>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      workflow: this.workflowName,
      message,
      ...(data !== undefined ? { data } : {}),
    };

    this.entries.push(entry);
    const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${this.workflowName}]`;
    console.log(`${prefix} ${message}`);
  }
}
