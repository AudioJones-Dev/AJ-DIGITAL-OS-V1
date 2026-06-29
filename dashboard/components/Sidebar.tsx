"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/command", label: "Command Center", icon: "⬡" },
  { divider: true, label: "Operations" },
  { href: "/control", label: "Control Plane", icon: "⚙" },
  { href: "/governance", label: "Governance", icon: "⚖" },
  { href: "/runs", label: "Runs", icon: "▶" },
  { href: "/agents", label: "Agents", icon: "◈" },
  { divider: true, label: "Applications" },
  { href: "/apps", label: "App Layer", icon: "◈" },
  { divider: true, label: "Execution" },
  { href: "/dag", label: "DAG Runs", icon: "⬡" },
  { href: "/hermes", label: "Hermes API", icon: "⚡" },
  { divider: true, label: "Intelligence" },
  { href: "/decision", label: "Decision Engine", icon: "◎" },
  { href: "/opportunities", label: "Opportunities", icon: "◉" },
  { href: "/entities", label: "Entities", icon: "◆" },
  { divider: true, label: "Memory" },
  { href: "/retrieval", label: "Retrieval", icon: "⊞" },
  { href: "/cache", label: "Cache", icon: "⊡" },
  { href: "/connectors", label: "Connectors", icon: "⇄" },
  { divider: true, label: "Observability" },
  { href: "/events", label: "System Events", icon: "≡" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-aj-surface-1 border-r border-aj-border flex flex-col overflow-y-auto">
      <div className="px-5 py-4 border-b border-aj-border">
        <span className="text-xs font-bold text-aj-data tracking-widest uppercase">
          AJ Digital OS
        </span>
        <p className="text-aj-text-muted text-xs mt-0.5">Command Center</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map((item, i) => {
          if ("divider" in item) {
            return (
              <div key={i} className="pt-4 pb-1 px-3">
                <p className="text-xs font-semibold text-aj-text-muted uppercase tracking-wider">
                  {item.label}
                </p>
              </div>
            );
          }
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-aj-surface-3 text-aj-signal"
                  : "text-aj-text-secondary hover:bg-aj-surface-2 hover:text-aj-text"
              }`}
            >
              <span className="text-xs opacity-60">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-3 border-t border-aj-border">
        <p className="text-aj-text-muted text-xs">v1.0 · AJ Digital LLC</p>
      </div>
    </aside>
  );
}
