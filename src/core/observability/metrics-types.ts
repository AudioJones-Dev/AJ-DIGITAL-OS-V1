/**
 * Operating Core — Observability Foundation v1 types
 */

export type MetricName = string;

export interface MetricsSnapshot {
  [name: string]: number;
}

export interface RunMetrics {
  created: number;
  completed: number;
  failed: number;
}

export interface PolicyMetrics {
  allow: number;
  block: number;
  approval_required: number;
}

export interface EventMetrics {
  total: number;
  by_category: Record<string, number>;
}
