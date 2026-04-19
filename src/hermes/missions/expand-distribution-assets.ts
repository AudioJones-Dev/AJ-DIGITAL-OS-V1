/**
 * Hermes Mission — Expand Distribution Assets
 *
 * Finds proof deliverables (performance reports, case studies) that
 * do not yet have distribution assets and expands them into
 * channel-ready drafts.
 *
 * Deduplication: skips deliverables that already have at least one
 * distribution_asset row for the same source_deliverable_id.
 */

import {
  resolveConfig,
  isConfigured,
  supabaseGet,
  type SupabaseConfig,
} from "../../db/supabase-client.js";
import type { DbDeliverable, DbDistributionAsset } from "../../db/db-types.js";
import { expandProofDeliverable } from "../../services/distribution.js";

const TAG = "[DISTRIBUTION]";

/**
 * Run one expansion cycle.
 */
export async function expandDistributionAssets(
  config?: Partial<SupabaseConfig>,
): Promise<{ expanded: number; skipped: number; errors: string[] }> {
  console.log(`${TAG} expansion run started`);

  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) {
    console.log(`${TAG} Supabase not configured — skipping`);
    return { expanded: 0, skipped: 0, errors: ["Supabase not configured"] };
  }

  // 1. Fetch proof deliverables (performance + case_study)
  const proofResult = await supabaseGet<DbDeliverable>(
    cfg,
    "deliverables",
    "or=(metadata->>report_type.eq.performance,metadata->>report_type.eq.case_study)&order=created_at.desc&limit=100",
  );
  if (!proofResult.ok || !proofResult.data?.length) {
    console.log(`${TAG} no proof deliverables found`);
    console.log(`${TAG} expansion run complete — expanded=0 skipped=0`);
    return { expanded: 0, skipped: 0, errors: [] };
  }

  // 2. Fetch existing distribution asset source IDs for deduplication
  const existingResult = await supabaseGet<DbDistributionAsset>(
    cfg,
    "distribution_assets",
    "select=source_deliverable_id&limit=1000",
  );
  const existingSourceIds = new Set(
    (existingResult.data ?? [])
      .map((a) => a.source_deliverable_id)
      .filter((id): id is string => id !== null),
  );

  let expanded = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const deliverable of proofResult.data) {
    if (existingSourceIds.has(deliverable.id)) {
      skipped++;
      continue;
    }

    const result = await expandProofDeliverable(deliverable.id, config);
    if (result.saved > 0) {
      expanded++;
    }
    if (result.errors.length > 0) {
      errors.push(...result.errors);
    }
  }

  console.log(
    `${TAG} expansion run complete — expanded=${expanded} skipped=${skipped} errors=${errors.length}`,
  );

  return { expanded, skipped, errors };
}
