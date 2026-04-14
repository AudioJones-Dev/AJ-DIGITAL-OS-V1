import { usePolling } from "../hooks/use-polling";
import type { CSSProperties } from "react";

// ── Types (mirrors HermesRuntimeStatus from backend) ───────────────

interface HermesRuntimeStatus {
  scheduler: {
    running: boolean;
    activeSchedules: number;
    failuresSinceStart: number;
  };
  watcher: {
    running: boolean;
    lastCheck: string | null;
  };
  schedules: {
    enabled: number;
    total: number;
  };
  notifications: {
    recent: number;
    lastAlert: {
      severity: string;
      title: string;
      message: string;
      timestamp: string;
    } | null;
    lastRetry: {
      title: string;
      message: string;
      timestamp: string;
    } | null;
  };
  timestamp: string;
}

// ── Fetcher ────────────────────────────────────────────────────────

const HERMES_API = import.meta.env.VITE_HERMES_API_URL ?? "http://127.0.0.1:7420";

async function fetchHermesStatus(): Promise<HermesRuntimeStatus> {
  const res = await fetch(`${HERMES_API}/status`, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`Hermes API ${res.status}`);
  return res.json();
}

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

const gridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: 12,
};

const metricStyle: CSSProperties = {
  backgroundColor: "#0f172a",
  borderRadius: 8,
  padding: "12px 14px",
};

const metricLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 500,
  color: "#64748b",
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
  marginBottom: 4,
};

const metricValueStyle: CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: "#e2e8f0",
};

const dotStyle = (on: boolean): CSSProperties => ({
  display: "inline-block",
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor: on ? "#22c55e" : "#64748b",
  marginRight: 6,
});

const offlineBanner: CSSProperties = {
  ...cardStyle,
  display: "flex",
  alignItems: "center",
  gap: 12,
  color: "#64748b",
  fontSize: 13,
};

// ── Component ──────────────────────────────────────────────────────

export function HermesWidget() {
  const { data, error } = usePolling<HermesRuntimeStatus>({
    fetcher: fetchHermesStatus,
    interval: 5_000,
  });

  // Offline / unreachable state
  if (error || !data) {
    return (
      <div style={offlineBanner}>
        <span style={{ fontSize: 18 }}>⚡</span>
        <div>
          <div style={{ ...titleStyle, marginBottom: 4, fontSize: 14 }}>Hermes</div>
          <div style={{ fontSize: 12, color: "#475569" }}>
            {error ? "Offline — status API not reachable" : "Connecting…"}
          </div>
        </div>
      </div>
    );
  }

  const { scheduler, watcher, schedules, notifications } = data;

  function formatTime(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  }

  return (
    <div style={cardStyle}>
      <div style={headerStyle}>
        <div style={titleStyle}>
          <span>⚡</span> Hermes Orchestrator
        </div>
        <div style={{ fontSize: 11, color: "#475569" }}>
          Updated {formatTime(data.timestamp)}
        </div>
      </div>

      <div style={gridStyle}>
        {/* Scheduler */}
        <div style={metricStyle}>
          <div style={metricLabelStyle}>Scheduler</div>
          <div style={metricValueStyle}>
            <span style={dotStyle(scheduler.running)} />
            {scheduler.running ? "Online" : "Offline"}
          </div>
        </div>

        {/* Watcher */}
        <div style={metricStyle}>
          <div style={metricLabelStyle}>Failure Watcher</div>
          <div style={metricValueStyle}>
            <span style={dotStyle(watcher.running)} />
            {watcher.running ? "Online" : "Offline"}
          </div>
        </div>

        {/* Active Schedules */}
        <div style={metricStyle}>
          <div style={metricLabelStyle}>Schedules</div>
          <div style={metricValueStyle}>
            {scheduler.activeSchedules}
            <span style={{ fontSize: 12, fontWeight: 400, color: "#64748b" }}>
              {" "}/ {schedules.total}
            </span>
          </div>
        </div>

        {/* Session Failures */}
        <div style={metricStyle}>
          <div style={metricLabelStyle}>Failures (session)</div>
          <div style={{
            ...metricValueStyle,
            color: scheduler.failuresSinceStart > 0 ? "#fca5a5" : "#6ee7b7",
          }}>
            {scheduler.failuresSinceStart}
          </div>
        </div>

        {/* Notifications */}
        <div style={metricStyle}>
          <div style={metricLabelStyle}>Notifications</div>
          <div style={metricValueStyle}>{notifications.recent}</div>
        </div>

        {/* Last Watcher Check */}
        <div style={metricStyle}>
          <div style={metricLabelStyle}>Last Check</div>
          <div style={{ ...metricValueStyle, fontSize: 13 }}>
            {formatTime(watcher.lastCheck)}
          </div>
        </div>
      </div>

      {/* Last Alert */}
      {notifications.lastAlert && (
        <div style={{
          marginTop: 12,
          padding: "10px 14px",
          backgroundColor: notifications.lastAlert.severity === "critical" ? "#450a0a" : "#422006",
          borderRadius: 8,
          fontSize: 12,
        }}>
          <span style={{ fontWeight: 600, color: notifications.lastAlert.severity === "critical" ? "#fca5a5" : "#fde68a" }}>
            Last Alert:
          </span>{" "}
          <span style={{ color: "#cbd5e1" }}>{notifications.lastAlert.message}</span>
          <span style={{ color: "#475569", marginLeft: 8 }}>
            {formatTime(notifications.lastAlert.timestamp)}
          </span>
        </div>
      )}

      {/* Last Retry */}
      {notifications.lastRetry && (
        <div style={{
          marginTop: 8,
          padding: "10px 14px",
          backgroundColor: "#1a1a2e",
          borderRadius: 8,
          fontSize: 12,
        }}>
          <span style={{ fontWeight: 600, color: "#a5b4fc" }}>Last Retry:</span>{" "}
          <span style={{ color: "#cbd5e1" }}>{notifications.lastRetry.message}</span>
          <span style={{ color: "#475569", marginLeft: 8 }}>
            {formatTime(notifications.lastRetry.timestamp)}
          </span>
        </div>
      )}
    </div>
  );
}
