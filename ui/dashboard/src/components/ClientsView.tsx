import { useMemo, useState } from "react";
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
  SearchInput,
  FilterSelect,
  Toolbar,
  type Column,
} from "./shared";

const statusOptions = [
  { value: "", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "archived", label: "Archived" },
];

const tierOptions = [
  { value: "", label: "All Tiers" },
  { value: "standard", label: "Standard" },
  { value: "professional", label: "Professional" },
  { value: "enterprise", label: "Enterprise" },
];

const columns: Column<Client>[] = [
  {
    key: "display_name",
    header: "Client",
    render: (r) => <strong style={{ color: "#f1f5f9" }}>{r.display_name}</strong>,
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
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");

  const { data, loading, error } = usePolling({
    fetcher: fetchClients,
    interval: 15_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.display_name.toLowerCase().includes(q) ||
          c.slug.toLowerCase().includes(q) ||
          (c.contact_email?.toLowerCase().includes(q) ?? false),
      );
    }
    if (statusFilter) result = result.filter((c) => c.status === statusFilter);
    if (tierFilter) result = result.filter((c) => c.tier === tierFilter);
    return result;
  }, [data, search, statusFilter, tierFilter]);

  return (
    <div>
      <PageHeader
        title="Clients"
        subtitle={data ? `${filtered.length} of ${data.length} clients` : undefined}
      />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search clients…" />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} />
        <FilterSelect value={tierFilter} onChange={setTierFilter} options={tierOptions} />
      </Toolbar>
      {error && <ErrorBanner message={error} />}
      {loading && !data ? (
        <Spinner />
      ) : filtered.length > 0 ? (
        <DataTable columns={columns} rows={filtered} rowKey={(r) => r.id} />
      ) : (
        <EmptyState message="No clients found." />
      )}
    </div>
  );
}
