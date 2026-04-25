/**
 * Hermes Status API — lightweight HTTP endpoint for runtime state.
 *
 * Exposes Hermes runtime state (scheduler, watcher, notifications) over HTTP
 * so the dashboard (or any consumer) can poll for live status.
 *
 * Default port: 7420 (overridable via HERMES_STATUS_PORT env var).
 * Only binds to localhost — not exposed externally.
 */

import { createServer, type Server } from "node:http";
import { getIntelligenceSnapshot } from "../intelligence/intelligence-engine.js";
import { registry } from "../observability/metrics.js";
import { getSchedulerStatus } from "./hermes-scheduler.js";
import { isWatcherRunning, getLastCheckAt } from "./hermes-failure-watcher.js";
import { getRecentNotifications } from "./hermes-notifications.js";
import { getEnabledSchedules, DEFAULT_SCHEDULES } from "./hermes-schedule-config.js";
import { getFullRunData, getRecentRepairEvents, getPatterns } from "../db/neon-client.js";
import { getRecentRepairs } from "./hermes-repair-engine.js";
import {
  createCheckoutSession,
  verifyWebhookSignature,
  handleStripeWebhook,
  type StripeWebhookEvent,
} from "../api/stripe.js";
import { createStripeWebhookHandlers } from "../api/stripe-handlers.js";
import { resolveConfig, isConfigured, supabaseGet, supabasePatch, type SupabaseConfig } from "../db/supabase-client.js";
import type { DbDistributionAsset } from "../db/db-types.js";
import { recordDistributionMetrics } from "../services/distribution-metrics.js";
import { getDistributionPerformance } from "../services/distribution-metrics.js";
import { classifyMcpTask } from "../mcp/mcp-task-classifier.js";
import { evaluateMcpPolicy } from "../mcp/mcp-policy.js";
import { executeMcpTask } from "../mcp/mcp-execution-adapter.js";
import { handleBelRequest } from "../bel/bel-controller.js";
import type { BelToolName as BelControllerTool } from "../bel/bel-types.js";
import {
  EnforcementBlockedError,
  executeWithEnforcement,
} from "../security/permissions/enforced-execution.js";
import {
  AgentTenantMismatchError,
  assertAgentTenantAccess,
  assertAgentToolAccess,
  resolveAgentContext,
} from "../security/agents/agent-registry.js";
import { getCapabilities } from "../bel/bel-capabilities.js";
import { listSessions } from "../bel/bel-session-manager.js";
import { getRecentLogs } from "../mcp/mcp-logger.js";
import { getRecentEvents, getEventsByRun } from "../attribution/attribution-tracker.js";
import { getMAPStats } from "../attribution/map-validator.js";
import {
  getOpportunityById,
  getTopOpportunities as getStoreTopOpportunities,
} from "../intelligence/opportunity-store.js";
import {
  listControlRuns,
  getControlRun,
} from "../control-plane/run-registry/run-control-store.js";
import { executeControlAction } from "../control-plane/run-registry/control-actions.js";
import { getAuditEvents } from "../control-plane/run-registry/run-audit-log.js";
import { listAgents } from "../security/agents/agent-registry.js";
import type { ControlAction } from "../control-plane/run-registry/run-control-types.js";
import {
  validateStateTransition,
  getAllowedTransitions as getAllowedRunStateTransitions,
  isTerminalState,
} from "../core/state/run-state-machine.js";
import { VALID_RUN_STATE_TRANSITIONS, type RunState } from "../core/state/run-state-types.js";
import { evaluateActionRisk } from "../core/policy/policy-engine.js";
import {
  listSystemEvents,
  getEventsByRunId,
  getEventsByTenantId,
} from "../core/events/event-ledger.js";
import { replayRunEvents } from "../core/events/event-replay.js";
import {
  listSchemas as listCoreSchemas,
  getSchema as getCoreSchema,
  exportJsonSchema,
} from "../core/schemas/schema-registry.js";
import { checkIdempotency } from "../core/idempotency/idempotency-store.js";
import { getMetricSnapshot } from "../core/observability/metrics-store.js";
import {
  lookupCache as cacheLookup,
  writeCache as cacheWrite,
  invalidateCache as cacheInvalidate,
  listCacheEntries as cacheList,
  hashInput as cacheHashInput,
} from "../cache/cache-store.js";
import { getCacheAuditEvents } from "../cache/cache-audit-log.js";
import type {
  CacheEnvironment,
  CacheNamespace,
  CacheRiskLevel,
} from "../cache/cache-types.js";

const TAG = "[HERMES-API]";
const DEFAULT_PORT = 7420;

let server: Server | null = null;

export interface HermesRuntimeStatus {
  scheduler: {
    running: boolean;
    activeSchedules: number;
    failuresSinceStart: number;
  };
  watcher: {
    running: boolean;
    lastCheck: string | null;
  };
  schedules: {
    enabled: number;
    total: number;
  };
  notifications: {
    recent: number;
    lastAlert: {
      severity: string;
      title: string;
      message: string;
      timestamp: string;
    } | null;
    lastRetry: {
      title: string;
      message: string;
      timestamp: string;
    } | null;
  };
  timestamp: string;
}

