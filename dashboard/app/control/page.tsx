export const dynamic = "force-dynamic";

const HERMES_API_URL = process.env.HERMES_API_URL ?? "http://localhost:3001";

type RunControlState =
  | "queued" | "planning" | "running" | "waiting_for_approval"
  | "retrying" | "escalated" | "completed" | "failed" | "cancelled";

interface ControlRunRecord {
  runId: string;
  agentId: string;
  controlState: RunControlState;
  previousState?: RunControlState;
  createdAt: string;
  updatedAt: string;
  approvedBy?: string;
  cancelledBy?: string;
}

const STATE_COLORS: Record<RunControlState, string> = {
  queued: "bg-aj-surface-3 text-aj-text",
  planning: "bg-aj-data/15 text-aj-data",
  running: "bg-aj-success/15 text-aj-success",
  waiting_for_approval: "bg-aj-warning/15 text-aj-warning",
  retrying: "bg-orange-900 text-orange-200",
  escalated: "bg-aj-critical/15 text-aj-critical",
  completed: "bg-aj-success/15 text-aj-success",
  failed: "bg-aj-critical/15 text-aj-critical",
  cancelled: "bg-aj-surface-2 text-aj-text-secondary",
};

async function fetchControlRuns(): Promise<ControlRunRecord[]> {
  try {
    const res = await fetch(`${HERMES_API_URL}/control/runs`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json() as { ok: boolean; data: ControlRunRecord[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function ControlPage() {
  const runs = await fetchControlRuns();

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Control Plane</h1>

      {runs.length === 0 ? (
        <p className="text-aj-text-muted text-sm">No control runs found.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-aj-border">
          <table className="w-full text-sm">
            <thead className="bg-aj-surface-1 border-b border-aj-border">
              <tr>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium">Run ID</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium">Agent</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium">State</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.runId} className="border-b border-aj-border hover:bg-aj-surface-2">
                  <td className="px-4 py-2 font-mono text-xs text-aj-text-secondary">
                    <a href={`/runs/${run.runId}`} className="hover:text-aj-data">
                      {run.runId.slice(0, 12)}…
                    </a>
                  </td>
                  <td className="px-4 py-2 text-aj-text-secondary">{run.agentId}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATE_COLORS[run.controlState] ?? "bg-aj-surface-3 text-aj-text"}`}>
                      {run.controlState}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-aj-text-muted text-xs">{run.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
