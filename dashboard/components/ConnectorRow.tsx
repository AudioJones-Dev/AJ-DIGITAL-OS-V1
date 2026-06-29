"use client";

import { useState } from "react";
import type { OSConnector } from "@/lib/types";
import { PUBLIC_HERMES_API_URL } from "@/lib/control-client";

interface Props {
  connector: OSConnector;
}

const RISK_COLORS: Record<string, string> = {
  low: "bg-emerald-900 text-emerald-300",
  medium: "bg-yellow-900 text-yellow-300",
  high: "bg-red-900 text-red-300",
  restricted: "bg-red-950 text-red-200",
};

export default function ConnectorRow({ connector }: Props) {
  const [enabled, setEnabled] = useState(connector.enabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle(): Promise<void> {
    setBusy(true);
    setError(null);
    const target = enabled ? "disable" : "enable";
    try {
      const res = await fetch(
        `${PUBLIC_HERMES_API_URL}/connectors/${encodeURIComponent(connector.id)}/${target}`,
        { method: "POST" },
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setEnabled(!enabled);
    } catch (err) {
      setError(err instanceof Error ? err.message : "request failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <tr className="border-t border-aj-border hover:bg-aj-surface-2">
      <td className="px-4 py-2 font-mono text-xs text-aj-text-secondary">{connector.id}</td>
      <td className="px-4 py-2 text-sm text-aj-text">{connector.displayName}</td>
      <td className="px-4 py-2 text-xs text-aj-text-secondary">{connector.provider}</td>
      <td className="px-4 py-2">
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            RISK_COLORS[connector.riskLevel] ?? "bg-aj-surface-2 text-aj-text-secondary"
          }`}
        >
          {connector.riskLevel}
        </span>
      </td>
      <td className="px-4 py-2 text-xs text-aj-text-secondary">
        {connector.capabilities.slice(0, 4).join(", ")}
        {connector.capabilities.length > 4 ? ` +${connector.capabilities.length - 4}` : ""}
      </td>
      <td className="px-4 py-2">
        <span
          className={`text-xs px-1.5 py-0.5 rounded ${
            enabled ? "bg-emerald-900 text-emerald-300" : "bg-aj-surface-2 text-aj-text-secondary"
          }`}
        >
          {enabled ? "enabled" : "disabled"}
        </span>
      </td>
      <td className="px-4 py-2">
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={busy}
          className={`text-xs px-2 py-1 rounded font-medium ${
            enabled
              ? "bg-aj-surface-2 text-aj-text-secondary hover:bg-aj-surface-3"
              : "bg-aj-signal text-aj-signal-ink hover:opacity-90"
          } disabled:opacity-50`}
        >
          {busy ? "…" : enabled ? "Disable" : "Enable"}
        </button>
        {error && (
          <p className="text-xs text-red-400 mt-1 max-w-[180px] truncate" title={error}>
            {error}
          </p>
        )}
      </td>
    </tr>
  );
}
