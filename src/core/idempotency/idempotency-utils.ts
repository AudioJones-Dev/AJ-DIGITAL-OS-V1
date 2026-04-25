/**
 * Operating Core — Idempotency hashing utilities
 */

import { createHash } from "node:crypto";

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * Stable JSON serialization (sorted keys) so semantically-equal payloads
 * produce identical hashes regardless of key ordering.
 */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    return Object.fromEntries(entries.map(([k, v]) => [k, sortKeys(v)]));
  }
  return value;
}

export function createIdempotencyKey(action: string, payload: unknown): string {
  return sha256(`${action}:${stableStringify(payload)}`);
}

export function hashCommand(command: unknown): string {
  return sha256(stableStringify(command));
}
