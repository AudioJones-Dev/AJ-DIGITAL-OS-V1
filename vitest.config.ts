import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup/test-env.ts"],
    include: ["tests/**/*.test.ts"],
    // The runtime/ stores are process-global, file-backed singletons keyed on
    // cwd. Test files that exercise them (DAG runs, the event ledger, the L15
    // verdict store) share those files, so running files in parallel produces
    // torn reads/writes. Serialize file execution for deterministic runs.
    fileParallelism: false,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: [
        "src/core/run-manager.ts",
        "src/core/state-machine.ts",
        "src/api/approval-webhook.ts",
        "src/api/execution-webhook.ts",
      ],
      thresholds: {
        lines: 80,
        branches: 70,
        functions: 80,
        statements: 80,
      },
    },
  },
});
