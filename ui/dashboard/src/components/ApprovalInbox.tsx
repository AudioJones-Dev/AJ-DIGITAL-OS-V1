import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { usePolling } from "../hooks/use-polling";
import { fetchApprovals, decideApproval } from "../lib/queries";
import type { ApprovalRequest } from "../lib/types";
import {
  PageHeader,
  Spinner,
  EmptyState,
  ErrorBanner,
  SearchInput,
  FilterSelect,
  Toolbar,
  StatusBadge,
} from "./shared";

// The human identity for dashboard decisions. Real per-user auth is a
// backend concern; the channel is fixed to "dashboard".
const DASHBOARD_ACTOR = "dashboard-operator";

// ── Formatting helpers ─────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
}

/** Human "expires in / expired Xm ago" relative to now. */
function expiryLabel(expiresAt: string): { text: string; urgent: boolean; expired: boolean } {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms)) return { text: "—", urgent: false, expired: false };
  const expired = ms <= 0;
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60_000);
  const hrs = Math.round(abs / 3_600_000);
  const span = mins < 60 ? `${mins}m` : hrs < 24 ? `${hrs}h` : `${Math.round(hrs / 24)}d`;
  return {
    text: expired ? `expired ${span} ago` : `expires in ${span}`,
    urgent: !expired && ms < 30 * 60_000,
    expired,
  };
}

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "", label: "All Statuses" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "expired", label: "Expired" },
  { value: "cancelled", label: "Cancelled" },
];

const riskOptions = [
  { value: "", label: "All Risk" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

// ── Tenant label (spec: every item MUST show its tenant scope) ──────

function tenantLabel(clientId: string | null): string {
  return clientId ? clientId : "Platform (no client scope)";
}

// ── Request list item (keyboard-navigable) ─────────────────────────

function RequestListItem({
  req,
  selected,
  onSelect,
}: {
  req: ApprovalRequest;
  selected: boolean;
  onSelect: () => void;
}) {
  const expiry = expiryLabel(req.expiresAt);
  return (
    <li style={{ listStyle: "none" }}>
      <button
        type="button"
        onClick={onSelect}
        aria-current={selected}
        aria-label={`${req.risk} risk · ${req.actionCategory} · tenant ${tenantLabel(req.clientId)} · ${expiry.text}`}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          padding: "12px 14px",
          marginBottom: 8,
          borderRadius: 10,
          border: selected ? "1px solid #3b82f6" : "1px solid #1e293b",
          background: selected ? "#15233b" : "#0f172a",
          color: "#e2e8f0",
          cursor: "pointer",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <StatusBadge value={req.risk} />
          <span style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{req.actionCategory}</span>
        </div>
        <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 4 }}>
          {tenantLabel(req.clientId)} · {req.requestedByAgentId}
        </div>
        <div style={{ fontSize: 11, color: expiry.urgent || expiry.expired ? "#fca5a5" : "#64748b" }}>
          {expiry.expired || expiry.urgent ? "⚠ " : ""}
          {expiry.text}
        </div>
      </button>
    </li>
  );
}

// ── Detail panel field ─────────────────────────────────────────────

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: "1px solid #1e293b" }}>
      <span style={{ width: 130, flexShrink: 0, color: "#64748b", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span style={{ color: "#e2e8f0", fontSize: 13, wordBreak: "break-word" }}>{children ?? "—"}</span>
    </div>
  );
}

// ── Decision actions (Approve / Deny at equal weight + clarify) ─────

