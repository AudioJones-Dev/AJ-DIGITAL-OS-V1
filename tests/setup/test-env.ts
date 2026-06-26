import { afterAll, afterEach, beforeEach, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ORIGINAL_WEBHOOK_SECRET = process.env.AJ_WEBHOOK_SECRET;
const ORIGINAL_MAX_SKEW = process.env.AJ_WEBHOOK_MAX_SKEW_SECONDS;
const ORIGINAL_REPLAY_TTL = process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS;
const ORIGINAL_RUNTIME_DIR = process.env.AJ_RUNTIME_DIR;
const TEST_RUNTIME_DIR = mkdtempSync(join(
  tmpdir(),
  `aj-digital-os-vitest-${process.pid}-${process.env.VITEST_POOL_ID ?? "0"}-`,
));

process.env.AJ_RUNTIME_DIR = TEST_RUNTIME_DIR;

beforeEach(() => {
  process.env.TZ = "UTC";
  process.env.AJ_WEBHOOK_SECRET = "test-secret";
  process.env.AJ_WEBHOOK_MAX_SKEW_SECONDS = "300";
  process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = "600";

  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-01-01T00:00:00.000Z"));
});

afterEach(() => {
  process.env.AJ_WEBHOOK_SECRET = ORIGINAL_WEBHOOK_SECRET;
  process.env.AJ_WEBHOOK_MAX_SKEW_SECONDS = ORIGINAL_MAX_SKEW;
  process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS = ORIGINAL_REPLAY_TTL;

  vi.restoreAllMocks();
  vi.useRealTimers();
});

afterAll(() => {
  if (ORIGINAL_RUNTIME_DIR !== undefined) {
    process.env.AJ_RUNTIME_DIR = ORIGINAL_RUNTIME_DIR;
  } else {
    delete process.env.AJ_RUNTIME_DIR;
  }

  rmSync(TEST_RUNTIME_DIR, { recursive: true, force: true });
});
