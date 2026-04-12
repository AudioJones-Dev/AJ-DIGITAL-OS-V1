export type WorkflowMode = "agent" | "direct";

export type WorkflowStep =
  | { type: "goto"; url: string }
  | { type: "extract"; fields: string[]; selector?: string };

export interface WorkflowJobDefinition {
  name: string;
  mode: WorkflowMode;
  startUrl: string;
  configUrl: string;
  allowedDomains: string[];
  targetFields: string[];
  /** Optional ordered step sequence for multi-page workflows (direct mode). */
  steps?: WorkflowStep[] | undefined;
  sessionFile: string;
  outputPrefix: string;
  maxSteps: number;
  maxRetries: number;
  authSelector: string;
}

export interface WorkflowResult {
  ok: boolean;
  workflow: string;
  stepCount: number;
  extractedFields: Record<string, string>;
  filesWritten: string[];
  errors: string[];
  durationMs: number;
}
