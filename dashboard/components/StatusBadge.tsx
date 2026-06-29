import type { RunStatus } from "@/lib/types";

const statusStyles: Record<string, string> = {
  created: "bg-aj-surface-3 text-aj-text-secondary",
  validated: "bg-aj-data/15 text-aj-data",
  pending_approval: "bg-aj-warning/15 text-aj-warning",
  approved: "bg-aj-success/15 text-aj-success",
  execution: "bg-orange-900 text-orange-300",
  executed: "bg-aj-success/15 text-aj-success",
  running: "bg-orange-900 text-orange-300",
  completed: "bg-aj-success/15 text-aj-success",
  failed: "bg-aj-critical/15 text-aj-critical",
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
