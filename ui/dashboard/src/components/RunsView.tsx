import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePolling } from "../hooks/use-polling";
import { fetchRuns } from "../lib/queries";
import type { RunWithMission } from "../lib/types";
import {
  DataTable,
  StatusBadge,
  PageHeader,
  Spinner,
  EmptyState,
  ErrorBanner,
  SearchInput,
  FilterSelect,
  Toolbar,
  type Column,
} from "./shared";

function formatDuration(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}m`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" },
];

const triggerOptions = [
  { value: "", label: "All Triggers" },
  { value: "manual", label: "Manual" },
  { value: "cron", label: "Cron" },
  { value: "webhook", label: "Webhook" },
  { value: "hermes", label: "Hermes" },
];

const columns: Column<RunWithMission>[] = [
  {
    key: "run_ref",
    header: "Run Ref",
    render: (r) => (
      <code style={{ fontSize: 12 }}>{r.run_ref}</code>
    ),
  },
  {
    key: "mission_type",
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
    render: (r) =>
      r.ok === null ? "—" : r.ok ? <span style={{ color: "#6ee7b7" }}>✓</span> : <span style={{ color: "#fca5a5" }}>✗</span>,
  },
  {
    key: "trigger_type",
    header: "Trigger",
    render: (r) => <StatusBadge value={r.trigger_type} />,
  },
  {
    key: "requested_by",
    header: "Requested By",
    render: (r) => r.requested_by ?? "—",
  },
  {
    key: "duration_ms",
    header: "Duration",
    render: (r) => formatDuration(r.duration_ms),
  },
  {
    key: "summary",
    header: "Summary / Alerts",
    render: (r) => {
      const warnings: string[] = [];
      if (r.failure_ref) warnings.push(`failure: ${r.failure_ref}`);
      if (r.ok === false && r.summary) warnings.push(r.summary);

      return (
        <div>
          {r.summary && r.ok !== false && (
            <span
              style={{
                display: "inline-block",
                maxWidth: 260,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: "#cbd5e1",
              }}
            >
              {r.summary}
            </span>
          )}
          {warnings.map((w, i) => (
            <div
              key={i}
              style={{
                fontSize: 11,
                color: "#fca5a5",
                marginTop: 2,
              }}
            >
              ⚠ {w}
            </div>
          ))}
        </div>
      );
    },
  },
  {
    key: "started_at",
    header: "Started",
    render: (r) => formatDate(r.started_at),
  },
  {
    key: "artifacts",
    header: "Artifacts",
    render: (r) =>
      r.artifacts.length > 0 ? (
        <span style={{ fontSize: 12, color: "#60a5fa" }}>{r.artifacts.length} files</span>
      ) : (
        "—"
      ),
  },
];

export function RunsView() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [triggerFilter, setTriggerFilter] = useState("");

  const { data, loading, error } = usePolling({
    fetcher: fetchRuns,
    interval: 8_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.run_ref.toLowerCase().includes(q) ||
          (r.missions?.mission_type?.toLowerCase().includes(q) ?? false) ||
          (r.summary?.toLowerCase().includes(q) ?? false) ||
          (r.requested_by?.toLowerCase().includes(q) ?? false),
      );
    }
    if (statusFilter) result = result.filter((r) => r.status === statusFilter);
    if (triggerFilter) result = result.filter((r) => r.trigger_type === triggerFilter);
    return result;
  }, [data, search, statusFilter, triggerFilter]);

  // Count running
  const runningCount = data?.filter((r) => r.status === "running").length ?? 0;
  const failedCount = data?.filter((r) => r.status === "failed").length ?? 0;

  return (
    <div>
      <PageHeader
        title="Mission Runs"
        subtitle={
          data
            ? `${filtered.length} of ${data.length} runs${runningCount > 0 ? ` · ${runningCount} running` : ""}${failedCount > 0 ? ` · ${failedCount} failed` : ""}`
            : undefined
        }
        right={
          runningCount > 0 ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: 9999,
                backgroundColor: "#1e3a5f",
                color: "#7dd3fc",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#3b82f6",
                  animation: "pulse 1.5s infinite",
                }}
              />
              {runningCount} active
            </span>
          ) : undefined
        }
      />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search runs…" />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
        <FilterSelect value={triggerFilter} onChange={setTriggerFilter} options={triggerOptions} />
      </Toolbar>
      {error && <ErrorBanner message={error} />}
      {loading && !data ? (
        <Spinner />
      ) : filtered.length > 0 ? (
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} onRowClick={(r) => navigate(`/runs/${r.id}`)} />
      ) : (
        <EmptyState message="No runs found." />
      )}
    </div>
  );
}
