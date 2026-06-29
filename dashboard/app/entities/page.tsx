import Link from "next/link";
import { getEntityList } from "@/lib/api";
import type { NormalizedEntityType } from "@/lib/types";

export const dynamic = "force-dynamic";

const ENTITY_TYPES: NormalizedEntityType[] = [
  "tenant",
  "contact",
  "lead",
  "offer",
  "asset",
  "workflow",
  "knowledge_document",
];

const TYPE_LABELS: Record<NormalizedEntityType, string> = {
  tenant: "Tenants",
  contact: "Contacts",
  lead: "Leads",
  offer: "Offers",
  asset: "Assets",
  workflow: "Workflows",
  knowledge_document: "Knowledge Docs",
};

function lastUpdated(items: { updatedAt?: string }[]): string {
  const stamps = items
    .map((i) => i.updatedAt)
    .filter((v): v is string => typeof v === "string")
    .sort();
  const newest = stamps.at(-1);
  return newest ? new Date(newest).toLocaleString() : "—";
}

export default async function EntitiesPage({
  searchParams,
}: {
  searchParams?: Promise<{ type?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const summaries = await Promise.all(
    ENTITY_TYPES.map(async (type) => {
      const result = await getEntityList(type, { limit: 100 });
      return { type, count: result.count, data: result.data };
    }),
  );

  const totalEntities = summaries.reduce((sum, s) => sum + s.count, 0);
  const populated = summaries.filter((s) => s.count > 0).length;

  const selected = resolvedSearchParams?.type as NormalizedEntityType | undefined;
  const drilldown = selected
    ? summaries.find((s) => s.type === selected) ?? null
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Entities</h1>
        <p className="text-aj-text-muted text-sm mt-1">
          Normalized entities · L5 Data Normalization layer · 7 entity types
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-4">
          <p className="text-xs text-aj-text-muted uppercase tracking-wide">Total Entities</p>
          <p className="text-2xl font-bold text-aj-text mt-1">{totalEntities}</p>
        </div>
        <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-4">
          <p className="text-xs text-aj-text-muted uppercase tracking-wide">Populated Types</p>
          <p className="text-2xl font-bold text-aj-data mt-1">
            {populated}
            <span className="text-aj-text-muted text-sm font-normal"> / 7</span>
          </p>
        </div>
        <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-4">
          <p className="text-xs text-aj-text-muted uppercase tracking-wide">Schema Version</p>
          <p className="text-2xl font-bold text-aj-text mt-1">v1.0.0</p>
        </div>
      </div>

      <div className="bg-aj-surface-1 border border-aj-border rounded-lg overflow-hidden">
        {totalEntities === 0 ? (
          <p className="text-aj-text-muted text-sm p-6">
            No entities normalized yet. Use the CLI to normalize entities.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-aj-border bg-aj-surface-2">
              <tr>
                <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">
                  Entity Type
                </th>
                <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Count</th>
                <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr
                  key={s.type}
                  className="border-t border-aj-border hover:bg-aj-surface-2"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/entities?type=${s.type}`}
                      className="text-aj-data hover:text-aj-data font-medium"
                    >
                      {TYPE_LABELS[s.type]}
                    </Link>
                    <span className="text-aj-text-muted text-xs ml-2 font-mono">{s.type}</span>
                  </td>
                  <td className="px-4 py-2 text-aj-text font-mono">{s.count}</td>
                  <td className="px-4 py-2 text-aj-text-muted text-xs">{lastUpdated(s.data)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {drilldown && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-aj-text-secondary">
              {TYPE_LABELS[drilldown.type]} ({drilldown.count})
            </h2>
            <Link
              href="/entities"
              className="text-xs text-aj-text-muted hover:text-aj-text-secondary"
            >
              ← back to summary
            </Link>
          </div>
          <div className="bg-aj-surface-1 border border-aj-border rounded-lg overflow-hidden">
            {drilldown.data.length === 0 ? (
              <p className="text-aj-text-muted text-sm p-4">No records.</p>
            ) : (
              <pre className="text-xs text-aj-text-secondary p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
                {JSON.stringify(drilldown.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
