import Link from "next/link";
import type { Run } from "@/lib/types";
import StatusBadge from "./StatusBadge";

export default function RunsTable({ runs }: { runs: Run[] }) {
  if (runs.length === 0) {
    return <p className="text-zinc-500 text-sm">No runs found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-zinc-500">
            <th className="pb-3 pr-6 font-medium">Run ID</th>
            <th className="pb-3 pr-6 font-medium">Status</th>
            <th className="pb-3 font-medium">Started At</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800">
          {runs.map((run) => (
            <tr key={run.id} className="hover:bg-zinc-900/50 transition-colors">
              <td className="py-3 pr-6">
                <Link
                  href={`/runs/${run.run_ref}`}
                  className="text-indigo-400 hover:text-indigo-300 font-mono text-xs"
                >
                  {run.run_ref}
                </Link>
                {run.mission_type && (
                  <span className="ml-2 text-zinc-600 text-xs">{run.mission_type}</span>
                )}
              </td>
              <td className="py-3 pr-6">
                <StatusBadge status={run.status} />
              </td>
              <td className="py-3 text-zinc-400 font-mono text-xs">
                {new Date(run.started_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
