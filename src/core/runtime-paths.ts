import { join, resolve } from "node:path";

export const AJ_RUNTIME_DIR_ENV = "AJ_RUNTIME_DIR";

export function resolveRuntimePath(...segments: string[]): string {
  const override = process.env[AJ_RUNTIME_DIR_ENV]?.trim();
  const runtimeRoot = override && override.length > 0
    ? resolve(override)
    : join(process.cwd(), "runtime");

  return segments.length > 0 ? join(runtimeRoot, ...segments) : runtimeRoot;
}
