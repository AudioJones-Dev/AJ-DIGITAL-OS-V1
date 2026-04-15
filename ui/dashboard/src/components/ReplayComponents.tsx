import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import type { ReplayStep, ReplayObservation, ReplayFailure } from "../lib/types";
import { StatusBadge } from "./shared";

// ── Helpers ────────────────────────────────────────────────────────

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

// ── Collapsible Section ────────────────────────────────────────────

export function CollapsibleSection({
  title,
  defaultOpen = false,
  badge,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section style={{ marginBottom: 24 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          width: "100%",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "8px 0",
          borderBottom: "1px solid #334155",
          marginBottom: open ? 12 : 0,
        }}
      >
        <span style={{ color: "#64748b", fontSize: 12, width: 16, textAlign: "center", transition: "transform 0.15s", transform: open ? "rotate(90deg)" : "rotate(0)" }}>
          ▶
        </span>
        <span style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {title}
        </span>
        {badge}
      </button>
      {open && children}
    </section>
  );
}

// ── JSON Viewer ────────────────────────────────────────────────────

export function JsonViewer({ data, label }: { data: unknown; label?: string }) {
  const [expanded, setExpanded] = useState(false);

  if (data == null) return null;

  const json = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  const preview = json.length > 120 ? json.slice(0, 120) + "…" : json;

  return (
    <div style={{ marginTop: 6 }}>
      {label && (
        <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {label}
        </span>
      )}
      <pre
        onClick={() => setExpanded((e) => !e)}
        style={{
          margin: "4px 0 0",
          padding: "8px 12px",
          backgroundColor: "#0f172a",
          border: "1px solid #1e293b",
          borderRadius: 6,
          fontSize: 11,
          color: "#94a3b8",
          lineHeight: 1.5,
          overflowX: "auto",
          maxHeight: expanded ? "none" : 80,
          overflow: expanded ? "auto" : "hidden",
          cursor: json.length > 120 ? "pointer" : "default",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {expanded ? json : preview}
      </pre>
      {json.length > 120 && (
        <button
          onClick={() => setExpanded((e) => !e)}
          style={{
            background: "none",
            border: "none",
            color: "#38bdf8",
            fontSize: 11,
            cursor: "pointer",
            padding: "2px 0",
          }}
        >
          {expanded ? "Collapse" : "Expand"}
        </button>
      )}
    </div>
  );
}

// ── Replay Step Card ───────────────────────────────────────────────

const stepCardStyle: CSSProperties = {
  position: "relative",
  padding: "12px 16px",
  backgroundColor: "#1e293b",
  borderRadius: 8,
  borderLeft: "3px solid",
  marginBottom: 2,
};

export function ReplayStepCard({ step, isLast }: { step: ReplayStep; isLast: boolean }) {
  const [open, setOpen] = useState(false);
  const accent = step.ok ? "#22c55e" : "#ef4444";
  const statusLabel = step.ok ? "passed" : "failed";

  return (
    <div style={{ display: "flex", gap: 0 }}>
      {/* Timeline rail */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 28, flexShrink: 0 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            backgroundColor: accent,
            marginTop: 14,
            border: "2px solid #0f172a",
            zIndex: 1,
          }}
        />
        {!isLast && (
          <div style={{ width: 2, flex: 1, backgroundColor: "#334155", marginTop: -1 }} />
        )}
      </div>

      {/* Card */}
      <div style={{ ...stepCardStyle, borderLeftColor: accent, flex: 1 }}>
        <div
          onClick={() => setOpen((o) => !o)}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: "#e2e8f0" }}>
              #{step.step_index}
            </span>
            <StatusBadge value={step.role} />
            <StatusBadge value={statusLabel} />
            {step.pipeline_id && (
              <span style={{ fontSize: 11, color: "#64748b" }}>
                {step.pipeline_id}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {step.retries > 0 && (
              <span style={{ fontSize: 11, color: "#f59e0b" }}>
                {step.retries} {step.retries === 1 ? "retry" : "retries"}
              </span>
            )}
            {step.warnings.length > 0 && (
              <span style={{ fontSize: 11, color: "#f59e0b" }}>
                {step.warnings.length} warn
              </span>
            )}
            <span style={{ fontSize: 12, color: "#64748b", fontVariantNumeric: "tabular-nums" }}>
              {step.duration_ms != null ? `${step.duration_ms}ms` : "—"}
            </span>
          </div>
        </div>

        {/* Step summary line */}
        {step.error ? (
          <div style={{ marginTop: 8, padding: "6px 10px", backgroundColor: "#450a0a", borderRadius: 4, fontSize: 12, color: "#fca5a5" }}>
            {step.error}
          </div>
        ) : (
          <div style={{ marginTop: 4, fontSize: 11, color: "#64748b" }}>
            {step.role} · {step.pipeline_id || "default"} · {step.duration_ms ?? 0}ms{step.retries > 0 ? ` · ${step.retries} retries` : ""}
          </div>
        )}

        {step.warnings.length > 0 && (
          <div style={{ marginTop: 6, fontSize: 11, color: "#fcd34d" }}>
            {step.warnings.map((w, i) => (
              <div key={i}>⚠ {w}</div>
            ))}
          </div>
        )}

        {open && (
          <div style={{ marginTop: 10 }}>
            <JsonViewer data={step.input_snapshot} label="Input Snapshot" />
            <JsonViewer data={step.output_snapshot} label="Output Snapshot" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Replay Timeline ────────────────────────────────────────────────

export function ReplayTimeline({ steps }: { steps: ReplayStep[] }) {
  if (steps.length === 0) {
    return <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>No steps recorded.</p>;
  }

  const totalMs = steps.reduce((s, st) => s + (st.duration_ms ?? 0), 0);
  const passed = steps.filter((s) => s.ok).length;
  const failed = steps.filter((s) => !s.ok).length;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 12, color: "#94a3b8" }}>
        <span>{steps.length} steps</span>
        <span style={{ color: "#22c55e" }}>{passed} passed</span>
        {failed > 0 && <span style={{ color: "#ef4444" }}>{failed} failed</span>}
        <span>{totalMs}ms total</span>
      </div>
      <div>
        {steps.map((step, i) => (
          <ReplayStepCard key={step.id} step={step} isLast={i === steps.length - 1} />
        ))}
      </div>
    </div>
  );
}

// ── Observation Panel ──────────────────────────────────────────────

const obsCardStyle: CSSProperties = {
  padding: "10px 14px",
  backgroundColor: "#1e293b",
  borderRadius: 8,
  borderLeft: "3px solid",
  marginBottom: 8,
};

export function ObservationPanel({ observations }: { observations: ReplayObservation[] }) {
  if (observations.length === 0) {
    return <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>No observations recorded.</p>;
  }

  const healthy = observations.filter((o) => o.healthy).length;
  const unhealthy = observations.length - healthy;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12, color: "#94a3b8" }}>
        <span>{observations.length} observations</span>
        <span style={{ color: "#22c55e" }}>{healthy} healthy</span>
        {unhealthy > 0 && <span style={{ color: "#ef4444" }}>{unhealthy} unhealthy</span>}
      </div>
      {observations.map((obs) => (
        <div
          key={obs.id}
          style={{ ...obsCardStyle, borderLeftColor: obs.healthy ? "#22c55e" : "#ef4444" }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <StatusBadge value={obs.source} />
              <span style={{ fontSize: 13, color: "#e2e8f0" }}>{obs.summary}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, color: "#64748b" }}>{fmtTime(obs.created_at)}</span>
              <span style={{ fontSize: 14, color: obs.healthy ? "#22c55e" : "#ef4444" }}>
                {obs.healthy ? "✓" : "✗"}
              </span>
            </div>
          </div>
          {obs.snapshot_label && (
            <div style={{ fontSize: 11, color: "#64748b", marginTop: 4 }}>
              Snapshot: {obs.snapshot_label}
            </div>
          )}
          {obs.checks && Array.isArray(obs.checks) && obs.checks.length > 0 && (
            <JsonViewer data={obs.checks} label="Checks" />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Failure Panel ──────────────────────────────────────────────────

const failCardStyle: CSSProperties = {
  padding: "12px 16px",
  backgroundColor: "#1c1117",
  borderRadius: 8,
  borderLeft: "3px solid #ef4444",
  marginBottom: 10,
};

export function FailurePanel({ failures }: { failures: ReplayFailure[] }) {
  if (failures.length === 0) {
    return <p style={{ color: "#64748b", fontSize: 13, margin: 0 }}>No failures recorded.</p>;
  }

  const escalated = failures.filter((f) => f.escalated).length;
  const resolved = failures.filter((f) => f.resolved).length;

  return (
    <div>
      <div style={{ display: "flex", gap: 16, marginBottom: 12, fontSize: 12, color: "#94a3b8" }}>
        <span style={{ color: "#ef4444" }}>{failures.length} failures</span>
        {escalated > 0 && <span style={{ color: "#f59e0b" }}>{escalated} escalated</span>}
        {resolved > 0 && <span style={{ color: "#22c55e" }}>{resolved} resolved</span>}
      </div>
      {failures.map((f) => (
        <FailureCard key={f.id} failure={f} />
      ))}
    </div>
  );
}

function FailureCard({ failure: f }: { failure: ReplayFailure }) {
  const [stackOpen, setStackOpen] = useState(false);

  return (
    <div style={failCardStyle}>
      {/* Header row: role, badges, timestamp */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusBadge value={f.role} />
          <StatusBadge value="failed" />
          {f.escalated && (
            <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, backgroundColor: "#78350f", color: "#fcd34d" }}>
              escalated
            </span>
          )}
          {f.resolved && (
            <span style={{ fontSize: 11, padding: "1px 6px", borderRadius: 4, backgroundColor: "#064e3b", color: "#6ee7b7" }}>
              resolved
            </span>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {f.step_id != null && (
            <span style={{ fontSize: 11, color: "#64748b" }}>step #{f.step_id}</span>
          )}
          <span style={{ fontSize: 11, color: "#64748b" }}>{fmtTime(f.created_at)}</span>
        </div>
      </div>

      {/* Error message — visually prominent */}
      <div style={{ fontSize: 13, color: "#fca5a5", marginBottom: 6, padding: "6px 10px", backgroundColor: "#450a0a", borderRadius: 4 }}>
        {f.error}
      </div>

      {f.resolution && (
        <div style={{ fontSize: 12, color: "#6ee7b7", marginBottom: 6 }}>
          Resolution: {f.resolution}
        </div>
      )}

      {/* Stack trace — collapsible by default */}
      {f.stack_trace && (
        <div style={{ marginTop: 6 }}>
          <button
            onClick={() => setStackOpen((o) => !o)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: 0,
              marginBottom: stackOpen ? 6 : 0,
            }}
          >
            <span style={{ color: "#64748b", fontSize: 11, width: 12, textAlign: "center", transition: "transform 0.15s", transform: stackOpen ? "rotate(90deg)" : "rotate(0)" }}>
              ▶
            </span>
            <span style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
              Stack Trace
            </span>
          </button>
          {stackOpen && (
            <pre
              style={{
                margin: 0,
                padding: "8px 10px",
                backgroundColor: "#0f172a",
                border: "1px solid #1e293b",
                borderRadius: 4,
                fontSize: 10,
                color: "#94a3b8",
                lineHeight: 1.4,
                overflowX: "auto",
                maxHeight: 200,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {f.stack_trace}
            </pre>
          )}
        </div>
      )}

      <JsonViewer data={f.input_snapshot} label="Input Snapshot" />
    </div>
  );
}
