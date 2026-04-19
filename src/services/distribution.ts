/**
 * Distribution Expansion Service — Phase 3
 *
 * Expands proof deliverables (performance reports, case studies)
 * into channel-ready distribution assets (LinkedIn, X, email, web, sales).
 */

import type {
  DbDeliverable,
  DbDistributionAsset,
  InsertDistributionAsset,
  DistributionAssetStatus,
} from "../db/db-types.js";
import {
  resolveConfig,
  isConfigured,
  supabaseGet,
  supabaseInsert,
  type SupabaseConfig,
} from "../db/supabase-client.js";

const TAG = "[DISTRIBUTION]";

// ── Types ──────────────────────────────────────────────────────────

interface ProofSource {
  headline: string;
  summary: string;
  metrics: string;
  improvement: string;
  cta: string;
}

interface DistributionVariant {
  channel: string;
  format: string;
  title: string;
  content: string;
  cta: string;
  status: DistributionAssetStatus;
}

// ── Extraction ─────────────────────────────────────────────────────

function extractProofSource(deliverable: DbDeliverable): ProofSource {
  const meta = deliverable.metadata ?? {};
  return {
    headline: (meta.headline as string) ?? (meta.title as string) ?? deliverable.filename,
    summary: (meta.summary as string) ?? (meta.description as string) ?? "",
    metrics: (meta.metrics as string) ?? (meta.key_metrics as string) ?? "",
    improvement: (meta.improvement_signal as string) ?? (meta.improvement_pct as string) ?? "",
    cta: (meta.cta as string) ?? "See how AJ Digital OS drives results.",
  };
}

// ── Variant Builders ───────────────────────────────────────────────

function buildLinkedInPost(src: ProofSource): DistributionVariant {
  const body = [
    src.headline,
    "",
    src.summary || "Proof of execution. Real metrics. No fluff.",
    "",
    src.metrics ? `Key metrics: ${src.metrics}` : null,
    src.improvement ? `Improvement: ${src.improvement}` : null,
    "",
    src.cta,
  ]
    .filter((l) => l !== null)
    .join("\n");
  return { channel: "linkedin", format: "post", title: src.headline, content: body, cta: src.cta, status: "draft" };
}

function buildXThread(src: ProofSource): DistributionVariant {
  const tweets = [
    `${src.headline} 🧵`,
    src.summary || "Here's what the data shows.",
    src.metrics ? `📊 ${src.metrics}` : null,
    src.improvement ? `📈 ${src.improvement}` : null,
    src.cta,
  ].filter((t) => t !== null);
  return { channel: "x", format: "thread", title: src.headline, content: tweets.join("\n---\n"), cta: src.cta, status: "draft" };
}

function buildEmailSnippet(src: ProofSource): DistributionVariant {
  const body = [
    `Subject: ${src.headline}`,
    "",
    src.summary || "Here are the latest results.",
    "",
    src.metrics ? `Metrics: ${src.metrics}` : null,
    src.improvement ? `Improvement: ${src.improvement}` : null,
    "",
    src.cta,
  ]
    .filter((l) => l !== null)
    .join("\n");
  return { channel: "email", format: "snippet", title: src.headline, content: body, cta: src.cta, status: "draft" };
}

function buildWebProofBlock(src: ProofSource): DistributionVariant {
  const body = JSON.stringify({
    headline: src.headline,
    summary: src.summary,
    metrics: src.metrics,
    improvement: src.improvement,
    cta: src.cta,
  });
  return { channel: "website", format: "proof_block", title: src.headline, content: body, cta: src.cta, status: "draft" };
}

function buildSalesSnippet(src: ProofSource): DistributionVariant {
  const body = [
    `**${src.headline}**`,
    src.summary,
    src.metrics ? `Metrics: ${src.metrics}` : null,
    src.improvement ? `Improvement: ${src.improvement}` : null,
  ]
    .filter((l) => l !== null)
    .join("\n");
  return { channel: "sales", format: "snippet", title: src.headline, content: body, cta: src.cta, status: "draft" };
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Build all distribution variants from a proof source.
 */
export function buildDistributionVariants(deliverable: DbDeliverable): DistributionVariant[] {
  const src = extractProofSource(deliverable);
  return [
    buildLinkedInPost(src),
    buildXThread(src),
    buildEmailSnippet(src),
    buildWebProofBlock(src),
    buildSalesSnippet(src),
  ];
}

/**
 * Persist distribution variants to Supabase.
 */
export async function saveDistributionAssets(
  clientId: string | null,
  sourceDeliverableId: string,
  variants: DistributionVariant[],
  config?: Partial<SupabaseConfig>,
): Promise<{ saved: number; errors: string[] }> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { saved: 0, errors: ["Supabase not configured"] };

  let saved = 0;
  const errors: string[] = [];

  for (const v of variants) {
    const row: InsertDistributionAsset = {
      client_id: clientId,
      source_deliverable_id: sourceDeliverableId,
      channel: v.channel,
      format: v.format,
      title: v.title,
      content: v.content,
      cta: v.cta,
      status: v.status,
      scheduled_at: null,
      published_at: null,
      metadata: {},
    };
    const result = await supabaseInsert<DbDistributionAsset>(
      cfg,
      "distribution_assets",
      row as unknown as Record<string, unknown>,
    );
    if (result.ok) {
      saved++;
    } else {
      errors.push(`${v.channel}/${v.format}: ${result.error}`);
    }
  }

  return { saved, errors };
}

/**
 * Expand a single proof deliverable into distribution assets and persist them.
 */
export async function expandProofDeliverable(
  deliverableId: string,
  config?: Partial<SupabaseConfig>,
): Promise<{ saved: number; errors: string[] }> {
  const cfg = resolveConfig(config);
  if (!isConfigured(cfg)) return { saved: 0, errors: ["Supabase not configured"] };

  // Fetch the deliverable
  const deliverableResult = await supabaseGet<DbDeliverable>(
    cfg,
    "deliverables",
    `id=eq.${encodeURIComponent(deliverableId)}&limit=1`,
  );
  if (!deliverableResult.ok || !deliverableResult.data?.length) {
    return { saved: 0, errors: [`Deliverable ${deliverableId} not found`] };
  }
  const deliverable = deliverableResult.data[0];

  // Build variants
  const variants = buildDistributionVariants(deliverable);

  // Persist
  const result = await saveDistributionAssets(
    deliverable.client_id,
    deliverableId,
    variants,
    config,
  );

  console.log(
    `${TAG} variants generated — source_deliverable_id=${deliverableId}, assets_created=${result.saved}`,
  );

  return result;
}
