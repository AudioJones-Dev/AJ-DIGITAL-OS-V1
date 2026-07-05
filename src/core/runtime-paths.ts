import { join, resolve } from "node:path";

export const AJ_RUNTIME_DIR_ENV = "AJ_RUNTIME_DIR";

export function resolveRuntimePath(...segments: string[]): string {
  const override = process.env[AJ_RUNTIME_DIR_ENV]?.trim();
  const runtimeRoot = override && override.length > 0
    ? resolve(override)
    : join(process.cwd(), "runtime");

  return segments.length > 0 ? join(runtimeRoot, ...segments) : runtimeRoot;
}

// The attribution log lives outside runtime/ in production (<cwd>/logs), but
// still honors AJ_RUNTIME_DIR (<override>/logs) so tests stay isolated.
export function resolveLogsPath(...segments: string[]): string {
  const override = process.env[AJ_RUNTIME_DIR_ENV]?.trim();
  const logsRoot = override && override.length > 0
    ? join(resolve(override), "logs")
    : join(process.cwd(), "logs");

  return segments.length > 0 ? join(logsRoot, ...segments) : logsRoot;
}
