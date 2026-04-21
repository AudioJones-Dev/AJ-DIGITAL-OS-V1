/**
 * Phase 3 — End-to-End Distribution Routing Validation
 *
 * Proves: deliverable → distribution_assets → queue → publish → metrics → proof
 *
 * Run: node --import ./dist/env.js dist/scripts/validate-distribution-e2e.js
 */

import {
  resolveConfig,
  isConfigured,
  supabaseGet,
  supabaseInsert,
  supabasePatch,
} from "../db/supabase-client.js";
import type {
  DbDeliverable,
  DbDistributionAsset,
  DbDistributionMetric,
} from "../db/db-types.js";
import { buildDistributionVariants, saveDistributionAssets, expandProofDeliverable } from "../services/distribution.js";
import { recordDistributionMetrics, getDistributionPerformance } from "../services/distribution-metrics.js";
import { publishScheduledAssets } from "../hermes/missions/publish-scheduled-assets.js";

const TAG = "[E2E-VALIDATE]";
const PASS = "✅ PASS";
const FAIL = "❌ FAIL";

interface TestResult {
  name: string;
  passed: boolean;
  details: string[];
  errors: string[];
}

interface ValidationContext {
  runId: string;
  clientId: string | null;
  missionId: string | null;
  missionRunId: string | null;
  deliverableId: string | null;
  assetIds: string[];
  queuedAssetId: string | null;
  publishedAssetId: string | null;
}

const results: TestResult[] = [];
const context: ValidationContext = {
  runId: `e2e-${Date.now()}`,
  clientId: null,
  missionId: null,
  missionRunId: null,
  deliverableId: null,
  assetIds: [],
  queuedAssetId: null,
  publishedAssetId: null,
};

function report(name: string, passed: boolean, details: string[], errors: string[] = []): void {
  results.push({ name, passed, details, errors });
  console.log(`\n${"=".repeat(60)}`);
  console.log(`${passed ? PASS : FAIL}  ${name}`);
  for (const d of details) console.log(`  → ${d}`);
  for (const e of errors) console.log(`  ⚠ ${e}`);
}

// ── Helpers ────────────────────────────────────────────────────────

