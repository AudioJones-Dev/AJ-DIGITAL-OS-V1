/**
 * Test: Prompt Injection Layer
 *
 * Validates buildModelPrompt() with various inputs:
 * - empty context
 * - full RetrievedContext
 * - truncation enforcement
 * - integration with local-agent normalize_config (deterministic fallback)
 */

import { buildModelPrompt } from "../prompt/model-prompt-builder.js";
import type { RetrievedContext } from "../memory-runtime/retrieval.js";
import type { MemoryRecord } from "../memory-runtime/types.js";
import { DEFAULT_PROMPT_BUDGET } from "../prompt/prompt-types.js";

let passed = 0;
let failed = 0;

function assert(label: string, condition: boolean, detail?: string): void {
  if (condition) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function header(group: string): void {
  console.log(`\n── ${group} ──`);
}

// ── Test data ────────────────────────────────────────────────────

const makeRecord = (overrides: Partial<MemoryRecord> = {}): MemoryRecord => ({
  id: "test-001",
  type: "run_log",
  workflow: "normalize_config",
  timestamp: "2026-04-12T10:00:00Z",
  content: "Previous run completed successfully with 3 fields normalized.",
  tags: ["config", "success"],
  metadata: {},
  ...overrides,
});

const fullContext: RetrievedContext = {
  workingContext: "Active project: aj-digital-os. Last deployment: 2026-04-11.",
  lastRun: makeRecord(),
  lastFailure: makeRecord({
    id: "fail-001",
    content: "JSON parse failed on malformed model output.",
    tags: ["config", "failure"],
  }),
  recentLogs: [
    { file: "2026-04-12.md", content: "Ran normalize_config for sanity.io project." },
    { file: "2026-04-11.md", content: "Completed browser extraction from dashboard." },
  ],
  charCounts: { working_context: 60, last_run: 55, last_failure: 45, recent_logs: 100 },
  totalChars: 260,
};

// ── Group 1: Basic prompt build ──────────────────────────────────

header("Group 1: Basic prompt build (no context)");

{
  const result = buildModelPrompt({
    task: "Normalize config fields",
    input: '{"projectId": "abc123", "title": "My Project"}',
  });

  assert("returns system section", result.prompt.system.length > 0);
  assert("returns user section", result.prompt.user.length > 0);
  assert("context is empty (no retrieved context)", result.prompt.context.length === 0);
  assert("system contains SYSTEM_POLICY", result.prompt.system.includes("AJ Digital OS"));
  assert("system contains task", result.prompt.system.includes("Normalize config"));
  assert("user contains input", result.prompt.user.includes("projectId"));
  assert("diagnostics totalChars > 0", result.diagnostics.totalChars > 0);
  assert("no truncations", !result.diagnostics.truncated);
  assert("sections list correct", result.diagnostics.sectionsUsed.includes("system") && result.diagnostics.sectionsUsed.includes("user"));
}

// ── Group 2: With full RetrievedContext ──────────────────────────

header("Group 2: Full RetrievedContext");

{
  const result = buildModelPrompt({
    task: "Normalize config",
    retrievedContext: fullContext,
    input: '{"projectId": "abc"}',
    outputSchema: "Return ONLY valid JSON.",
    constraints: ["Must be local", "No external calls"],
  });

  assert("context is non-empty", result.prompt.context.length > 0);
  assert("context has Current State", result.prompt.context.includes("Current State"));
  assert("context has Last Run", result.prompt.context.includes("Last Run"));
  assert("context has Last Failure", result.prompt.context.includes("Last Failure"));
  assert("context has Recent Activity", result.prompt.context.includes("Recent Activity"));
  assert("system has output schema", result.prompt.system.includes("Return ONLY valid JSON"));
  assert("system has constraints", result.prompt.system.includes("Must be local"));
  assert("sections includes context", result.diagnostics.sectionsUsed.includes("context"));
}

// ── Group 3: Working context only ────────────────────────────────

header("Group 3: Partial context (working context only)");

{
  const partialCtx: RetrievedContext = {
    workingContext: "Active project: aj-digital-os.",
    lastRun: null,
    lastFailure: null,
    recentLogs: [],
    charCounts: { working_context: 30, last_run: 0, last_failure: 0, recent_logs: 0 },
    totalChars: 30,
  };

  const result = buildModelPrompt({
    task: "Test",
    retrievedContext: partialCtx,
    input: "test input",
  });

  assert("context has working context", result.prompt.context.includes("Active project"));
  assert("context does NOT have Last Run", !result.prompt.context.includes("Last Run"));
  assert("context does NOT have Last Failure", !result.prompt.context.includes("Last Failure"));
}

// ── Group 4: Truncation enforcement ─────────────────────────────

header("Group 4: Truncation enforcement");

{
  const longContent = "x".repeat(10_000);
  const longCtx: RetrievedContext = {
    workingContext: longContent,
    lastRun: makeRecord({ content: longContent }),
    lastFailure: makeRecord({ content: longContent }),
    recentLogs: [{ file: "big.md", content: longContent }],
    charCounts: { working_context: 10000, last_run: 10000, last_failure: 10000, recent_logs: 10000 },
    totalChars: 40000,
  };

  const tinyBudget = { system: 500, context: 1000, user: 500 };

  const result = buildModelPrompt(
    {
      task: "Truncation test",
      retrievedContext: longCtx,
      input: longContent,
    },
    tinyBudget,
  );

  assert("system bounded", result.prompt.system.length <= 500);
  assert("context bounded", result.prompt.context.length <= 1000);
  assert("user bounded", result.prompt.user.length <= 500);
  assert("truncations reported", result.diagnostics.truncated);
  assert("truncation count > 0", result.diagnostics.truncations.length > 0);
  assert("total within budget", result.diagnostics.totalChars <= 2000);
}

// ── Group 5: Default budget values ──────────────────────────────

header("Group 5: Default budget");

{
  assert("default system budget = 2000", DEFAULT_PROMPT_BUDGET.system === 2000);
  assert("default context budget = 6000", DEFAULT_PROMPT_BUDGET.context === 6000);
  assert("default user budget = 4000", DEFAULT_PROMPT_BUDGET.user === 4000);
}

// ── Group 6: Record summarization (object content) ──────────────

header("Group 6: Record summarization");

{
  const objRecord = makeRecord({
    content: {
      projectId: "abc",
      title: "My Project",
      dataset: "production",
      nested: { deep: true },
    } as unknown as string,
  });

  const ctxWithObj: RetrievedContext = {
    workingContext: "",
    lastRun: objRecord,
    lastFailure: null,
    recentLogs: [],
    charCounts: { working_context: 0, last_run: 100, last_failure: 0, recent_logs: 0 },
    totalChars: 100,
  };

  const result = buildModelPrompt({
    task: "Test obj summary",
    retrievedContext: ctxWithObj,
    input: "test",
  });

  assert("context summarizes object keys", result.prompt.context.includes("projectId"));
  assert("context shows string values", result.prompt.context.includes("abc"));
  assert("context handles nested as [type]", result.prompt.context.includes("[object]"));
  assert("no raw JSON dump", !result.prompt.context.includes('"projectId"'));
}

// ── Group 7: Empty input edge case ──────────────────────────────

header("Group 7: Edge cases");

{
  const result = buildModelPrompt({
    task: "",
    input: "",
  });

  assert("handles empty task", result.prompt.system.length > 0);
  assert("handles empty input", result.prompt.user.length === 0);
  assert("no crash", result.diagnostics.totalChars >= 0);
}

// ── Summary ──────────────────────────────────────────────────────

console.log(`\n${"═".repeat(50)}`);
console.log(`Prompt Injection Layer: ${passed}/${passed + failed} passed`);
if (failed > 0) {
  console.error(`${failed} FAILED`);
  process.exit(1);
}
