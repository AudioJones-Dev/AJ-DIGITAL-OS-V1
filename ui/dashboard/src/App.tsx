import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { DashboardHome } from "./components/DashboardHome";
import { ClientsView } from "./components/ClientsView";
import { MissionsView } from "./components/MissionsView";
import { RunsView } from "./components/RunsView";
import { DeliverablesView } from "./components/DeliverablesView";
import { AssetsView } from "./components/AssetsView";
import MissionDetail from "./components/MissionDetail";
import RunDetail from "./components/RunDetail";
import MissionTrigger from "./components/MissionTrigger";
import { AgentsView } from "./components/AgentsView";
import { WorkspaceBoard } from "./components/WorkspaceBoard";
import { TaskDetail } from "./components/TaskDetail";
import { ClientAlerts } from "./components/ClientAlerts";
import { ClientDeliverables } from "./components/ClientDeliverables";
import { ViewModeSwitcher } from "./components/ViewModeSwitcher";
import { OnboardingView } from "./components/OnboardingView";
import { ApprovalInbox } from "./components/ApprovalInbox";
import { ViewModeProvider, useViewMode } from "./lib/view-mode";
import type { CSSProperties } from "react";
import "./dashboard.css";

// ── Nav items by mode ──────────────────────────────────────────────

const operatorNav = [
  { to: "/", label: "Dashboard" },
  { to: "/agents", label: "Agents" },
  { to: "/approvals", label: "Approvals" },
  { to: "/workspace", label: "Workspace" },
  { to: "/clients", label: "Clients" },
  { to: "/missions", label: "Missions" },
  { to: "/runs", label: "Runs" },
  { to: "/deliverables", label: "Deliverables" },
  { to: "/assets", label: "Assets" },
  { to: "/alerts", label: "Alerts" },
];

const clientNav = [
  { to: "/", label: "Home" },
  { to: "/agents", label: "Your Team" },
  { to: "/workspace", label: "Task Board" },
  { to: "/outputs", label: "Outputs" },
  { to: "/alerts", label: "Notifications" },
];

const shellStyle: CSSProperties = {
  display: "flex",
  minHeight: "100vh",
  fontFamily: '"DM Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  color: "#e2e8f0",
  backgroundColor: "#090b0c",
};

const sidebarStyle: CSSProperties = {
  width: 236,
  backgroundColor: "#0c0f10",
  color: "#e5e7eb",
  padding: "24px 0",
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
  borderRight: "1px solid #25292b",
};

const logoStyle: CSSProperties = {
  padding: "0 20px 20px",
  borderBottom: "1px solid #25292b",
  marginBottom: 16,
};

const navLinkBase: CSSProperties = {
  display: "block",
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: 500,
  color: "#8c9497",
  textDecoration: "none",
  borderLeft: "3px solid transparent",
  transition: "all 0.15s",
};

const navLinkActive: CSSProperties = {
  ...navLinkBase,
  color: "#f7f8f2",
  backgroundColor: "#171b1c",
  borderLeftColor: "#e8ff5a",
};

const contentStyle: CSSProperties = {
  flex: 1,
  padding: "34px clamp(22px, 4vw, 54px)",
  width: "100%",
  maxWidth: 1500,
};

export default function App() {
  return (
    <ViewModeProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </ViewModeProvider>
  );
}

function AppShell() {
  const { isClient } = useViewMode();
  const navItems = isClient ? clientNav : operatorNav;
  const versionLabel = isClient ? "Client Portal v1.0" : "Operator Dashboard v0.4";

  return (
    <div style={shellStyle}>
      <a href="#main-content" className="skip-link">Skip to content</a>
      {/* Sidebar */}
      <nav style={sidebarStyle} aria-label="Primary">
        <div style={logoStyle}>
          <img src="/audiojones-wordmark-white.svg" alt="Audio Jones" style={{ width: 176, height: "auto" }} />
          <div className="os-label">AJ DIGITAL OS / BUILD CONTROL</div>
        </div>
        <ViewModeSwitcher />
        <div style={{ height: 12 }} />
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            style={({ isActive }) => (isActive ? navLinkActive : navLinkBase)}
          >
            {item.label}
          </NavLink>
        ))}
        <div style={{ flex: 1 }} />
        <div
          style={{
            padding: "12px 20px",
            fontSize: 11,
            color: "#475569",
            borderTop: "1px solid #1e293b",
          }}
        >
          {versionLabel}
        </div>
      </nav>

      {/* Main content */}
      <main id="main-content" tabIndex={-1} style={{ ...contentStyle, outline: "none" }}>
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/agents" element={<AgentsView />} />
          <Route path="/approvals" element={isClient ? <Navigate to="/" replace /> : <ApprovalInbox />} />
          <Route path="/workspace" element={<WorkspaceBoard />} />
          <Route path="/clients" element={<ClientsView />} />
          <Route path="/missions" element={<MissionsView />} />
          <Route path="/missions/new" element={<MissionTrigger />} />
          <Route path="/missions/:id" element={<MissionDetail />} />
          <Route path="/runs" element={<RunsView />} />
          <Route path="/runs/:id" element={isClient ? <TaskDetail /> : <RunDetail />} />
          <Route path="/deliverables" element={<DeliverablesView />} />
          <Route path="/outputs" element={<ClientDeliverables />} />
          <Route path="/assets" element={<AssetsView />} />
          <Route path="/alerts" element={<ClientAlerts />} />
          <Route path="/onboarding" element={<OnboardingView />} />
          <Route path="/onboarding/success" element={<OnboardingSuccess />} />
          <Route path="/onboarding/cancel" element={<OnboardingCancel />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function OnboardingSuccess() {
  return (
    <div style={{ textAlign: "center", paddingTop: 80 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#22c55e", marginBottom: 8 }}>Welcome to AJ Digital OS</h1>
      <p style={{ color: "#94a3b8", fontSize: 15, marginBottom: 24 }}>
        Your AI team is being provisioned. You'll be ready to go in a few moments.
      </p>
      <a href="/" style={{ color: "#3b82f6", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
        Go to Dashboard →
      </a>
    </div>
  );
}

function OnboardingCancel() {
  return (
    <div style={{ textAlign: "center", paddingTop: 80 }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>Checkout Canceled</h1>
      <p style={{ color: "#94a3b8", fontSize: 15, marginBottom: 24 }}>
        No worries — you can try again whenever you're ready.
      </p>
      <a href="/onboarding" style={{ color: "#3b82f6", textDecoration: "none", fontSize: 14, fontWeight: 600 }}>
        ← Back to Plans
      </a>
    </div>
  );
}
