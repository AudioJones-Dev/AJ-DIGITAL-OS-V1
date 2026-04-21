import { usePolling } from "../hooks/use-polling";
import { fetchRepairEvents } from "../lib/queries";
import type { RepairEvent, FailureClassification, RepairResult } from "../lib/types";
import type { CSSProperties } from "react";

// ── Styles ─────────────────────────────────────────────────────────

const cardStyle: CSSProperties = {
  backgroundColor: "#1e293b",
  borderRadius: 12,
  padding: 20,
  marginBottom: 24,
  border: "1px solid #334155",
};

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 16,
};

const titleStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 600,
  color: "#f1f5f9",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

const tableStyle: CSSProperties = {
  width: "100%",
  borderCollapse: "collapse" as const,
  fontSize: 12,
};

const thStyle: CSSProperties = {
  textAlign: "left",
  padding: "8px 10px",
  fontWeight: 600,
  color: "#94a3b8",
  borderBottom: "1px solid #334155",
  fontSize: 11,
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
};

const tdStyle: CSSProperties = {
  padding: "8px 10px",
  color: "#cbd5e1",
  borderBottom: "1px solid #1e293b",
};

const emptyStyle: CSSProperties = {
  padding: 24,
  textAlign: "center",
  color: "#64748b",
  fontSize: 13,
};

// ── Badge helpers ──────────────────────────────────────────────────

const classificationColors: Record<FailureClassification, { bg: string; fg: string }> = {
  transient:   { bg: "#422006", fg: "#fde68a" },
  network:     { bg: "#1e1b4b", fg: "#c4b5fd" },
  dependency:  { bg: "#1e1b4b", fg: "#a5b4fc" },
  data_schema: { bg: "#0c4a6e", fg: "#7dd3fc" },
  auth_config: { bg: "#450a0a", fg: "#fca5a5" },
  unknown:     { bg: "#1e293b", fg: "#94a3b8" },
};

const resultColors: Record<RepairResult, { bg: string; fg: string }> = {
  pending:   { bg: "#1e293b", fg: "#94a3b8" },
  success:   { bg: "#052e16", fg: "#6ee7b7" },
  failed:    { bg: "#450a0a", fg: "#fca5a5" },
  escalated: { bg: "#4c1d95", fg: "#c4b5fd" },
};

function Badge({ label, colors }: { label: string; colors: { bg: string; fg: string } }) {
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 8px",
      borderRadius: 6,
      fontSize: 11,
      fontWeight: 600,
      backgroundColor: colors.bg,
      color: colors.fg,
    }}>
      {label}
    </span>
  );
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

function fmtClassification(c: FailureClassification): string {
  return c.replace(/_/g, " ");
}

function fmtStrategy(s: string): string {
  return s.replace(/_/g, " ");
}

// ── Component ──────────────────────────────────────────────────────

export function RepairWidget() {
  const { data, error } = usePolling<RepairEvent[]>({
    fetcher: fetchRepairEvents,
    interval: 10_000,
  });

  const events = data ?? [];

  // Summary stats
  const pending = events.filter((e) => e.result === "pending").length;
  const succeeded = events.filter((e) => e.result === "success").length;
  const escalated = events.filter((e) => e.result === "escalated").length;
  const failed = events.filter((e) => e.result === "failed").length;

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>
          <span>🔧</span> Failure Auto-Repair
        </div>
        <div style={{ fontSize: 11, color: "#475569" }}>
          {events.length} event{events.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Summary row */}
      <div style={{
        display: "flex",
        gap: 12,
        marginBottom: 16,
        flexWrap: "wrap",
      }}>
        <StatPill label="Pending" value={pending} color="#94a3b8" />
        <StatPill label="Succeeded" value={succeeded} color="#6ee7b7" />
        <StatPill label="Failed" value={failed} color="#fca5a5" />
        <StatPill label="Escalated" value={escalated} color="#c4b5fd" />
      </div>

      {error && (
        <div style={{ fontSize: 12, color: "#f87171", marginBottom: 12 }}>
          Failed to load repair events
        </div>
      )}

      {events.length === 0 ? (
        <div style={emptyStyle}>No repair events yet</div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Time</th>
                <th style={thStyle}>Run Ref</th>
                <th style={thStyle}>Classification</th>
                <th style={thStyle}>Strategy</th>
                <th style={thStyle}>Retries</th>
                <th style={thStyle}>Result</th>
                <th style={thStyle}>Escalated</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 20).map((e) => (
                <tr key={e.id} style={{ backgroundColor: e.escalated ? "#1a0a2e10" : undefined }}>
                  <td style={tdStyle}>{fmtTime(e.created_at)}</td>
                  <td style={{ ...tdStyle, fontFamily: "monospace", fontSize: 11 }}>
                    {e.run_ref.length > 28 ? e.run_ref.slice(0, 28) + "…" : e.run_ref}
                  </td>
                  <td style={tdStyle}>
                    <Badge label={fmtClassification(e.classification)} colors={classificationColors[e.classification]} />
                  </td>
                  <td style={{ ...tdStyle, fontSize: 11, color: "#94a3b8" }}>
                    {fmtStrategy(e.strategy)}
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    {e.retry_count}/{e.max_retries}
                  </td>
                  <td style={tdStyle}>
                    <Badge label={e.result} colors={resultColors[e.result]} />
                  </td>
                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    {e.escalated ? "⚠️" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── StatPill ───────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#0f172a",
      borderRadius: 8,
      padding: "6px 12px",
    }}>
      <span style={{ fontSize: 16, fontWeight: 700, color }}>{value}</span>
      <span style={{ fontSize: 11, color: "#64748b" }}>{label}</span>
    </div>
  );
}
