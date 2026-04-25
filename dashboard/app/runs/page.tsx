import { fetchRuns } from "@/lib/api";
import RunsTable from "@/components/RunsTable";
import type { Run } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function RunsPage() {
  let runs: Run[] = [];
  let error: string | null = null;

  try {
    runs = await fetchRuns();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to fetch runs";
  }

  return (
    <div>
      <h1 className="text-xl font-semibold mb-6">Runs</h1>
      {error ? (
        <div className="text-red-400 text-sm bg-red-950/50 border border-red-900 rounded-md p-3">
          {error}
        </div>
      ) : (
        <RunsTable runs={runs} />
      )}
    </div>
  );
}
