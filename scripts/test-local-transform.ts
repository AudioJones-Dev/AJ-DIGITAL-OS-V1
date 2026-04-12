#!/usr/bin/env -S node --import ./dist/env.js
/**
 * Smoke test: route a "transform" task through the local Ollama provider.
 *
 * Turns extracted Sanity config fields into a markdown summary via the
 * model router (local provider) + local-agent file write.
 *
 * Usage:
 *   node --import ./dist/env.js dist/scripts/test-local-transform.js
 */

import { routeModelTask } from "../model-routing/model-router.js";
import { runLocalAgentTask } from "../local-agent/local-agent.js";
import path from "node:path";

const extractedFields = {
  project_id: "5xzji9lx",
  organization_id: "okDn92NJ2",
  title: "aj-digital-os",
  dataset: "production",
};

async function main() {
  console.log("=== Local Transform Test ===\n");

  // Step 1: Route a transform task through the local model
  console.log("1) Sending transform task to model router (local provider)...\n");

  const result = await routeModelTask<Record<string, string>, string>(
    {
      taskType: "transform",
      task: "Convert the following extracted config fields into a concise markdown summary with a title, a bullet list of fields, and a one-line status note.",
      context: extractedFields,
      constraints: { mustBeLocal: true },
      allowEscalation: false,
    },
    {},  // no openai/deterministic dispatch needed — local handles it
  );

  console.log("Router result:");
  console.log(`  ok:       ${result.ok}`);
  console.log(`  provider: ${result.provider}`);
  console.log(`  model:    ${result.model}`);
  console.log(`  escalated:${result.escalated}`);
  if (result.error) {
    console.log(`  error:    ${result.error}`);
  }
  if (result.warnings.length > 0) {
    console.log(`  warnings: ${result.warnings.join("; ")}`);
  }

  if (!result.ok || result.output === null) {
    console.error("\nLocal transform FAILED — cannot proceed to file write.");
    process.exit(1);
  }

  const transformedContent = typeof result.output === "string"
    ? result.output
    : JSON.stringify(result.output, null, 2);

  console.log(`\n--- Transformed output (${transformedContent.length} chars) ---`);
  console.log(transformedContent.slice(0, 500));
  console.log("---\n");

  // Step 2: Write the output through the local agent (validated file write)
  console.log("2) Writing through local agent...\n");

  const outputPath = path.resolve("output", "configs", "sanity-transform-test.md");

  const agentResult = await runLocalAgentTask({
    task: "Write local-model transformed Sanity config summary",
    outputTargets: [outputPath],
    context: { extractedFields: { content: transformedContent } },
  });

  console.log("Local agent result:");
  console.log(`  ok:            ${agentResult.ok}`);
  console.log(`  mode:          ${agentResult.mode}`);
  console.log(`  filesWritten:  ${agentResult.filesWritten.join(", ") || "(none)"}`);
  console.log(`  validation:    ${agentResult.validation.passed ? "PASSED" : "FAILED"}`);
  if (agentResult.error) {
    console.log(`  error:         ${agentResult.error}`);
  }

  console.log("\n=== Test complete ===");
  process.exit(agentResult.ok ? 0 : 1);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
