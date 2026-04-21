/**
 * Test: Tool Registry and Tool Execution Layer
 *
 * Validates:
 * - Tool registration and lookup
 * - listEnabled / findByCapability / getDescriptor
 * - Permission gate (allowlist enforcement)
 * - Input schema validation (required fields, type checking)
 * - Executor lifecycle (permission → enabled → validate → execute)
 * - Error handling (handler throws, disabled tool, missing tool)
 * - Timing and invocation ID tracking
 */

import { ToolRegistry } from "../tools/tool-registry.js";
import { ToolExecutor, validateInput } from "../tools/tool-executor.js";
import type {
  ToolDefinition,
  ToolExecutionContext,
  ToolInputSchema,
} from "../tools/tool-types.js";

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

// ── Test Tools ─────────────────────────────────────────────────────

const echoTool: ToolDefinition<{ message: string }, { echo: string }> = {
  name: "echo",
  description: "Echoes the input message",
  displayName: "Echo Tool",
  inputSchema: {
    message: { type: "string", required: true, description: "The message to echo" },
  },
  capabilityIds: ["filesystem.read"],
  permissionClassification: "read_only",
  enabled: true,
  execute: async (payload) => ({ echo: payload.message }),
};

const adderTool: ToolDefinition<{ a: number; b: number }, { sum: number }> = {
  name: "adder",
  description: "Adds two numbers",
  inputSchema: {
    a: { type: "number", required: true },
    b: { type: "number", required: true },
  },
  capabilityIds: ["filesystem.read"],
  enabled: true,
  execute: (payload) => ({ sum: payload.a + payload.b }),
};

const failingTool: ToolDefinition = {
  name: "failing",
  description: "Always throws",
  enabled: true,
  execute: async () => {
    throw new Error("intentional failure");
  },
};

const disabledTool: ToolDefinition = {
  name: "disabled-tool",
  description: "This tool is disabled",
  enabled: false,
  execute: async () => ({ ok: true }),
};

const noSchemaTool: ToolDefinition = {
  name: "no-schema",
  description: "Tool without input schema",
  enabled: true,
  execute: async (payload) => payload,
};

const writeTool: ToolDefinition = {
  name: "writer",
  description: "Writes data",
  capabilityIds: ["filesystem.write"],
  permissionClassification: "local_mutation",
  enabled: true,
  execute: async () => ({ written: true }),
};

// ── Tests ──────────────────────────────────────────────────────────

