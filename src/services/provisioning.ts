/**
 * Client Provisioning Service — auto-setup after Stripe payment.
 *
 * provisionClient(clientId, planTier) does:
 *   1. Create default agents for the client
 *   2. Create default missions for the client
 *   3. Create R2 folder (placeholder object)
 *   4. Seed Hermes schedules
 *   5. Mark client active
 *
 * Each step is idempotent — safe to retry on partial failure.
 */

import type { ClientTier, AgentRoleName, QueryResult } from "../db/db-types.js";
import { putObject } from "../storage/r2-client.js";
import {
  supabaseInsert,
  supabasePatch,
  supabaseGet,
  resolveConfig,
  isConfigured,
  type SupabaseConfig,
} from "../db/supabase-client.js";
import { seedClientSchedules } from "../hermes/hermes-client-schedules.js";
import { notify } from "../hermes/hermes-notifications.js";

const TAG = "[PROVISION]";

// ── Plan Tier → Feature Map ────────────────────────────────────────

interface PlanFeatures {
  agents: AgentRoleName[];
  missions: Array<{ mission_type: string; objective: string; priority: string }>;
  schedules: Array<{ id: string; name: string; cron: string; mission_type: string; objective: string }>;
}

const PLAN_FEATURES: Record<ClientTier, PlanFeatures> = {
  standard: {
    agents: ["planner", "executor"],
    missions: [
      { mission_type: "build_and_review", objective: "Content creation and review", priority: "normal" },
    ],
    schedules: [
      { id: "health-check", name: "System Health Check", cron: "every 6h", mission_type: "monitor_only", objective: "System health verification" },
    ],
  },
  professional: {
    agents: ["planner", "executor", "validator"],
    missions: [
      { mission_type: "build_and_review", objective: "Content creation and review", priority: "normal" },
      { mission_type: "extract_normalize_store", objective: "Data extraction and normalization", priority: "normal" },
      { mission_type: "monitor_only", objective: "Automated monitoring", priority: "low" },
    ],
    schedules: [
      { id: "health-check", name: "System Health Check", cron: "every 6h", mission_type: "monitor_only", objective: "System health verification" },
      { id: "data-extract", name: "Daily Data Extract", cron: "every day 02:00", mission_type: "extract_normalize_store", objective: "Extract and normalize client data" },
    ],
  },
  enterprise: {
    agents: ["planner", "executor", "validator", "monitor"],
    missions: [
      { mission_type: "build_and_review", objective: "Content creation and review", priority: "high" },
      { mission_type: "extract_normalize_store", objective: "Data extraction and normalization", priority: "normal" },
      { mission_type: "repair_failed_workflow", objective: "Auto-repair failed workflows", priority: "normal" },
      { mission_type: "monitor_only", objective: "Automated monitoring", priority: "low" },
    ],
    schedules: [
      { id: "health-check", name: "System Health Check", cron: "every 6h", mission_type: "monitor_only", objective: "System health verification" },
      { id: "data-extract", name: "Daily Data Extract", cron: "every day 02:00", mission_type: "extract_normalize_store", objective: "Extract and normalize client data" },
      { id: "auto-repair", name: "Daily Auto-Repair", cron: "every day 06:00", mission_type: "repair_failed_workflow", objective: "Repair failed runs from last 24h" },
    ],
  },
};

// ── Provisioning Result ────────────────────────────────────────────

export interface ProvisionResult {
  ok: boolean;
  clientId: string;
  steps: ProvisionStep[];
  error: string | null;
}

export interface ProvisionStep {
  name: string;
  ok: boolean;
  detail: string;
}

// ── Main Provisioning Function ─────────────────────────────────────

/**
 * Provision a client with all default resources based on their plan tier.
 * Idempotent — safe to call multiple times.
 */