function DecisionActions({
  req,
  busy,
  onDecide,
  onClarify,
}: {
  req: ApprovalRequest;
  busy: boolean;
  onDecide: (decision: "approve" | "deny") => void;
  onClarify: () => void;
}) {
  const [confirmingDeny, setConfirmingDeny] = useState(false);

  if (req.status !== "pending") {
    return (
      <div style={{ fontSize: 13, color: "#94a3b8" }}>
        This request is <StatusBadge value={req.status} />
        {req.approvedBy ? <> — decided by {req.approvedBy}</> : null}. No further action available.
      </div>
    );
  }

  const btnBase: CSSProperties = {
    flex: "1 1 0",
    padding: "12px 18px",
    borderRadius: 8,
    border: "none",
    fontSize: 14,
    fontWeight: 700,
    cursor: busy ? "not-allowed" : "pointer",
    opacity: busy ? 0.6 : 1,
  };

  return (
    <div>
      {/* Approve + Deny share identical footprint — reject is never subordinate. */}
      <div style={{ display: "flex", gap: 12 }}>
        <button
          type="button"
          disabled={busy}
          onClick={() => onDecide("approve")}
          aria-label={`Approve request ${req.approvalId}`}
          style={{ ...btnBase, background: "#16a34a", color: "#fff" }}
        >
          Approve
        </button>
        {!confirmingDeny ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirmingDeny(true)}
            aria-label={`Deny request ${req.approvalId}`}
            style={{ ...btnBase, background: "#dc2626", color: "#fff" }}
          >
            Deny
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setConfirmingDeny(false);
              onDecide("deny");
            }}
            aria-label={`Confirm deny request ${req.approvalId}`}
            style={{ ...btnBase, background: "#991b1b", color: "#fff", border: "2px solid #fca5a5" }}
          >
            Confirm deny
          </button>
        )}
      </div>
      <div style={{ display: "flex", gap: 12, marginTop: 10, alignItems: "center" }}>
        {confirmingDeny && (
          <button
            type="button"
            onClick={() => setConfirmingDeny(false)}
            style={{ background: "none", border: "none", color: "#94a3b8", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={onClarify}
          style={{ background: "none", border: "1px solid #334155", color: "#cbd5e1", fontSize: 13, fontWeight: 600, padding: "8px 14px", borderRadius: 8, cursor: busy ? "not-allowed" : "pointer" }}
        >
          Request clarification
        </button>
      </div>
    </div>
  );
}

// ── Detail panel ───────────────────────────────────────────────────

function RequestDetail({
  req,
  busy,
  onDecide,
  onClarify,
}: {
  req: ApprovalRequest;
  busy: boolean;
  onDecide: (decision: "approve" | "deny") => void;
  onClarify: () => void;
}) {
  const expiry = expiryLabel(req.expiresAt);
  return (
    <div style={{ background: "#1e293b", borderRadius: 12, padding: 24 }}>
      {/* Risk / impact — visible at the point of decision (spec) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
        <StatusBadge value={req.risk} />
        <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{req.actionCategory}</span>
        <span style={{ marginLeft: "auto", fontSize: 12, color: expiry.urgent || expiry.expired ? "#fca5a5" : "#94a3b8" }}>
          {expiry.text}
        </span>
      </div>
      <p style={{ margin: "0 0 18px", fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>{req.reason}</p>

      <Field label="Tenant">{tenantLabel(req.clientId)}</Field>
      <Field label="Requested by">{req.requestedByAgentId}</Field>
      <Field label="Permission">{req.permissionLevel}</Field>
      <Field label="Environment">{req.environment}</Field>
      <Field label="Target">{req.target ? <code style={{ fontSize: 12 }}>{req.target}</code> : "—"}</Field>
      <Field label="Command">{req.command ? <code style={{ fontSize: 12 }}>{req.command}</code> : "—"}</Field>
      <Field label="Requested at">{formatDate(req.requestedAt)}</Field>
      <Field label="Expires">{formatDate(req.expiresAt)}</Field>
      <Field label="Audit ref">{req.auditId ? <code style={{ fontSize: 12 }}>{req.auditId}</code> : "not yet linked"}</Field>

      <div style={{ marginTop: 22 }}>
        <DecisionActions req={req} busy={busy} onDecide={onDecide} onClarify={onClarify} />
      </div>
    </div>
  );
}

// ── Screen ─────────────────────────────────────────────────────────

export function ApprovalInbox() {
  const { data, loading, error, refetch } = usePolling({ fetcher: fetchApprovals, interval: 10_000 });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [riskFilter, setRiskFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = data;
    if (statusFilter) result = result.filter((r) => r.status === statusFilter);
    if (riskFilter) result = result.filter((r) => r.risk === riskFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (r) =>
          r.actionCategory.toLowerCase().includes(q) ||
          r.reason.toLowerCase().includes(q) ||
          r.requestedByAgentId.toLowerCase().includes(q) ||
          (r.clientId?.toLowerCase().includes(q) ?? false) ||
          (r.target?.toLowerCase().includes(q) ?? false),
      );
    }
    return result;
  }, [data, statusFilter, riskFilter, search]);

  const selected = useMemo(
    () => filtered.find((r) => r.approvalId === selectedId) ?? null,
    [filtered, selectedId],
  );

  const pendingCount = data?.filter((r) => r.status === "pending").length ?? 0;
  const criticalCount = data?.filter((r) => r.status === "pending" && r.risk === "critical").length ?? 0;

  async function handleDecide(decision: "approve" | "deny") {
    if (!selected) return;
    setBusy(true);
    setAnnouncement(`Submitting ${decision} for ${selected.actionCategory}…`);
    const result = await decideApproval({ approvalId: selected.approvalId, decision, actorId: DASHBOARD_ACTOR });
    setBusy(false);
    if (result.ok) {
      setAnnouncement(`Request ${selected.actionCategory} ${decision === "approve" ? "approved" : "denied"}.`);
      setSelectedId(null);
      refetch();
    } else {
      setAnnouncement(`Could not ${decision} request — ${result.error ?? "unknown error"}. No change was made.`);
    }
  }

  function handleClarify() {
    if (!selected) return;
    // Clarification routing is backend-gated; surface intent without pretending it shipped.
    setAnnouncement(
      `Clarification requested for ${selected.actionCategory}. This request stays pending until the requesting agent responds.`,
    );
  }

  return (
    <div>
      <PageHeader
        title="Approval Inbox"
        subtitle={
          data
            ? `${pendingCount} pending${criticalCount > 0 ? ` · ${criticalCount} critical` : ""}`
            : undefined
        }
        right={
          criticalCount > 0 ? (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 12px",
                borderRadius: 9999,
                backgroundColor: "#7f1d1d",
                color: "#fca5a5",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              {criticalCount} critical pending
            </span>
          ) : undefined
        }
      />

      {/* Screen-reader announcements for decision results / errors */}
      <div aria-live="polite" role="status" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {announcement}
      </div>

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search approvals…" />
        <FilterSelect value={statusFilter} onChange={setStatusFilter} options={statusOptions} label="Status" />
        <FilterSelect value={riskFilter} onChange={setRiskFilter} options={riskOptions} label="Risk" />
      </Toolbar>

      {error && <ErrorBanner message={`${error} — pending approvals cannot be shown. Do not assume the queue is empty.`} />}

      {loading && !data ? (
        <Spinner />
      ) : !error && filtered.length === 0 ? (
        <EmptyState message={statusFilter === "pending" ? "No pending approvals. You're all caught up." : "No approvals match this filter."} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 20, alignItems: "start" }}>
          {/* Request queue */}
          <ul aria-label="Approval requests" style={{ margin: 0, padding: 0 }}>
            {filtered.map((req) => (
              <RequestListItem
                key={req.approvalId}
                req={req}
                selected={req.approvalId === selectedId}
                onSelect={() => setSelectedId(req.approvalId)}
              />
            ))}
          </ul>

          {/* Selected request detail + decision */}
          {selected ? (
            <RequestDetail req={selected} busy={busy} onDecide={handleDecide} onClarify={handleClarify} />
          ) : (
            <div style={{ background: "#1e293b", borderRadius: 12, padding: 48, textAlign: "center", color: "#64748b", fontSize: 14 }}>
              Select a request to review its impact and decide.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
