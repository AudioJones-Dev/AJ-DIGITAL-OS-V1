import { useMemo, useState } from "react";
import { usePolling } from "../hooks/use-polling";
import { fetchDeliverables } from "../lib/queries";
import type { Deliverable } from "../lib/types";
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

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "uploaded", label: "Uploaded" },
  { value: "published", label: "Published" },
  { value: "failed", label: "Failed" },
];

const columns: Column<Deliverable>[] = [
  {
    key: "filename",
    header: "Filename",
    render: (r) => <strong style={{ color: "#f1f5f9" }}>{r.filename}</strong>,
  },
  {
    key: "content_type",
    header: "Type",
    render: (r) => (
      <span style={{ fontSize: 12, color: "#94a3b8" }}>{r.content_type}</span>
    ),
  },
  {
    key: "size_bytes",
    header: "Size",
    render: (r) => formatBytes(r.size_bytes),
  },
  {
    key: "status",
    header: "Status",
    render: (r) => <StatusBadge value={r.status} />,
  },
  {
    key: "r2_key",
    header: "R2 Key",
    render: (r) => (
      <code style={{ fontSize: 11, maxWidth: 200, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {r.r2_key}
      </code>
    ),
  },
  {
    key: "public_url",
    header: "Link",
    render: (r) =>
      r.public_url ? (
        <a
          href={r.public_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "#60a5fa", fontSize: 12, textDecoration: "none" }}
        >
          Open ↗
        </a>
      ) : (
        "—"
      ),
  },
  {
    key: "created_at",
    header: "Created",
    render: (r) => new Date(r.created_at).toLocaleDateString(),
  },
];

export function DeliverablesView() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, loading, error } = usePolling({
    fetcher: fetchDeliverables,
    interval: 15_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.filename.toLowerCase().includes(q) ||
          d.content_type.toLowerCase().includes(q) ||
          d.r2_key.toLowerCase().includes(q),
      );
    }
    if (statusFilter) result = result.filter((d) => d.status === statusFilter);
    return result;
  }, [data, search, statusFilter]);

  return (
    <div>
      <PageHeader
        title="Deliverables"
        subtitle={data ? `${filtered.length} of ${data.length} outputs` : undefined}
      />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search deliverables…" />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
      </Toolbar>
      {error && <ErrorBanner message={error} />}
      {loading && !data ? (
        <Spinner />
      ) : filtered.length > 0 ? (
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} />
      ) : (
        <EmptyState message="No deliverables found." />
      )}
    </div>
  );
}
