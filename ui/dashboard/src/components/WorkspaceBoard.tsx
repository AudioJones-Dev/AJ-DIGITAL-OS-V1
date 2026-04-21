/**
 * WorkspaceBoard — Multica-style Kanban board.
 *
 * Maps AJ OS missions → Kanban cards across columns:
 *   Backlog | In Progress | Review | Completed | Failed
 *
 * Each card is a mission, colored by latest run status.
 * Links through to Run Detail / Replay / Repair.
 *
 * Data: Supabase missions + runs.
 */

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { usePolling } from "../hooks/use-polling";
import { fetchMissions, fetchRuns } from "../lib/queries";
import { KANBAN_COLUMNS, mapToKanbanColumn } from "../lib/agents";
import type { KanbanColumn } from "../lib/agents";
import type { MissionWithClient, RunWithMission } from "../lib/types";
import { PageHeader, Spinner, ErrorBanner, StatusBadge } from "./shared";
import { useViewMode } from "../lib/view-mode";

// ── Types ──────────────────────────────────────────────────────────

interface KanbanCard {
  mission: MissionWithClient;
  latestRun: RunWithMission | null;
  column: KanbanColumn;
}

// ── Component ──────────────────────────────────────────────────────

export function WorkspaceBoard() {
  const { isClient } = useViewMode();

  const { data: missions, loading: ml, error: me } = usePolling<MissionWithClient[]>({
    fetcher: fetchMissions,
    interval: 12_000,
  });

  const { data: runs, loading: rl, error: re } = usePolling<RunWithMission[]>({
    fetcher: fetchRuns,
    interval: 10_000,
  });

  // Build run lookup: mission_id → latest run
  const runByMission = useMemo(() => {
    const map = new Map<string, RunWithMission>();
    for (const r of runs ?? []) {
      if (!map.has(r.mission_id)) map.set(r.mission_id, r);
    }
    return map;
  }, [runs]);

  // Build Kanban cards
  const cards: KanbanCard[] = useMemo(() => {
    return (missions ?? []).map((m) => {
      const latest = runByMission.get(m.id) ?? null;
      const column = mapToKanbanColumn(m.status, latest?.status ?? null);
      return { mission: m, latestRun: latest, column };
    });
  }, [missions, runByMission]);

  // Group by column
  const columns = useMemo(() => {
    const groups = new Map<KanbanColumn, KanbanCard[]>();
    for (const col of KANBAN_COLUMNS) groups.set(col.id, []);
    for (const card of cards) {
      groups.get(card.column)?.push(card);
    }
    return groups;
  }, [cards]);

  if ((ml || rl) && !missions && !runs) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={isClient ? "Task Board" : "Workspace Board"}
        subtitle={isClient
          ? "Track your tasks and their progress"
          : "Kanban view of all missions across the pipeline"
        }
      />
      {(me || re) && <ErrorBanner message={(me ?? re)!} />}

      <div style={boardStyle}>
        {KANBAN_COLUMNS.map((col) => {
          // In client mode, hide the "Failed" column
          if (isClient && col.id === "failed") return null;

          const colCards = columns.get(col.id) ?? [];
          return (
            <div key={col.id} style={columnStyle}>
              <div style={columnHeaderStyle}>
                <span style={{ ...columnDot, backgroundColor: col.color }} />
                <span style={{ fontWeight: 600, fontSize: 13, color: "#f1f5f9" }}>
                  {col.label}
                </span>
                <span style={countBadge}>{colCards.length}</span>
              </div>
              <div style={columnBody}>
                {colCards.length === 0 && (
                  <div style={emptyCol}>No tasks</div>
                )}
                {colCards.map((card) => (
                  <TaskCard
                    key={card.mission.id}
                    card={card}
                    isClient={isClient}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Task Card ──────────────────────────────────────────────────────

function TaskCard({ card, isClient }: { card: KanbanCard; isClient: boolean }) {
  const { mission: m, latestRun: r } = card;

  const handleClick = () => {
    if (r) {
      window.location.href = `/runs/${r.id}`;
    } else {
      window.location.href = `/missions/${m.id}`;
    }
  };

  // Map mission type to a friendly name for client mode
  const typeLabel = isClient
    ? friendlyType(m.mission_type)
    : m.mission_type;

  return (
    <div
      style={taskCardStyle}
      onClick={handleClick}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#334155"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "#64748b" }}>{typeLabel}</span>
        {r && <StatusBadge value={r.status} />}
      </div>

      <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", marginBottom: 6, lineHeight: 1.4 }}>
        {m.objective.length > 80 ? m.objective.slice(0, 77) + "…" : m.objective}
      </div>

      {!isClient && m.clients && (
        <div style={{ fontSize: 11, color: "#64748b" }}>
          {m.clients.display_name}
        </div>
      )}

      {r && (
        <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 11, color: "#475569" }}>
          {r.duration_ms !== null && <span>{(r.duration_ms / 1000).toFixed(1)}s</span>}
          {r.trigger_type && !isClient && <span>{r.trigger_type}</span>}
          {r.ok !== null && (
            <span style={{ color: r.ok ? "#22c55e" : "#ef4444" }}>
              {r.ok ? "passed" : "failed"}
            </span>
          )}
        </div>
      )}

      {/* Links row */}
      <div style={linksRow}>
        {r && (
          <a
            href={`/runs/${r.id}`}
            style={linkStyle}
            onClick={(e) => e.stopPropagation()}
          >
            {isClient ? "Details" : "Run Detail"}
          </a>
        )}
        {!isClient && r && r.status === "failed" && (
          <a
            href={`/runs/${r.id}`}
            style={{ ...linkStyle, color: "#f87171" }}
            onClick={(e) => e.stopPropagation()}
          >
            Repair
          </a>
        )}
      </div>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────

function friendlyType(type: string): string {
  const map: Record<string, string> = {
    build_and_review: "Build & Review",
    extract_normalize_store: "Extract & Store",
    repair_failed_workflow: "Repair",
    monitor_only: "Health Check",
  };
  return map[type] ?? type;
}

// ── Styles ─────────────────────────────────────────────────────────

const boardStyle: CSSProperties = {
  display: "flex",
  gap: 16,
  overflowX: "auto",
  paddingBottom: 16,
};

const columnStyle: CSSProperties = {
  flex: "1 1 0",
  minWidth: 240,
  maxWidth: 320,
};

const columnHeaderStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 12px",
  marginBottom: 8,
};

const columnDot: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: "50%",
};

const countBadge: CSSProperties = {
  marginLeft: "auto",
  fontSize: 11,
  fontWeight: 600,
  color: "#64748b",
  backgroundColor: "#0f172a",
  padding: "1px 8px",
  borderRadius: 999,
};

const columnBody: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 10,
  minHeight: 200,
  padding: 8,
  backgroundColor: "#0f172a40",
  borderRadius: 10,
};

const emptyCol: CSSProperties = {
  textAlign: "center",
  padding: 24,
  color: "#475569",
  fontSize: 12,
};

const taskCardStyle: CSSProperties = {
  backgroundColor: "#1e293b",
  borderRadius: 10,
  padding: 14,
  border: "1px solid #334155",
  cursor: "pointer",
  transition: "border-color 0.15s",
};

const linksRow: CSSProperties = {
  display: "flex",
  gap: 12,
  marginTop: 8,
  borderTop: "1px solid #1e293b50",
  paddingTop: 8,
};

const linkStyle: CSSProperties = {
  fontSize: 11,
  color: "#38bdf8",
  textDecoration: "none",
};

export default WorkspaceBoard;
