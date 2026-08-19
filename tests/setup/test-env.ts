import { afterAll, afterEach, beforeEach, vi } from "vitest";
import { cpSync, existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ORIGINAL_WEBHOOK_SECRET = process.env.AJ_WEBHOOK_SECRET;
const ORIGINAL_MAX_SKEW = process.env.AJ_WEBHOOK_MAX_SKEW_SECONDS;
const ORIGINAL_REPLAY_TTL = process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS;
const ORIGINAL_RUNTIME_DIR = process.env.AJ_RUNTIME_DIR;
const ORIGINAL_APPROVALS_PATH = process.env.AJ_APPROVALS_STORE_PATH;
const ORIGINAL_AUDIT_STORE_PATH = process.env.AJ_AUDIT_STORE_PATH;
const TEST_RUNTIME_DIR = mkdtempSync(join(
  tmpdir(),
  `aj-digital-os-vitest-${process.pid}-${process.env.VITEST_POOL_ID ?? "0"}-`,
));

process.env.AJ_RUNTIME_DIR = TEST_RUNTIME_DIR;
// Isolate the approvals store too — its production default (data/security/
// approvals.json) is cwd-relative and shared across parallel workers.
process.env.AJ_APPROVALS_STORE_PATH = join(TEST_RUNTIME_DIR, "security", "approvals.json");
// Same story for the persistent audit store (data/security/audit-log.jsonl):
// every enforcement-path test appends to it via defaultAuditStore.
process.env.AJ_AUDIT_STORE_PATH = join(TEST_RUNTIME_DIR, "security", "audit-log.jsonl");

const SOURCE_POLICIES_DIR = join(process.cwd(), "runtime", "policies");
const TEST_POLICIES_DIR = join(TEST_RUNTIME_DIR, "policies");
if (existsSync(SOURCE_POLICIES_DIR)) {
  cpSync(SOURCE_POLICIES_DIR, TEST_POLICIES_DIR, { recursive: true });
}

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
  if (ORIGINAL_APPROVALS_PATH !== undefined) {
    process.env.AJ_APPROVALS_STORE_PATH = ORIGINAL_APPROVALS_PATH;
  } else {
    delete process.env.AJ_APPROVALS_STORE_PATH;
  }
  if (ORIGINAL_AUDIT_STORE_PATH !== undefined) {
    process.env.AJ_AUDIT_STORE_PATH = ORIGINAL_AUDIT_STORE_PATH;
  } else {
    delete process.env.AJ_AUDIT_STORE_PATH;
  }

  // rmSync(recursive) is not atomic: it walks the tree, then rmdir()s the root.
  // Anything landing in between — an audit-log or approvals append that outlives
  // the test which triggered it — recreates a file inside the emptied directory,
  // and the final rmdir() fails with ENOTEMPTY. `force` only suppresses ENOENT.
  // `maxRetries` is the documented remedy: it retries on exactly EBUSY, EMFILE,
  // ENFILE, ENOTEMPTY and EPERM with a linear backoff. It defaults to 0, which
  // is why this surfaced as an intermittent CI failure.
  try {
    rmSync(TEST_RUNTIME_DIR, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 50,
    });
  } catch (error) {
    // A leftover temp directory must never fail an otherwise-passing suite;
    // tmpdir() is reclaimed by the OS regardless. Surface it and move on.
    console.warn(`[test-env] could not remove ${TEST_RUNTIME_DIR}:`, error);
  }
});
