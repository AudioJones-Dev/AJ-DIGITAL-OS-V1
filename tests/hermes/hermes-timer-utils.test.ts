/**
 * Tests for hermes-timer-utils — safe large-interval scheduling.
 *
 * Verifies that safeSetInterval:
 *   - fires correctly for normal (safe-range) intervals
 *   - fires at the correct time for overflowing (30-day) intervals
 *     by chunking the delay without calling the callback early
 *   - respects cancel() at any point in the chain
 *   - rejects invalid interval values (0, negative, NaN, Infinity)
 *   - keeps MAX_TIMER_DELAY_MS safely below Node's 32-bit int limit
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  MAX_TIMER_DELAY_MS,
  safeSetInterval,
} from "../../src/hermes/hermes-timer-utils.js";

describe("MAX_TIMER_DELAY_MS", () => {
  it("is below Node's 32-bit signed integer max (2,147,483,647)", () => {
    expect(MAX_TIMER_DELAY_MS).toBeLessThan(2_147_483_647);
  });

  it("is a positive finite number", () => {
    expect(MAX_TIMER_DELAY_MS).toBeGreaterThan(0);
    expect(Number.isFinite(MAX_TIMER_DELAY_MS)).toBe(true);
  });
});

describe("safeSetInterval — normal (safe-range) intervals", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("fires after the first interval elapses", () => {
    const fn = vi.fn();
    const handle = safeSetInterval(fn, 1_000);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1_000);
    expect(fn).toHaveBeenCalledTimes(1);
    handle.cancel();
  });

  it("fires repeatedly on each interval", () => {
    const fn = vi.fn();
    const handle = safeSetInterval(fn, 500);
    vi.advanceTimersByTime(2_500);
    expect(fn).toHaveBeenCalledTimes(5);
    handle.cancel();
  });

  it("does not fire before the interval elapses", () => {
    const fn = vi.fn();
    const handle = safeSetInterval(fn, 1_000);
    vi.advanceTimersByTime(999);
    expect(fn).not.toHaveBeenCalled();
    handle.cancel();
  });
});

describe("safeSetInterval — overflowing 30-day interval", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000; // 2,592,000,000 ms

  it("does not fire during the first chunk (before MAX_TIMER_DELAY_MS elapses)", () => {
    const fn = vi.fn();
    const handle = safeSetInterval(fn, THIRTY_DAYS_MS);
    vi.advanceTimersByTime(MAX_TIMER_DELAY_MS - 1);
    expect(fn).not.toHaveBeenCalled();
    handle.cancel();
  });

  it("does not fire immediately after the first chunk (second chunk still pending)", () => {
    const fn = vi.fn();
    const handle = safeSetInterval(fn, THIRTY_DAYS_MS);
    vi.advanceTimersByTime(MAX_TIMER_DELAY_MS);
    expect(fn).not.toHaveBeenCalled(); // second chunk still pending
    handle.cancel();
  });

  it("fires exactly once after the full 30-day interval elapses", () => {
    const fn = vi.fn();
    const handle = safeSetInterval(fn, THIRTY_DAYS_MS);
    vi.advanceTimersByTime(THIRTY_DAYS_MS);
    expect(fn).toHaveBeenCalledTimes(1);
    handle.cancel();
  });

  it("fires a second time after two full 30-day intervals", () => {
    const fn = vi.fn();
    const handle = safeSetInterval(fn, THIRTY_DAYS_MS);
    vi.advanceTimersByTime(THIRTY_DAYS_MS * 2);
    expect(fn).toHaveBeenCalledTimes(2);
    handle.cancel();
  });

  it("emits a console.warn about chunking (only for overflowing intervals)", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const handle = safeSetInterval(() => {}, THIRTY_DAYS_MS);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Chunking into segments"),
    );
    warnSpy.mockRestore();
    handle.cancel();
  });

  it("does NOT emit a console.warn for safe-range intervals", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const handle = safeSetInterval(() => {}, 1_000);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
    handle.cancel();
  });
});

describe("safeSetInterval — cancel()", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("stops firing after cancel() during a normal interval", () => {
    const fn = vi.fn();
    const handle = safeSetInterval(fn, 500);
    vi.advanceTimersByTime(500);
    expect(fn).toHaveBeenCalledTimes(1);
    handle.cancel();
    vi.advanceTimersByTime(1_000);
    expect(fn).toHaveBeenCalledTimes(1); // no new calls
  });

  it("stops before first fire when cancelled mid-chunk (30d interval)", () => {
    const fn = vi.fn();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const handle = safeSetInterval(fn, THIRTY_DAYS_MS);
    vi.advanceTimersByTime(MAX_TIMER_DELAY_MS + 1); // into second chunk
    handle.cancel();
    vi.advanceTimersByTime(THIRTY_DAYS_MS); // well past the end
    expect(fn).not.toHaveBeenCalled();
  });

  it("calling cancel() twice is safe (no throw)", () => {
    const handle = safeSetInterval(() => {}, 1_000);
    expect(() => {
      handle.cancel();
      handle.cancel();
    }).not.toThrow();
  });
});

describe("safeSetInterval — invalid interval guard", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it.each([
    ["0", 0],
    ["negative", -1000],
    ["NaN", NaN],
    ["Infinity", Infinity],
    ["-Infinity", -Infinity],
  ])("does not schedule for %s interval", (_label, interval) => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fn = vi.fn();
    const handle = safeSetInterval(fn, interval);
    vi.advanceTimersByTime(10_000);
    expect(fn).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("invalid interval"),
    );
    errorSpy.mockRestore();
    handle.cancel(); // no-op handle — should not throw
  });
});
