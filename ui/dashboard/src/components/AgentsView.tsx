/**
 * AgentsView — Multica-style agent "teammates" page.
 *
 * Shows each AJ OS role as a visual agent card with status,
 * active mission count, and capabilities.
 *
 * Data: agent definitions (static) + run data (Supabase) for status.
 */

import type { CSSProperties } from "react";
import { usePolling } from "../hooks/use-polling";
import { fetchRuns } from "../lib/queries";
import { AGENT_DEFINITIONS, deriveAgentStatus } from "../lib/agents";
import type { AgentWithStatus } from "../lib/agents";
import type { RunWithMission } from "../lib/types";
import { PageHeader, Spinner, StatusBadge, ErrorBanner } from "./shared";
import { useViewMode } from "../lib/view-mode";

// ── Status colors ──────────────────────────────────────────────────

const statusColors: Record<string, string> = {
  idle: "#64748b",
  running: "#3b82f6",
  failed: "#ef4444",
  completed: "#22c55e",
};

// ── Component ──────────────────────────────────────────────────────

export function AgentsView() {
  const { isClient } = useViewMode();
  const { data: runs, loading, error } = usePolling<RunWithMission[]>({
    fetcher: fetchRuns,
    interval: 10_000,
  });

  const agents: AgentWithStatus[] = AGENT_DEFINITIONS.map((def) => {
    const runInfo = (runs ?? []).map((r) => ({
      roles_used: r.missions?.mission_type ? [mapTypeToRole(r.missions.mission_type)] : [],
      status: r.status,
    }));
    return deriveAgentStatus(def, runInfo);
  });

  if (loading && !runs) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={isClient ? "Your Team" : "Agents"}
        subtitle={isClient ? "AI assistants working on your tasks" : "Agent roles and their current status"}
      />
      {error && <ErrorBanner message={error} />}

      <div style={gridStyle}>
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} isClient={isClient} />
        ))}
      </div>
    </div>
  );
}

// ── Agent Card ─────────────────────────────────────────────────────

function AgentCard({ agent, isClient }: { agent: AgentWithStatus; isClient: boolean }) {
  const borderColor = statusColors[agent.status] ?? "#334155";

  return (
    <div style={{ ...cardStyle, borderLeftColor: borderColor }}>
      <div style={cardHeaderStyle}>
        <span style={{ fontSize: 28 }}>{agent.avatar}</span>
        <div style={{ flex: 1, marginLeft: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>
            {agent.name}
          </div>
          {!isClient && (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>
              role: {agent.role}
            </div>
          )}
        </div>
        <StatusBadge value={agent.status} />
      </div>

      <p style={descStyle}>{agent.description}</p>

      <div style={statsRow}>
        <StatPill
          label={isClient ? "Active tasks" : "Active missions"}
          value={agent.activeMissions}
          accent={agent.activeMissions > 0 ? "#3b82f6" : "#475569"}
        />
        {!isClient && agent.lastRunStatus && (
          <StatPill label="Last run" value={agent.lastRunStatus} />
        )}
      </div>

      {!isClient && (
        <div style={capsStyle}>
          {agent.capabilities.map((cap) => (
            <span key={cap} style={capBadge}>{cap}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function StatPill({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 11, color: "#64748b" }}>{label}:</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: accent ?? "#e2e8f0" }}>
        {value}
      </span>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function mapTypeToRole(missionType: string): string {
  const map: Record<string, string> = {
    build_and_review: "planner",
    extract_normalize_store: "executor",
    repair_failed_workflow: "monitor",
    monitor_only: "monitor",
  };
  return map[missionType] ?? "executor";
}

// ── Styles ─────────────────────────────────────────────────────────

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
  gap: 20,
};

const cardStyle: CSSProperties = {
  backgroundColor: "#1e293b",
  borderRadius: 12,
  padding: 20,
  borderLeft: "4px solid #334155",
  transition: "transform 0.15s, box-shadow 0.15s",
};

const cardHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
};

const descStyle: CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
  margin: "12px 0",
  lineHeight: 1.5,
};

const statsRow: CSSProperties = {
  display: "flex",
  gap: 20,
  marginBottom: 12,
};

const capsStyle: CSSProperties = {
  display: "flex",
  gap: 6,
  flexWrap: "wrap",
};

const capBadge: CSSProperties = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 6,
  fontSize: 11,
  backgroundColor: "#0f172a",
  color: "#64748b",
  border: "1px solid #334155",
};

export default AgentsView;