function buildStatus(): HermesRuntimeStatus {
  const status = getSchedulerStatus();
  const notifications = getRecentNotifications();
  const enabled = getEnabledSchedules(DEFAULT_SCHEDULES);

  const lastAlert =
    [...notifications].reverse().find((n) => n.severity === "critical" || n.severity === "warning") ?? null;

  const lastRetry =
    [...notifications].reverse().find((n) => n.title.toLowerCase().includes("retry")) ?? null;

  return {
    scheduler: {
      running: status.running,
      activeSchedules: status.activeSchedules,
      failuresSinceStart: status.failuresSinceStart,
    },
    watcher: {
      running: isWatcherRunning(),
      lastCheck: getLastCheckAt(),
    },
    schedules: {
      enabled: enabled.length,
      total: DEFAULT_SCHEDULES.length,
    },
    notifications: {
      recent: notifications.length,
      lastAlert: lastAlert
        ? { severity: lastAlert.severity, title: lastAlert.title, message: lastAlert.message, timestamp: lastAlert.timestamp }
        : null,
      lastRetry: lastRetry
        ? { title: lastRetry.title, message: lastRetry.message, timestamp: lastRetry.timestamp }
        : null,
    },
    timestamp: new Date().toISOString(),
  };
}

// ── Proof Helpers ──────────────────────────────────────────────────

async function supabaseCount(cfg: SupabaseConfig, table: string): Promise<number> {
  const res = await fetch(`${cfg.url}/rest/v1/${table}?select=id&limit=0`, {
    method: "HEAD",
    headers: {
      apikey: cfg.serviceRoleKey,
      Authorization: `Bearer ${cfg.serviceRoleKey}`,
      Prefer: "count=exact",
    },
  });
  const range = res.headers.get("content-range"); // e.g. "*/42"
  if (!range) return 0;
  const total = range.split("/")[1];
  return total ? parseInt(total, 10) || 0 : 0;
}

async function supabaseAvg(cfg: SupabaseConfig, table: string, column: string): Promise<number | null> {
  const dataRes = await fetch(
    `${cfg.url}/rest/v1/${table}?select=${encodeURIComponent(column)}&${encodeURIComponent(column)}=not.is.null`,
    {
      headers: {
        apikey: cfg.serviceRoleKey,
        Authorization: `Bearer ${cfg.serviceRoleKey}`,
      },
    },
  );

  if (!dataRes.ok) return null;
  const rows = (await dataRes.json()) as Record<string, unknown>[];
  if (rows.length === 0) return null;

  const sum = rows.reduce((acc, row) => acc + (Number(row[column]) || 0), 0);
  return Math.round((sum / rows.length) * 10) / 10;
}

async function buildProofPayload(): Promise<Record<string, unknown>> {
  const cfg = resolveConfig();

  if (!isConfigured(cfg)) {
    return {
      total_missions: 0,
      total_clients: 0,
      avg_quality: null,
      note: "Supabase not configured",
      timestamp: new Date().toISOString(),
    };
  }

  const [totalMissions, totalClients, avgQuality, totalDeliverables, avgImprovement] = await Promise.all([
    supabaseCount(cfg, "mission_runs"),
    supabaseCount(cfg, "clients"),
    supabaseAvg(cfg, "mission_runs", "output_quality_score"),
    supabaseCount(cfg, "deliverables"),
    supabaseAvg(cfg, "execution_intelligence", "improvement_pct"),
  ]);

  // Total patterns from Neon
  let totalPatterns = 0;
  const patternsResult = await getPatterns();
  if (patternsResult.ok && patternsResult.data) {
    totalPatterns = patternsResult.data.length;
  }

  // Uptime: days since earliest mission_run
  let uptimeDays: number | null = null;
  const earliestResult = await supabaseGet<{ created_at: string }>(
    cfg,
    "mission_runs",
    "select=created_at&order=created_at.asc&limit=1",
  );
  if (earliestResult.ok && earliestResult.data?.[0]) {
    const firstRun = new Date(earliestResult.data[0].created_at);
    uptimeDays = Math.floor((Date.now() - firstRun.getTime()) / (24 * 60 * 60 * 1000));
  }

  // Distribution metrics
  const distPerf = await getDistributionPerformance();

  console.log(`${TAG} [PROOF] updated — missions=${totalMissions} clients=${totalClients} patterns=${totalPatterns}`);

  return {
    total_missions: totalMissions,
    total_clients: totalClients,
    avg_quality: avgQuality,
    total_deliverables: totalDeliverables,
    avg_improvement_pct: avgImprovement,
    total_patterns: totalPatterns,
    uptime_days: uptimeDays,
    total_distribution_assets: distPerf.total_assets,
    total_published: distPerf.published,
    distribution_impressions: distPerf.total_impressions,
    distribution_engagements: distPerf.total_engagements,
    distribution_leads: distPerf.total_leads,
    timestamp: new Date().toISOString(),
  };
}

// ── Body Collector ─────────────────────────────────────────────────

// UUID v4 pattern for client_id validation
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface ClientPerformance {
  total_runs: number;
  avg_quality: number | null;
  improvement_pct: number | null;
  patterns_learned: number;
  distribution_assets: number;
  published_assets: number;
  distribution_impressions: number;
  distribution_engagements: number;
  distribution_leads: number;
  timestamp: string;
}

