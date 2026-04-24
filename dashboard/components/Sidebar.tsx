"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/runs", label: "Runs" },
  { href: "/hermes", label: "Hermes" },
  { href: "/opportunities", label: "Opportunities" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 bg-zinc-900 border-r border-zinc-800 flex flex-col">
      <div className="px-5 py-4 border-b border-zinc-800">
        <span className="text-xs font-bold text-indigo-400 tracking-widest uppercase">
          AJ Digital OS
        </span>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
