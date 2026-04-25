// Run statuses: Neon DB uses running/completed/failed;
// lifecycle statuses (created→…→executed) are included for forward-compatibility.
export type RunStatus =
  | "created"
  | "validated"
  | "pending_approval"
  | "approved"
  | "execution"
  | "executed"
  | "running"
  | "completed"
  | "failed"
  | "pending";

export interface Run {
  id: number;
  run_ref: string;
  mission_type: string;
  objective: string;
  status: RunStatus;
  ok: boolean | null;
  summary: string | null;
  error: string | null;
  roles_used: string[];
  escalation_count: number;
  duration_ms: number | null;
  started_at: string;
  completed_at: string | null;
}

export interface Step {
  id: number;
  run_id: number;
  step_index: number;
  role: string;
  pipeline_id: string;
  ok: boolean;
  error: string | null;
  duration_ms: number;
  retries: number;
  warnings: string[];
  created_at: string;
}

export interface Observation {
  id: number;
  run_id: number | null;
  source: string;
  healthy: boolean;
  summary: string;
  created_at: string;
}

export interface Failure {
  id: number;
  run_id: number | null;
  step_id: number | null;
  role: string;
  error: string;
  escalated: boolean;
  resolved: boolean;
  created_at: string;
}

export interface Mission {
  id: string;
  mission_type: string;
  objective: string;
  status: string;
  priority: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface BelCapabilities {
  tools: string[];
  version?: string;
  [key: string]: unknown;
}

export interface HermesStatus {
  health: string;
  missions?: Mission[];
  uptime?: number;
  version?: string;
  [key: string]: unknown;
}

export interface FullRunData {
  run: Run;
  steps: Step[];
  observations: Observation[];
  failures: Failure[];
}
