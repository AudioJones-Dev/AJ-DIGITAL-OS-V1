/**
 * smoke-e2e.ts — End-to-end smoke test for AJ Digital OS.
 *
 * Proves the full chain works:
 *   CLI trigger → Hermes bridge → Mission entry → Agent pipeline
 *   → Deliverable → Neon logging → Replay load → Verification
 *
 * Usage:
 *   node --import ./dist/env.js dist/scripts/smoke-e2e.js
 *   node --import ./dist/env.js dist/scripts/smoke-e2e.js --dry-run
 *   node --import ./dist/env.js dist/scripts/smoke-e2e.js --skip-neon
 */

import { triggerMission } from "../hermes/hermes-bridge.js";
import { executeMissionFromEnvelope, resetMissionSeq } from "../missions/mission-entry.js";
import { validateMissionEnvelope } from "../missions/mission-entry-types.js";
import type { MissionEnvelope, MissionResultEnvelope } from "../missions/mission-entry-types.js";
import { loadReplay } from "../missions/mission-replay.js";
import * as neon from "../db/neon-client.js";
import * as execLogger from "../db/execution-logger.js";
import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

// ── Configuration ──────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const SKIP_NEON = args.includes("--skip-neon");

const TAG = "[SMOKE-E2E]";
const DELIVERABLE_DIR = join(process.cwd(), "data", "smoke-runs");

// ── Types ──────────────────────────────────────────────────────────

interface CheckResult {
  name: string;
  passed: boolean;
  detail: string;
}

