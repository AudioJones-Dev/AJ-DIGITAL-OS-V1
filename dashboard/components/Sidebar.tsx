"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/command", label: "Command Center", icon: "⬡" },
  { divider: true, label: "Operations" },
  { href: "/control", label: "Control Plane", icon: "⚙" },
  { href: "/runs", label: "Runs", icon: "▶" },
  { href: "/agents", label: "Agents", icon: "◈" },
  { divider: true, label: "Execution" },
  { href: "/dag", label: "DAG Runs", icon: "⬡" },
  { href: "/hermes", label: "Hermes API", icon: "⚡" },
  { divider: true, label: "Intelligence" },
  { href: "/decision", label: "Decision Engine", icon: "◎" },
  { href: "/opportunities", label: "Opportunities", icon: "◉" },
  { divider: true, label: "Memory" },
  { href: "/retrieval", label: "Retrieval", icon: "⊞" },
  { href: "/cache", label: "Cache", icon: "⊡" },
  { divider: true, label: "Observability" },
  { href: "/events", label: "System Events", icon: "≡" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col overflow-y-auto">
      <div className="px-5 py-4 border-b border-zinc-800">
        <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase">
          AJ Digital OS
        </span>
        <p className="text-zinc-600 text-xs mt-0.5">Command Center</p>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map((item, i) => {
          if ("divider" in item) {
            return (
              <div key={i} className="pt-4 pb-1 px-3">
                <p className="text-xs font-semibold text-zinc-600 uppercase tracking-wider">
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
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              <span className="text-xs opacity-60">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-3 border-t border-zinc-800">
        <p className="text-zinc-700 text-xs">v1.0 · AJ Digital LLC</p>
      </div>
    </aside>
  );
}
