/**
 * Replay UI Validation — inserts one successful and one failed test run
 * into Neon, then verifies the replay endpoint serves them correctly.
 *
 * Usage: node --import ./dist/env.js dist/scripts/validate-replay-ui.js
 */

import { createRun, insertStep, insertObservation, insertFailure, getFullRunData, completeRun } from "../db/neon-client.js";

const TAG = "[REPLAY-VALIDATE]";
const ts = Date.now();

async function seedSuccessRun(): Promise<string> {
  const ref = `validate-ok-${ts}`;
  console.log(`${TAG} Creating successful run: ${ref}`);

  const run = await createRun({
    run_ref: ref,
    mission_type: "content_pipeline",
    objective: "Validate replay UI — successful path",
    input_payload: { test: true, scenario: "success" },
    status: "running",
    ok: null,
    summary: null,
    error: null,
    roles_used: [],
    escalation_count: 0,
    duration_ms: null,
  });
  if (!run.ok || !run.data) throw new Error(`Failed to create run: ${run.error}`);
  const runId = run.data.id;

  // Step 1: planner
  await insertStep({
    run_id: runId,
    step_index: 0,
    role: "planner",
    pipeline_id: "content-plan",
    ok: true,
    input_snapshot: { prompt: "Plan content pipeline", model: "gpt-4o" },
    output_snapshot: { stages: ["draft", "review", "publish"], confidence: 0.95 },
    error: null,
    duration_ms: 245,
    retries: 0,
    warnings: [],
  });

  // Step 2: executor
  await insertStep({
    run_id: runId,
    step_index: 1,
    role: "executor",
    pipeline_id: "content-draft",
    ok: true,
    input_snapshot: { stage: "draft", topic: "AI automation" },
    output_snapshot: { wordCount: 850, title: "How AI Automates Your Business" },
    error: null,
    duration_ms: 1820,
    retries: 0,
    warnings: [],
  });

  // Step 3: validator
  await insertStep({
    run_id: runId,
    step_index: 2,
    role: "validator",
    pipeline_id: "content-review",
    ok: true,
    input_snapshot: { check: "grammar, tone, seo" },
    output_snapshot: { score: 0.92, issues: 0, passed: true },
    error: null,
    duration_ms: 310,
    retries: 0,
    warnings: ["SEO title could be stronger"],
  });

  // Observation
  await insertObservation({
    run_id: runId,
    source: "sentinel",
    healthy: true,
    summary: "All steps completed within expected bounds",
    checks: [
      { name: "duration_check", passed: true, detail: "Total < 5s threshold" },
      { name: "quality_check", passed: true, detail: "Score 0.92 > 0.8 minimum" },
    ],
    snapshot_label: "post-validation",
  });

  // Complete
  await completeRun(ref, {
    status: "completed",
    ok: true,
    summary: "Content pipeline completed — 850 words, score 0.92",
    error: null,
    roles_used: ["planner", "executor", "validator"],
    escalation_count: 0,
    duration_ms: 2375,
  });

  console.log(`${TAG} ✓ Successful run seeded: ${ref}`);
  return ref;
}

