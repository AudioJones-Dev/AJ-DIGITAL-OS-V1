/**
 * Operating Core — Policy loader
 *
 * Reads JSON policy documents from `runtime/policies/`. Documents are cached
 * after first load; pass `reload=true` to re-read.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import type { PolicyDocument } from "./policy-types.js";

const cache = new Map<string, PolicyDocument>();

export function policiesDir(): string {
  return join(process.cwd(), "runtime", "policies");
}

export function policyPath(policyFile: string): string {
  return join(policiesDir(), policyFile);
}

export function loadPolicy(policyFile: string, reload = false): PolicyDocument {
  if (!reload) {
    const cached = cache.get(policyFile);
    if (cached) return cached;
  }

  const fullPath = policyPath(policyFile);
  if (!existsSync(fullPath)) {
    throw new Error(`Policy file not found: ${policyFile}`);
  }

  let parsed: PolicyDocument;
  try {
    parsed = JSON.parse(readFileSync(fullPath, "utf-8")) as PolicyDocument;
  } catch (err) {
    throw new Error(
      `Failed to parse policy '${policyFile}': ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (typeof parsed.policy !== "string" || typeof parsed.version !== "string") {
    throw new Error(`Policy '${policyFile}' is missing required fields (policy, version)`);
  }

  cache.set(policyFile, parsed);
  return parsed;
}

export function clearPolicyCache(): void {
  cache.clear();
}
