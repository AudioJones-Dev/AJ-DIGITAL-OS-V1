import type { AttributionEvent } from "@/lib/types";

interface Props {
  events: AttributionEvent[];
}

export default function MAPAttribution({ events }: Props) {
  if (events.length === 0) {
    return (
      <p className="text-zinc-500 text-xs" data-testid="map-attribution-empty">
        No attribution event recorded yet.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-zinc-800" data-testid="map-attribution-table">
      <table className="w-full text-xs">
        <thead className="bg-zinc-900 border-b border-zinc-800">
          <tr className="text-left text-zinc-400">
            <th className="px-3 py-2 font-medium">Emitted</th>
            <th className="px-3 py-2 font-medium">Event Type</th>
            <th className="px-3 py-2 font-medium">Action Source</th>
            <th className="px-3 py-2 font-medium">Channel</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">MAP</th>
          </tr>
        </thead>
        <tbody>
          {events.map((e) => {
            const action = (e.metadata?.["controlAction"] as string | undefined) ?? "—";
            const status = deriveStatus(e.eventType);
            return (
              <tr key={e.eventId} className="border-b border-zinc-800 hover:bg-zinc-900/60">
                <td className="px-3 py-2 text-zinc-500 font-mono whitespace-nowrap">
                  {new Date(e.timestamp).toLocaleString()}
                </td>
                <td className="px-3 py-2 text-zinc-200 font-mono">{e.eventType}</td>
                <td className="px-3 py-2 text-zinc-300 font-mono">{action}</td>
                <td className="px-3 py-2 text-zinc-400 font-mono">{e.channel}</td>
                <td className="px-3 py-2">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      status === "completed"
                        ? "bg-emerald-900/60 text-emerald-300"
                        : status === "failed"
                        ? "bg-red-900/60 text-red-300"
                        : "bg-zinc-800 text-zinc-300"
                    }`}
                  >
                    {status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {e.mapScore ? (
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] ${
                        e.mapScore.mapCompliant
                          ? "bg-emerald-900/40 text-emerald-300"
                          : "bg-zinc-800 text-zinc-400"
                      }`}
                      title={[
                        `meaningful: ${e.mapScore.meaningful}`,
                        `actionable: ${e.mapScore.actionable}`,
                        `profitable: ${e.mapScore.profitable}`,
                      ].join("\n")}
                    >
                      {e.mapScore.mapCompliant ? "compliant" : "non-compliant"}
                    </span>
                  ) : (
                    <span className="text-zinc-600">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function deriveStatus(t: AttributionEvent["eventType"]): string {
  switch (t) {
    case "run_completed":
      return "completed";
    case "run_failed":
      return "failed";
    case "content_published":
      return "published";
    case "content_distributed":
      return "distributed";
    case "run_created":
      return "created";
    default:
      return t;
  }
}
