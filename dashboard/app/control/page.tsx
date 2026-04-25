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
  queued: "bg-zinc-700 text-zinc-200",
  planning: "bg-blue-900 text-blue-200",
  running: "bg-green-900 text-green-200",
  waiting_for_approval: "bg-yellow-900 text-yellow-200",
  retrying: "bg-orange-900 text-orange-200",
  escalated: "bg-red-900 text-red-200",
  completed: "bg-emerald-900 text-emerald-200",
  failed: "bg-red-950 text-red-300",
  cancelled: "bg-zinc-800 text-zinc-400",
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
        <p className="text-zinc-500 text-sm">No control runs found.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium">Run ID</th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium">Agent</th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium">State</th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run) => (
                <tr key={run.runId} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                  <td className="px-4 py-2 font-mono text-xs text-zinc-300">
                    <a href={`/runs/${run.runId}`} className="hover:text-indigo-400">
                      {run.runId.slice(0, 12)}…
                    </a>
                  </td>
                  <td className="px-4 py-2 text-zinc-300">{run.agentId}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATE_COLORS[run.controlState] ?? "bg-zinc-700 text-zinc-200"}`}>
                      {run.controlState}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">{run.updatedAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
