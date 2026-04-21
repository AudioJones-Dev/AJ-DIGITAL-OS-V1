/**
 * ViewModeSwitcher — toggles between operator and client mode.
 *
 * Appears in the sidebar. Persists selection to localStorage.
 */

import type { CSSProperties } from "react";
import { useViewMode } from "../lib/view-mode";

export function ViewModeSwitcher() {
  const { mode, setMode } = useViewMode();

  return (
    <div style={containerStyle}>
      <ModeButton
        label="Operator"
        active={mode === "operator"}
        onClick={() => setMode("operator")}
      />
      <ModeButton
        label="Client"
        active={mode === "client"}
        onClick={() => setMode("client")}
      />
    </div>
  );
}

function ModeButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...buttonStyle,
        backgroundColor: active ? "#1e293b" : "transparent",
        color: active ? "#f1f5f9" : "#64748b",
        borderColor: active ? "#334155" : "transparent",
      }}
    >
      {label}
    </button>
  );
}

// ── Styles ─────────────────────────────────────────────────────────

const containerStyle: CSSProperties = {
  display: "flex",
  margin: "0 12px",
  borderRadius: 8,
  overflow: "hidden",
  border: "1px solid #1e293b",
};

const buttonStyle: CSSProperties = {
  flex: 1,
  padding: "6px 0",
  fontSize: 11,
  fontWeight: 600,
  border: "1px solid transparent",
  cursor: "pointer",
  transition: "all 0.15s",
  background: "transparent",
};

export default ViewModeSwitcher;
