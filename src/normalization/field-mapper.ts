/**
 * L5 — Field mapping & coercion utilities for the Data Normalization Layer.
 *
 * Used by the normalizer to translate raw, source-shaped objects into
 * canonical entity fields. Pure functions — no I/O, no logging.
 */

export type FieldMap = Record<string, readonly string[]>;

/**
 * Apply a field map to a raw record. Each output key is taken from the first
 * source key in the alias list that exists on the input.
 */
export function mapFields(
  raw: Record<string, unknown>,
  map: FieldMap,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [target, aliases] of Object.entries(map)) {
    for (const alias of aliases) {
      if (alias in raw && raw[alias] !== undefined && raw[alias] !== null) {
        out[target] = raw[alias];
        break;
      }
    }
  }
  return out;
}

/**
 * Throws a descriptive error if any required field is missing or empty.
 */
export function requireFields(
  obj: Record<string, unknown>,
  required: readonly string[],
  context: string,
): void {
  const missing: string[] = [];
  for (const key of required) {
    const value = obj[key];
    if (value === undefined || value === null) {
      missing.push(key);
      continue;
    }
    if (typeof value === "string" && value.trim() === "") {
      missing.push(key);
    }
  }
  if (missing.length > 0) {
    throw new Error(`${context}: missing required fields: ${missing.join(", ")}`);
  }
}

export function coerceString(value: unknown, fallback?: string): string | undefined {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

export function coerceNumber(value: unknown, fallback?: number): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") return fallback;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function coerceEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  for (const option of allowed) {
    if (option === value || option === normalized) return option;
  }
  return fallback;
}

export function coerceStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((v) => coerceString(v))
      .filter((v): v is string => typeof v === "string" && v.length > 0);
  }
  if (typeof value === "string" && value.trim() !== "") {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }
  return [];
}

export function coerceBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "1" || v === "yes") return true;
    if (v === "false" || v === "0" || v === "no") return false;
  }
  if (typeof value === "number") return value !== 0;
  return fallback;
}