async function seedFailedRun(): Promise<string> {
  const ref = `validate-fail-${ts}`;
  console.log(`${TAG} Creating failed run: ${ref}`);

  const run = await createRun({
    run_ref: ref,
    mission_type: "seo_audit",
    objective: "Validate replay UI — failure path",
    input_payload: { test: true, scenario: "failure", url: "https://example.com" },
    status: "running",
    ok: null,
    summary: null,
    error: null,
    roles_used: [],
    escalation_count: 0,
    duration_ms: null,
  });
  if (!run.ok || !run.data) throw new Error(`Failed to create run: ${run.error}`);
  const runId = run.data.id;

  // Step 1: planner (ok)
  const step1 = await insertStep({
    run_id: runId,
    step_index: 0,
    role: "planner",
    pipeline_id: "seo-plan",
    ok: true,
    input_snapshot: { url: "https://example.com", depth: 3 },
    output_snapshot: { pages: 12, checks: ["meta", "h1", "links", "speed"] },
    error: null,
    duration_ms: 180,
    retries: 0,
    warnings: [],
  });

  // Step 2: executor (fails)
  const step2 = await insertStep({
    run_id: runId,
    step_index: 1,
    role: "executor",
    pipeline_id: "seo-crawl",
    ok: false,
    input_snapshot: { pages: 12, timeout: 30000 },
    output_snapshot: null,
    error: "Connection timeout after 30s — target returned HTTP 503",
    duration_ms: 30120,
    retries: 2,
    warnings: ["Retry 1: timeout at 10s", "Retry 2: timeout at 20s"],
  });

  // Step 3: validator (not reached, but logged as skipped)
  await insertStep({
    run_id: runId,
    step_index: 2,
    role: "validator",
    pipeline_id: "seo-validate",
    ok: false,
    input_snapshot: null,
    output_snapshot: null,
    error: "Skipped — upstream executor failed",
    duration_ms: 0,
    retries: 0,
    warnings: [],
  });

  // Observation (unhealthy)
  await insertObservation({
    run_id: runId,
    source: "sentinel",
    healthy: false,
    summary: "Executor failed after 2 retries — target unresponsive",
    checks: [
      { name: "connectivity", passed: false, detail: "HTTP 503 from target" },
      { name: "retry_budget", passed: false, detail: "Exhausted 2/2 retries" },
    ],
    snapshot_label: "post-failure",
  });

  // Failure record
  await insertFailure({
    run_id: runId,
    step_id: step2.data?.id ?? null,
    role: "executor",
    error: "Connection timeout after 30s — target returned HTTP 503",
    input_snapshot: { pages: 12, timeout: 30000 },
    stack_trace: `Error: Connection timeout after 30s — target returned HTTP 503
    at SeoExecutor.crawl (src/missions/seo-audit/crawl.ts:142:11)
    at SeoExecutor.execute (src/missions/seo-audit/executor.ts:38:22)
    at PipelineRunner.runStage (src/agent-roles/pipeline-runner.ts:89:30)
    at PipelineRunner.run (src/agent-roles/pipeline-runner.ts:52:18)
    at MissionEntry.execute (src/missions/mission-entry.ts:112:24)`,
    escalated: true,
    resolved: false,
    resolution: null,
  });

  // Complete (failed)
  await completeRun(ref, {
    status: "failed",
    ok: false,
    summary: "SEO audit failed — target site unresponsive after retries",
    error: "Connection timeout after 30s — target returned HTTP 503",
    roles_used: ["planner", "executor"],
    escalation_count: 1,
    duration_ms: 30300,
  });

  console.log(`${TAG} ✓ Failed run seeded: ${ref}`);
  return ref;
}

async function verifyReplay(runRef: string, expectOk: boolean): Promise<boolean> {
  console.log(`${TAG} Verifying replay for: ${runRef} (expect ${expectOk ? "success" : "failure"})`);
  const result = await getFullRunData(runRef);
  if (!result.ok || !result.data) {
    console.log(`${TAG} ✗ Could not load replay: ${result.error}`);
    return false;
  }

  const { run, steps, observations, failures } = result.data;
  const checks = [
    { label: "run.status", pass: expectOk ? run.status === "completed" : run.status === "failed", got: run.status },
    { label: "run.ok", pass: run.ok === expectOk, got: String(run.ok) },
    { label: "steps count", pass: steps.length >= 2, got: String(steps.length) },
    { label: "step ordering", pass: steps[0]?.step_index === 0, got: String(steps[0]?.step_index) },
    { label: "observations", pass: observations.length >= 1, got: String(observations.length) },
    { label: "failures", pass: expectOk ? failures.length === 0 : failures.length >= 1, got: String(failures.length) },
  ];

  let allPass = true;
  for (const c of checks) {
    const icon = c.pass ? "✓" : "✗";
    console.log(`${TAG}   ${icon} ${c.label}: ${c.got}`);
    if (!c.pass) allPass = false;
  }

  if (!expectOk && failures.length > 0) {
    const f = failures[0]!;
    console.log(`${TAG}   Failure detail: role=${f.role}, escalated=${f.escalated}, has_stack=${!!f.stack_trace}`);
  }

  return allPass;
}

async function main() {
  console.log(`${TAG} ══════════════════════════════════════════`);
  console.log(`${TAG} Replay UI Validation`);
  console.log(`${TAG} ══════════════════════════════════════════`);

  const okRef = await seedSuccessRun();
  const failRef = await seedFailedRun();

  console.log(`${TAG}`);
  const okPass = await verifyReplay(okRef, true);
  console.log(`${TAG}`);
  const failPass = await verifyReplay(failRef, false);

  console.log(`${TAG}`);
  console.log(`${TAG} ══════════════════════════════════════════`);
  console.log(`${TAG} Results`);
  console.log(`${TAG}   Success run: ${okPass ? "PASS" : "FAIL"}`);
  console.log(`${TAG}   Failed  run: ${failPass ? "PASS" : "FAIL"}`);
  console.log(`${TAG}   Overall:     ${okPass && failPass ? "ALL PASS ✓" : "SOME FAILED ✗"}`);
  console.log(`${TAG} ══════════════════════════════════════════`);

  process.exit(okPass && failPass ? 0 : 1);
}

main().catch((err) => {
  console.error(`${TAG} Fatal:`, err);
  process.exit(1);
});
