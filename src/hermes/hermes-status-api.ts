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
  evaluateMap,
  createCeraCycle,
  getCompoundScore,
} from "../decision/decision-engine.js";
import {
  saveEvaluation,
  getEvaluation,
  listEvaluations,
  saveCycle,
  getCycle,
  listCycles,
  appendDecisionAuditEvent,
  getDecisionAuditEvents,
} from "../decision/decision-store.js";
import {
  emitMapEvaluation,
  emitCeraCycle,
  emitCompoundScore,
} from "../decision/decision-attribution.js";
import { applyDecisionPolicy, validateProductionTenant } from "../decision/decision-policy.js";
import type {
  CeraSignals,
  DecisionCategory,
  DecisionEnvironment,
  DecisionInput,
} from "../decision/decision-types.js";

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
          const performedBy = String(body["performedBy"] ?? "system").trim();
          const reason = body["reason"] !== undefined ? String(body["reason"]) : undefined;
          const approvalGranted = body["approvalGranted"] === true;
          if (!action) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "action is required" }));
            return;
          }
          const result = await executeControlAction(runId, action, performedBy, reason, approvalGranted);
          const status = result.success ? 200 : result.requiresApproval ? 403 : 400;
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

    // ── Decision: MAP evaluate ─────────────────────────────────────────
    if (req.url === "/decision/map/evaluate" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const title = String(body["title"] ?? "").trim();
          const description = String(body["description"] ?? "").trim();
          const category = body["category"] as DecisionCategory | undefined;
          const meaningfulScore = Number(body["meaningfulScore"] ?? 0);
          const actionableScore = Number(body["actionableScore"] ?? 0);
          const profitableScore = Number(body["profitableScore"] ?? 0);
          const createdBy = String(body["createdBy"] ?? "system").trim() || "system";
          const environment = (body["environment"] as DecisionEnvironment | undefined) ?? "local";

          if (!title || !description || !category) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "title, description, category are required" }));
            return;
          }

          const input: DecisionInput = {
            title,
            description,
            category,
            meaningfulScore,
            actionableScore,
            profitableScore,
            createdBy,
            environment,
            ...(body["tenantId"] !== undefined ? { tenantId: String(body["tenantId"]) } : {}),
            ...(body["runId"] !== undefined ? { runId: String(body["runId"]) } : {}),
            ...(body["policyVersion"] !== undefined ? { policyVersion: String(body["policyVersion"]) } : {}),
            ...(typeof body["aeoScore"] === "number" ? { aeoScore: body["aeoScore"] as number } : {}),
          };

          const tenantCheck = validateProductionTenant(input);
          if (!tenantCheck.ok) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: tenantCheck.reason }));
            return;
          }

          const evaluation = evaluateMap(input);
          saveEvaluation(evaluation);
          appendDecisionAuditEvent({
            evaluationId: evaluation.evaluationId,
            event: "map_evaluation_created",
            actorId: createdBy,
            ...(evaluation.tenantId !== undefined ? { tenantId: evaluation.tenantId } : {}),
            payload: {
              mapScore: evaluation.mapScore,
              decisionBand: evaluation.decisionBand,
              decision: evaluation.decision,
              category: evaluation.category,
            },
          });
          emitMapEvaluation(evaluation);

          const actorTypeRaw = body["actorType"];
          const actorType =
            actorTypeRaw === "system" || actorTypeRaw === "user" || actorTypeRaw === "agent"
              ? (actorTypeRaw as "system" | "user" | "agent")
              : undefined;
          const policy = applyDecisionPolicy(evaluation, {
            ...(actorType !== undefined ? { actorType } : {}),
            ...(body["forceExecute"] === true ? { forceExecute: true } : {}),
          });

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, data: evaluation, policy }));
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── Decision: list MAP evaluations ─────────────────────────────────
    if ((req.url === "/decision/map/evaluations" || req.url?.startsWith("/decision/map/evaluations?")) && req.method === "GET") {
      const urlObj = new URL(req.url ?? "/decision/map/evaluations", "http://localhost");
      const tenantId = urlObj.searchParams.get("tenantId");
      const limitRaw = urlObj.searchParams.get("limit");
      const filter: Parameters<typeof listEvaluations>[0] = {};
      if (tenantId !== null) filter.tenantId = tenantId;
      if (limitRaw !== null) filter.limit = Math.max(1, parseInt(limitRaw, 10) || 50);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: listEvaluations(filter) }));
      return;
    }

    // ── Decision: get evaluation by id ─────────────────────────────────
    const mapEvalMatch = req.url?.match(/^\/decision\/map\/evaluations\/([^/]+)$/);
    if (mapEvalMatch && req.method === "GET") {
      const evaluationId = decodeURIComponent(mapEvalMatch[1]!);
      const record = getEvaluation(evaluationId);
      if (!record) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Evaluation not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: record }));
      return;
    }

    // ── Decision: CERA create cycle ────────────────────────────────────
    if (req.url === "/decision/cera/cycle" && req.method === "POST") {
      collectBody(req)
        .then((raw) => {
          const body = JSON.parse(raw) as Record<string, unknown>;
          const evaluationId = String(body["evaluationId"] ?? "").trim();
          if (!evaluationId) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "evaluationId is required" }));
            return;
          }
          const evaluation = getEvaluation(evaluationId);
          if (!evaluation) {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: "Evaluation not found" }));
            return;
          }

          const toStringArray = (v: unknown): string[] =>
            Array.isArray(v) ? v.map((x) => String(x)).filter(Boolean) : [];

          const signals: CeraSignals = {
            captureSignals: toStringArray(body["captureSignals"]),
            extractedInsights: toStringArray(body["extractedInsights"]),
            refinementActions: toStringArray(body["refinementActions"]),
            amplificationActions: toStringArray(body["amplificationActions"]),
            ...(body["tenantId"] !== undefined ? { tenantId: String(body["tenantId"]) } : {}),
            ...(body["runId"] !== undefined ? { runId: String(body["runId"]) } : {}),
          };

          const cycle = createCeraCycle(evaluation, signals);
          saveCycle(cycle);
          appendDecisionAuditEvent({
            evaluationId: cycle.evaluationId,
            cycleId: cycle.cycleId,
            event: "cera_cycle_created",
            ...(cycle.tenantId !== undefined ? { tenantId: cycle.tenantId } : {}),
            payload: {
              ceraEfficiencyScore: cycle.ceraEfficiencyScore,
              compoundScore: cycle.compoundScore,
              decisionPath: cycle.decisionPath,
            },
          });
          emitCeraCycle(cycle);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, data: cycle }));
        })
        .catch((err: unknown) => {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "Bad request" }));
        });
      return;
    }

    // ── Decision: list cycles ──────────────────────────────────────────
    if ((req.url === "/decision/cera/cycles" || req.url?.startsWith("/decision/cera/cycles?")) && req.method === "GET") {
      const urlObj = new URL(req.url ?? "/decision/cera/cycles", "http://localhost");
      const tenantId = urlObj.searchParams.get("tenantId");
      const evaluationId = urlObj.searchParams.get("evaluationId");
      const limitRaw = urlObj.searchParams.get("limit");
      const filter: Parameters<typeof listCycles>[0] = {};
      if (tenantId !== null) filter.tenantId = tenantId;
      if (evaluationId !== null) filter.evaluationId = evaluationId;
      if (limitRaw !== null) filter.limit = Math.max(1, parseInt(limitRaw, 10) || 50);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: listCycles(filter) }));
      return;
    }

    // ── Decision: get cycle by id ──────────────────────────────────────
    const ceraCycleMatch = req.url?.match(/^\/decision\/cera\/cycles\/([^/]+)$/);
    if (ceraCycleMatch && req.method === "GET") {
      const cycleId = decodeURIComponent(ceraCycleMatch[1]!);
      const record = getCycle(cycleId);
      if (!record) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Cycle not found" }));
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: record }));
      return;
    }

    // ── Decision: compound score for evaluation ────────────────────────
    const compoundMatch = req.url?.match(/^\/decision\/compound\/([^/]+)$/);
    if (compoundMatch && req.method === "GET") {
      const evaluationId = decodeURIComponent(compoundMatch[1]!);
      const evaluation = getEvaluation(evaluationId);
      if (!evaluation) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "Evaluation not found" }));
        return;
      }
      const cycles = listCycles({ evaluationId, limit: 1 });
      const cycle = cycles[0];
      if (!cycle) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: false, error: "No CERA cycle for evaluation" }));
        return;
      }
      const score = getCompoundScore(evaluation, cycle);
      appendDecisionAuditEvent({
        evaluationId: evaluation.evaluationId,
        cycleId: cycle.cycleId,
        event: "compound_score_created",
        ...(evaluation.tenantId !== undefined ? { tenantId: evaluation.tenantId } : {}),
        payload: {
          mapScore: score.mapScore,
          ceraEfficiencyScore: score.ceraEfficiencyScore,
          compoundScore: score.compoundScore,
          decisionPath: score.decisionPath,
        },
      });
      emitCompoundScore(score, evaluation.runId);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, data: score }));
      return;
    }

    // ── Decision: audit log ────────────────────────────────────────────
    if ((req.url === "/decision/audit" || req.url?.startsWith("/decision/audit?")) && req.method === "GET") {
      const urlObj = new URL(req.url ?? "/decision/audit", "http://localhost");
      const evaluationId = urlObj.searchParams.get("evaluationId");
      const cycleId = urlObj.searchParams.get("cycleId");
      const event = urlObj.searchParams.get("event");
      const limitRaw = urlObj.searchParams.get("limit");
      const filter: Parameters<typeof getDecisionAuditEvents>[0] = {};
      if (evaluationId !== null) filter.evaluationId = evaluationId;
      if (cycleId !== null) filter.cycleId = cycleId;
      if (event !== null) filter.event = event;
      if (limitRaw !== null) filter.limit = Math.max(1, parseInt(limitRaw, 10) || 100);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, events: getDecisionAuditEvents(filter) }));
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
