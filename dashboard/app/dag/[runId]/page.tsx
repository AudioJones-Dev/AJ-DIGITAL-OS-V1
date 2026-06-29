import { getDagRun, getDagAudit } from "@/lib/api";
import type { BelDagNode, BelDagAuditEvent } from "@/lib/types";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

const NODE_STATUS_COLORS: Record<string, string> = {
  pending: "bg-aj-surface-3 text-aj-text-secondary",
  running: "bg-aj-success/15 text-aj-success",
  completed: "bg-aj-success/15 text-aj-success",
  failed: "bg-aj-critical/15 text-aj-critical",
  skipped: "bg-aj-surface-2 text-aj-text-muted",
  waiting_for_approval: "bg-aj-warning/15 text-aj-warning",
};

const NODE_TYPE_COLORS: Record<string, string> = {
  input: "text-aj-data",
  transform: "text-purple-400",
  retrieve: "text-teal-400",
  score: "text-aj-data",
  generate: "text-pink-400",
  tool_call: "text-orange-400",
  approval_gate: "text-aj-warning",
  publish: "text-aj-success",
  audit: "text-aj-text-secondary",
  attribution: "text-aj-data",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-aj-surface-3 text-aj-text",
  running: "bg-aj-success/15 text-aj-success",
  waiting_for_approval: "bg-aj-warning/15 text-aj-warning",
  completed: "bg-aj-success/15 text-aj-success",
  failed: "bg-aj-critical/15 text-aj-critical",
  cancelled: "bg-aj-surface-2 text-aj-text-secondary",
};

export default async function DagRunDetailPage({ params }: { params: Promise<{ runId: string }> }) {
  const { runId } = await params;
  const [run, audit] = await Promise.all([
    getDagRun(runId),
    getDagAudit(runId, 50),
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
            <a href="/dag" className="text-aj-text-muted text-sm hover:text-aj-text-secondary">← DAG Runs</a>
          </div>
          <h1 className="text-xl font-semibold">{run.name ?? run.dagId}</h1>
          <p className="font-mono text-aj-text-muted text-xs mt-1">{run.runId}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[run.status] ?? "bg-aj-surface-3 text-aj-text"}`}>
          {run.status}
        </span>
      </div>

      <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-aj-text-muted">Node Progress</p>
          <p className="text-xs text-aj-text-secondary">{completed}/{run.nodes.length}</p>
        </div>
        <div className="bg-aj-surface-2 rounded-full h-2 mb-3">
          <div
            className={`h-2 rounded-full ${failed > 0 ? "bg-aj-critical" : "bg-aj-data"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex gap-4 text-xs">
          <span className="text-aj-success">✓ {completed} done</span>
          {running > 0 && <span className="text-aj-success">▶ {running} running</span>}
          {pending > 0 && <span className="text-aj-text-secondary">○ {pending} pending</span>}
          {failed > 0 && <span className="text-aj-critical">✗ {failed} failed</span>}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-aj-text-secondary mb-3">Nodes</h2>
        <div className="overflow-x-auto rounded-md border border-aj-border">
          <table className="w-full text-sm">
            <thead className="bg-aj-surface-1 border-b border-aj-border">
              <tr>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Node</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Type</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Status</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Risk</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Attempts</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Completed</th>
                <th className="text-left px-4 py-2 text-aj-text-secondary font-medium text-xs">Error</th>
              </tr>
            </thead>
            <tbody>
              {run.nodes.map((node: BelDagNode) => (
                <tr key={node.nodeId} className="border-b border-aj-border hover:bg-aj-surface-2">
                  <td className="px-4 py-2">
                    <p className="text-sm text-aj-text">{node.name}</p>
                    <p className="font-mono text-aj-text-muted text-xs">{node.nodeId}</p>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs font-mono ${NODE_TYPE_COLORS[node.type] ?? "text-aj-text-secondary"}`}>
                      {node.type}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${NODE_STATUS_COLORS[node.status] ?? "bg-aj-surface-3 text-aj-text"}`}>
                      {node.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs ${node.riskLevel === "high" ? "text-aj-critical" : node.riskLevel === "medium" ? "text-aj-warning" : "text-aj-text-muted"}`}>
                      {node.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-aj-text-secondary text-xs">{node.attempts}/{node.maxAttempts}</td>
                  <td className="px-4 py-2 text-aj-text-muted text-xs">
                    {node.completedAt ? new Date(node.completedAt).toLocaleTimeString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-aj-critical text-xs max-w-[160px] truncate">
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
          <h2 className="text-sm font-semibold text-aj-text-secondary mb-3">Edges</h2>
          <div className="flex flex-wrap gap-2">
            {run.edges.map((edge, i) => (
              <span key={i} className="bg-aj-surface-1 border border-aj-border rounded px-3 py-1 text-xs font-mono text-aj-text-secondary">
                {edge.from} → {edge.to}
                {edge.condition && <span className="text-aj-text-muted"> [{edge.condition}]</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-aj-text-secondary mb-3">Audit Trail</h2>
        <div className="bg-aj-surface-1 border border-aj-border rounded-lg overflow-hidden">
          {audit.length === 0 ? (
            <p className="text-aj-text-muted text-sm p-4">No audit events.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-aj-border bg-aj-surface-2">
                <tr>
                  <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Time</th>
                  <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Event</th>
                  <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Node</th>
                  <th className="text-left px-4 py-2 text-aj-text-muted font-medium text-xs">Transition</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((ev: BelDagAuditEvent) => (
                  <tr key={ev.eventId} className="border-t border-aj-border hover:bg-aj-surface-2">
                    <td className="px-4 py-2 text-aj-text-muted text-xs">
                      {new Date(ev.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-4 py-2 text-aj-text-secondary text-xs">{ev.event}</td>
                    <td className="px-4 py-2 text-aj-text-muted text-xs font-mono">{ev.nodeId ?? "—"}</td>
                    <td className="px-4 py-2 text-aj-text-muted text-xs">
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