async function buildClientPerformance(clientId: string): Promise<ClientPerformance> {
  const cfg = resolveConfig();

  if (!isConfigured(cfg)) {
    return { total_runs: 0, avg_quality: null, improvement_pct: null, patterns_learned: 0, distribution_assets: 0, published_assets: 0, distribution_impressions: 0, distribution_engagements: 0, distribution_leads: 0, timestamp: new Date().toISOString() };
  }

  // 1. Fetch missions for this client to get mission_ids
  const missionsResult = await supabaseGet<{ id: string }>(cfg, "missions", `client_id=eq.${encodeURIComponent(clientId)}&select=id`);
  const missionIds = missionsResult.ok && missionsResult.data ? missionsResult.data.map((m) => m.id) : [];

  let totalRuns = 0;
  let avgQuality: number | null = null;

  if (missionIds.length > 0) {
    const inList = missionIds.map((id) => encodeURIComponent(id)).join(",");

    // 2. Count runs for this client
    const runsResult = await supabaseGet<{ id: string; output_quality_score: number | null }>(
      cfg,
      "mission_runs",
      `mission_id=in.(${inList})&select=id,output_quality_score&status=eq.completed&limit=500`,
    );

    if (runsResult.ok && runsResult.data) {
      totalRuns = runsResult.data.length;

      const scores = runsResult.data
        .map((r) => r.output_quality_score)
        .filter((s): s is number => s != null);

      if (scores.length > 0) {
        avgQuality = Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
      }
    }
  }

  // 3. Most recent improvement_pct from execution_intelligence
  let improvementPct: number | null = null;
  const intelResult = await supabaseGet<{ improvement_pct: number | null }>(
    cfg,
    "execution_intelligence",
    `client_id=eq.${encodeURIComponent(clientId)}&select=improvement_pct&order=created_at.desc&limit=1`,
  );
  if (intelResult.ok && intelResult.data?.[0]?.improvement_pct != null) {
    improvementPct = intelResult.data[0].improvement_pct;
  }

  // 4. Patterns count — global fallback (no direct client link in Neon patterns table)
  let patternsLearned = 0;
  const patternsResult = await getPatterns();
  if (patternsResult.ok && patternsResult.data) {
    patternsLearned = patternsResult.data.length;
  }

  // 5. Distribution performance for this client
  const distPerf = await getDistributionPerformance(clientId);

  return {
    total_runs: totalRuns,
    avg_quality: avgQuality,
    improvement_pct: improvementPct,
    patterns_learned: patternsLearned,
    distribution_assets: distPerf.total_assets,
    published_assets: distPerf.published,
    distribution_impressions: distPerf.total_impressions,
    distribution_engagements: distPerf.total_engagements,
    distribution_leads: distPerf.total_leads,
    timestamp: new Date().toISOString(),
  };
}

function collectBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const MAX = 1_048_576; // 1 MB

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX) {
        req.destroy();
        reject(new Error("Request body too large"));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    req.on("error", reject);
  });
}

/**
 * Start the Hermes status API on localhost.
 */
