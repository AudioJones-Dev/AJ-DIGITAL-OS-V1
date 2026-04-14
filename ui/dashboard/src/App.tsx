import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { DashboardHome } from "./components/DashboardHome";
import { ClientsView } from "./components/ClientsView";
import { MissionsView } from "./components/MissionsView";
import { RunsView } from "./components/RunsView";
import { DeliverablesView } from "./components/DeliverablesView";
import { AssetsView } from "./components/AssetsView";
import type { CSSProperties } from "react";

const navItems = [
  { to: "/", label: "Dashboard" },
  { to: "/clients", label: "Clients" },
  { to: "/missions", label: "Missions" },
  { to: "/runs", label: "Runs" },
  { to: "/deliverables", label: "Deliverables" },
  { to: "/assets", label: "Assets" },
];

const shellStyle: CSSProperties = {
  display: "flex",
  minHeight: "100vh",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  color: "#e2e8f0",
  backgroundColor: "#0f172a",
};

const sidebarStyle: CSSProperties = {
  width: 220,
  backgroundColor: "#020617",
  color: "#e5e7eb",
  padding: "24px 0",
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
  borderRight: "1px solid #1e293b",
};

const logoStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "0.04em",
  padding: "0 20px 20px",
  borderBottom: "1px solid #1e293b",
  marginBottom: 16,
  color: "#fff",
};

const navLinkBase: CSSProperties = {
  display: "block",
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: 500,
  color: "#64748b",
  textDecoration: "none",
  borderLeft: "3px solid transparent",
  transition: "all 0.15s",
};

const navLinkActive: CSSProperties = {
  ...navLinkBase,
  color: "#f1f5f9",
  backgroundColor: "#1e293b",
  borderLeftColor: "#3b82f6",
};

const contentStyle: CSSProperties = {
  flex: 1,
  padding: "32px 40px",
  maxWidth: 1280,
};

export default function App() {
  return (
    <BrowserRouter>
      <div style={shellStyle}>
        {/* Sidebar */}
        <nav style={sidebarStyle}>
          <div style={logoStyle}>AJ DIGITAL OS</div>
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
            Operator Dashboard v0.2
          </div>
        </nav>

        {/* Main content */}
        <main style={contentStyle}>
          <Routes>
            <Route path="/" element={<DashboardHome />} />
            <Route path="/clients" element={<ClientsView />} />
            <Route path="/missions" element={<MissionsView />} />
            <Route path="/runs" element={<RunsView />} />
            <Route path="/deliverables" element={<DeliverablesView />} />
            <Route path="/assets" element={<AssetsView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
