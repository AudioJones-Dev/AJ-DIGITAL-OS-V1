import type { ReactNode } from "react";
import type { EnforcementSnapshot, ActionDecision, RiskLevel } from "@/lib/types";

interface Props {
  snapshot: EnforcementSnapshot;
}

const DECISION_COLORS: Record<ActionDecision, string> = {
  allow: "bg-aj-success/15 text-aj-success",
  block: "bg-aj-critical/15 text-aj-critical",
  approval_required: "bg-aj-warning/15 text-aj-warning",
};

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "bg-aj-surface-2 text-aj-text-secondary",
  medium: "bg-aj-warning/15 text-aj-warning border border-aj-warning/40",
  high: "bg-aj-critical/15 text-aj-critical border border-aj-critical/40",
};

export default function EnforcementStatus({ snapshot }: Props) {
  return (
    <div
      data-testid="enforcement-status"
      data-decision={snapshot.decision ?? "none"}
      data-risk={snapshot.risk ?? "none"}
      className="bg-aj-surface-1 border border-aj-border rounded-md p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-aj-text">Enforcement Status</h3>
        {snapshot.decision && (
          <span
            data-testid="enforcement-decision"
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${DECISION_COLORS[snapshot.decision]}`}
          >
            {snapshot.decision}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
        <Field label="State" value={<span className="font-mono">{snapshot.state}</span>} />
        <Field
          label="Last action"
          value={snapshot.lastAction ? <span className="font-mono">{snapshot.lastAction}</span> : "—"}
        />
        <Field
          label="Risk"
          value={
            snapshot.risk ? (
              <span className={`px-1.5 py-0.5 rounded text-[10px] ${RISK_COLORS[snapshot.risk]}`}>
                {snapshot.risk}
              </span>
            ) : (
              "—"
            )
          }
        />
        <Field
          label="Approval required"
          value={
            <span
              className={
                snapshot.approvalRequired ? "text-aj-warning font-medium" : "text-aj-text-muted"
              }
              data-testid="approval-required-flag"
            >
              {snapshot.approvalRequired ? "yes" : "no"}
            </span>
          }
        />
        <Field label="Actor" value={snapshot.actor ? <span className="font-mono">{snapshot.actor}</span> : "—"} />
        <Field
          label="Actor type"
          value={snapshot.actorType ?? "—"}
        />
        <Field
          label="Tenant"
          value={
            snapshot.hasTenantId ? (
              <span className="font-mono text-aj-success" data-testid="tenant-status">
                {snapshot.tenantId}
              </span>
            ) : (
              <span className="text-aj-text-muted" data-testid="tenant-status">absent</span>
            )
          }
        />
        <Field
          label="Environment"
          value={snapshot.environment ? <span className="font-mono">{snapshot.environment}</span> : "—"}
        />
      </dl>

      {snapshot.blockedReason && (
        <div
          data-testid="blocked-reason"
          className="bg-aj-critical/15 border border-aj-critical/40 rounded p-2 text-xs text-aj-critical font-mono"
        >
          <span className="text-aj-text-muted not-italic mr-1">blocked:</span>
          {snapshot.blockedReason}
        </div>
      )}

      {snapshot.approvalId && (
        <div className="text-xs text-aj-warning" data-testid="approval-id">
          Approval ID: <span className="font-mono">{snapshot.approvalId}</span>
        </div>
      )}

      {snapshot.enforcementAuditId && (
        <div className="text-xs text-aj-text-muted">
          Enforcement audit: <span className="font-mono">{snapshot.enforcementAuditId.slice(0, 12)}…</span>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="text-aj-text-muted">{label}</dt>
      <dd className="text-aj-text">{value}</dd>
    </>
  );
}
