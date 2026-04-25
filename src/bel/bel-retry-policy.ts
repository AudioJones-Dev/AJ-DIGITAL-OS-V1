import type { BelToolName } from "./bel-types.js";

const MAX_ATTEMPTS: Record<BelToolName, number> = {
  filesystem: 1,
  shell: 2,
  browser: 3,
};

export function shouldRetry(tool: BelToolName, attempt: number, _error: string): boolean {
  return attempt < MAX_ATTEMPTS[tool];
}

export function getDelay(attempt: number): number {
  return 500 * Math.pow(2, attempt - 1);
}
