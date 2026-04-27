export type AttributionChannel = "seo" | "aeo" | "social" | "email" | "blog" | "distribution" | "unknown";
export type AttributionEventType =
  | "run_created"
  | "run_completed"
  | "run_failed"
  | "content_published"
  | "content_distributed"
  | "dag_run_created"
  | "dag_node_started"
  | "dag_node_completed"
  | "dag_node_failed"
  | "dag_node_retried"
  | "dag_run_completed"
  | "dag_run_failed"
  | "map_evaluation_created"
  | "map_decision_execute"
  | "map_decision_improve"
  | "map_decision_reconsider"
  | "cera_cycle_created"
  | "compound_score_created"
  | "decision_path_scale"
  | "decision_path_pivot"
  | "decision_path_kill"
  | "governance_check_passed"
  | "governance_check_blocked"
  | "governance_check_warned"
  | "governance_approval_required";

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

export interface AttributionSummary {
  agentId: string;
  channel: AttributionChannel;
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  publishedContent: number;
  periodStart: string;
  periodEnd: string;
  mapScore?: MAPScore;
}
