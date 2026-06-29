import { getEntityList } from "@/lib/api";
import type { NormalizedOffer, NormalizedAsset } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-aj-surface-3 text-aj-text-secondary",
  active: "bg-emerald-900 text-emerald-300",
  archived: "bg-aj-surface-2 text-aj-text-muted",
  review: "bg-yellow-900 text-yellow-300",
  approved: "bg-emerald-900 text-emerald-300",
  published: "bg-blue-900 text-blue-300",
  rejected: "bg-red-900 text-red-300",
  pending: "bg-yellow-900 text-yellow-300",
};

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-aj-text-secondary">{title}</h2>
        <p className="text-xs text-aj-text-muted mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message, cli }: { message: string; cli?: string }) {
  return (
    <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-8 text-center">
      <p className="text-aj-text-muted text-sm">{message}</p>
      {cli && <p className="text-aj-text-muted text-xs mt-2 font-mono">{cli}</p>}
    </div>
  );
}

export default async function AppsPage() {
  const [offersRaw, assetsRaw] = await Promise.allSettled([
    getEntityList("offer"),
    getEntityList("asset"),
  ]);

  const offers = (offersRaw.status === "fulfilled" ? offersRaw.value : []) as NormalizedOffer[];
  const assets = (assetsRaw.status === "fulfilled" ? assetsRaw.value : []) as NormalizedAsset[];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-xl font-semibold">Application Layer</h1>
        <p className="text-aj-text-muted text-sm mt-1">Offer Engine · Diagnostic Engine · Content Engine</p>
      </div>

      {/* Offer Engine */}
      <Section
        title="Offer Engine"
        subtitle="Creates and governs service offers using MAP-CERA + Governance"
      >
        {offers.length === 0 ? (
          <EmptyState
            message="No offers created yet."
            cli="node dist/cli.js offer-create --title 'Strategy Audit' --type audit --price 1500 --currency USD --deliverables 'report,recs' --createdBy ops"
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-aj-border">
            <table className="w-full text-sm">
              <thead className="bg-aj-surface-1 border-b border-aj-border">
                <tr>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Title</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Type</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Price</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Status</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Governance</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">MAP</th>
                </tr>
              </thead>
              <tbody>
                {offers.slice(0, 10).map((offer) => (
                  <tr key={offer.entityId} className="border-b border-aj-border hover:bg-aj-surface-2">
                    <td className="px-4 py-2 text-aj-text text-sm truncate max-w-[200px]">{offer.title}</td>
                    <td className="px-4 py-2 text-aj-text-secondary text-xs font-mono">{offer.type}</td>
                    <td className="px-4 py-2 text-emerald-400 text-xs font-mono">
                      {offer.currency} {offer.price?.toLocaleString()}
                    </td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[offer.status] ?? "bg-aj-surface-3 text-aj-text-secondary"}`}>
                        {offer.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {offer.governanceStatus && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[offer.governanceStatus] ?? "bg-aj-surface-3 text-aj-text-secondary"}`}>
                          {offer.governanceStatus}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-aj-data text-xs font-mono">
                      {offer.mapScore !== undefined ? `${offer.mapScore}/9` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Diagnostic Engine */}
      <Section
        title="Diagnostic Engine"
        subtitle="Analyzes business constraints and recommends actions using Intelligence + Retrieval layers"
      >
        <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-6">
          <p className="text-aj-text-secondary text-sm mb-4">
            The Diagnostic Engine searches your knowledge base, scores opportunities with AEO, and runs MAP evaluations on proposed actions to identify the highest-leverage changes.
          </p>
          <div className="space-y-2">
            <p className="text-xs text-aj-text-muted font-medium uppercase tracking-wider">Example usage</p>
            <div className="bg-aj-base rounded p-3 font-mono text-xs text-aj-text-secondary space-y-1">
              <p>node dist/cli.js diagnose \</p>
              <p className="pl-4">--description "Lead conversion is slow due to manual follow-up" \</p>
              <p className="pl-4">--category lead_gen \</p>
              <p className="pl-4">--proposedActions "automate,shorten-form" \</p>
              <p className="pl-4">--json</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center">
            {[
              { label: "Search Namespaces", value: "9" },
              { label: "Scoring Formula", value: "AEO v1" },
              { label: "Decision Engine", value: "MAP-CERA" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-aj-surface-2 rounded p-3">
                <p className="text-xs text-aj-text-muted">{label}</p>
                <p className="text-sm font-bold text-aj-data mt-1">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* Content Engine */}
      <Section
        title="Content Engine"
        subtitle="Manages content briefs, production workflows, and publication via DAG + Governance"
      >
        {assets.length === 0 ? (
          <EmptyState
            message="No content briefs created yet."
            cli="node dist/cli.js content-brief --title 'Q1 Update' --description 'Quarterly update' --contentType blog_post --channel blog --createdBy writer"
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-aj-border">
            <table className="w-full text-sm">
              <thead className="bg-aj-surface-1 border-b border-aj-border">
                <tr>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Title</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Type</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Status</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Channel</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Words</th>
                  <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Created</th>
                </tr>
              </thead>
              <tbody>
                {assets.slice(0, 10).map((asset) => (
                  <tr key={asset.entityId} className="border-b border-aj-border hover:bg-aj-surface-2">
                    <td className="px-4 py-2 text-aj-text text-sm truncate max-w-[200px]">{asset.title}</td>
                    <td className="px-4 py-2 text-aj-text-secondary text-xs font-mono">{asset.type}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[asset.status] ?? "bg-aj-surface-3 text-aj-text-secondary"}`}>
                        {asset.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-aj-text-muted text-xs">{asset.channel ?? "—"}</td>
                    <td className="px-4 py-2 text-aj-text-muted text-xs">{asset.wordCount ?? "—"}</td>
                    <td className="px-4 py-2 text-aj-text-muted text-xs">
                      {new Date(asset.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}
