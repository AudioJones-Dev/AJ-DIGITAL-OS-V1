export interface RetryOptions {
  maxRetries: number;
  delayMs?: number | undefined;
  onRetry?: ((attempt: number, error: Error) => void) | undefined;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions,
): Promise<T> {
  const { maxRetries, delayMs = 1000 } = options;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt > maxRetries) {
        break;
      }

      if (options.onRetry) {
        options.onRetry(attempt, lastError);
      }

      if (delayMs > 0) {
        await new Promise<void>((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError ?? new Error("withRetry exhausted all attempts.");
}
