import type { Mission } from "@/lib/types";

const statusStyle: Record<string, string> = {
  active: "bg-green-900 text-green-300",
  paused: "bg-yellow-900 text-yellow-300",
  retired: "bg-zinc-700 text-zinc-400",
  failed: "bg-red-900 text-red-300",
};

export default function MissionCard({ mission }: { mission: Mission }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-100 truncate">{mission.mission_type}</h3>
        <span
          className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
            statusStyle[mission.status] ?? "bg-zinc-700 text-zinc-400"
          }`}
        >
          {mission.status}
        </span>
      </div>
      {mission.objective && (
        <p className="text-xs text-zinc-400 line-clamp-2">{mission.objective}</p>
      )}
      {mission.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {mission.tags.map((tag) => (
            <span key={tag} className="text-xs bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
      <p className="text-xs font-mono text-zinc-600 truncate">{mission.id}</p>
    </div>
  );
}
