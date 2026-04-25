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

// ── Control Plane ────────────────────────────────────────────────

export type RunControlState =
  | "queued"
  | "planning"
  | "running"
  | "waiting_for_approval"
  | "retrying"
  | "escalated"
  | "completed"
  | "failed"
  | "cancelled";

export type ControlAction =
  | "rerun"
  | "pause"
  | "resume"
  | "cancel"
  | "approve"
  | "reject"
  | "escalate"
  | "inspect";

export type ActionDecision = "allow" | "block" | "approval_required";
export type RiskLevel = "low" | "medium" | "high";
export type ActorType = "human" | "system" | "agent";

export const TERMINAL_STATES: RunControlState[] = ["completed", "failed", "cancelled"];
export const APPROVAL_REQUIRED_ACTIONS: ControlAction[] = ["rerun", "escalate", "cancel"];

export const ACTION_RISK: Record<ControlAction, RiskLevel> = {
  inspect: "low",
  approve: "medium",
  reject: "medium",
  pause: "medium",
  resume: "medium",
  rerun: "high",
  escalate: "high",
  cancel: "high",
};

export interface ControlRunRecord {
  runId: string;
  agentId: string;
  controlState: RunControlState;
  previousState?: RunControlState;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  cancelledBy?: string;
  metadata?: Record<string, unknown>;
}

export interface ControlAuditEvent {
  eventId: string;
  runId: string;
  agentId: string;
  action: ControlAction;
  fromState: RunControlState;
  toState: RunControlState;
  performedBy: string;
  timestamp: string;
  decision?: ActionDecision;
  risk?: RiskLevel;
  tenantId?: string;
  enforcementResult?: string;
  approvalId?: string;
  enforcementAuditId?: string;
  metadata?: Record<string, unknown>;
}

export interface ControlActionPayload {
  action: ControlAction;
  actor: string;
  actorType: ActorType;
  tenantId?: string;
  reason?: string;
}

export interface ControlActionResult {
  ok: boolean;
  success?: boolean;
  newState?: RunControlState;
  error?: string;
  requiresApproval?: boolean;
  approvalId?: string;
  blocked?: boolean;
}

export interface EnforcementSnapshot {
  state: RunControlState;
  lastAction?: ControlAction;
  decision?: ActionDecision;
  risk?: RiskLevel;
  approvalRequired: boolean;
  blockedReason?: string;
  actor?: string;
  actorType?: ActorType;
  tenantId?: string;
  hasTenantId: boolean;
  environment?: string;
  enforcementAuditId?: string;
  approvalId?: string;
  updatedAt?: string;
}

// ── Attribution ───────────────────────────────────────────────────

export type AttributionChannel =
  | "seo"
  | "aeo"
  | "social"
  | "email"
  | "blog"
  | "distribution"
  | "unknown";

export type AttributionEventType =
  | "run_created"
  | "run_completed"
  | "run_failed"
  | "content_published"
  | "content_distributed";

export interface MAPScore {
  meaningful: boolean;
  actionable: boolean;
  profitable: boolean;
  mapCompliant: boolean;
  reason?: string;
}

export interface AttributionEvent {
  eventId: string;
  eventType: AttributionEventType;
  runId: string;
  agentId: string;
  channel: AttributionChannel;
  clientId?: string;
  contentType?: string;
  contentId?: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  mapScore?: MAPScore;
}


// ── Cache Augmentation Layer (CAL v1) ──────────────────────────────
export type CacheNamespace =
  | "context-cache"
  | "plan-cache"
  | "score-cache"
  | "report-cache"
  | "response-cache";

export type CacheDecision = "hit" | "miss" | "stale" | "blocked" | "bypass";

export type CacheRiskLevel = "low" | "medium" | "high";

export type CacheStatus = "active" | "stale" | "invalidated";

export interface CacheEntryMeta {
  cacheKey: string;
  namespace: CacheNamespace;
  tenantId?: string;
  inputHash: string;
  outputHash: string;
  sourceRefs: string[];
  formulaVersion?: string;
  policyVersion: string;
  capabilityVersion?: string;
  environment: string;
  riskLevel: CacheRiskLevel;
  ttlSeconds: number;
  createdAt: string;
  expiresAt: string;
  createdBy: string;
  cacheStatus: CacheStatus;
}

export interface CacheLookupResponse {
  ok: boolean;
  decision: CacheDecision;
  entry?: CacheEntryMeta & { data: unknown };
  reason?: string;
}

export interface CacheAuditEvent {
  eventId: string;
  timestamp: string;
  eventType:
    | "cache_hit"
    | "cache_miss"
    | "cache_stale"
    | "cache_invalidated"
    | "cache_write"
    | "cache_blocked_cross_tenant"
    | "cache_blocked_policy_mismatch"
    | "cache_bypass_high_risk";
  namespace: CacheNamespace;
  cacheKey?: string;
  tenantId?: string;
  decision: CacheDecision;
  reason?: string;
  performedBy?: string;
}
