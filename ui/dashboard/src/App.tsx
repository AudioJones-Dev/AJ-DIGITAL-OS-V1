import { BrowserRouter, Routes, Route, NavLink, Navigate } from "react-router-dom";
import { ClientsView } from "./components/ClientsView";
import { MissionsView } from "./components/MissionsView";
import { RunsView } from "./components/RunsView";
import { DeliverablesView } from "./components/DeliverablesView";
import type { CSSProperties } from "react";

const navItems = [
  { to: "/clients", label: "Clients" },
  { to: "/missions", label: "Missions" },
  { to: "/runs", label: "Runs" },
  { to: "/deliverables", label: "Deliverables" },
];

const shellStyle: CSSProperties = {
  display: "flex",
  minHeight: "100vh",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  color: "#111827",
  backgroundColor: "#f9fafb",
};

const sidebarStyle: CSSProperties = {
  width: 220,
  backgroundColor: "#111827",
  color: "#e5e7eb",
  padding: "24px 0",
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
};

const logoStyle: CSSProperties = {
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: "0.04em",
  padding: "0 20px 20px",
  borderBottom: "1px solid #1f2937",
  marginBottom: 16,
  color: "#fff",
};

const navLinkBase: CSSProperties = {
  display: "block",
  padding: "10px 20px",
  fontSize: 13,
  fontWeight: 500,
  color: "#9ca3af",
  textDecoration: "none",
  borderLeft: "3px solid transparent",
  transition: "all 0.15s",
};

const navLinkActive: CSSProperties = {
  ...navLinkBase,
  color: "#fff",
  backgroundColor: "#1f2937",
  borderLeftColor: "#2563eb",
};

const contentStyle: CSSProperties = {
  flex: 1,
  padding: "32px 40px",
  maxWidth: 1200,
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
              color: "#6b7280",
              borderTop: "1px solid #1f2937",
            }}
          >
            Operator Dashboard v0.1
          </div>
        </nav>

        {/* Main content */}
        <main style={contentStyle}>
          <Routes>
            <Route path="/" element={<Navigate to="/runs" replace />} />
            <Route path="/clients" element={<ClientsView />} />
            <Route path="/missions" element={<MissionsView />} />
            <Route path="/runs" element={<RunsView />} />
            <Route path="/deliverables" element={<DeliverablesView />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
