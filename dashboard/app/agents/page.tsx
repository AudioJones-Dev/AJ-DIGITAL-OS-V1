export const dynamic = "force-dynamic";

const HERMES_API_URL = process.env.HERMES_API_URL ?? "http://localhost:3001";

type PermissionLevel = 0 | 1 | 2 | 3 | 4 | 5;

interface AgentContext {
  agentId: string;
  permissionLevel: PermissionLevel;
  tenantId: string | null;
  allowedTools: string[];
  environment: string;
  capabilities: string[];
}

const RISK_LABELS: Record<PermissionLevel, { label: string; color: string }> = {
  0: { label: "read-only", color: "text-aj-text-secondary" },
  1: { label: "low", color: "text-aj-success" },
  2: { label: "medium", color: "text-aj-warning" },
  3: { label: "elevated", color: "text-orange-400" },
  4: { label: "high", color: "text-aj-critical" },
  5: { label: "critical", color: "text-aj-critical" },
};

async function fetchAgents(): Promise<AgentContext[]> {
  try {
    const res = await fetch(`${HERMES_API_URL}/control/agents`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json() as { ok: boolean; data: AgentContext[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function AgentsPage() {
  const agents = await fetchAgents();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Registered Agents</h1>

      {agents.length === 0 ? (
        <p className="text-aj-text-muted text-sm">No agents found.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-aj-border">
          <table className="w-full text-sm">
            <thead className="bg-aj-surface-1 border-b border-aj-border">
              <tr>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium">Name</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium">Type / Capabilities</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium">Status</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium">Risk</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((agent) => {
                const risk = RISK_LABELS[agent.permissionLevel] ?? { label: "unknown", color: "text-aj-text-secondary" };
                return (
                  <tr key={agent.agentId} className="border-b border-aj-border hover:bg-aj-surface-2">
                    <td className="px-4 py-2 font-mono text-xs text-aj-text">{agent.agentId}</td>
                    <td className="px-4 py-2 text-aj-text-secondary text-xs">{agent.capabilities.join(", ")}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded text-xs bg-aj-success/15 text-aj-success">active</span>
                    </td>
                    <td className={`px-4 py-2 text-xs font-medium ${risk.color}`}>
                      L{agent.permissionLevel} — {risk.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
