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
  type Column,
} from "./shared";

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1_048_576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

const columns: Column<Deliverable>[] = [
  {
    key: "filename",
    header: "Filename",
    render: (r) => <strong>{r.filename}</strong>,
  },
  {
    key: "content_type",
    header: "Type",
    render: (r) => (
      <span style={{ fontSize: 12, color: "#6b7280" }}>{r.content_type}</span>
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
          style={{ color: "#2563eb", fontSize: 12, textDecoration: "none" }}
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
  const { data, loading, error } = usePolling({
    fetcher: fetchDeliverables,
    interval: 15_000,
  });

  return (
    <div>
      <PageHeader
        title="Deliverables"
        subtitle={data ? `${data.length} outputs` : undefined}
      />
      {error && <ErrorBanner message={error} />}
      {loading && !data ? (
        <Spinner />
      ) : data && data.length > 0 ? (
        <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
      ) : (
        <EmptyState message="No deliverables found." />
      )}
    </div>
  );
}
