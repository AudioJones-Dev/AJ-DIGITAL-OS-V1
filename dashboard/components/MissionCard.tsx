import type { Mission } from "@/lib/types";

const statusStyle: Record<string, string> = {
  active: "bg-aj-success/15 text-aj-success",
  paused: "bg-aj-warning/15 text-aj-warning",
  retired: "bg-aj-surface-3 text-aj-text-secondary",
  failed: "bg-aj-critical/15 text-aj-critical",
};

export default function MissionCard({ mission }: { mission: Mission }) {
  return (
    <div className="bg-aj-surface-1 border border-aj-border rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-aj-text truncate">{mission.mission_type}</h3>
        <span
          className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
            statusStyle[mission.status] ?? "bg-aj-surface-3 text-aj-text-secondary"
          }`}
        >
          {mission.status}
        </span>
      </div>
      {mission.objective && (
        <p className="text-xs text-aj-text-secondary line-clamp-2">{mission.objective}</p>
      )}
      {mission.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {mission.tags.map((tag) => (
            <span key={tag} className="text-xs bg-aj-surface-2 text-aj-text-muted px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs font-mono text-aj-text-muted truncate">{mission.id}</p>
    </div>
  );
}
