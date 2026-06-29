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
  allow: "bg-aj-success/15 text-aj-success",
  block: "bg-aj-critical/15 text-aj-critical",
  approval_required: "bg-aj-warning/15 text-aj-warning",
};

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "text-aj-text-secondary",
  medium: "text-aj-warning",
  high: "text-aj-critical",
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

  if (loading) return <p className="text-aj-text-muted text-xs">Loading audit trail…</p>;
  if (error) return <p className="text-aj-critical text-xs" data-testid="audit-error">{error}</p>;
  if (events.length === 0) return <p className="text-aj-text-muted text-xs" data-testid="audit-empty">No audit events.</p>;

  return (
    <div className="overflow-x-auto rounded-md border border-aj-border" data-testid="audit-table">
      <table className="w-full text-xs">
        <thead className="bg-aj-surface-1 border-b border-aj-border">
          <tr className="text-left text-aj-text-secondary">
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
      className="border-b border-aj-border hover:bg-aj-surface-2"
      data-testid="audit-row"
      data-decision={decision ?? "none"}
    >
      <td className="px-3 py-2 text-aj-text-muted font-mono whitespace-nowrap">
        {new Date(event.timestamp).toLocaleString()}
      </td>
      <td className="px-3 py-2 text-aj-text font-mono">{event.action}</td>
      <td className="px-3 py-2">
        {decision ? (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${DECISION_COLORS[decision]}`}>
            {decision}
          </span>
        ) : (
          <span className="text-aj-text-muted">—</span>
        )}
      </td>
      <td className={`px-3 py-2 font-mono ${risk ? RISK_COLORS[risk] : "text-aj-text-muted"}`}>
        {risk ?? "—"}
      </td>
      <td className="px-3 py-2 text-aj-text-secondary font-mono">{event.performedBy}</td>
      <td className="px-3 py-2 font-mono">
        {event.tenantId ? (
          <span className="text-aj-success">{event.tenantId}</span>
        ) : (
          <span className="text-aj-text-muted">—</span>
        )}
      </td>
      <td className="px-3 py-2 font-mono text-aj-text-muted" title={event.enforcementAuditId ?? event.eventId}>
        {(event.enforcementAuditId ?? event.eventId).slice(0, 8)}…
      </td>
    </tr>
  );
}