async function main() {
  // ── 1. Registry: register and lookup ──────────────────────

  header("1. Registry: register and lookup");

  const registry = new ToolRegistry();
  registry.register(echoTool);
  registry.register(adderTool);
  registry.register(failingTool);
  registry.register(disabledTool);
  registry.register(noSchemaTool);
  registry.register(writeTool);

  assert("has() returns true for registered", registry.has("echo"));
  assert("has() returns false for unregistered", !registry.has("nonexistent"));
  assert("get() returns tool", registry.get("echo").name === "echo");
  assert("list() returns sorted names", registry.list().join(",") === "adder,disabled-tool,echo,failing,no-schema,writer");

  let threwOnMissing = false;
  try {
    registry.get("nonexistent");
  } catch {
    threwOnMissing = true;
  }
  assert("get() throws for missing tool", threwOnMissing);

  // ── 2. Registry: listEnabled ──────────────────────────────

  header("2. Registry: listEnabled");

  const enabled = registry.listEnabled();
  assert("listEnabled excludes disabled", enabled.every((t) => t.enabled !== false));
  assert("listEnabled count is 5", enabled.length === 5);

  // ── 3. Registry: findByCapability ─────────────────────────

  header("3. Registry: findByCapability");

  const readTools = registry.findByCapability("filesystem.read");
  assert("findByCapability returns matching tools", readTools.length === 2);
  assert("findByCapability includes echo", readTools.some((t) => t.name === "echo"));
  assert("findByCapability includes adder", readTools.some((t) => t.name === "adder"));

  const writeTools = registry.findByCapability("filesystem.write");
  assert("findByCapability returns writer", writeTools.length === 1);
  assert("findByCapability writer name", writeTools[0]!.name === "writer");

  const noMatch = registry.findByCapability("nonexistent.cap");
  assert("findByCapability returns empty for no match", noMatch.length === 0);

  // ── 4. Registry: getDescriptor ────────────────────────────

  header("4. Registry: getDescriptor");

  const desc = registry.getDescriptor("echo");
  assert("getDescriptor returns descriptor", desc !== undefined);
  assert("descriptor has name", desc!.name === "echo");
  assert("descriptor has displayName", desc!.displayName === "Echo Tool");
  assert("descriptor has description", desc!.description === "Echoes the input message");
  assert("descriptor has inputSchema", desc!.inputSchema !== undefined);
  assert("descriptor has capabilityIds", desc!.capabilityIds.length === 1);
  assert("descriptor defaults kind=native", desc!.kind === "native");
  assert("descriptor defaults approval=none", desc!.approvalClassification === "none");

  const missingDesc = registry.getDescriptor("nonexistent");
  assert("getDescriptor undefined for missing", missingDesc === undefined);

  // ── 5. Input validation: required fields ──────────────────

  header("5. Input validation: required fields");

  const schema: ToolInputSchema = {
    name: { type: "string", required: true },
    age: { type: "number", required: true },
    nickname: { type: "string" },
  };

  const valid = validateInput({ name: "test", age: 25 }, schema);
  assert("Valid input passes", valid.ok);
  assert("No errors on valid", valid.errors.length === 0);

  const missingRequired = validateInput({ name: "test" }, schema);
  assert("Missing required fails", !missingRequired.ok);
  assert("Error mentions field", missingRequired.errors[0]!.includes("age"));

  const withOptional = validateInput({ name: "test", age: 25, nickname: "t" }, schema);
  assert("Optional field accepted", withOptional.ok);

  // ── 6. Input validation: type checking ────────────────────

  header("6. Input validation: type checking");

  const wrongType = validateInput({ name: 123, age: 25 }, schema);
  assert("Wrong type fails", !wrongType.ok);
  assert("Error mentions type mismatch", wrongType.errors[0]!.includes("string"));

  const arraySchema: ToolInputSchema = {
    items: { type: "array", required: true },
  };
  const arrayValid = validateInput({ items: [1, 2, 3] }, arraySchema);
  assert("Array type validates", arrayValid.ok);

  const arrayInvalid = validateInput({ items: "not-array" }, arraySchema);
  assert("Non-array fails array check", !arrayInvalid.ok);

  // ── 7. Input validation: non-object input ─────────────────

  header("7. Input validation: non-object input");

  const nullInput = validateInput(null, schema);
  assert("Null input fails", !nullInput.ok);

  const stringInput = validateInput("string", schema);
  assert("String input fails", !stringInput.ok);

  const arrayInput = validateInput([1, 2], schema);
  assert("Array input fails", !arrayInput.ok);

  // ── 8. Executor: successful execution ─────────────────────

  header("8. Executor: successful execution");

  const executor = new ToolExecutor(registry);

  const echoResult = await executor.execute<{ echo: string }>(
    "echo",
    { message: "hello" },
  );
  assert("Echo succeeds", echoResult.ok);
  assert("Echo result correct", echoResult.result?.echo === "hello");
  assert("Has invocationId", typeof echoResult.invocationId === "string" && echoResult.invocationId.length > 0);
  assert("Has durationMs", echoResult.durationMs >= 0);
  assert("No errors", echoResult.errors.length === 0);

  const adderResult = await executor.execute<{ sum: number }>(
    "adder",
    { a: 3, b: 4 },
  );
  assert("Adder succeeds", adderResult.ok);
  assert("Adder sum correct", adderResult.result?.sum === 7);

  // ── 9. Executor: schema validation rejects bad input ──────

  header("9. Executor: schema validation rejects bad input");

  const badInput = await executor.execute("echo", { wrong: "field" });
  assert("Bad input rejected", !badInput.ok);
  assert("Error mentions required", badInput.errors[0]!.includes("message"));

  const wrongTypeInput = await executor.execute("adder", { a: "not-number", b: 4 });
  assert("Wrong type rejected", !wrongTypeInput.ok);
  assert("Error mentions type", wrongTypeInput.errors[0]!.includes("number"));

  // ── 10. Executor: no-schema tool accepts anything ─────────

  header("10. Executor: no-schema tool accepts anything");

  const noSchemaResult = await executor.execute("no-schema", { anything: true });
  assert("No-schema tool succeeds", noSchemaResult.ok);

  // ── 11. Executor: handler error caught ────────────────────

  header("11. Executor: handler error caught");

  const failResult = await executor.execute("failing", {});
  assert("Failing tool returns ok=false", !failResult.ok);
  assert("Error message captured", failResult.errors[0] === "intentional failure");
  assert("Has invocationId on failure", typeof failResult.invocationId === "string");

  // ── 12. Executor: disabled tool rejected ──────────────────

  header("12. Executor: disabled tool rejected");

  const disabledResult = await executor.execute("disabled-tool", {});
  assert("Disabled tool fails", !disabledResult.ok);
  assert("Error mentions disabled", disabledResult.errors[0]!.includes("disabled"));

  // ── 13. Executor: missing tool rejected ───────────────────

  header("13. Executor: missing tool rejected");

  const missingResult = await executor.execute("nonexistent", {});
  assert("Missing tool fails", !missingResult.ok);
  assert("Error mentions not registered", missingResult.errors[0]!.includes("not registered"));

  // ── 14. Executor: permission gate blocks ──────────────────

  header("14. Executor: permission gate blocks");

  const restrictedCtx: ToolExecutionContext = {
    allowedToolNames: ["echo"],
  };

  const allowedResult = await executor.execute("echo", { message: "ok" }, restrictedCtx);
  assert("Allowed tool passes gate", allowedResult.ok);

  const blockedResult = await executor.execute("adder", { a: 1, b: 2 }, restrictedCtx);
  assert("Blocked tool rejected", !blockedResult.ok);
  assert("Error mentions not allowed", blockedResult.errors[0]!.includes("not allowed"));

  // ── 15. Executor: custom invocationId passthrough ─────────

  header("15. Executor: custom invocationId passthrough");

  const customCtx: ToolExecutionContext = {
    invocation: { invocationId: "custom-id-123" },
  };
  const customResult = await executor.execute("echo", { message: "tracked" }, customCtx);
  assert("Custom invocationId preserved", customResult.invocationId === "custom-id-123");

  // ── 16. Registry snapshot includes inputSchema ────────────

  header("16. Registry snapshot includes inputSchema");

  const snapshot = registry.snapshot();
  const echoSnap = snapshot.tools.find((t) => t.name === "echo");
  assert("Snapshot has echo tool", echoSnap !== undefined);
  assert("Snapshot echo has inputSchema", echoSnap!.inputSchema !== undefined);
  assert("Snapshot echo schema has message", "message" in (echoSnap!.inputSchema ?? {}));

  const noSchemaSnap = snapshot.tools.find((t) => t.name === "no-schema");
  assert("No-schema tool has no inputSchema in snapshot", noSchemaSnap!.inputSchema === undefined);

  // ── Summary ────────────────────────────────────────────────

  console.log(`\n════════════════════════════════════════`);
  console.log(`  Tool layer tests: ${passed} passed, ${failed} failed`);
  console.log(`════════════════════════════════════════\n`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Test runner crashed:", err);
  process.exit(2);
});
