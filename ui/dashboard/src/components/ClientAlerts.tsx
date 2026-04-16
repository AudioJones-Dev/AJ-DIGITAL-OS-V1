/**
 * ClientAlerts — Human-readable alerts derived from Hermes notifications.
 *
 * Converts technical Hermes alerts into simple status messages.
 * Client mode hides severity levels and technical metadata.
 */

import type { CSSProperties } from "react";
import { usePolling } from "../hooks/use-polling";
import { fetchRepairEvents } from "../lib/queries";
import type { RepairEvent } from "../lib/types";
import { PageHeader, Spinner, ErrorBanner, StatusBadge } from "./shared";
import { useViewMode } from "../lib/view-mode";

interface FriendlyAlert {
  id: number;
  title: string;
  message: string;
  severity: "info" | "warning" | "error";
  timestamp: string;
}

export function ClientAlerts() {
  const { isClient } = useViewMode();

  const { data: repairs, loading, error } = usePolling<RepairEvent[]>({
    fetcher: fetchRepairEvents,
    interval: 15_000,
  });

  const alerts: FriendlyAlert[] = (repairs ?? []).map(toFriendlyAlert);

  if (loading && !repairs) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={isClient ? "Notifications" : "System Alerts"}
        subtitle={isClient
          ? "Updates on your tasks"
          : "Hermes repair events translated to alerts"
        }
      />
      {error && <ErrorBanner message={error} />}

      {alerts.length === 0 && (
        <div style={emptyStyle}>No alerts — everything is running smoothly.</div>
      )}

      <div style={listStyle}>
        {alerts.map((alert) => (
          <div key={alert.id} style={{ ...alertCard, borderLeftColor: severityColor(alert.severity) }}>
            <div style={alertHeader}>
              <span style={{ fontWeight: 600, fontSize: 14, color: "#f1f5f9" }}>
                {alert.title}
              </span>
              {!isClient && (
                <StatusBadge value={alert.severity} />
              )}
            </div>
            <p style={alertMessage}>{alert.message}</p>
            <div style={{ fontSize: 11, color: "#475569" }}>
              {new Date(alert.timestamp).toLocaleString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Transform repair events into friendly alerts ───────────────────

function toFriendlyAlert(event: RepairEvent): FriendlyAlert {
  const severityMap: Record<string, "info" | "warning" | "error"> = {
    pending: "warning",
    success: "info",
    failed: "error",
    escalated: "error",
  };

  const titleMap: Record<string, string> = {
    pending: "Task is being retried",
    success: "Issue resolved automatically",
    failed: "Task needs attention",
    escalated: "Task escalated for review",
  };

  const messageMap: Record<string, string> = {
    pending: `A task encountered an issue and is being automatically retried (attempt ${event.retry_count}/${event.max_retries}).`,
    success: "An issue was detected and resolved automatically. No action needed.",
    failed: "A task could not be completed after multiple attempts. Our team has been notified.",
    escalated: "A task has been escalated for manual review. We'll update you when it's resolved.",
  };

  return {
    id: event.id,
    title: titleMap[event.result] ?? "System update",
    message: messageMap[event.result] ?? (event.error_message ?? "No additional details."),
    severity: severityMap[event.result] ?? "info",
    timestamp: event.created_at,
  };
}

function severityColor(severity: string): string {
  const map: Record<string, string> = {
    info: "#3b82f6",
    warning: "#f59e0b",
    error: "#ef4444",
  };
  return map[severity] ?? "#64748b";
}

// ── Styles ─────────────────────────────────────────────────────────

const emptyStyle: CSSProperties = {
  textAlign: "center",
  padding: 48,
  color: "#22c55e",
  fontSize: 14,
};

const listStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 12,
};

const alertCard: CSSProperties = {
  backgroundColor: "#1e293b",
  borderRadius: 10,
  padding: 16,
  borderLeft: "4px solid #64748b",
};

const alertHeader: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 8,
};

const alertMessage: CSSProperties = {
  fontSize: 13,
  color: "#94a3b8",
  margin: "0 0 8px",
  lineHeight: 1.5,
};

export default ClientAlerts;
