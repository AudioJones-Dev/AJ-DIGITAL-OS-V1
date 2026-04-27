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
        <p className="text-zinc-500 text-sm mt-1">
          External tool drivers · L3 Connector layer · enable/disable governs runtime access
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Total</p>
          <p className="text-2xl font-bold text-zinc-100 mt-1">{connectors.length}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">Enabled</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{enabledCount}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide">High / Restricted</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{highRisk}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
        {connectors.length === 0 ? (
          <p className="text-zinc-500 text-sm p-6">
            No connectors registered. Run{" "}
            <code className="bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-300">
              node dist/cli.js connector-list
            </code>{" "}
            to initialize.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/50">
              <tr>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">ID</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">
                  Display Name
                </th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">
                  Provider
                </th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Risk</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">
                  Capabilities
                </th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Status</th>
                <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Actions</th>
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
