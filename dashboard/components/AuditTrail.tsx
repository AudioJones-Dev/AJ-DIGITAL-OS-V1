"use client";

import { useEffect, useState } from "react";

interface AuditEvent {
  eventId: string;
  runId: string;
  agentId: string;
  action: string;
  fromState: string;
  toState: string;
  performedBy: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const HERMES_API_URL = process.env.NEXT_PUBLIC_HERMES_API_URL ?? "http://localhost:3001";

interface Props {
  runId: string;
}

export default function AuditTrail({ runId }: Props) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${HERMES_API_URL}/control/runs/${runId}/audit`)
      .then((res) => res.json() as Promise<{ ok: boolean; events: AuditEvent[] }>)
      .then((json) => setEvents(json.events ?? []))
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load audit trail"))
      .finally(() => setLoading(false));
  }, [runId]);

  if (loading) return <p className="text-zinc-500 text-xs">Loading audit trail…</p>;
  if (error) return <p className="text-red-400 text-xs">{error}</p>;
  if (events.length === 0) return <p className="text-zinc-500 text-xs">No audit events.</p>;

  return (
    <ol className="space-y-2">
      {events.map((e) => (
        <li key={e.eventId} className="flex gap-3 text-xs">
          <span className="text-zinc-500 shrink-0 w-36">{new Date(e.timestamp).toLocaleString()}</span>
          <span className="text-zinc-300">
            <span className="font-medium text-indigo-400">{e.action}</span>
            {" "}{e.fromState} → {e.toState}
            {" "}by <span className="text-zinc-200">{e.performedBy}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
