/**
 * Minimal logger wrapper to keep the starter scaffold explicit and testable.
 */
export const logger = {
  info(message: string, data?: Record<string, unknown>): void {
    console.info(message, data ?? {});
  },
  warn(message: string, data?: Record<string, unknown>): void {
    console.warn(message, data ?? {});
  },
  error(message: string, data?: Record<string, unknown>): void {
    console.error(message, data ?? {});
  },
};
