export type AttributionChannel = "seo" | "aeo" | "social" | "email" | "blog" | "distribution" | "unknown";
export type AttributionEventType = "run_created" | "run_completed" | "run_failed" | "content_published" | "content_distributed";

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
}
