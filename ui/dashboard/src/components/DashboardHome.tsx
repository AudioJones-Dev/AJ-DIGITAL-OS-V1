import { useNavigate } from "react-router-dom";
import { usePolling } from "../hooks/use-polling";
import { fetchDashboardSummary, fetchRuns } from "../lib/queries";
import type { DashboardSummary, RunWithMission } from "../lib/types";
import {
  SummaryCard,
  PageHeader,
  StatusBadge,
  Spinner,
  ErrorBanner,
  DataTable,
  type Column,
} from "./shared";
import { HermesWidget } from "./HermesWidget";
import { RepairWidget } from "./RepairWidget";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const recentRunColumns: Column<RunWithMission>[] = [
  {
    key: "run_ref",
    header: "Run",
    render: (r) => <code style={{ fontSize: 12 }}>{r.run_ref}</code>,
  },
  {
    key: "mission",
    header: "Mission",
    render: (r) => r.missions?.mission_type ?? "—",
  },
  {
    key: "status",
    header: "Status",
    render: (r) => <StatusBadge value={r.status} />,
  },
  {
    key: "ok",
    header: "OK",
    width: "50px",
    render: (r) => (r.ok === null ? "—" : r.ok ? "✓" : "✗"),
  },
  {
    key: "summary",
    header: "Summary",
    render: (r) => (
      <span
        style={{
          display: "inline-block",
          maxWidth: 300,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          color: r.status === "failed" ? "#fca5a5" : "#cbd5e1",
        }}
      >
        {r.summary ?? "—"}
      </span>
    ),
  },
  {
    key: "started_at",
    header: "Started",
    render: (r) => formatDate(r.started_at),
  },
];

export function DashboardHome() {
  const navigate = useNavigate();
  const {
    data: summary,
    loading: summaryLoading,
    error: summaryError,
  } = usePolling<DashboardSummary>({
    fetcher: fetchDashboardSummary,
    interval: 15_000,
  });

  const { data: runs, error: runsError } = usePolling({
    fetcher: fetchRuns,
    interval: 10_000,
  });

  const recentFailed = runs?.filter((r) => r.status === "failed").slice(0, 8) ?? [];
  const recentCompleted = runs?.filter((r) => r.status === "completed").slice(0, 8) ?? [];

  const anyError = summaryError || runsError;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="AJ Digital OS — Operator Overview"
        right={
          <button
            onClick={() => navigate("/missions/new")}
            style={{
              padding: "8px 18px",
              borderRadius: 6,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            + Run Mission
          </button>
        }
      />

      {anyError && <ErrorBanner message={anyError} />}

      {/* Summary cards */}
      {summaryLoading && !summary ? (
        <Spinner />
      ) : summary ? (
        <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
          <SummaryCard label="Active Clients" value={summary.activeClients} accent="#3b82f6" />
          <SummaryCard label="Active Missions" value={summary.runningMissions} accent="#8b5cf6" />
          <SummaryCard label="Failed Runs" value={summary.failedRuns} accent={summary.failedRuns > 0 ? "#ef4444" : "#22c55e"} />
          <SummaryCard label="Deliverables (7d)" value={summary.deliverablesThisWeek} accent="#06b6d4" />
        </div>
      ) : null}

      {/* Hermes orchestrator status */}
      <HermesWidget />

      {/* Failure Auto-Repair */}
      <RepairWidget />

      {/* Recent failed runs */}
      <div style={{ marginBottom: 32 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>
          Recent Failed Runs
        </h3>
        {recentFailed.length > 0 ? (
          <div style={{ backgroundColor: "#1e293b", borderRadius: 12, padding: 16 }}>
            <DataTable columns={recentRunColumns} rows={recentFailed} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/runs/${r.id}`)} />
          </div>
        ) : (
          <div style={{ padding: 24, color: "#64748b", fontSize: 13, backgroundColor: "#1e293b", borderRadius: 12, textAlign: "center" }}>
            No recent failures — all clear.
          </div>
        )}
      </div>

      {/* Recent completed */}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 12 }}>
          Recently Completed
        </h3>
        {recentCompleted.length > 0 ? (
          <div style={{ backgroundColor: "#1e293b", borderRadius: 12, padding: 16 }}>
            <DataTable columns={recentRunColumns} rows={recentCompleted} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/runs/${r.id}`)} />
          </div>
        ) : (
          <div style={{ padding: 24, color: "#64748b", fontSize: 13, backgroundColor: "#1e293b", borderRadius: 12, textAlign: "center" }}>
            No recent completions.
          </div>
        )}
      </div>
    </div>
  );
}
