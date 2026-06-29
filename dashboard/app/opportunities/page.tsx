import { fetchOpportunities } from "@/lib/api";

export const dynamic = "force-dynamic";

export default async function OpportunitiesPage() {
  let items: unknown[] = [];
  let error: string | null = null;

  try {
    items = await fetchOpportunities();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to fetch opportunities";
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Opportunities</h1>

      {error ? (
        <div className="text-aj-critical text-sm bg-aj-critical/15 border border-aj-critical/40 rounded-md p-3">
          {error}
        </div>
      ) : items.length === 0 ? (
        <p className="text-aj-text-muted text-sm">No opportunities found.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="bg-aj-surface-1 border border-aj-border rounded-lg p-4">
              <pre className="text-xs text-aj-text-secondary font-mono overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(item, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
