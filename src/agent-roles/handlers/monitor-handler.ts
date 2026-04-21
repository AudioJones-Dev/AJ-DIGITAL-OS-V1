import type { RoleHandler, RoleStepInput, RoleStepOutput } from "../agent-role-types.js";

// ── Monitor Input / Output ─────────────────────────────────────────

export interface MonitorInput {
  /** What to observe / check. */
  checkDescription: string;
  /** Conditions that constitute a healthy state. */
  healthChecks?: MonitorHealthCheck[] | undefined;
  /** If provided, used as the data to inspect instead of previousOutput. */
  snapshot?: Record<string, unknown> | undefined;
}

export interface MonitorHealthCheck {
  name: string;
  check: (data: unknown) => boolean;
}

export interface MonitorObservation {
  timestamp: string;
  healthy: boolean;
  checksRun: number;
  checksPassed: number;
  details: Array<{ name: string; passed: boolean }>;
  summary: string;
}

/**
 * Monitor role handler — lightweight observation and health checking.
 * No model calls. Evaluates health check functions against pipeline
 * output or a provided snapshot.
 *
 * Designed to be scheduled via cron or a recurring trigger.
 */
export function createMonitorHandler(): RoleHandler<MonitorInput, MonitorObservation> {
  return {
    role: "monitor",
    async execute(input: RoleStepInput<MonitorInput>): Promise<RoleStepOutput<MonitorObservation>> {
      const start = Date.now();
      const payload = input.payload;
      const data = payload.snapshot ?? input.previousOutput ?? {};
      const checks = payload.healthChecks ?? [];

      const details: Array<{ name: string; passed: boolean }> = [];

      for (const hc of checks) {
        let passed = false;
        try {
          passed = hc.check(data);
        } catch {
          passed = false;
        }
        details.push({ name: hc.name, passed });
      }

      const checksPassed = details.filter((d) => d.passed).length;
      const healthy = checks.length === 0 || checksPassed === checks.length;

      const observation: MonitorObservation = {
        timestamp: new Date().toISOString(),
        healthy,
        checksRun: checks.length,
        checksPassed,
        details,
        summary: checks.length === 0
          ? `Monitor observed: ${payload.checkDescription} (no health checks defined).`
          : `${checksPassed}/${checks.length} health checks passed for: ${payload.checkDescription}`,
      };

      return {
        ok: true, // Monitor always succeeds — it reports, doesn't block
        role: "monitor",
        output: observation,
        durationMs: Date.now() - start,
        retries: 0,
        warnings: healthy ? [] : [`Unhealthy: ${checks.length - checksPassed} checks failed.`],
        error: null,
      };
    },
  };
}
