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
      r.ok === null ? "—" : r.ok ? "✓" : "✗",
  },
  {
    key: "trigger_type",
    header: "Trigger",
    render: (r) => <StatusBadge value={r.trigger_type} />,
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
                maxWidth: 280,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
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
                color: "#dc2626",
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
        <span style={{ fontSize: 12, color: "#2563eb" }}>{r.artifacts.length} files</span>
      ) : (
        "—"
      ),
  },
];

export function RunsView() {
  const { data, loading, error } = usePolling({
    fetcher: fetchRuns,
    interval: 8_000,
  });

  // Count running
  const runningCount = data?.filter((r) => r.status === "running").length ?? 0;

  return (
    <div>
      <PageHeader
        title="Mission Runs"
        subtitle={
          data
            ? `${data.length} runs${runningCount > 0 ? ` · ${runningCount} running` : ""}`
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
                backgroundColor: "#dbeafe",
                color: "#1e40af",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#2563eb",
                  animation: "pulse 1.5s infinite",
                }}
              />
              {runningCount} active
            </span>
          ) : undefined
        }
      />
      {error && <ErrorBanner message={error} />}
      {loading && !data ? (
        <Spinner />
      ) : data && data.length > 0 ? (
        <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
      ) : (
        <EmptyState message="No runs found." />
      )}
    </div>
  );
}
