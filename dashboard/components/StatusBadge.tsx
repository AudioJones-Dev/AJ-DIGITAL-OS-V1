import type { RunStatus } from "@/lib/types";

const statusStyles: Record<string, string> = {
  created: "bg-aj-surface-3 text-aj-text-secondary",
  validated: "bg-blue-900 text-blue-300",
  pending_approval: "bg-yellow-900 text-yellow-300",
  approved: "bg-green-900 text-green-300",
  execution: "bg-orange-900 text-orange-300",
  executed: "bg-green-900 text-green-300",
  running: "bg-orange-900 text-orange-300",
  completed: "bg-green-900 text-green-300",
  failed: "bg-red-900 text-red-300",
  pending: "bg-aj-surface-3 text-aj-text-secondary",
};

export default function StatusBadge({ status }: { status: RunStatus | string }) {
  const style = statusStyles[status] ?? "bg-aj-surface-3 text-aj-text-secondary";
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style}`}
    >
      {status}
    </span>
  );
}
