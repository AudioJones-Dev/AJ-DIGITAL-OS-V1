/**
 * AJ Digital OS — Prometheus Metrics
 *
 * Exposes application-level metrics via prom-client.
 * Import helpers from here to instrument any module.
 */

import {
  Registry,
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
} from "prom-client";

export const registry = new Registry();

// Collect default Node.js runtime metrics (event loop lag, heap, GC, etc.)
collectDefaultMetrics({ register: registry });

// ── Counters ────────────────────────────────────────────────────────────────

export const sessionsCreatedTotal = new Counter({
  name: "aj_os_sessions_created_total",
  help: "Total number of sessions created",
  registers: [registry],
});

export const eventsTotal = new Counter({
  name: "aj_os_events_total",
  help: "Total number of events published, labelled by type",
  labelNames: ["type"] as const,
  registers: [registry],
});

export const interruptsTotal = new Counter({
  name: "aj_os_interrupts_total",
  help: "Total number of interrupt events",
  registers: [registry],
});

export const errorsTotal = new Counter({
  name: "aj_os_errors_total",
  help: "Total number of application errors",
  registers: [registry],
});

export const agentRunsTotal = new Counter({
  name: "aj_os_agent_runs_total",
  help: "Total number of agent runs, labelled by agent name",
  labelNames: ["agent"] as const,
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: "aj_os_http_requests_total",
  help: "Total HTTP requests received, labelled by method and route",
  labelNames: ["method", "route", "status"] as const,
  registers: [registry],
});

// ── Gauges ───────────────────────────────────────────────────────────────────

export const sessionsActive = new Gauge({
  name: "aj_os_sessions_active",
  help: "Number of currently active sessions",
  registers: [registry],
});

export const sessionsIdle = new Gauge({
  name: "aj_os_sessions_idle",
  help: "Number of currently idle sessions",
  registers: [registry],
});

export const sessionsError = new Gauge({
  name: "aj_os_sessions_error",
  help: "Number of sessions currently in error state",
  registers: [registry],
});

export const predictionErrorGauge = new Gauge({
  name: "aj_os_prediction_error",
  help: "Latest prediction error per agent",
  labelNames: ["agent"] as const,
  registers: [registry],
});

export const signalScoreGauge = new Gauge({
  name: "aj_os_signal_score",
  help: "Latest signal score per agent",
  labelNames: ["agent"] as const,
  registers: [registry],
});

export const agentSuccessRate = new Gauge({
  name: "aj_os_agent_success_rate",
  help: "Current success rate per agent",
  labelNames: ["agent"] as const,
  registers: [registry],
});

export const agentFailureRate = new Gauge({
  name: "aj_os_agent_failure_rate",
  help: "Current failure rate per agent",
  labelNames: ["agent"] as const,
  registers: [registry],
});

// ── Histograms ────────────────────────────────────────────────────────────────

export const taskDurationMs = new Histogram({
  name: "aj_os_task_duration_ms",
  help: "Duration of task executions in milliseconds",
  buckets: [10, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
  registers: [registry],
});

export const agentRunDurationMs = new Histogram({
  name: "aj_os_agent_run_duration_ms",
  help: "Duration of agent runs in milliseconds, labelled by agent name",
  labelNames: ["agent"] as const,
  buckets: [50, 100, 250, 500, 1000, 2500, 5000, 12000, 30000],
  registers: [registry],
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Record an event of a given type. */
export function recordEvent(type: string): void {
  eventsTotal.labels(type).inc();
}

/** Record an agent run result and duration. */
export function recordAgentRun(agent: string, durationMs: number, ok: boolean): void {
  agentRunsTotal.labels(agent).inc();
  agentRunDurationMs.labels(agent).observe(durationMs);
  if (!ok) {
    errorsTotal.inc();
  }
}

/** Increment interrupt counter and fire a matching event label. */
export function recordInterrupt(): void {
  interruptsTotal.inc();
  eventsTotal.labels("interrupt").inc();
}

/** Record an error. */
export function recordError(): void {
  errorsTotal.inc();
}