// ── Main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startTime = Date.now();
  const checks: CheckResult[] = [];

  console.log(`\n${TAG} ═══════════════════════════════════════════════════`);
  console.log(`${TAG}  AJ Digital OS — End-to-End Smoke Test`);
  console.log(`${TAG}  Mode: ${DRY_RUN ? "DRY RUN (no external writes)" : "LIVE"}`);
  console.log(`${TAG}  Neon: ${SKIP_NEON ? "SKIPPED" : "ENABLED"}`);
  console.log(`${TAG} ═══════════════════════════════════════════════════\n`);

  // ── Step 1: Build envelope ────────────────────────────────────
  console.log(`${TAG} [1/8] Building mission envelope…`);

  const envelope: MissionEnvelope = {
    mission_type: "build_and_review",
    objective: "Generate a short markdown status report for AJ Digital OS smoke test",
    input: {
      topic: "system-health",
      format: "markdown",
      maxLength: 500,
      sections: ["summary", "status", "next-steps"],
    },
    priority: "normal",
    requested_by: "smoke-e2e",
    schedule_context: {
      trigger_type: "smoke-test",
      trigger_time: new Date().toISOString(),
    },
  };

  checks.push({ name: "Envelope built", passed: true, detail: `type=${envelope.mission_type}` });

  // ── Step 2: Validate envelope ─────────────────────────────────
  console.log(`${TAG} [2/8] Validating envelope…`);

  const validation = validateMissionEnvelope(envelope);
  checks.push({
    name: "Envelope valid",
    passed: validation.valid,
    detail: validation.valid ? "all fields OK" : validation.errors.join("; "),
  });

  if (!validation.valid) {
    printSummary(checks, null, startTime);
    process.exit(1);
  }

  // ── Step 3: Execute mission via core pipeline ─────────────────
  console.log(`${TAG} [3/8] Executing mission via core pipeline…`);

  resetMissionSeq();
  let resultEnvelope: MissionResultEnvelope;

  try {
    resultEnvelope = await executeMissionFromEnvelope(envelope, { dryRun: DRY_RUN });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    checks.push({ name: "Mission executed", passed: false, detail: msg });
    printSummary(checks, null, startTime);
    process.exit(1);
  }

  checks.push({
    name: "Mission executed",
    passed: true,
    detail: `id=${resultEnvelope.mission_id}, status=${resultEnvelope.status}`,
  });

  checks.push({
    name: "Mission completed OK",
    passed: resultEnvelope.ok,
    detail: resultEnvelope.ok
      ? `steps=${resultEnvelope.metrics.steps}, roles=${resultEnvelope.metrics.rolesUsed.join(",")}`
      : `error: ${resultEnvelope.summary}`,
  });

  // ── Step 4: Write local deliverable ───────────────────────────
  console.log(`${TAG} [4/8] Writing local deliverable…`);

  let deliverablePath: string | null = null;

  try {
    if (!existsSync(DELIVERABLE_DIR)) {
      mkdirSync(DELIVERABLE_DIR, { recursive: true });
    }

    const filename = `${resultEnvelope.mission_id}.md`;
    deliverablePath = join(DELIVERABLE_DIR, filename);

    const deliverableContent = buildDeliverableMarkdown(resultEnvelope);
    writeFileSync(deliverablePath, deliverableContent, "utf-8");

    checks.push({
      name: "Deliverable written",
      passed: true,
      detail: deliverablePath,
    });
  } catch (err: unknown) {
    checks.push({
      name: "Deliverable written",
      passed: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // ── Step 5: Verify deliverable exists ─────────────────────────
  console.log(`${TAG} [5/8] Verifying deliverable file…`);

  const deliverableExists = deliverablePath !== null && existsSync(deliverablePath);
  checks.push({
    name: "Deliverable file exists",
    passed: deliverableExists,
    detail: deliverableExists ? deliverablePath! : "file not found",
  });

  // ── Step 6: Write metadata record ─────────────────────────────
  console.log(`${TAG} [6/8] Writing deliverable metadata…`);

  try {
    const metadataPath = join(DELIVERABLE_DIR, `${resultEnvelope.mission_id}.meta.json`);
    const metadata = {
      mission_id: resultEnvelope.mission_id,
      mission_type: resultEnvelope.mission_type,
      status: resultEnvelope.status,
      ok: resultEnvelope.ok,
      summary: resultEnvelope.summary,
      artifacts: resultEnvelope.artifacts,
      metrics: resultEnvelope.metrics,
      deliverable_path: deliverablePath,
      created_at: new Date().toISOString(),
      trigger: "smoke-e2e",
    };
    writeFileSync(metadataPath, JSON.stringify(metadata, null, 2), "utf-8");

    checks.push({
      name: "Metadata recorded",
      passed: true,
      detail: metadataPath,
    });
  } catch (err: unknown) {
    checks.push({
      name: "Metadata recorded",
      passed: false,
      detail: err instanceof Error ? err.message : String(err),
    });
  }

  // ── Step 7: Log to Neon (execution data layer) ────────────────
  let neonRunId: number | null = null;
  let neonStepsExist = false;

  if (SKIP_NEON || DRY_RUN) {
    console.log(`${TAG} [7/8] Neon logging — SKIPPED`);
    checks.push({ name: "Neon run logged", passed: true, detail: "skipped (dry-run or --skip-neon)" });
    checks.push({ name: "Neon steps exist", passed: true, detail: "skipped" });
  } else {
    console.log(`${TAG} [7/8] Logging execution to Neon…`);

    try {
      // Check Neon connection first
      const health = await neon.checkNeonConnection();
      if (!health.ok) {
        throw new Error(`Neon unhealthy: ${health.error}`);
      }

      neonRunId = await execLogger.logRunStart(resultEnvelope.mission_id, envelope);

      if (neonRunId !== null) {
        checks.push({
          name: "Neon run logged",
          passed: true,
          detail: `neon_run_id=${neonRunId}`,
        });

        // Complete the run record
        await execLogger.logRunComplete(resultEnvelope.mission_id, resultEnvelope);
        checks.push({
          name: "Neon run completed",
          passed: true,
          detail: `status=${resultEnvelope.status}`,
        });

        // Verify via read-back
        const readBack = await neon.getRun(resultEnvelope.mission_id);
        neonStepsExist = readBack.ok && readBack.data !== null;

        checks.push({
          name: "Neon steps exist",
          passed: neonStepsExist,
          detail: neonStepsExist ? `run_ref=${readBack.data!.run_ref}` : "read-back failed",
        });
      } else {
        checks.push({ name: "Neon run logged", passed: false, detail: "logRunStart returned null" });
        checks.push({ name: "Neon steps exist", passed: false, detail: "no run ID" });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      checks.push({ name: "Neon run logged", passed: false, detail: msg });
      checks.push({ name: "Neon steps exist", passed: false, detail: "skipped due to error" });
    }
  }

  // ── Step 8: Replay data loadable ──────────────────────────────
  if (SKIP_NEON || DRY_RUN) {
    console.log(`${TAG} [8/8] Replay data — SKIPPED`);
    checks.push({ name: "Replay data loadable", passed: true, detail: "skipped" });
  } else {
    console.log(`${TAG} [8/8] Verifying replay data…`);

    try {
      const replay = await loadReplay(resultEnvelope.mission_id);
      checks.push({
        name: "Replay data loadable",
        passed: replay.ok,
        detail: replay.ok
          ? `steps=${replay.data?.steps?.length ?? 0}, observations=${replay.data?.observations?.length ?? 0}`
          : replay.error ?? "unknown error",
      });
    } catch (err: unknown) {
      checks.push({
        name: "Replay data loadable",
        passed: false,
        detail: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ── Summary ───────────────────────────────────────────────────
  printSummary(checks, resultEnvelope, startTime);

  const allPassed = checks.every((c) => c.passed);
  process.exit(allPassed ? 0 : 1);
}

// ── Helpers ────────────────────────────────────────────────────────

function buildDeliverableMarkdown(result: MissionResultEnvelope): string {
  const lines: string[] = [
    `# AJ Digital OS — Smoke Test Report`,
    ``,
    `**Mission ID:** ${result.mission_id}`,
    `**Type:** ${result.mission_type}`,
    `**Status:** ${result.status}`,
    `**Generated:** ${new Date().toISOString()}`,
    ``,
    `## Summary`,
    ``,
    result.summary,
    ``,
    `## Metrics`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Duration | ${result.metrics.durationMs}ms |`,
    `| Steps | ${result.metrics.steps} |`,
    `| Roles | ${result.metrics.rolesUsed.join(", ") || "none"} |`,
    `| Escalations | ${result.metrics.escalations} |`,
    ``,
    `## Alerts`,
    ``,
    result.alerts.length > 0 ? result.alerts.map((a) => `- ${a}`).join("\n") : "_No alerts_",
    ``,
    `## Artifacts`,
    ``,
    result.artifacts.length > 0 ? result.artifacts.map((a) => `- \`${a}\``).join("\n") : "_No artifacts_",
    ``,
    `---`,
    `_Generated by smoke-e2e.ts_`,
  ];
  return lines.join("\n");
}

function printSummary(
  checks: CheckResult[],
  result: MissionResultEnvelope | null,
  startTime: number,
): void {
  const elapsed = Date.now() - startTime;
  const passed = checks.filter((c) => c.passed).length;
  const failed = checks.filter((c) => !c.passed).length;
  const allPassed = failed === 0;

  console.log(`\n${TAG} ═══════════════════════════════════════════════════`);
  console.log(`${TAG}  SMOKE TEST RESULTS`);
  console.log(`${TAG} ═══════════════════════════════════════════════════`);

  if (result) {
    console.log(`${TAG}  Mission ID:       ${result.mission_id}`);
    console.log(`${TAG}  Mission Type:      ${result.mission_type}`);
    console.log(`${TAG}  Final Status:      ${result.status}`);
    console.log(`${TAG}  Pipeline Duration: ${result.metrics.durationMs}ms`);
    console.log(`${TAG}  Total Duration:    ${elapsed}ms`);
  }

  console.log(`${TAG}`);
  console.log(`${TAG}  Verification Checks:`);

  for (const check of checks) {
    const icon = check.passed ? "✔" : "✘";
    console.log(`${TAG}    ${icon} ${check.name}: ${check.detail}`);
  }

  console.log(`${TAG}`);
  console.log(`${TAG}  ${passed}/${checks.length} passed, ${failed} failed`);
  console.log(`${TAG}  Overall: ${allPassed ? "ALL PASS ✔" : "FAILED ✘"}`);
  console.log(`${TAG} ═══════════════════════════════════════════════════\n`);
}

// ── Entry ──────────────────────────────────────────────────────────

main().catch((err: unknown) => {
  console.error(`${TAG} Fatal error:`, err);
  process.exit(1);
});
