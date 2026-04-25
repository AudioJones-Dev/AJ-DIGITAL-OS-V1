import { hashInput, writeCache } from "../cache/cache-store.js";
import type { CacheEnvironment, CacheNamespace, CacheRiskLevel } from "../cache/cache-types.js";

export interface CacheWriteCommandInput {
  namespace?: string;
  cacheKey?: string;
  tenantId?: string;
  environment?: string;
  policyVersion?: string;
  formulaVersion?: string;
  capabilityVersion?: string;
  riskLevel?: string;
  ttlSeconds?: number;
  data?: string;
  createdBy?: string;
  json?: boolean;
}

export interface CacheWriteCommandResult {
  ok: boolean;
  command: "cache-write";
  rendered: boolean;
  cacheKey?: string;
  warnings: string[];
  errors: string[];
}

export class CacheWriteCommand {
  async run(input: CacheWriteCommandInput = {}): Promise<CacheWriteCommandResult> {
    if (!input.namespace || !input.cacheKey || input.data === undefined) {
      return {
        ok: false,
        command: "cache-write",
        rendered: false,
        warnings: [],
        errors: ["namespace, cacheKey, and data are required"],
      };
    }

    let parsed: unknown = input.data;
    try {
      parsed = JSON.parse(input.data);
    } catch {
      // store as raw string
    }

    const inputHash = hashInput(parsed);

    const entry = writeCache({
      namespace: input.namespace as CacheNamespace,
      cacheKey: input.cacheKey,
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      inputHash,
      ...(input.formulaVersion !== undefined ? { formulaVersion: input.formulaVersion } : {}),
      policyVersion: input.policyVersion ?? "cache-policy-v1",
      ...(input.capabilityVersion !== undefined ? { capabilityVersion: input.capabilityVersion } : {}),
      environment: (input.environment ?? "development") as CacheEnvironment,
      riskLevel: (input.riskLevel ?? "low") as CacheRiskLevel,
      ttlSeconds: input.ttlSeconds ?? 3600,
      createdBy: input.createdBy ?? "cli",
      data: parsed,
    });

    if (input.json) {
      console.log(JSON.stringify({ ok: true, entry }, null, 2));
    } else {
      console.log(`Cache entry written: ${entry.namespace}/${entry.cacheKey}`);
      console.log(`expiresAt: ${entry.expiresAt}`);
    }

    return {
      ok: true,
      command: "cache-write",
      rendered: true,
      cacheKey: entry.cacheKey,
      warnings: [],
      errors: [],
    };
  }
}
