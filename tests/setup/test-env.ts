import { afterEach, beforeEach, vi } from "vitest";

const ORIGINAL_WEBHOOK_SECRET = process.env.AJ_WEBHOOK_SECRET;
const ORIGINAL_MAX_SKEW = process.env.AJ_WEBHOOK_MAX_SKEW_SECONDS;
const ORIGINAL_REPLAY_TTL = process.env.AJ_WEBHOOK_REPLAY_TTL_SECONDS;

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
