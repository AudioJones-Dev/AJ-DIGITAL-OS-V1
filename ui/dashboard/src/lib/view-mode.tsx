/**
 * View mode context — operator vs client.
 *
 * Controls what data is visible throughout the dashboard.
 * Operator mode shows everything. Client mode hides technical detail.
 */

import { createContext, useContext, useState, type ReactNode } from "react";

export type ViewMode = "operator" | "client";

interface ViewModeContext {
  mode: ViewMode;
  setMode: (mode: ViewMode) => void;
  isOperator: boolean;
  isClient: boolean;
}

const Ctx = createContext<ViewModeContext>({
  mode: "operator",
  setMode: () => {},
  isOperator: true,
  isClient: false,
});

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("aj-view-mode");
      if (stored === "client" || stored === "operator") return stored;
    }
    return "operator";
  });

  const handleSet = (m: ViewMode) => {
    setMode(m);
    if (typeof window !== "undefined") {
      localStorage.setItem("aj-view-mode", m);
    }
  };

  return (
    <Ctx.Provider
      value={{
        mode,
        setMode: handleSet,
        isOperator: mode === "operator",
        isClient: mode === "client",
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useViewMode(): ViewModeContext {
  return useContext(Ctx);
}
