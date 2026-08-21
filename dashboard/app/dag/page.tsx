import { getDagRuns } from "@/lib/api";
import type { BelDagRunState } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-aj-surface-3 text-aj-text",
  running: "bg-aj-success/15 text-aj-success",
  waiting_for_approval: "bg-aj-warning/15 text-aj-warning",
  completed: "bg-aj-success/15 text-aj-success",
  failed: "bg-aj-critical/15 text-aj-critical",
  cancelled: "bg-aj-surface-2 text-aj-text-secondary",
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
        <p className="text-aj-text-muted text-sm mt-1">Graph-based workflow execution</p>
      </div>

      {/* Status breakdown */}
      {runs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(byStatus).map(([status, count]) => (
            <span
              key={status}
              className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? "bg-aj-surface-3 text-aj-text"}`}
            >
              {status} · {count}
            </span>
          ))}
        </div>
      )}

      {/* Runs table */}
      {runs.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-aj-text-muted text-sm">No DAG runs yet.</p>
          <p className="text-aj-text-muted text-xs mt-2">Use the CLI: node dist/cli.js dag-create --file plan.json</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-aj-border">
          <table className="w-full text-sm">
            <thead className="bg-aj-surface-1 border-b border-aj-border">
              <tr>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Run ID</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Name</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Status</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Nodes</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Progress</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Created</th>
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
                  <tr key={run.runId} className="border-b border-aj-border hover:bg-aj-surface-2">
                    <td className="px-4 py-2">
                      <a
                        href={`/dag/${run.runId}`}
                        className="font-mono text-xs text-aj-text-secondary hover:text-aj-data"
                      >
                        {run.runId.slice(0, 14)}…
                      </a>
                    </td>
                    <td className="px-4 py-2 text-aj-text-secondary text-xs">{run.name ?? run.dagId}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[run.status] ?? "bg-aj-surface-3 text-aj-text"}`}>
                        {run.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-aj-text-secondary text-xs">{run.nodes.length}</td>
                    <td className="px-4 py-2 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-aj-surface-2 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${failed > 0 ? "bg-aj-critical" : "bg-aj-data"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs text-aj-text-muted">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2 text-aj-text-muted text-xs">
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
