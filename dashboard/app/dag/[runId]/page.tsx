import { getDagRun, getDagAudit } from "@/lib/api";
import type { BelDagNode, BelDagAuditEvent } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const NODE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-zinc-700 text-zinc-300",
  running: "bg-green-900 text-green-200",
  completed: "bg-emerald-900 text-emerald-200",
  failed: "bg-red-950 text-red-300",
  skipped: "bg-zinc-800 text-zinc-500",
  waiting_for_approval: "bg-yellow-900 text-yellow-200",
};

const NODE_TYPE_COLORS: Record<string, string> = {
  input: "text-blue-400",
  transform: "text-purple-400",
  retrieve: "text-teal-400",
  score: "text-indigo-400",
  generate: "text-pink-400",
  tool_call: "text-orange-400",
  approval_gate: "text-yellow-400",
  publish: "text-green-400",
  audit: "text-zinc-400",
  attribution: "text-indigo-300",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-zinc-700 text-zinc-200",
  running: "bg-green-900 text-green-200",
  waiting_for_approval: "bg-yellow-900 text-yellow-200",
  completed: "bg-emerald-900 text-emerald-200",
  failed: "bg-red-950 text-red-300",
  cancelled: "bg-zinc-800 text-zinc-400",
};

export default async function DagRunDetailPage({ params }: { params: { runId: string } }) {
  const [run, audit] = await Promise.all([
    getDagRun(params.runId),
    getDagAudit(params.runId, 50),
  ]);

  if (!run) notFound();

  const completed = run.nodes.filter((n) => n.status === "completed").length;
  const failed = run.nodes.filter((n) => n.status === "failed").length;
  const pending = run.nodes.filter((n) => n.status === "pending").length;
  const running = run.nodes.filter((n) => n.status === "running").length;
  const pct = run.nodes.length > 0 ? Math.round((completed / run.nodes.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1">
            <a href="/dag" className="text-zinc-500 text-sm hover:text-zinc-300">← DAG Runs</a>
          </div>
          <h1 className="text-xl font-semibold">{run.name ?? run.dagId}</h1>
          <p className="font-mono text-zinc-500 text-xs mt-1">{run.runId}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[run.status] ?? "bg-zinc-700 text-zinc-200"}`}>
          {run.status}
        </span>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-500">Node Progress</p>
          <p className="text-xs text-zinc-400">{completed}/{run.nodes.length}</p>
        </div>
        <div className="bg-zinc-800 rounded-full h-2 mb-3">
          <div
            className={`h-2 rounded-full ${failed > 0 ? "bg-red-500" : "bg-indigo-500"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-emerald-400">✓ {completed} done</span>
          {running > 0 && <span className="text-green-400">▶ {running} running</span>}
          {pending > 0 && <span className="text-zinc-400">○ {pending} pending</span>}
          {failed > 0 && <span className="text-red-400">✗ {failed} failed</span>}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Nodes</h2>
        <div className="overflow-x-auto rounded-md border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 border-b border-zinc-800">
              <tr>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Node</th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Type</th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Status</th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Risk</th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Attempts</th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Completed</th>
                <th className="text-left px-4 py-2 text-zinc-400 font-medium text-xs">Error</th>
              </tr>
            </thead>
            <tbody>
              {run.nodes.map((node: BelDagNode) => (
                <tr key={node.nodeId} className="border-b border-zinc-800 hover:bg-zinc-900/50">
                  <td className="px-4 py-2">
                    <p className="text-sm text-zinc-200">{node.name}</p>
                    <p className="font-mono text-zinc-600 text-xs">{node.nodeId}</p>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-mono ${NODE_TYPE_COLORS[node.type] ?? "text-zinc-400"}`}>
                      {node.type}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${NODE_STATUS_COLORS[node.status] ?? "bg-zinc-700 text-zinc-200"}`}>
                      {node.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs ${node.riskLevel === "high" ? "text-red-400" : node.riskLevel === "medium" ? "text-yellow-400" : "text-zinc-500"}`}>
                      {node.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-400 text-xs">{node.attempts}/{node.maxAttempts}</td>
                  <td className="px-4 py-2 text-zinc-500 text-xs">
                    {node.completedAt ? new Date(node.completedAt).toLocaleTimeString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-red-400 text-xs max-w-[160px] truncate">
                    {node.error ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {run.edges && run.edges.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-zinc-300 mb-3">Edges</h2>
          <div className="flex flex-wrap gap-2">
            {run.edges.map((edge, i) => (
              <span key={i} className="bg-zinc-900 border border-zinc-800 rounded px-3 py-1 text-xs font-mono text-zinc-400">
                {edge.from} → {edge.to}
                {edge.condition && <span className="text-zinc-600"> [{edge.condition}]</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-zinc-300 mb-3">Audit Trail</h2>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
          {audit.length === 0 ? (
            <p className="text-zinc-600 text-sm p-4">No audit events.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/50">
                <tr>
                  <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Time</th>
                  <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Event</th>
                  <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Node</th>
                  <th className="text-left px-4 py-2 text-zinc-500 font-medium text-xs">Transition</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((ev: BelDagAuditEvent) => (
                  <tr key={ev.eventId} className="border-t border-zinc-800/50 hover:bg-zinc-800/20">
                    <td className="px-4 py-2 text-zinc-500 text-xs">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2 text-zinc-300 text-xs">{ev.event}</td>
                    <td className="px-4 py-2 text-zinc-500 text-xs font-mono">{ev.nodeId ?? "—"}</td>
                    <td className="px-4 py-2 text-zinc-500 text-xs">
                      {ev.fromStatus && ev.toStatus ? `${ev.fromStatus} → ${ev.toStatus}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