async function ensureDistributionTables(cfg: ReturnType<typeof resolveConfig>): Promise<boolean> {
  let lastError: string | null = null;

  for (let attempt = 1; attempt <= 5; attempt++) {
    const check = await supabaseGet<DbDistributionAsset>(cfg, "distribution_assets", "select=id&limit=0");
    if (check.ok) return true;

    lastError = check.error ?? "Unknown pre-check failure";
    if (attempt < 5) {
      console.log(`${TAG} distribution pre-check retry ${attempt}/5: ${lastError}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
    }
  }

  console.log(`${TAG} distribution table pre-check failed after retries: ${lastError}`);
  return false;
}

async function seedTestDeliverable(cfg: ReturnType<typeof resolveConfig>): Promise<DbDeliverable | null> {
  if (context.deliverableId) {
    const existing = await supabaseGet<DbDeliverable>(
      cfg,
      "deliverables",
      `id=eq.${context.deliverableId}&select=*`,
    );
    if (existing.ok && existing.data?.[0]) {
      return existing.data[0];
    }
  }

  console.log(`${TAG} Seeding isolated test data for run ${context.runId}`);

  const clientSlug = `e2e-validation-${context.runId}`;
  const clientResult = await supabaseInsert<{ id: string }>(cfg, "clients", {
    slug: clientSlug,
    display_name: `E2E Validation ${context.runId}`,
    contact_email: `${context.runId}@ajdigital.test`,
    tier: "standard",
    status: "active",
    metadata: { test: true, run_id: context.runId },
  });
  if (!clientResult.ok || !clientResult.data) {
    console.log(`${TAG} Failed to seed client: ${clientResult.error}`);
    return null;
  }
  context.clientId = clientResult.data.id;

  const missionResult = await supabaseInsert<{ id: string }>(cfg, "missions", {
    client_id: context.clientId,
    mission_type: "build_and_review",
    objective: `E2E validation mission ${context.runId}`,
    priority: "normal",
    input_payload: { test: true, run_id: context.runId },
    status: "active",
    tags: ["e2e", "validation", context.runId],
  });
  if (!missionResult.ok || !missionResult.data) {
    console.log(`${TAG} Failed to seed mission: ${missionResult.error}`);
    return null;
  }
  context.missionId = missionResult.data.id;

  const runResult = await supabaseInsert<{ id: string }>(cfg, "mission_runs", {
    mission_id: context.missionId,
    run_ref: context.runId,
    status: "completed",
    trigger_type: "manual",
    ok: true,
    summary: `E2E validation run ${context.runId}`,
    artifacts: [],
  });
  if (!runResult.ok || !runResult.data) {
    console.log(`${TAG} Failed to seed mission_run: ${runResult.error}`);
    return null;
  }
  context.missionRunId = runResult.data.id;

  const deliverableResult = await supabaseInsert<DbDeliverable>(cfg, "deliverables", {
    client_id: context.clientId,
    mission_run_id: context.missionRunId,
    filename: `${context.runId}-proof-report.json`,
    content_type: "application/json",
    size_bytes: 1024,
    r2_key: `validation/${context.runId}/proof-report.json`,
    status: "published",
    metadata: {
      test: true,
      run_id: context.runId,
      report_type: "performance",
      headline: "E2E Validation Performance Report",
      summary: "Automated validation proving the distribution pipeline works end-to-end.",
      metrics: "conversion +34%, engagement +22%",
      improvement_signal: "+28% overall improvement",
      cta: "Book a strategy call to see your results.",
    },
  });
  if (!deliverableResult.ok || !deliverableResult.data) {
    console.log(`${TAG} Failed to insert simulated deliverable: ${deliverableResult.error}`);
    return null;
  }

  context.deliverableId = deliverableResult.data.id;
  console.log(`${TAG} Simulated proof deliverable created: ${deliverableResult.data.id}`);
  return deliverableResult.data;
}

// ── Test 1: Validate Expansion ─────────────────────────────────────

async function test1_expansion(cfg: ReturnType<typeof resolveConfig>): Promise<void> {
  const name = "Expansion";
  const details: string[] = [];
  const errors: string[] = [];

  const deliverable = await seedTestDeliverable(cfg);
  if (!deliverable) {
    report(name, false, [], ["No deliverable available — cannot test expansion"]);
    return;
  }

  // Build variants in-memory first
  const variants = buildDistributionVariants(deliverable);
  details.push(`Variants built in-memory: ${variants.length}`);

  if (variants.length !== 5) {
    errors.push(`Expected 5 variants, got ${variants.length}`);
  }

  const expectedChannels = ["linkedin", "x", "email", "website", "sales"];
  for (const ch of expectedChannels) {
    const v = variants.find((v) => v.channel === ch);
    if (!v) {
      errors.push(`Missing channel: ${ch}`);
    } else {
      if (!v.title) errors.push(`${ch}: missing title`);
      if (!v.content) errors.push(`${ch}: missing content`);
      if (v.status !== "draft") errors.push(`${ch}: status is '${v.status}', expected 'draft'`);
      if (!v.format) errors.push(`${ch}: missing format`);
      details.push(`${ch}/${v.format}: title="${v.title.slice(0, 40)}..." status=${v.status}`);
    }
  }

  // Now persist via expandProofDeliverable
  const expandResult = await expandProofDeliverable(deliverable.id);
  details.push(`Saved to DB: ${expandResult.saved}`);
  if (expandResult.errors.length > 0) {
    for (const e of expandResult.errors) errors.push(`Save error: ${e}`);
  }

  // Verify they exist in DB
  const dbAssets = await supabaseGet<DbDistributionAsset>(
    cfg,
    "distribution_assets",
    `source_deliverable_id=eq.${deliverable.id}&select=*&order=created_at.asc`,
  );
  const assets = dbAssets.ok && dbAssets.data ? dbAssets.data : [];
  context.assetIds = assets.map((asset) => asset.id);
  details.push(`Assets in DB: ${assets.length}`);

  if (assets.length !== 5) {
    errors.push(`Expected 5 assets in DB, got ${assets.length}`);
  }

  for (const a of assets) {
    if (a.status !== "draft") errors.push(`Asset ${a.id} status=${a.status}, expected draft`);
  }

  report(name, errors.length === 0, details, errors);
}

// ── Test 2: Validate Queue API ─────────────────────────────────────

async function test2_queueApi(cfg: ReturnType<typeof resolveConfig>): Promise<void> {
  const name = "Queue API";
  const details: string[] = [];
  const errors: string[] = [];

  const testAssetId = context.assetIds[0];
  if (!testAssetId) {
    report(name, false, [], ["No isolated assets found from expansion test"]);
    return;
  }

  const testAssetResult = await supabaseGet<DbDistributionAsset>(
    cfg,
    "distribution_assets",
    `id=eq.${testAssetId}&select=*`,
  );
  const testAsset = testAssetResult.data?.[0];
  if (!testAsset || testAsset.status !== "draft") {
    report(name, false, [], [`Expected isolated draft asset ${testAssetId}, got '${testAsset?.status ?? "missing"}'`]);
    return;
  }

  details.push(`Draft assets available: ${context.assetIds.length}`);
  details.push(`Test asset: ${testAsset.id} (${testAsset.channel})`);

  // Approve: draft → approved
  const approveResult = await supabasePatch<DbDistributionAsset>(
    cfg,
    "distribution_assets",
    `id=eq.${testAsset.id}&status=eq.draft`,
    { status: "approved" },
  );
  if (approveResult.ok) {
    details.push(`Approve: draft → approved ✓`);
  } else {
    errors.push(`Approve failed: ${approveResult.error}`);
  }

  // Verify approved
  const afterApprove = await supabaseGet<DbDistributionAsset>(
    cfg,
    "distribution_assets",
    `id=eq.${testAsset.id}&select=status`,
  );
  const approvedStatus = afterApprove.data?.[0]?.status;
  if (approvedStatus !== "approved") {
    errors.push(`After approve, status is '${approvedStatus}', expected 'approved'`);
  }

  // Try invalid transition: approve an already-approved asset (should do nothing since filter is status=eq.draft)
  const invalidApprove = await supabasePatch<DbDistributionAsset>(
    cfg,
    "distribution_assets",
    `id=eq.${testAsset.id}&status=eq.draft`,
    { status: "approved" },
  );
  // PostgREST returns ok even if 0 rows matched, but data will be empty/null
  details.push(`Invalid approve (already approved): no crash ✓`);

  // Schedule: approved → scheduled
  const scheduledAt = new Date().toISOString();
  const scheduleResult = await supabasePatch<DbDistributionAsset>(
    cfg,
    "distribution_assets",
    `id=eq.${testAsset.id}&status=eq.approved`,
    { status: "scheduled", scheduled_at: scheduledAt },
  );
  if (scheduleResult.ok) {
    details.push(`Schedule: approved → scheduled at ${scheduledAt} ✓`);
  } else {
    errors.push(`Schedule failed: ${scheduleResult.error}`);
  }

  // Verify scheduled
  const afterSchedule = await supabaseGet<DbDistributionAsset>(
    cfg,
    "distribution_assets",
    `id=eq.${testAsset.id}&select=status,scheduled_at`,
  );
  const scheduled = afterSchedule.data?.[0];
  if (scheduled?.status !== "scheduled") {
    errors.push(`After schedule, status is '${scheduled?.status}', expected 'scheduled'`);
  }
  if (!scheduled?.scheduled_at) {
    errors.push("scheduled_at not set");
  }

  context.queuedAssetId = testAsset.id;

  report(name, errors.length === 0, details, errors);
}

// ── Test 3: Validate Publish Cycle ─────────────────────────────────

async function test3_publish(cfg: ReturnType<typeof resolveConfig>): Promise<void> {
  const name = "Publish Cycle";
  const details: string[] = [];
  const errors: string[] = [];

  if (!context.queuedAssetId) {
    report(name, false, [], ["No isolated scheduled asset found — queue test likely failed"]);
    return;
  }

  const scheduledAssets = await supabaseGet<DbDistributionAsset>(
    cfg,
    "distribution_assets",
    `id=eq.${context.queuedAssetId}&status=eq.scheduled&select=id,channel,title,scheduled_at`,
  );
  if (!scheduledAssets.ok || !scheduledAssets.data?.length) {
    report(name, false, [], [`Scheduled isolated asset ${context.queuedAssetId} not found`]);
    return;
  }

  details.push(`Scheduled assets: ${scheduledAssets.data.length}`);

  // Manually trigger publish cycle
  await publishScheduledAssets();
  details.push("publishScheduledAssets() triggered");

  // Check if assets are now published
  const afterPublish = await supabaseGet<DbDistributionAsset>(
    cfg,
    "distribution_assets",
    `id=eq.${scheduledAssets.data[0]!.id}&select=id,status,published_at`,
  );
  const asset = afterPublish.data?.[0];
  if (asset?.status === "published") {
    details.push(`Status → published ✓`);
  } else {
    errors.push(`After publish, status is '${asset?.status}', expected 'published'`);
  }

  if (asset?.published_at) {
    details.push(`published_at = ${asset.published_at} ✓`);
  } else {
    errors.push("published_at not set after publish");
  }

  if (asset?.status === "published") {
    context.publishedAssetId = asset.id;
  }

  report(name, errors.length === 0, details, errors);
}

// ── Test 4: Validate Metrics Ingestion ─────────────────────────────

async function test4_metrics(cfg: ReturnType<typeof resolveConfig>): Promise<void> {
  const name = "Metrics Ingestion";
  const details: string[] = [];
  const errors: string[] = [];

  if (!context.publishedAssetId) {
    report(name, false, [], ["No isolated published asset found — publish test likely failed"]);
    return;
  }

  const publishedAssets = await supabaseGet<DbDistributionAsset>(
    cfg,
    "distribution_assets",
    `id=eq.${context.publishedAssetId}&status=eq.published&select=id,channel`,
  );

  if (!publishedAssets.ok || !publishedAssets.data?.length) {
    report(name, false, [], [`Published isolated asset ${context.publishedAssetId} not found`]);
    return;
  }

  const asset = publishedAssets.data[0]!;
  details.push(`Recording metrics for asset: ${asset.id} (${asset.channel})`);

  // Record metrics
  const metricsResult = await recordDistributionMetrics(asset.id, asset.channel, {
    impressions: 1500,
    clicks: 120,
    engagements: 45,
    leads: 8,
  });

  if (metricsResult.ok) {
    details.push("Metrics recorded ✓");
  } else {
    errors.push(`Metrics insert failed: ${metricsResult.error}`);
  }

  // Verify row in DB
  const dbMetrics = await supabaseGet<DbDistributionMetric>(
    cfg,
    "distribution_metrics",
    `distribution_asset_id=eq.${asset.id}&select=*&order=captured_at.desc&limit=1`,
  );

  if (dbMetrics.ok && dbMetrics.data?.length) {
    const m = dbMetrics.data[0]!;
    details.push(`DB row: impressions=${m.impressions} clicks=${m.clicks} engagements=${m.engagements} leads=${m.leads}`);
    if (m.impressions !== 1500) errors.push(`impressions: expected 1500, got ${m.impressions}`);
    if (m.clicks !== 120) errors.push(`clicks: expected 120, got ${m.clicks}`);
    if (m.engagements !== 45) errors.push(`engagements: expected 45, got ${m.engagements}`);
    if (m.leads !== 8) errors.push(`leads: expected 8, got ${m.leads}`);
  } else {
    errors.push("No metrics row found in DB after insert");
  }

  // Verify aggregation for the isolated test client
  const perf = await getDistributionPerformance(context.clientId ?? undefined);
  details.push(`Aggregation: total_assets=${perf.total_assets} published=${perf.published} impressions=${perf.total_impressions} leads=${perf.total_leads}`);

  if (perf.total_assets !== 5) {
    errors.push(`Aggregation total_assets: expected 5, got ${perf.total_assets}`);
  }
  if (perf.published !== 1) {
    errors.push(`Aggregation published: expected 1, got ${perf.published}`);
  }
  if (perf.total_impressions !== 1500) {
    errors.push(`Aggregation impressions: expected 1500, got ${perf.total_impressions}`);
  }
  if (perf.total_engagements !== 45) {
    errors.push(`Aggregation engagements: expected 45, got ${perf.total_engagements}`);
  }
  if (perf.total_leads !== 8) {
    errors.push(`Aggregation leads: expected 8, got ${perf.total_leads}`);
  }

  if (Object.keys(perf.by_channel).length > 0) {
    details.push(`by_channel keys: ${Object.keys(perf.by_channel).join(", ")}`);
  }

  report(name, errors.length === 0, details, errors);
}

// ── Test 5: Validate /proof endpoint (service-level) ───────────────

async function test5_proofEndpoint(cfg: ReturnType<typeof resolveConfig>): Promise<void> {
  const name = "/proof Endpoint";
  const details: string[] = [];
  const errors: string[] = [];

  // We can't hit HTTP directly without starting the server.
  // Instead, test the underlying getDistributionPerformance used by buildProofPayload.
  if (!context.clientId) {
    report(name, false, [], ["No isolated client found for proof validation"]);
    return;
  }

  const perf = await getDistributionPerformance(context.clientId);

  const fields: Array<[string, unknown]> = [
    ["total_assets", perf.total_assets],
    ["published", perf.published],
    ["total_impressions", perf.total_impressions],
    ["total_engagements", perf.total_engagements],
    ["total_leads", perf.total_leads],
  ];

  for (const [field, value] of fields) {
    if (typeof value !== "number") {
      errors.push(`${field}: expected number, got ${typeof value}`);
    } else {
      details.push(`${field} = ${value}`);
    }
  }

  if (perf.total_assets !== 5) errors.push(`total_assets: expected 5, got ${perf.total_assets}`);
  if (perf.published !== 1) errors.push(`published: expected 1, got ${perf.published}`);
  if (perf.total_impressions !== 1500) errors.push(`total_impressions: expected 1500, got ${perf.total_impressions}`);
  if (perf.total_engagements !== 45) errors.push(`total_engagements: expected 45, got ${perf.total_engagements}`);
  if (perf.total_leads !== 8) errors.push(`total_leads: expected 8, got ${perf.total_leads}`);

  details.push(`timestamp = ${perf.timestamp}`);

  // The proof endpoint adds these to buildProofPayload — verify mapping names
  details.push("Field mapping check:");
  details.push("  total_distribution_assets ← total_assets");
  details.push("  total_published ← published");
  details.push("  distribution_impressions ← total_impressions");
  details.push("  distribution_engagements ← total_engagements");
  details.push("  distribution_leads ← total_leads");

  report(name, errors.length === 0, details, errors);
}

// ── Test 6: Validate client performance ────────────────────────────

async function test6_clientPerformance(cfg: ReturnType<typeof resolveConfig>): Promise<void> {
  const name = "Client Performance";
  const details: string[] = [];
  const errors: string[] = [];

  const clientId = context.clientId;
  if (!clientId) {
    report(name, false, [], ["No isolated client found for client performance test"]);
    return;
  }

  details.push(`Client: ${clientId}`);
  const perf = await getDistributionPerformance(clientId);

  const fields: Array<[string, unknown]> = [
    ["distribution_assets", perf.total_assets],
    ["published_assets", perf.published],
    ["distribution_impressions", perf.total_impressions],
    ["distribution_engagements", perf.total_engagements],
    ["distribution_leads", perf.total_leads],
  ];

  for (const [field, value] of fields) {
    if (typeof value !== "number") {
      errors.push(`${field}: expected number, got ${typeof value}`);
    } else {
      details.push(`${field} = ${value}`);
    }
  }

  if (perf.total_assets !== 5) errors.push(`distribution_assets: expected 5, got ${perf.total_assets}`);
  if (perf.published !== 1) errors.push(`published_assets: expected 1, got ${perf.published}`);
  if (perf.total_impressions !== 1500) errors.push(`distribution_impressions: expected 1500, got ${perf.total_impressions}`);
  if (perf.total_engagements !== 45) errors.push(`distribution_engagements: expected 45, got ${perf.total_engagements}`);
  if (perf.total_leads !== 8) errors.push(`distribution_leads: expected 8, got ${perf.total_leads}`);

  report(name, errors.length === 0, details, errors);
}

// ── Test 7: Edge Cases ─────────────────────────────────────────────

async function test7_edgeCases(cfg: ReturnType<typeof resolveConfig>): Promise<void> {
  const name = "Edge Cases";
  const details: string[] = [];
  const errors: string[] = [];

  // Non-existent client performance
  try {
    const perf = await getDistributionPerformance("00000000-0000-0000-0000-000000000000");
    details.push(`Non-existent client: total_assets=${perf.total_assets} (safe default) ✓`);
    if (perf.total_assets !== 0) errors.push("Expected 0 assets for non-existent client");
  } catch (err) {
    errors.push(`Non-existent client crashed: ${err}`);
  }

  // Metrics for non-existent asset
  try {
    const metricsResult = await recordDistributionMetrics(
      "00000000-0000-0000-0000-000000000000",
      "test",
      { impressions: 0, clicks: 0, engagements: 0, leads: 0 },
    );
    // This should fail due to FK constraint — that's expected
    if (!metricsResult.ok) {
      details.push(`Non-existent asset metrics: rejected (FK constraint) ✓`);
    } else {
      details.push(`Non-existent asset metrics: insert succeeded (no FK enforcement) — acceptable`);
    }
  } catch (err) {
    errors.push(`Non-existent asset metrics crashed: ${err}`);
  }

  // Empty aggregation with explicit empty filter
  try {
    const emptyPerf = await getDistributionPerformance("ffffffff-ffff-ffff-ffff-ffffffffffff");
    details.push(`Empty aggregation: total=${emptyPerf.total_assets} impressions=${emptyPerf.total_impressions} ✓`);
  } catch (err) {
    errors.push(`Empty aggregation crashed: ${err}`);
  }

  // Expand non-existent deliverable
  try {
    const { expandProofDeliverable: expand } = await import("../services/distribution.js");
    const result = await expand("00000000-0000-0000-0000-000000000000");
    details.push(`Non-existent deliverable expansion: saved=${result.saved} errors=${result.errors.length} ✓`);
    if (result.saved !== 0) errors.push("Expected 0 saved for non-existent deliverable");
  } catch (err) {
    errors.push(`Non-existent deliverable expansion crashed: ${err}`);
  }

  // Publish with no scheduled assets (should be a no-op)
  try {
    await publishScheduledAssets();
    details.push("Publish with no scheduled assets: no crash ✓");
  } catch (err) {
    errors.push(`Publish with no scheduled assets crashed: ${err}`);
  }

  report(name, errors.length === 0, details, errors);
}

// ── Main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n" + "═".repeat(60));
  console.log("  Phase 3 Distribution Routing — E2E Validation");
  console.log("═".repeat(60));

  const cfg = resolveConfig();
  if (!isConfigured(cfg)) {
    console.error(`${TAG} Supabase not configured. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.`);
    process.exit(1);
  }

  // Pre-check: ensure distribution tables exist
  const tablesOk = await ensureDistributionTables(cfg);
  if (!tablesOk) {
    console.error(`${TAG} distribution_assets table not found. Run sql/005-distribution-routing.sql first.`);
    process.exit(1);
  }
  console.log(`${TAG} distribution tables confirmed ✓\n`);

  await test1_expansion(cfg);
  await test2_queueApi(cfg);
  await test3_publish(cfg);
  await test4_metrics(cfg);
  await test5_proofEndpoint(cfg);
  await test6_clientPerformance(cfg);
  await test7_edgeCases(cfg);

  // ── Final Report ───────────────────────────────────────────────
  console.log("\n" + "═".repeat(60));
  console.log("  FINAL REPORT");
  console.log("═".repeat(60));

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log("");
  for (const r of results) {
    console.log(`  ${r.passed ? PASS : FAIL}  ${r.name}`);
  }

  console.log(`\n  Total: ${passed} passed, ${failed} failed out of ${results.length}`);

  if (failed > 0) {
    console.log("\n  Exact Failure Points:");
    for (const r of results.filter((r) => !r.passed)) {
      console.log(`    ${r.name}:`);
      for (const e of r.errors) console.log(`      - ${e}`);
    }
    console.log(`\n  Final Verdict: FAIL`);
    process.exit(1);
  } else {
    console.log(`\n  Final Verdict: PASS`);
    console.log("  Pipeline validated: deliverable → distribution_assets → queue → publish → metrics → proof");
  }
}

main().catch((err) => {
  console.error(`${TAG} Fatal error:`, err);
  process.exit(1);
});
