"use client";

import { useEffect, useState } from "react";
import type { ControlAuditEvent, ActionDecision, RiskLevel } from "@/lib/types";
import { clientGetControlRunAudit, PUBLIC_HERMES_API_URL } from "@/lib/control-client";

interface Props {
  runId: string;
  /** Bumping this causes a refetch — useful after an action completes. */
  refreshKey?: number;
  /** Optional preloaded events (for SSR or tests). */
  initialEvents?: ControlAuditEvent[];
}

const DECISION_COLORS: Record<ActionDecision, string> = {
  allow: "bg-emerald-900/60 text-emerald-300",
  block: "bg-red-900/60 text-red-300",
  approval_required: "bg-amber-900/60 text-amber-300",
};

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "text-zinc-400",
  medium: "text-amber-400",
  high: "text-red-400",
};

export default function AuditTrail({ runId, refreshKey, initialEvents }: Props) {
  const [events, setEvents] = useState<ControlAuditEvent[]>(initialEvents ?? []);
  const [loading, setLoading] = useState(initialEvents === undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    clientGetControlRunAudit(runId, PUBLIC_HERMES_API_URL)
      .then((evts) => {
        if (!cancelled) setEvents(evts);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load audit trail");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [runId, refreshKey]);

  if (loading) return <p className="text-zinc-500 text-xs">Loading audit trail…</p>;
  if (error) return <p className="text-red-400 text-xs" data-testid="audit-error">{error}</p>;
  if (events.length === 0) return <p className="text-zinc-500 text-xs" data-testid="audit-empty">No audit events.</p>;

  return (
    <div className="overflow-x-auto rounded-md border border-zinc-800" data-testid="audit-table">
      <table className="w-full text-xs">
        <thead className="bg-zinc-900 border-b border-zinc-800">
          <tr className="text-left text-zinc-400">
            <th className="px-3 py-2 font-medium">Timestamp</th>
            <th className="px-3 py-2 font-medium">Action</th>
            <th className="px-3 py-2 font-medium">Decision</th>
            <th className="px-3 py-2 font-medium">Risk</th>
            <th className="px-3 py-2 font-medium">Actor</th>
            <th className="px-3 py-2 font-medium">Tenant</th>
            <th className="px-3 py-2 font-medium">Audit ID</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => (
            <AuditRow key={e.eventId} event={e} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditRow({ event }: { event: ControlAuditEvent }) {
  const decision = event.decision;
  const risk = event.risk;
  return (
    <tr
      className="border-b border-zinc-800 hover:bg-zinc-900/60"
      data-testid="audit-row"
      data-decision={decision ?? "none"}
    >
      <td className="px-3 py-2 text-zinc-500 font-mono whitespace-nowrap">
        {new Date(event.timestamp).toLocaleString()}
      </td>
      <td className="px-3 py-2 text-zinc-200 font-mono">{event.action}</td>
      <td className="px-3 py-2">
        {decision ? (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${DECISION_COLORS[decision]}`}>
            {decision}
          </span>
        ) : (
          <span className="text-zinc-600">—</span>
        )}
      </td>
      <td className={`px-3 py-2 font-mono ${risk ? RISK_COLORS[risk] : "text-zinc-600"}`}>
        {risk ?? "—"}
      </td>
      <td className="px-3 py-2 text-zinc-300 font-mono">{event.performedBy}</td>
      <td className="px-3 py-2 font-mono">
        {event.tenantId ? (
          <span className="text-emerald-300">{event.tenantId}</span>
        ) : (
          <span className="text-zinc-600">—</span>
        )}
      </td>
      <td className="px-3 py-2 font-mono text-zinc-500" title={event.enforcementAuditId ?? event.eventId}>
        {(event.enforcementAuditId ?? event.eventId).slice(0, 8)}…
      </td>
    </tr>
  );
}
