import { randomUUID } from "node:crypto";
import { createExecutionPlan } from "../bel/bel-execution-planner.js";
import { executePlan } from "../bel/bel-execution-runtime.js";
import type { BelTaskRequest } from "../bel/bel-types.js";

async function main(): Promise<void> {
  const req: BelTaskRequest = {
    taskId: randomUUID(),
    agentId: "test-agent-v3",
    task: "list files in project directory",
    tool: "filesystem",
    params: { op: "list_files", dirPath: process.cwd() },
    dryRun: true,
  };

  console.log("[TEST-BEL-V3] Creating execution plan...");
  const plan = createExecutionPlan(req);
  console.log("[TEST-BEL-V3] Plan created:", JSON.stringify({
    planId: plan.planId,
    mode: plan.mode,
    steps: plan.steps.length,
    requiresApproval: plan.requiresApproval,
  }, null, 2));

  console.log("[TEST-BEL-V3] Executing plan via runtime...");
  const result = await executePlan(plan);
  console.log("[TEST-BEL-V3] Result:", JSON.stringify(result, null, 2));

  if (!result.success && result.error?.includes("Path is outside allowed roots")) {
    console.log("[TEST-BEL-V3] PASS (filesystem policy enforced correctly)");
    process.exit(0);
  }

  if (!result.planId || result.stepsTotal !== 1) {
    throw new Error(`Unexpected result shape: ${JSON.stringify(result)}`);
  }

  console.log("[TEST-BEL-V3] PASS");
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    console.error("[TEST-BEL-V3] FAIL:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
