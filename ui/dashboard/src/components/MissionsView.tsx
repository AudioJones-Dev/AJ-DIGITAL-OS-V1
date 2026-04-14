import { useMemo } from "react";
import { usePolling } from "../hooks/use-polling";
import { fetchMissions, fetchRuns } from "../lib/queries";
import type { MissionWithClient, RunWithMission } from "../lib/types";
import {
  DataTable,
  StatusBadge,
  PageHeader,
  Spinner,
  EmptyState,
  ErrorBanner,
  type Column,
} from "./shared";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function MissionsView() {
  const { data: missions, loading, error } = usePolling({
    fetcher: fetchMissions,
    interval: 12_000,
  });

  const { data: runs } = usePolling({
    fetcher: fetchRuns,
    interval: 12_000,
  });

  // Index: last run per mission_id
  const lastRunMap = useMemo(() => {
    const map = new Map<string, RunWithMission>();
    if (!runs) return map;
    for (const r of runs) {
      if (!map.has(r.mission_id)) map.set(r.mission_id, r);
    }
    return map;
  }, [runs]);

  // Group missions by client
  const grouped = useMemo(() => {
    if (!missions) return [];
    const map = new Map<string, { label: string; missions: MissionWithClient[] }>();
    for (const m of missions) {
      const clientKey = m.clients?.slug ?? "__none__";
      const clientLabel = m.clients?.display_name ?? "No Client";
      if (!map.has(clientKey)) map.set(clientKey, { label: clientLabel, missions: [] });
      map.get(clientKey)!.missions.push(m);
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [missions]);

  const columns: Column<MissionWithClient>[] = [
    {
      key: "mission_type",
      header: "Type",
      render: (r) => <code>{r.mission_type}</code>,
    },
    {
      key: "objective",
      header: "Objective",
      render: (r) => (
        <span style={{ maxWidth: 320, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {r.objective}
        </span>
      ),
    },
    {
      key: "priority",
      header: "Priority",
      render: (r) => <StatusBadge value={r.priority} />,
    },
    {
      key: "status",
      header: "Status",
      render: (r) => <StatusBadge value={r.status} />,
    },
    {
      key: "last_run",
      header: "Last Run",
      render: (r) => {
        const last = lastRunMap.get(r.id);
        if (!last) return "—";
        return (
          <span>
            <StatusBadge value={last.status} />{" "}
            <span style={{ color: "#6b7280", fontSize: 12 }}>
              {formatDate(last.started_at)}
            </span>
          </span>
        );
      },
    },
    {
      key: "tags",
      header: "Tags",
      render: (r) =>
        r.tags.length > 0
          ? r.tags.map((t) => (
              <span
                key={t}
                style={{
                  display: "inline-block",
                  margin: "0 3px 2px 0",
                  padding: "1px 6px",
                  borderRadius: 4,
                  fontSize: 11,
                  backgroundColor: "#f3f4f6",
                  color: "#374151",
                }}
              >
                {t}
              </span>
            ))
          : "—",
    },
  ];

  return (
    <div>
      <PageHeader
        title="Missions"
        subtitle={missions ? `${missions.length} missions` : undefined}
      />
      {error && <ErrorBanner message={error} />}
      {loading && !missions ? (
        <Spinner />
      ) : grouped.length > 0 ? (
        grouped.map((group) => (
          <div key={group.label} style={{ marginBottom: 32 }}>
            <h3
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: "#374151",
                borderBottom: "1px solid #e5e7eb",
                paddingBottom: 6,
                marginBottom: 8,
              }}
            >
              {group.label}
            </h3>
            <DataTable
              columns={columns}
              rows={group.missions}
              rowKey={(r) => r.id}
            />
          </div>
        ))
      ) : (
        <EmptyState message="No missions found." />
      )}
    </div>
  );
}
