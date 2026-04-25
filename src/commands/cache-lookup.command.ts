import { lookupCache } from "../cache/cache-store.js";
import type { CacheEnvironment, CacheLookupResult, CacheNamespace, CacheRiskLevel } from "../cache/cache-types.js";

export interface CacheLookupCommandInput {
  namespace?: string;
  cacheKey?: string;
  tenantId?: string;
  environment?: string;
  policyVersion?: string;
  formulaVersion?: string;
  capabilityVersion?: string;
  riskLevel?: string;
  json?: boolean;
}

export interface CacheLookupCommandResult {
  ok: boolean;
  command: "cache-lookup";
  rendered: boolean;
  result?: CacheLookupResult;
  warnings: string[];
  errors: string[];
}

export class CacheLookupCommand {
  async run(input: CacheLookupCommandInput = {}): Promise<CacheLookupCommandResult> {
    if (!input.namespace || !input.cacheKey) {
      return {
        ok: false,
        command: "cache-lookup",
        rendered: false,
        warnings: [],
        errors: ["namespace and cacheKey are required"],
      };
    }

    const result = lookupCache({
      namespace: input.namespace as CacheNamespace,
      cacheKey: input.cacheKey,
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      environment: (input.environment ?? "development") as CacheEnvironment,
      policyVersion: input.policyVersion ?? "cache-policy-v1",
      ...(input.formulaVersion !== undefined ? { formulaVersion: input.formulaVersion } : {}),
      ...(input.capabilityVersion !== undefined ? { capabilityVersion: input.capabilityVersion } : {}),
      riskLevel: (input.riskLevel ?? "low") as CacheRiskLevel,
    });

    if (input.json) {
      console.log(JSON.stringify({ ok: true, result }, null, 2));
    } else {
      console.log("CACHE LOOKUP");
      console.log("============");
      console.log(`namespace: ${input.namespace}`);
      console.log(`cacheKey:  ${input.cacheKey}`);
      console.log(`decision:  ${result.decision}`);
      if (result.reason) console.log(`reason:    ${result.reason}`);
      if (result.entry) {
        console.log(`tenantId:  ${result.entry.tenantId ?? "(none)"}`);
        console.log(`expiresAt: ${result.entry.expiresAt}`);
      }
    }

    return { ok: true, command: "cache-lookup", rendered: true, result, warnings: [], errors: [] };
  }
}
