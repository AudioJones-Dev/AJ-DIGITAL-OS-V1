/**
 * Hermes Mission — Publish Scheduled Distribution Assets
 *
 * Finds distribution assets with status=scheduled and scheduled_at <= now(),
 * transitions them to published with published_at timestamp.
 * Simulation only — no actual external publishing.
 */

import { resolveConfig, isConfigured, supabaseGet, supabasePatch } from "../../db/supabase-client.js";
import type { DbDistributionAsset } from "../../db/db-types.js";

const TAG = "[PUBLISH-SCHEDULED]";

export async function publishScheduledAssets(): Promise<void> {
  const cfg = resolveConfig();
  if (!isConfigured(cfg)) {
    console.log(`${TAG} Supabase not configured — skipping.`);
    return;
  }

  const now = new Date().toISOString();

  const result = await supabaseGet<DbDistributionAsset>(
    cfg,
    "distribution_assets",
    `status=eq.scheduled&scheduled_at=lte.${encodeURIComponent(now)}&select=id,channel,title&limit=50`,
  );

  if (!result.ok || !result.data?.length) {
    console.log(`${TAG} No assets due for publishing.`);
    return;
  }

  console.log(`${TAG} Found ${result.data.length} assets due for publishing.`);

  let published = 0;
  let failed = 0;

  for (const asset of result.data) {
    const patch = await supabasePatch<DbDistributionAsset>(
      cfg,
      "distribution_assets",
      `id=eq.${encodeURIComponent(asset.id)}`,
      { status: "published", published_at: now },
    );

    if (patch.ok) {
      published++;
      console.log(`${TAG} Published asset — id=${asset.id} channel=${asset.channel} title="${asset.title}"`);
    } else {
      failed++;
      console.error(`${TAG} Failed to publish asset — id=${asset.id} error=${patch.error}`);
    }
  }

  console.log(`${TAG} Done — published=${published} failed=${failed}`);
}