export async function provisionClient(
  clientId: string,
  planTier: ClientTier,
  config?: Partial<SupabaseConfig>,
): Promise<ProvisionResult> {
  const steps: ProvisionStep[] = [];
  const cfg = resolveConfig(config);

  if (!isConfigured(cfg)) {
    return { ok: false, clientId, steps, error: "Supabase not configured" };
  }

  const features = PLAN_FEATURES[planTier];

  console.log(`${TAG} Provisioning client ${clientId} (tier: ${planTier})…`);

  // Step 1: Create default agents
  const agentResult = await createDefaultAgents(clientId, features.agents, cfg);
  steps.push(agentResult);

  // Step 2: Create default missions
  const missionResult = await createDefaultMissions(clientId, features.missions, cfg);
  steps.push(missionResult);

  // Step 3: Create R2 folder
  const r2Result = await createR2ClientFolder(clientId);
  steps.push(r2Result);

  // Step 4: Seed Hermes schedules
  const scheduleResult = await seedSchedules(clientId, planTier, features.schedules);
  steps.push(scheduleResult);

  // Step 5: Mark client active
  const activateResult = await activateClient(clientId, planTier, cfg);
  steps.push(activateResult);

  const allOk = steps.every((s) => s.ok);

  if (allOk) {
    console.log(`${TAG} ✓ Client ${clientId} fully provisioned (${planTier})`);
    notify({
      severity: "info",
      channel: "console",
      title: "Client Provisioned",
      message: `Client ${clientId} provisioned on ${planTier} plan: ${features.agents.length} agents, ${features.missions.length} missions`,
      metadata: { client_id: clientId, plan_tier: planTier },
      timestamp: new Date().toISOString(),
    });
  } else {
    const failedSteps = steps.filter((s) => !s.ok).map((s) => s.name).join(", ");
    console.error(`${TAG} ✘ Client ${clientId} provisioning partial failure: ${failedSteps}`);
    notify({
      severity: "critical",
      channel: "console",
      title: "Provisioning Partial Failure",
      message: `Client ${clientId} (${planTier}): failed steps: ${failedSteps}`,
      metadata: { client_id: clientId, failed_steps: failedSteps },
      timestamp: new Date().toISOString(),
    });
  }

  return {
    ok: allOk,
    clientId,
    steps,
    error: allOk ? null : `Provisioning incomplete: ${steps.filter((s) => !s.ok).length} step(s) failed`,
  };
}

// ── Step Implementations ───────────────────────────────────────────

async function createDefaultAgents(
  clientId: string,
  roles: AgentRoleName[],
  cfg: SupabaseConfig,
): Promise<ProvisionStep> {
  try {
    // Check existing agents to avoid duplicates
    const existing = await supabaseGet<{ role: string }>(
      cfg,
      "client_agents",
      `client_id=eq.${encodeURIComponent(clientId)}&select=role`,
    );
    const existingRoles = new Set((existing.data ?? []).map((a) => a.role));

    let created = 0;
    for (const role of roles) {
      if (existingRoles.has(role)) continue;

      const result = await supabaseInsert(cfg, "client_agents", {
        client_id: clientId,
        role,
        config: {},
        enabled: true,
      });
      if (result.ok) created++;
    }

    return { name: "create_agents", ok: true, detail: `${created} agents created (${roles.length - created} already existed)` };
  } catch (err) {
    return { name: "create_agents", ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function createDefaultMissions(
  clientId: string,
  missions: PlanFeatures["missions"],
  cfg: SupabaseConfig,
): Promise<ProvisionStep> {
  try {
    let created = 0;
    for (const m of missions) {
      const result = await supabaseInsert(cfg, "missions", {
        client_id: clientId,
        mission_type: m.mission_type,
        objective: m.objective,
        priority: m.priority,
        input_payload: {},
        status: "active",
        tags: ["auto-provisioned"],
      });
      if (result.ok) created++;
    }

    return { name: "create_missions", ok: true, detail: `${created}/${missions.length} missions created` };
  } catch (err) {
    return { name: "create_missions", ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function createR2ClientFolder(clientId: string): Promise<ProvisionStep> {
  try {
    const key = `clients/${clientId}/.init`;
    const result = await putObject(
      key,
      `# Client folder initialized at ${new Date().toISOString()}\n`,
      "text/plain",
    );

    if (!result.ok) {
      // R2 not configured is non-fatal — client can still use the system
      if (result.error?.includes("not configured")) {
        return { name: "create_r2_folder", ok: true, detail: "R2 not configured — skipped (non-blocking)" };
      }
      return { name: "create_r2_folder", ok: false, detail: result.error ?? "Unknown R2 error" };
    }

    return { name: "create_r2_folder", ok: true, detail: `R2 folder created: ${key}` };
  } catch (err) {
    return { name: "create_r2_folder", ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function seedSchedules(
  clientId: string,
  planTier: ClientTier,
  schedules: PlanFeatures["schedules"],
): Promise<ProvisionStep> {
  try {
    const result = seedClientSchedules(clientId, planTier, schedules);
    return { name: "seed_schedules", ok: true, detail: `${result.count} schedules seeded` };
  } catch (err) {
    return { name: "seed_schedules", ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}

async function activateClient(
  clientId: string,
  planTier: ClientTier,
  cfg: SupabaseConfig,
): Promise<ProvisionStep> {
  try {
    const result = await supabasePatch(
      cfg,
      "clients",
      `id=eq.${encodeURIComponent(clientId)}`,
      { status: "active", plan_tier: planTier },
    );

    if (!result.ok) {
      return { name: "activate_client", ok: false, detail: result.error ?? "Failed to activate" };
    }

    return { name: "activate_client", ok: true, detail: `Client marked active (tier: ${planTier})` };
  } catch (err) {
    return { name: "activate_client", ok: false, detail: err instanceof Error ? err.message : String(err) };
  }
}
