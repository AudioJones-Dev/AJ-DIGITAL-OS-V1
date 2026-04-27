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
  searchParams?: { type?: string };
}) {
  const summaries = await Promise.all(
    ENTITY_TYPES.map(async (type) => {
      const result = await getEntityList(type, { limit: 100 });
      return { type, count: result.count, data: result.data };
    }),
  );

  const totalEntities = summaries.reduce((sum, s) => sum + s.count, 0);
  const populated = summaries.filter((s) => s.count > 0).length;

  const selected = searchParams?.type as NormalizedEntityType | undefined;
  const drilldown = selected
    ? summaries.find((s) => s.type === selected) ?? null
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Entities</h1>
        <p className="text-zinc-500 text-sm mt-1">
          Normalized entities · L5 Data Normalization layer · 7 entity types
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Total Entities</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{totalEntities}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Populated Types</p>
          <p className="text-2xl font-bold text-indigo-400 mt-1">
            {populated}
            <span className="text-zinc-500 text-sm font-normal"> / 7</span>
          </p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Schema Version</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">v1.0.0</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {totalEntities === 0 ? (
          <p className="text-zinc-500 text-sm p-6">
            No entities normalized yet. Use the CLI to normalize entities.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/50">
              <tr>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">
                  Entity Type
                </th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Count</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {summaries.map((s) => (
                <tr
                  key={s.type}
                  className="border-t border-zinc-800/50 hover:bg-zinc-800/20"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/entities?type=${s.type}`}
                      className="text-indigo-400 hover:text-indigo-300 font-medium"
                    >
                      {TYPE_LABELS[s.type]}
                    </Link>
                    <span className="text-zinc-600 text-xs ml-2 font-mono">{s.type}</span>
                  </td>
                  <td className="px-4 py-2 text-zinc-200 font-mono">{s.count}</td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">{lastUpdated(s.data)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {drilldown && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-300">
              {TYPE_LABELS[drilldown.type]} ({drilldown.count})
            </h2>
            <Link
              href="/entities"
              className="text-xs text-zinc-500 hover:text-zinc-300"
            >
              ← back to summary
            </Link>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
            {drilldown.data.length === 0 ? (
              <p className="text-zinc-500 text-sm p-4">No records.</p>
            ) : (
              <pre className="text-xs text-zinc-300 p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
                {JSON.stringify(drilldown.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
