/**
 * Hermes Timer Utilities — safe long-interval scheduling.
 *
 * Node.js (V8/libuv) converts setTimeout/setInterval delay values to a
 * signed 32-bit integer internally. The maximum safe value is 2^31-1
 * (2,147,483,647 ms ≈ 24.8 days). Any value above this overflows to a
 * small or negative number, which Node normalises to 1 ms — causing an
 * infinite tight loop.
 *
 * The 30-day "Performance-reports" interval (2,592,000,000 ms) is one
 * such case. `safeSetInterval` handles this by chaining `setTimeout`
 * calls in segments that each stay below MAX_TIMER_DELAY_MS.
 */

/**
 * Maximum milliseconds that can be safely passed to Node's
 * `setTimeout` / `setInterval` without 32-bit signed integer overflow.
 *
 * Node max:  2,147,483,647 ms (2^31 − 1, ~24.8 days)
 * Our limit: 2,000,000,000 ms (~23.1 days) — safety margin of ~1.7 days
 */
export const MAX_TIMER_DELAY_MS = 2_000_000_000;

/**
 * A cancellable interval handle returned by `safeSetInterval`.
 * Replaces `ReturnType<typeof setInterval>` wherever large intervals
 * may be used.
 */
export interface SafeIntervalHandle {
  cancel: () => void;
}

/**
 * Safe replacement for `setInterval` that correctly handles intervals
 * larger than Node's 32-bit timer limit.
 *
 * - For intervals ≤ MAX_TIMER_DELAY_MS: behaves like `setInterval`.
 * - For intervals > MAX_TIMER_DELAY_MS: decomposes the wait into
 *   chained `setTimeout` segments, then restarts the cycle once the
 *   callback fires. The intended cadence is preserved.
 * - Logs a one-time `console.warn` if chunking is required.
 * - Logs `console.error` and returns a no-op handle for invalid
 *   intervals (0, negative, NaN, Infinity).
 *
 * @param callback  Function to invoke on each tick.
 * @param intervalMs  Desired repeat interval in milliseconds.
 * @returns  A handle with a `cancel()` method to stop the interval.
 */
export function safeSetInterval(
  callback: () => void,
  intervalMs: number,
): SafeIntervalHandle {
  // ── Guard: reject invalid intervals ───────────────────────────────
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
    console.error(
      `[HERMES-TIMER] safeSetInterval received invalid interval: ${intervalMs}ms — job will not be scheduled.`,
    );
    return { cancel: () => {} };
  }

  // ── Warn once if the interval requires chunking ────────────────────
  if (intervalMs > MAX_TIMER_DELAY_MS) {
    console.warn(
      `[HERMES-TIMER] Interval ${intervalMs}ms exceeds MAX_TIMER_DELAY_MS ` +
        `(${MAX_TIMER_DELAY_MS}ms ≈ 23.1d). Chunking into segments ` +
        `to prevent 32-bit overflow — intended cadence is preserved.`,
    );
  }

  let cancelled = false;
  let currentTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleNext(remaining: number): void {
    if (cancelled) return;

    const delay = Math.min(remaining, MAX_TIMER_DELAY_MS);

    currentTimer = setTimeout(() => {
      if (cancelled) return;

      const newRemaining = remaining - delay;

      if (newRemaining > 0) {
        // Still working through the chunked wait — do not fire yet.
        scheduleNext(newRemaining);
      } else {
        // Full interval has elapsed — fire the callback, then restart.
        callback();
        scheduleNext(intervalMs);
      }
    }, delay);
  }

  scheduleNext(intervalMs);

  return {
    cancel(): void {
      cancelled = true;
      if (currentTimer !== null) {
        clearTimeout(currentTimer);
        currentTimer = null;
      }
    },
  };
}
