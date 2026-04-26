import { getDagRuns } from "@/lib/api";
import type { BelDagRunState } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-zinc-700 text-zinc-200",
  running: "bg-green-900 text-green-200",
  waiting_for_approval: "bg-yellow-900 text-yellow-200",
  completed: "bg-emerald-900 text-emerald-200",
  failed: "bg-red-950 text-red-300",
  cancelled: "bg-zinc-800 text-zinc-400",
};

export default async function DagPage() {
  const runs = await getDagRuns({ limit: 50 });

  const byStatus = runs.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">BEL v4 DAG Runs</h1>
        <p className="text-zinc-500 text-sm mt-1">Graph-based workflow execution</p>
      </div>

      {/* Status breakdown */}
      {runs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byStatus).map(([status, count]) => (
            <span
              key={status}
              className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? "bg-zinc-700 text-zinc-200"}`}
            >
              {status} · {count}
            </span>
          ))}
        </div>
      )}

      {/* Runs table */}
      {runs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-zinc-500 text-sm">No DAG runs yet.</p>
          <p className="text-zinc-700 text-xs mt-2">Use the CLI: node dist/cli.js dag-create --file plan.json</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Run ID</th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Name</th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Status</th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Nodes</th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Progress</th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Created</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((run: BelDagRunState) => {
                const completed = run.nodes.filter((n) => n.status === "completed").length;
                const failed = run.nodes.filter((n) => n.status === "failed").length;
                const pct = run.nodes.length > 0
                  ? Math.round((completed / run.nodes.length) * 100)
                  : 0;

                return (
                  <tr key={run.runId} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                    <td className="px-4 py-2">
                      <a
                        href={`/dag/${run.runId}`}
                        className="font-mono text-xs text-zinc-300 hover:text-indigo-400"
                      >
                        {run.runId.slice(0, 14)}…
                      </a>
                    </td>
                    <td className="px-4 py-2 text-zinc-300 text-xs">{run.name ?? run.dagId}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[run.status] ?? "bg-zinc-700 text-zinc-200"}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-zinc-400 text-xs">{run.nodes.length}</td>
                    <td className="px-4 py-2 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-zinc-800 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${failed > 0 ? "bg-red-500" : "bg-indigo-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-zinc-500">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-zinc-500 text-xs">
                      {new Date(run.createdAt).toLocaleString()}
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
