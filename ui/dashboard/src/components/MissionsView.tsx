import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  SearchInput,
  FilterSelect,
  Toolbar,
  type Column,
} from "./shared";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "retired", label: "Retired" },
];

const typeOptions = [
  { value: "", label: "All Types" },
  { value: "build_and_review", label: "Build & Review" },
  { value: "extract_normalize_store", label: "Extract/Normalize" },
  { value: "repair_failed_workflow", label: "Repair" },
  { value: "monitor_only", label: "Monitor" },
];

export function MissionsView() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

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

  // Filter missions
  const filtered = useMemo(() => {
    if (!missions) return [];
    let result = missions;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.objective.toLowerCase().includes(q) ||
          m.mission_type.toLowerCase().includes(q) ||
          (m.clients?.display_name?.toLowerCase().includes(q) ?? false),
      );
    }
    if (statusFilter) result = result.filter((m) => m.status === statusFilter);
    if (typeFilter) result = result.filter((m) => m.mission_type === typeFilter);
    return result;
  }, [missions, search, statusFilter, typeFilter]);

  // Group by client
  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; missions: MissionWithClient[] }>();
    for (const m of filtered) {
      const clientKey = m.clients?.slug ?? "__none__";
      const clientLabel = m.clients?.display_name ?? "No Client";
      if (!map.has(clientKey)) map.set(clientKey, { label: clientLabel, missions: [] });
      map.get(clientKey)!.missions.push(m);
    }
    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [filtered]);

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
        <span style={{ maxWidth: 280, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#e2e8f0" }}>
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
            <span style={{ color: "#64748b", fontSize: 12 }}>
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
                  backgroundColor: "#1e293b",
                  color: "#94a3b8",
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
        subtitle={missions ? `${filtered.length} of ${missions.length} missions` : undefined}
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
            + New Mission
          </button>
        }
      />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search missions…" />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
        <FilterSelect value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
      </Toolbar>
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
                color: "#94a3b8",
                borderBottom: "1px solid #1e293b",
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
              onRowClick={(r) => navigate(`/missions/${r.id}`)}
            />
          </div>
        ))
      ) : (
        <EmptyState message="No missions found." />
      )}
    </div>
  );
}
