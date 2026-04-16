/**
 * Agent definitions for the Multica workspace UI.
 *
 * Maps AJ Digital OS roles to "teammate" agents displayed in the UI.
 * These are NOT new execution entities — they are visual abstractions
 * over existing AgentRoleKind / MissionRole values.
 */

import type { RunDbStatus } from "./types";

// ── Agent Definition ───────────────────────────────────────────────

export interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  description: string;
  avatar: string; // emoji for now
  capabilities: string[];
}

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: "architect",
    name: "Architect",
    role: "planner",
    description: "Decomposes objectives into executable plans. Uses high-intelligence models.",
    avatar: "🏗️",
    capabilities: ["planning", "strategy", "decomposition"],
  },
  {
    id: "operator",
    name: "Operator",
    role: "executor",
    description: "Executes tasks using local models or deterministic transforms.",
    avatar: "⚡",
    capabilities: ["execution", "transforms", "file-ops"],
  },
  {
    id: "auditor",
    name: "Auditor",
    role: "validator",
    description: "Validates outputs against rules. Deterministic, no model calls.",
    avatar: "🔍",
    capabilities: ["validation", "quality-checks", "rule-enforcement"],
  },
  {
    id: "sentinel",
    name: "Sentinel",
    role: "monitor",
    description: "Monitors system health and observes pipeline state.",
    avatar: "🛡️",
    capabilities: ["monitoring", "health-checks", "alerting"],
  },
];

// ── Agent Status (derived from runs) ───────────────────────────────

export type AgentStatus = "idle" | "running" | "failed" | "completed";

export interface AgentWithStatus extends AgentDefinition {
  status: AgentStatus;
  activeMissions: number;
  lastRunStatus: RunDbStatus | null;
}

/**
 * Derive agent status from run data.
 * A role is "running" if any run has the role active.
 */
export function deriveAgentStatus(
  agent: AgentDefinition,
  runsWithRoles: Array<{ roles_used: string[]; status: string }>,
): AgentWithStatus {
  const relevant = runsWithRoles.filter((r) =>
    r.roles_used.includes(agent.role) || r.roles_used.includes(agent.id),
  );

  const running = relevant.filter((r) => r.status === "running");
  const failed = relevant.filter((r) => r.status === "failed");
  const last = relevant[0]; // assume sorted desc

  let status: AgentStatus = "idle";
  if (running.length > 0) status = "running";
  else if (failed.length > 0 && (!last || last.status === "failed")) status = "failed";
  else if (last && last.status === "completed") status = "completed";

  return {
    ...agent,
    status,
    activeMissions: running.length,
    lastRunStatus: (last?.status as RunDbStatus) ?? null,
  };
}

// ── Kanban Column Mapping ──────────────────────────────────────────

export type KanbanColumn = "backlog" | "in_progress" | "review" | "completed" | "failed";

export const KANBAN_COLUMNS: { id: KanbanColumn; label: string; color: string }[] = [
  { id: "backlog", label: "Backlog", color: "#64748b" },
  { id: "in_progress", label: "In Progress", color: "#3b82f6" },
  { id: "review", label: "Review", color: "#f59e0b" },
  { id: "completed", label: "Completed", color: "#22c55e" },
  { id: "failed", label: "Failed", color: "#ef4444" },
];

/**
 * Map a mission + latest run status to a Kanban column.
 */
export function mapToKanbanColumn(
  missionStatus: string,
  latestRunStatus: string | null,
): KanbanColumn {
  if (latestRunStatus === "failed") return "failed";
  if (latestRunStatus === "completed") return "completed";
  if (latestRunStatus === "running") return "in_progress";
  if (latestRunStatus === "pending") return "review";
  if (missionStatus === "active") return "backlog";
  if (missionStatus === "paused") return "backlog";
  return "backlog";
}
