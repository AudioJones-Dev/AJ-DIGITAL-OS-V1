import { getConnectors } from "@/lib/api";
import ConnectorRow from "@/components/ConnectorRow";

export const dynamic = "force-dynamic";

export default async function ConnectorsPage() {
  const connectors = await getConnectors();

  const enabledCount = connectors.filter((c) => c.enabled).length;
  const highRisk = connectors.filter(
    (c) => c.riskLevel === "high" || c.riskLevel === "restricted",
  ).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Connectors</h1>
        <p className="text-aj-text-muted text-sm mt-1">
          External tool drivers · L3 Connector layer · enable/disable governs runtime access
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-4">
          <p className="text-xs text-aj-text-muted uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-aj-text mt-1">{connectors.length}</p>
        </div>
        <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-4">
          <p className="text-xs text-aj-text-muted uppercase tracking-wide">Enabled</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{enabledCount}</p>
        </div>
        <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-4">
          <p className="text-xs text-aj-text-muted uppercase tracking-wide">High / Restricted</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{highRisk}</p>
        </div>
      </div>

      <div className="bg-aj-surface-1 border border-aj-border rounded-lg overflow-hidden">
        {connectors.length === 0 ? (
          <p className="text-aj-text-muted text-sm p-6">
            No connectors registered. Run{" "}
            <code className="bg-aj-surface-2 px-1.5 py-0.5 rounded text-aj-text-secondary">
              node dist/cli.js connector-list
            </code>{" "}
            to initialize.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-aj-border bg-aj-surface-2">
              <tr>
                <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">ID</th>
                <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">
                  Display Name
                </th>
                <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">
                  Provider
                </th>
                <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Risk</th>
                <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">
                  Capabilities
                </th>
                <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Status</th>
                <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Actions</th>
              </tr>
            </thead>
            <tbody>
              {connectors.map((c) => (
                <ConnectorRow key={c.id} connector={c} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
