import type { ReactNode } from "react";
import type { EnforcementSnapshot, ActionDecision, RiskLevel } from "@/lib/types";

interface Props {
  snapshot: EnforcementSnapshot;
}

const DECISION_COLORS: Record<ActionDecision, string> = {
  allow: "bg-emerald-900 text-emerald-200",
  block: "bg-red-900 text-red-200",
  approval_required: "bg-amber-900 text-amber-200",
};

const RISK_COLORS: Record<RiskLevel, string> = {
  low: "bg-zinc-800 text-zinc-300",
  medium: "bg-amber-950/60 text-amber-300 border border-amber-900",
  high: "bg-red-950/60 text-red-300 border border-red-900",
};

export default function EnforcementStatus({ snapshot }: Props) {
  return (
    <div
      data-testid="enforcement-status"
      data-decision={snapshot.decision ?? "none"}
      data-risk={snapshot.risk ?? "none"}
      className="bg-zinc-900 border border-zinc-800 rounded-md p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-200">Enforcement Status</h3>
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
                snapshot.approvalRequired ? "text-amber-300 font-medium" : "text-zinc-500"
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
              <span className="font-mono text-emerald-300" data-testid="tenant-status">
                {snapshot.tenantId}
              </span>
            ) : (
              <span className="text-zinc-500" data-testid="tenant-status">absent</span>
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
          className="bg-red-950/40 border border-red-900 rounded p-2 text-xs text-red-300 font-mono"
        >
          <span className="text-zinc-500 not-italic mr-1">blocked:</span>
          {snapshot.blockedReason}
        </div>
      )}

      {snapshot.approvalId && (
        <div className="text-xs text-amber-300/90" data-testid="approval-id">
          Approval ID: <span className="font-mono">{snapshot.approvalId}</span>
        </div>
      )}

      {snapshot.enforcementAuditId && (
        <div className="text-xs text-zinc-500">
          Enforcement audit: <span className="font-mono">{snapshot.enforcementAuditId.slice(0, 12)}…</span>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <>
      <dt className="text-zinc-500">{label}</dt>
      <dd className="text-zinc-200">{value}</dd>
    </>
  );
}
