import { usePolling } from "../hooks/use-polling";
import { fetchClients } from "../lib/queries";
import type { Client } from "../lib/types";
import {
  DataTable,
  StatusBadge,
  PageHeader,
  Spinner,
  EmptyState,
  ErrorBanner,
  type Column,
} from "./shared";

const columns: Column<Client>[] = [
  {
    key: "display_name",
    header: "Client",
    render: (r) => <strong>{r.display_name}</strong>,
  },
  { key: "slug", header: "Slug", render: (r) => <code>{r.slug}</code> },
  {
    key: "tier",
    header: "Tier",
    render: (r) => <StatusBadge value={r.tier} />,
  },
  {
    key: "status",
    header: "Status",
    render: (r) => <StatusBadge value={r.status} />,
  },
  {
    key: "contact_email",
    header: "Contact",
    render: (r) => r.contact_email ?? "—",
  },
  {
    key: "created_at",
    header: "Created",
    render: (r) => new Date(r.created_at).toLocaleDateString(),
  },
];

export function ClientsView() {
  const { data, loading, error } = usePolling({
    fetcher: fetchClients,
    interval: 15_000,
  });

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={data ? `${data.length} clients` : undefined}
      />
      {error && <ErrorBanner message={error} />}
      {loading && !data ? (
        <Spinner />
      ) : data && data.length > 0 ? (
        <DataTable columns={columns} rows={data} rowKey={(r) => r.id} />
      ) : (
        <EmptyState message="No clients found." />
      )}
    </div>
  );
}
