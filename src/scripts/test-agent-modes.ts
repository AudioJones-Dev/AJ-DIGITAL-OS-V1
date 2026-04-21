#!/usr/bin/env node
/**
 * Test: generate_env and normalize_config local-agent modes.
 *
 * Feeds extracted Sanity config fields through both new modes and
 * verifies:
 *   1. .env file created + validated (nonEmpty, validEnv, hasKeys)
 *   2. JSON output created + validated (validJson, hasKeys)
 *
 * Usage:
 *   cd C:\dev\AJ-DIGITAL-OS
 *   node --import ./dist/env.js dist/scripts/test-agent-modes.js
 */

import path from "node:path";
import fs from "node:fs/promises";
import { runLocalAgentTask } from "../local-agent/local-agent.js";

const extractedFields = {
  project_id: "5xzji9lx",
  organization_id: "okDn92NJ2",
  title: "aj-digital-os",
  dataset: "production",
};

let passed = 0;
let failed = 0;

function assert(label: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function testGenerateEnv(): Promise<void> {
  console.log("\n=== Task 1: generate_env ===\n");

  const envPath = path.resolve("output", "configs", "sanity-test.env");

  const result = await runLocalAgentTask({
    task: "generate_env for Sanity project",
    mode: "generate_env",
    outputTargets: [envPath],
    context: {
      extractedFields,
      envPrefix: "SANITY_",
      requiredKeys: ["SANITY_PROJECT_ID", "SANITY_DATASET"],
    },
  });

  console.log(`  ok:         ${result.ok}`);
  console.log(`  mode:       ${result.mode}`);
  console.log(`  files:      ${result.filesWritten.join(", ") || "(none)"}`);
  console.log(`  validation: ${result.validation.passed ? "PASSED" : "FAILED"}`);
  for (const c of result.validation.checks) {
    if (!c.passed) console.log(`    FAIL: ${c.name} — ${c.reason}`);
  }
  if (result.error) console.log(`  error:      ${result.error}`);
  console.log("");

  assert("generate_env ok", result.ok);
  assert("mode is generate_env", result.mode === "generate_env");
  assert("file written", result.filesWritten.length === 1);
  assert("validation passed", result.validation.passed);

  // Read the file and verify content
  if (result.filesWritten.length > 0) {
    const content = await fs.readFile(result.filesWritten[0]!, "utf-8");
    assert("contains SANITY_PROJECT_ID", content.includes("SANITY_PROJECT_ID=5xzji9lx"));
    assert("contains SANITY_DATASET", content.includes("SANITY_DATASET=production"));
    assert("contains SANITY_ORGANIZATION_ID", content.includes("SANITY_ORGANIZATION_ID=okDn92NJ2"));
    console.log("\n  --- file content ---");
    console.log(content.split("\n").map((l) => `  ${l}`).join("\n"));
    console.log("  ---");
  }
}

async function testNormalizeConfig(): Promise<void> {
  console.log("\n=== Task 2: normalize_config ===\n");

  const jsonPath = path.resolve("output", "configs", "sanity-normalized.json");

  const result = await runLocalAgentTask({
    task: "normalize_config for Sanity project",
    mode: "normalize_config",
    outputTargets: [jsonPath],
    context: {
      extractedFields,
      requiredKeys: ["project", "dataset"],
    },
  });

  console.log(`  ok:         ${result.ok}`);
  console.log(`  mode:       ${result.mode}`);
  console.log(`  files:      ${result.filesWritten.join(", ") || "(none)"}`);
  console.log(`  validation: ${result.validation.passed ? "PASSED" : "FAILED"}`);
  for (const c of result.validation.checks) {
    if (!c.passed) console.log(`    FAIL: ${c.name} — ${c.reason}`);
  }
  if (result.warnings.length > 0) {
    console.log(`  warnings:   ${result.warnings.join("; ")}`);
  }
  if (result.error) console.log(`  error:      ${result.error}`);
  console.log("");

  assert("normalize_config ok", result.ok);
  assert("mode is normalize_config", result.mode === "normalize_config");
  assert("file written", result.filesWritten.length === 1);
  assert("validation passed", result.validation.passed);

  // Read and verify JSON structure
  if (result.filesWritten.length > 0) {
    const content = await fs.readFile(result.filesWritten[0]!, "utf-8");
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = JSON.parse(content) as Record<string, unknown>;
      assert("output is valid JSON", true);
    } catch {
      assert("output is valid JSON", false, "JSON parse failed");
    }

    if (parsed) {
      assert("has 'project' key", "project" in parsed);
      assert("has 'dataset' key", "dataset" in parsed);
      assert("has 'meta' key", "meta" in parsed);
    }

    console.log("\n  --- file content ---");
    console.log(content.split("\n").map((l) => `  ${l}`).join("\n"));
    console.log("  ---");
  }
}

async function main(): Promise<void> {
  console.log("=== Local Agent Mode Tests ===");

  await testGenerateEnv();
  await testNormalizeConfig();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err: unknown) => {
  console.error("Fatal:", err);
  process.exit(1);
});