export function startHermesApi(port?: number): void {
  if (server) {
    console.log(`${TAG} Already running.`);
    return;
  }

  const p = port ?? (Number(process.env.HERMES_STATUS_PORT) || DEFAULT_PORT);

  server = createServer((req, res) => {
    // CORS headers for dashboard access
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Stripe-Signature");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    if (req.url === "/status" || req.url === "/") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(buildStatus()));
      return;
    }

    if (req.url === "/intelligence" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(getIntelligenceSnapshot()));
      return;
    }

    if (req.url === "/mcp/execute" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const task = String(body["task"] ?? "").trim();
          const dryRun = body["dryRun"] === false ? false : true;

          if (!task) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "task is required" }));
            return;
          }

          const classification = classifyMcpTask(task);
          const policy = evaluateMcpPolicy({ task, classification });

          if (!policy.approved) {
            res.writeHead(403, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                ok: false,
                classification,
                approved: false,
                dryRun: true,
                plannedAction: policy.plannedAction,
                result: null,
                error: policy.reason,
              }),
            );
            return;
          }

          if (dryRun) {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                ok: true,
                classification,
                approved: true,
                dryRun: true,
                plannedAction: policy.plannedAction,
                result: null,
              }),
            );
            return;
          }

          if (!policy.taskType) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                ok: false,
                classification,
                approved: false,
                dryRun,
                plannedAction: policy.plannedAction,
                result: null,
                error: "No executable MCP task type resolved.",
              }),
            );
            return;
          }

          const requestedAgentId = String(body["agentId"] ?? "api-mcp-execute").trim() || "api-mcp-execute";
          let agentContext: ReturnType<typeof resolveAgentContext>;
          try {
            agentContext = resolveAgentContext(requestedAgentId);
            assertAgentToolAccess(agentContext, policy.taskType);
            assertAgentTenantAccess(agentContext, body["clientId"] !== undefined ? String(body["clientId"]) : null);
          } catch (err: unknown) {
            const statusCode = err instanceof AgentTenantMismatchError ? 403 : 400;
            res.writeHead(statusCode, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Invalid agent context" }));
            return;
          }

          const adapterRequest = {
            taskType: policy.taskType,
            task,
            dryRun,
            agentId: agentContext.agentId,
            ...(policy.targetPath !== undefined ? { targetPath: policy.targetPath } : {}),
            ...(policy.command !== undefined ? { command: policy.command } : {}),
          };

          return executeWithEnforcement(
            {
              agentId: agentContext.agentId,
              actionType: "mcp_tool_call",
              ...(policy.command !== undefined ? { command: policy.command } : {}),
              ...(policy.targetPath !== undefined ? { target: policy.targetPath } : {}),
              ...(policy.taskType !== null ? { toolName: policy.taskType } : {}),
              ...(body["clientId"] !== undefined ? { clientId: String(body["clientId"]) } : {}),
            },
            {
              permissionLevel: agentContext.permissionLevel,
              ...(body["approvalGranted"] === true ? { approval: { approved: true } } : {}),
              environment: agentContext.environment,
            },
            async () => executeMcpTask(adapterRequest),
          )
            .then((wrapped) => {
              if (wrapped.status === "approval_required") {
                res.writeHead(403, { "Content-Type": "application/json" });
                res.end(
                  JSON.stringify({
                    ok: false,
                    classification,
                    approved: false,
                    dryRun,
                    plannedAction: policy.plannedAction,
                    approvalRequired: true,
                    approvalId: wrapped.enforcement.approvalId ?? null,
                    auditId: wrapped.enforcement.auditId,
                    error: wrapped.enforcement.reason,
                  }),
                );
                return;
              }

              const result = wrapped.result;
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  ok: result.ok,
                  classification,
                  approved: true,
                  dryRun,
                  plannedAction: policy.plannedAction,
                  result,
                  auditId: wrapped.enforcement.auditId,
                }),
              );
            })
            .catch((err: unknown) => {
              if (err instanceof EnforcementBlockedError) {
                res.writeHead(403, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: false, error: err.message, auditId: err.auditId }));
                return;
              }

              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Execution failed" }));
            });
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── BEL Execute ────────────────────────────────────────────────
    if (req.url === "/bel/execute" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const agentId = String(body["agentId"] ?? "").trim();
          const task = String(body["task"] ?? "").trim();
          const dryRun = body["dryRun"] === false ? false : true;
          const tool = body["tool"] as BelControllerTool | undefined;
          const params = body["params"] as Record<string, unknown> | undefined;
          const sessionName = body["sessionName"] ? String(body["sessionName"]) : undefined;
          if (!task) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "task is required" }));
            return;
          }

          if (!agentId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "agentId is required" }));
            return;
          }

          let agentContext: ReturnType<typeof resolveAgentContext>;
          try {
            agentContext = resolveAgentContext(agentId);
            if (tool !== undefined) {
              assertAgentToolAccess(agentContext, tool);
            }
            assertAgentTenantAccess(agentContext, body["clientId"] !== undefined ? String(body["clientId"]) : null);
          } catch (err: unknown) {
            const statusCode = err instanceof AgentTenantMismatchError ? 403 : 400;
            res.writeHead(statusCode, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Invalid agent context" }));
            return;
          }

          return executeWithEnforcement(
            {
              agentId: agentContext.agentId,
              actionType: tool === "browser" ? "browser_action" : "mcp_tool_call",
              ...(tool !== undefined ? { toolName: tool } : {}),
              ...(body["target"] !== undefined ? { target: String(body["target"]) } : {}),
              ...(body["clientId"] !== undefined ? { clientId: String(body["clientId"]) } : {}),
            },
            {
              permissionLevel: agentContext.permissionLevel,
              ...(body["approvalGranted"] === true ? { approval: { approved: true } } : {}),
              environment: agentContext.environment,
            },
            async () => handleBelRequest({
              agentId, task, dryRun,
              ...(tool !== undefined ? { tool } : {}),
              ...(params !== undefined ? { params } : {}),
              ...(sessionName !== undefined ? { sessionName } : {}),
            }),
          )
            .then((wrapped) => {
              if (wrapped.status === "approval_required") {
                res.writeHead(403, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                  ok: false,
                  approved: false,
                  approvalRequired: true,
                  approvalId: wrapped.enforcement.approvalId ?? null,
                  auditId: wrapped.enforcement.auditId,
                  error: wrapped.enforcement.reason,
                }));
                return;
              }

              const result = wrapped.result;
              const status = result.approved ? 200 : 403;
              res.writeHead(status, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ...result, auditId: wrapped.enforcement.auditId }));
            })
            .catch((err: unknown) => {
              if (err instanceof EnforcementBlockedError) {
                res.writeHead(403, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: false, error: err.message, auditId: err.auditId }));
                return;
              }

              res.writeHead(500, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Execution failed" }));
            });
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // Replay endpoint — load full run data from Neon by run_ref
    const replayMatch = req.url?.match(/^\/replay\/(.+)$/);
    if (replayMatch) {
      const runRef = decodeURIComponent(replayMatch[1]!);
      getFullRunData(runRef)
        .then((result) => {
          if (!result.ok || !result.data) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: result.error ?? "Run not found" }));
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, data: result.data }));
        })
        .catch((err: unknown) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Internal error" }));
        });
      return;
    }

    // Repairs endpoint — recent repair events from Neon + in-memory
    if (req.url === "/repairs" || req.url?.startsWith("/repairs?")) {
      getRecentRepairEvents(30)
        .then((result) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            ok: true,
            data: result.ok ? result.data : [],
            inMemory: getRecentRepairs(),
          }));
        })
        .catch((err: unknown) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({
            ok: true,
            data: [],
            inMemory: getRecentRepairs(),
            error: err instanceof Error ? err.message : "Failed to fetch repair events",
          }));
        });
      return;
    }

    // ── Stripe: Create Checkout Session ─────────────────────────────
    if (req.url === "/api/stripe/create-checkout-session" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const clientId = body["clientId"] as string | undefined;
          const email = body["email"] as string | undefined;
          const tier = (body["tier"] as string | undefined) ?? "standard";

          if (!email) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "email is required" }));
            return;
          }

          return createCheckoutSession({
            clientId: clientId ?? "",
            email,
            tier: tier as "standard" | "professional" | "enterprise",
          }).then((result) => {
            res.writeHead(result.ok ? 200 : 500, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          });
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── Stripe: Webhook ──────────────────────────────────────────────
    if (req.url === "/api/stripe/webhook" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const sig = req.headers["stripe-signature"];
          if (typeof sig !== "string") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "Missing Stripe-Signature header" }));
            return;
          }

          const verification = verifyWebhookSignature(raw, sig);
          if (!verification.verified) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: verification.error }));
            return;
          }

          const event = JSON.parse(raw) as StripeWebhookEvent;
          const handlers = createStripeWebhookHandlers();

          return handleStripeWebhook(event, handlers).then((result) => {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          });
        })
        .catch((err: unknown) => {
          console.error(`${TAG} Stripe webhook error:`, err);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: "Internal webhook error" }));
        });
      return;
    }

    // ── Proof endpoint ─────────────────────────────────────────────
    if (req.url === "/proof") {
      console.log(`${TAG} [PROOF] endpoint accessed`);
      buildProofPayload()
        .then((proof) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(proof));
        })
        .catch((err: unknown) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }));
        });
      return;
    }

    // ── Client Performance endpoint ────────────────────────────────
    const perfMatch = req.url?.match(/^\/api\/client\/([^/]+)\/performance$/);
    if (perfMatch && req.method === "GET") {
      const clientId = decodeURIComponent(perfMatch[1]!);

      if (!UUID_RE.test(clientId)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid client_id format" }));
        return;
      }

      console.log(`${TAG} [PERFORMANCE] client queried — client_id=${clientId}`);

      buildClientPerformance(clientId)
        .then((perf) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(perf));
        })
        .catch((err: unknown) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }));
        });
      return;
    }

    // ── Distribution Queue endpoints ──────────────────────────────────
    const distListMatch = req.url?.match(/^\/api\/distribution-assets(?:\?(.*))?$/);
    if (distListMatch && req.method === "GET") {
      const params = new URLSearchParams(distListMatch[1] ?? "");
      const status = params.get("status");
      const cfg = resolveConfig();

      if (!isConfigured(cfg)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, data: [], note: "Supabase not configured" }));
        return;
      }

      let query = "select=*&order=created_at.desc&limit=100";
      if (status) {
        query += `&status=eq.${encodeURIComponent(status)}`;
      }

      supabaseGet<DbDistributionAsset>(cfg, "distribution_assets", query)
        .then((result) => {
          console.log(`${TAG} [QUEUE] listed distribution_assets — status=${status ?? "all"} count=${result.data?.length ?? 0}`);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: result.ok, data: result.data ?? [], error: result.error }));
        })
        .catch((err: unknown) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Internal error" }));
        });
      return;
    }

    const distApproveMatch = req.url?.match(/^\/api\/distribution-assets\/([^/]+)\/approve$/);
    if (distApproveMatch && req.method === "POST") {
      const assetId = decodeURIComponent(distApproveMatch[1]!);
      if (!UUID_RE.test(assetId)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid asset id format" }));
        return;
      }

      const cfg = resolveConfig();
      supabasePatch<DbDistributionAsset>(cfg, "distribution_assets", `id=eq.${encodeURIComponent(assetId)}&status=eq.draft`, { status: "approved" })
        .then((result) => {
          console.log(`${TAG} [QUEUE] approved asset — id=${assetId} ok=${result.ok}`);
          res.writeHead(result.ok ? 200 : 400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: result.ok, data: result.data, error: result.error }));
        })
        .catch((err: unknown) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Internal error" }));
        });
      return;
    }

    const distScheduleMatch = req.url?.match(/^\/api\/distribution-assets\/([^/]+)\/schedule$/);
    if (distScheduleMatch && req.method === "POST") {
      const assetId = decodeURIComponent(distScheduleMatch[1]!);
      if (!UUID_RE.test(assetId)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid asset id format" }));
        return;
      }

      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const scheduledAt = body["scheduled_at"] as string | undefined;
          if (!scheduledAt || isNaN(Date.parse(scheduledAt))) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "scheduled_at (ISO 8601) is required" }));
            return;
          }

          const cfg = resolveConfig();
          return supabasePatch<DbDistributionAsset>(cfg, "distribution_assets", `id=eq.${encodeURIComponent(assetId)}&status=eq.approved`, { status: "scheduled", scheduled_at: scheduledAt })
            .then((result) => {
              console.log(`${TAG} [QUEUE] scheduled asset — id=${assetId} at=${scheduledAt} ok=${result.ok}`);
              res.writeHead(result.ok ? 200 : 400, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: result.ok, data: result.data, error: result.error }));
            });
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── Distribution Metrics endpoint ────────────────────────────────
    const distMetricsMatch = req.url?.match(/^\/api\/distribution-assets\/([^/]+)\/metrics$/);
    if (distMetricsMatch && req.method === "POST") {
      const assetId = decodeURIComponent(distMetricsMatch[1]!);
      if (!UUID_RE.test(assetId)) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Invalid asset id format" }));
        return;
      }

      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const channel = body["channel"] as string | undefined;
          if (!channel) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "channel is required" }));
            return;
          }

          return recordDistributionMetrics(assetId, channel, {
            impressions: typeof body["impressions"] === "number" ? body["impressions"] : 0,
            clicks: typeof body["clicks"] === "number" ? body["clicks"] : 0,
            engagements: typeof body["engagements"] === "number" ? body["engagements"] : 0,
            leads: typeof body["leads"] === "number" ? body["leads"] : 0,
          }).then((result) => {
            res.writeHead(result.ok ? 200 : 500, { "Content-Type": "application/json" });
            res.end(JSON.stringify(result));
          });
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── BEL Capabilities ───────────────────────────────────────────────────
    if (req.url === "/bel/capabilities" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(getCapabilities()));
      return;
    }

    // ── BEL Sessions ───────────────────────────────────────────────────────
    if (req.url === "/bel/sessions" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(listSessions()));
      return;
    }

    // ── BEL Logs ───────────────────────────────────────────────────────────
    if ((req.url === "/bel/logs" || req.url?.startsWith("/bel/logs?")) && req.method === "GET") {
      const urlObj = new URL(req.url ?? "/bel/logs", "http://localhost");
      const limit = Number(urlObj.searchParams.get("limit")) || 50;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(getRecentLogs(limit)));
      return;
    }

    // ── MAP stats ─────────────────────────────────────────────────────────
    if (req.url === "/attribution/map-stats" && req.method === "GET") {
      const events = getRecentEvents(500);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, ...getMAPStats(events) }));
      return;
    }

    // ── Attribution events by runId ───────────────────────────────────────
    const attributionRunMatch = req.url?.match(/^\/attribution\/events\/(.+)$/);
    if (attributionRunMatch && req.method === "GET") {
      const runId = decodeURIComponent(attributionRunMatch[1]!);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, events: getEventsByRun(runId) }));
      return;
    }

    // ── Attribution events list ───────────────────────────────────────────
    const attributionEventsMatch = req.url?.match(/^\/attribution\/events(?:\?(.*))?$/);
    if (attributionEventsMatch && req.method === "GET") {
      const params = new URLSearchParams(attributionEventsMatch[1] ?? "");
      const limitRaw = params.get("limit");
      const limit = limitRaw ? Math.max(1, Math.min(1000, parseInt(limitRaw, 10) || 100)) : 100;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, events: getRecentEvents(limit) }));
      return;
    }

    // ── Prometheus metrics ──────────────────────────────────────────────────
    if (req.url === "/metrics" && req.method === "GET") {
      registry.metrics().then((metrics) => {
        res.writeHead(200, { "Content-Type": registry.contentType });
        res.end(metrics);
      }).catch((err: unknown) => {
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Error collecting metrics");
      });
      return;
    }

    // ── Intelligence: opportunity by scoreId ────────────────────────
    const oppByIdMatch = req.url?.match(/^\/intelligence\/opportunities\/(.+)$/);
    if (oppByIdMatch && req.method === "GET") {
      const scoreId = decodeURIComponent(oppByIdMatch[1]!);
      getOpportunityById(scoreId)
        .then((opp) => {
          if (!opp) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "Opportunity not found" }));
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, data: opp }));
        })
        .catch((err: unknown) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Internal error" }));
        });
      return;
    }

    // ── Intelligence: top opportunities list ────────────────────────
    const oppListMatch = req.url?.match(/^\/intelligence\/opportunities(?:\?(.*))?$/);
    if (oppListMatch && req.method === "GET") {
      const params = new URLSearchParams(oppListMatch[1] ?? "");
      const rawLimit = parseInt(params.get("limit") ?? "10", 10);
      const limit = isNaN(rawLimit) || rawLimit <= 0 ? 10 : rawLimit;
      getStoreTopOpportunities(limit)
        .then((opps) => {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, data: opps, total: opps.length }));
        })
        .catch((err: unknown) => {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Internal error" }));
        });
      return;
    }

    // ── Control Plane: list runs ────────────────────────────────────────
    if ((req.url === "/control/runs" || req.url?.startsWith("/control/runs?")) && req.method === "GET") {
      const urlObj = new URL(req.url ?? "/control/runs", "http://localhost");
      const agentIdParam = urlObj.searchParams.get("agentId");
      const stateParam = urlObj.searchParams.get("state");
      const limitRaw = urlObj.searchParams.get("limit");
      const filter: Parameters<typeof listControlRuns>[0] = {};
      if (agentIdParam !== null) filter.agentId = agentIdParam;
      if (stateParam !== null) filter.state = stateParam as import("../control-plane/run-registry/run-control-types.js").RunControlState;
      if (limitRaw !== null) filter.limit = Math.max(1, parseInt(limitRaw, 10) || 50);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: listControlRuns(filter) }));
      return;
    }

    // ── Control Plane: get run + audit ──────────────────────────────────
    const controlRunMatch = req.url?.match(/^\/control\/runs\/([^/]+)$/);
    if (controlRunMatch && req.method === "GET") {
      const runId = decodeURIComponent(controlRunMatch[1]!);
      const record = getControlRun(runId);
      if (!record) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Run not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: record }));
      return;
    }

    // ── Control Plane: execute action ──────────────────────────────────
    const controlActionMatch = req.url?.match(/^\/control\/runs\/([^/]+)\/action$/);
    if (controlActionMatch && req.method === "POST") {
      const runId = decodeURIComponent(controlActionMatch[1]!);
      collectBody(req)
        .then(async (raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const action = body["action"] as ControlAction | undefined;
          // Accept new contract { actor, actorType, tenantId } and legacy { performedBy, approvalGranted }
          const actor = body["actor"] !== undefined ? String(body["actor"]).trim() : undefined;
          const actorType = body["actorType"] !== undefined ? String(body["actorType"]).trim() : undefined;
          const tenantId = body["tenantId"] !== undefined ? String(body["tenantId"]) : undefined;
          const performedByLegacy = body["performedBy"] !== undefined ? String(body["performedBy"]).trim() : undefined;
          const performedBy = actor ?? performedByLegacy ?? "system";
          const reason = body["reason"] !== undefined ? String(body["reason"]) : undefined;
          const approvalGranted = body["approvalGranted"] === true;
          if (!action) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "action is required" }));
            return;
          }
          // If new contract used (actor/actorType/tenantId provided), build full context
          if (actor !== undefined || tenantId !== undefined) {
            const ctx: import("../control-plane/run-registry/control-context.js").ControlActionContext = {
              agentId: performedBy,
              permissionLevel: 2,
              environment: (process.env.HERMES_ENVIRONMENT as "local" | "dev" | "staging" | "production") ?? "local",
              performedBy: actorType === "system" ? "system" : performedBy,
              ...(tenantId !== undefined ? { tenantId } : {}),
            };
            const result = await executeControlAction(runId, action, ctx, reason);
            const status = result.success ? 200 : result.requiresApproval ? 403 : result.blocked ? 403 : 400;
            res.writeHead(status, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: result.success, ...result }));
            return;
          }
          const result = await executeControlAction(runId, action, performedBy, reason, approvalGranted);
          const status = result.success ? 200 : result.requiresApproval ? 403 : result.blocked ? 403 : 400;
          res.writeHead(status, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: result.success, ...result }));
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── Control Plane: audit log for run ───────────────────────────────
    const controlAuditMatch = req.url?.match(/^\/control\/runs\/([^/]+)\/audit(?:\?(.*))?$/);
    if (controlAuditMatch && req.method === "GET") {
      const runId = decodeURIComponent(controlAuditMatch[1]!);
      const params = new URLSearchParams(controlAuditMatch[2] ?? "");
      const limitRaw = params.get("limit");
      const limit = limitRaw ? Math.max(1, parseInt(limitRaw, 10) || 100) : undefined;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, events: getAuditEvents(runId, limit) }));
      return;
    }

    // ── Control Plane: agent list ──────────────────────────────────────
    if (req.url === "/control/agents" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: listAgents() }));
      return;
    }

    // ── Cache: list namespace ──────────────────────────────────────────
    const cacheListMatch = req.url?.match(/^\/cache\/([^/?]+)(?:\?(.*))?$/);
    if (cacheListMatch && req.method === "GET" && !cacheListMatch[1]?.startsWith("audit")) {
      const namespace = decodeURIComponent(cacheListMatch[1]!) as CacheNamespace;
      const params = new URLSearchParams(cacheListMatch[2] ?? "");
      const tenantId = params.get("tenantId") ?? undefined;
      const entries = cacheList(namespace, tenantId ?? undefined);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, namespace, data: entries }));
      return;
    }

    // ── Cache: get entry by key ────────────────────────────────────────
    const cacheKeyMatch = req.url?.match(/^\/cache\/([^/]+)\/([^/?]+)(?:\?(.*))?$/);
    if (cacheKeyMatch && req.method === "GET" && cacheKeyMatch[1] !== "audit") {
      const namespace = decodeURIComponent(cacheKeyMatch[1]!) as CacheNamespace;
      const cacheKey = decodeURIComponent(cacheKeyMatch[2]!);
      const entries = cacheList(namespace);
      const entry = entries.find((e) => e.cacheKey === cacheKey);
      if (!entry) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Cache entry not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: entry }));
      return;
    }

    // ── Cache: lookup ──────────────────────────────────────────────────
    if (req.url === "/cache/lookup" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const result = cacheLookup({
            namespace: String(body["namespace"] ?? "") as CacheNamespace,
            cacheKey: String(body["cacheKey"] ?? ""),
            ...(body["tenantId"] !== undefined ? { tenantId: String(body["tenantId"]) } : {}),
            environment: (body["environment"] !== undefined ? String(body["environment"]) : "development") as CacheEnvironment,
            policyVersion: String(body["policyVersion"] ?? "cache-policy-v1"),
            ...(body["formulaVersion"] !== undefined ? { formulaVersion: String(body["formulaVersion"]) } : {}),
            ...(body["capabilityVersion"] !== undefined ? { capabilityVersion: String(body["capabilityVersion"]) } : {}),
            riskLevel: (body["riskLevel"] !== undefined ? String(body["riskLevel"]) : "low") as CacheRiskLevel,
            ...(body["approvalGranted"] === true ? { approvalGranted: true } : {}),
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, ...result }));
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── Cache: write ───────────────────────────────────────────────────
    if (req.url === "/cache/write" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const data = body["data"];
          const inputHash = String(body["inputHash"] ?? cacheHashInput(data));
          const entry = cacheWrite({
            namespace: String(body["namespace"] ?? "") as CacheNamespace,
            cacheKey: String(body["cacheKey"] ?? ""),
            ...(body["tenantId"] !== undefined ? { tenantId: String(body["tenantId"]) } : {}),
            inputHash,
            ...(body["formulaVersion"] !== undefined ? { formulaVersion: String(body["formulaVersion"]) } : {}),
            policyVersion: String(body["policyVersion"] ?? "cache-policy-v1"),
            ...(body["capabilityVersion"] !== undefined ? { capabilityVersion: String(body["capabilityVersion"]) } : {}),
            environment: (body["environment"] !== undefined ? String(body["environment"]) : "development") as CacheEnvironment,
            riskLevel: (body["riskLevel"] !== undefined ? String(body["riskLevel"]) : "low") as CacheRiskLevel,
            ttlSeconds: typeof body["ttlSeconds"] === "number" ? body["ttlSeconds"] : 3600,
            createdBy: String(body["createdBy"] ?? "hermes-api"),
            data,
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, data: entry }));
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── Cache: invalidate ──────────────────────────────────────────────
    if (req.url === "/cache/invalidate" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const count = cacheInvalidate({
            namespace: String(body["namespace"] ?? "") as CacheNamespace,
            ...(body["cacheKey"] !== undefined ? { cacheKey: String(body["cacheKey"]) } : {}),
            ...(body["tenantId"] !== undefined ? { tenantId: String(body["tenantId"]) } : {}),
            reason: String(body["reason"] ?? "manual invalidation"),
            performedBy: String(body["performedBy"] ?? "hermes-api"),
          });
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, invalidated: count }));
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── Cache: audit log ───────────────────────────────────────────────
    if (req.url === "/cache/audit" || req.url?.startsWith("/cache/audit?")) {
      const urlObj = new URL(req.url ?? "/cache/audit", "http://localhost");
      const namespaceParam = urlObj.searchParams.get("namespace");
      const tenantIdParam = urlObj.searchParams.get("tenantId");
      const cacheKeyParam = urlObj.searchParams.get("cacheKey");
      const limitRaw = urlObj.searchParams.get("limit");
      const events = getCacheAuditEvents({
        ...(namespaceParam !== null ? { namespace: namespaceParam as CacheNamespace } : {}),
        ...(tenantIdParam !== null ? { tenantId: tenantIdParam } : {}),
        ...(cacheKeyParam !== null ? { cacheKey: cacheKeyParam } : {}),
        ...(limitRaw !== null ? { limit: parseInt(limitRaw, 10) || 100 } : { limit: 100 }),
      });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, events }));
      return;
    }

    // ── Operating Core: health ─────────────────────────────────────────
    if (req.url === "/core/health" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          modules: {
            state: "v1",
            policy: "v1",
            events: "v1",
            schemas: "v1",
            idempotency: "v1",
            observability: "v1",
            commands: "v1",
          },
          timestamp: new Date().toISOString(),
        }),
      );
      return;
    }

    // ── Operating Core: state transitions table ───────────────────────
    if (req.url === "/core/state/transitions" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, transitions: VALID_RUN_STATE_TRANSITIONS }));
      return;
    }

    // ── Operating Core: validate transition ───────────────────────────
    if (req.url === "/core/state/validate" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const from = body["from"] as RunState | undefined;
          const to = body["to"] as RunState | undefined;
          const force = body["force"] === true;
          if (!from || !to) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "from and to are required" }));
            return;
          }
          const validation = validateStateTransition(from, to, force);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              ok: true,
              ...validation,
              terminal: isTerminalState(from),
              allowed: getAllowedRunStateTransitions(from),
            }),
          );
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── Operating Core: policy evaluate ───────────────────────────────
    if (req.url === "/core/policy/evaluate" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const action = String(body["action"] ?? "").trim();
          const environment = (body["environment"] as
            | "local"
            | "dev"
            | "staging"
            | "production"
            | undefined) ?? "local";
          const tenantId = body["tenantId"] !== undefined ? String(body["tenantId"]) : undefined;
          if (!action) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "action is required" }));
            return;
          }
          const result = evaluateActionRisk(action, environment, tenantId);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, ...result }));
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── Operating Core: events list ───────────────────────────────────
    const coreEventsListMatch = req.url?.match(/^\/core\/events(?:\?(.*))?$/);
    if (coreEventsListMatch && req.method === "GET") {
      const params = new URLSearchParams(coreEventsListMatch[1] ?? "");
      const filter: Parameters<typeof listSystemEvents>[0] = {};
      const cat = params.get("category");
      if (cat) filter.category = cat as Parameters<typeof listSystemEvents>[0] extends infer F ? F extends { category?: infer C } ? C : never : never;
      const runIdParam = params.get("runId");
      if (runIdParam) filter.runId = runIdParam;
      const tenantIdParam = params.get("tenantId");
      if (tenantIdParam) filter.tenantId = tenantIdParam;
      const limitRaw = params.get("limit");
      if (limitRaw) filter.limit = Math.max(1, parseInt(limitRaw, 10) || 100);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, events: listSystemEvents(filter) }));
      return;
    }

    // ── Operating Core: events by run ─────────────────────────────────
    const coreEventsRunMatch = req.url?.match(/^\/core\/events\/run\/([^/]+)$/);
    if (coreEventsRunMatch && req.method === "GET") {
      const runId = decodeURIComponent(coreEventsRunMatch[1]!);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, events: getEventsByRunId(runId) }));
      return;
    }

    // ── Operating Core: events by tenant ──────────────────────────────
    const coreEventsTenantMatch = req.url?.match(/^\/core\/events\/tenant\/([^/]+)$/);
    if (coreEventsTenantMatch && req.method === "GET") {
      const tenantId = decodeURIComponent(coreEventsTenantMatch[1]!);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, events: getEventsByTenantId(tenantId) }));
      return;
    }

    // ── Operating Core: replay run events ─────────────────────────────
    if (req.url === "/core/events/replay" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const runId = String(body["runId"] ?? "").trim();
          if (!runId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "runId is required" }));
            return;
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, events: replayRunEvents(runId) }));
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── Operating Core: schemas list ──────────────────────────────────
    if (req.url === "/core/schemas" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, schemas: listCoreSchemas() }));
      return;
    }

    // ── Operating Core: schema detail ─────────────────────────────────
    const coreSchemaMatch = req.url?.match(/^\/core\/schemas\/([^/]+)$/);
    if (coreSchemaMatch && req.method === "GET") {
      const name = decodeURIComponent(coreSchemaMatch[1]!);
      const reg = getCoreSchema(name);
      if (!reg) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Schema not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          ok: true,
          name: reg.name,
          version: reg.version,
          jsonSchema: exportJsonSchema(name),
        }),
      );
      return;
    }

    // ── Operating Core: idempotency check ─────────────────────────────
    if (req.url === "/core/idempotency/check" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const idempotencyKey = String(body["idempotencyKey"] ?? "").trim();
          const commandHash = String(body["commandHash"] ?? "").trim();
          if (!idempotencyKey || !commandHash) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "idempotencyKey and commandHash are required" }));
            return;
          }
          const result = checkIdempotency(idempotencyKey, commandHash);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, ...result }));
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── Operating Core: metrics snapshot ──────────────────────────────
    if (req.url === "/core/metrics" && req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, metrics: getMetricSnapshot() }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
  });

  const host = process.env.HERMES_BIND_HOST ?? "127.0.0.1";
  server.listen(p, host, () => {
    console.log(`${TAG} Status API listening on http://${host}:${p}/status`);
  });
}

/**
 * Stop the Hermes status API.
 */
export function stopHermesApi(): void {
  if (!server) return;
  server.close();
  server = null;
  console.log(`${TAG} Status API stopped.`);
}
