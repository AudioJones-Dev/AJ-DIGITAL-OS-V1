/**
 * Distribution Metrics Service
 *
 * Records per-asset engagement metrics and aggregates performance
 * across channels for client reporting.
 */

import { resolveConfig, isConfigured, supabaseGet, supabaseInsert } from "../db/supabase-client.js";
import type { DbDistributionMetric, InsertDistributionMetric, DbDistributionAsset } from "../db/db-types.js";

const TAG = "[DIST-METRICS]";

/**
 * Record a metrics snapshot for a published distribution asset.
 */
export async function recordDistributionMetrics(
  assetId: string,
  channel: string,
  metrics: { impressions?: number; clicks?: number; engagements?: number; leads?: number },
): Promise<{ ok: boolean; error?: string }> {
  const cfg = resolveConfig();
  if (!isConfigured(cfg)) return { ok: false, error: "Supabase not configured" };

  const row: InsertDistributionMetric = {
    distribution_asset_id: assetId,
    channel,
    impressions: metrics.impressions ?? 0,
    clicks: metrics.clicks ?? 0,
    engagements: metrics.engagements ?? 0,
    leads: metrics.leads ?? 0,
  };

  const result = await supabaseInsert<DbDistributionMetric>(cfg, "distribution_metrics", row);
  if (result.ok) {
    console.log(`${TAG} Recorded metrics — asset=${assetId} channel=${channel}`);
    return { ok: true };
  }
  return { ok: false, error: result.error ?? "Unknown insert error" };
}

export interface DistributionPerformance {
  total_assets: number;
  published: number;
  total_impressions: number;
  total_clicks: number;
  total_engagements: number;
  total_leads: number;
  by_channel: Record<string, { impressions: number; clicks: number; engagements: number; leads: number }>;
  timestamp: string;
}

/**
 * Aggregate distribution performance for a client (or all clients).
 */
export async function getDistributionPerformance(clientId?: string): Promise<DistributionPerformance> {
  const cfg = resolveConfig();
  const empty: DistributionPerformance = {
    total_assets: 0,
    published: 0,
    total_impressions: 0,
    total_clicks: 0,
    total_engagements: 0,
    total_leads: 0,
    by_channel: {},
    timestamp: new Date().toISOString(),
  };

  if (!isConfigured(cfg)) return empty;

  // Get assets
  let assetQuery = "select=id,status,channel&limit=500";
  if (clientId) assetQuery += `&client_id=eq.${encodeURIComponent(clientId)}`;

  const assetsResult = await supabaseGet<Pick<DbDistributionAsset, "id" | "status" | "channel">>(cfg, "distribution_assets", assetQuery);
  const assets = assetsResult.ok && assetsResult.data ? assetsResult.data : [];

  empty.total_assets = assets.length;
  empty.published = assets.filter((a) => a.status === "published").length;

  if (assets.length === 0) return empty;

  // Get all metrics for these assets
  const assetIds = assets.map((a) => encodeURIComponent(a.id)).join(",");
  const metricsResult = await supabaseGet<DbDistributionMetric>(
    cfg,
    "distribution_metrics",
    `distribution_asset_id=in.(${assetIds})&select=*&limit=1000`,
  );

  const metrics = metricsResult.ok && metricsResult.data ? metricsResult.data : [];

  let totalImpressions = 0;
  let totalClicks = 0;
  let totalEngagements = 0;
  let totalLeads = 0;
  const byChannel: Record<string, { impressions: number; clicks: number; engagements: number; leads: number }> = {};

  for (const m of metrics) {
    totalImpressions += m.impressions;
    totalClicks += m.clicks;
    totalEngagements += m.engagements;
    totalLeads += m.leads;

    if (!byChannel[m.channel]) {
      byChannel[m.channel] = { impressions: 0, clicks: 0, engagements: 0, leads: 0 };
    }
    byChannel[m.channel]!.impressions += m.impressions;
    byChannel[m.channel]!.clicks += m.clicks;
    byChannel[m.channel]!.engagements += m.engagements;
    byChannel[m.channel]!.leads += m.leads;
  }

  return {
    total_assets: assets.length,
    published: empty.published,
    total_impressions: totalImpressions,
    total_clicks: totalClicks,
    total_engagements: totalEngagements,
    total_leads: totalLeads,
    by_channel: byChannel,
    timestamp: new Date().toISOString(),
  };
}
