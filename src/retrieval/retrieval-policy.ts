/**
 * Operational Retrieval Layer v1 — policy rules.
 *
 * Policy decisions run BEFORE any data is loaded so denials cannot leak
 * cross-tenant chunks. The policy evaluator returns a structured
 * approve/deny + warnings result; restricted namespaces are flagged
 * (not blocked) so future enforcement-approval wiring can hook in.
 */

import type {
  RetrievalNamespace,
  RetrievalPolicy,
  RetrievalPolicyEvaluation,
  RetrievalIngestRequest,
  RetrievalSearchRequest,
} from "./retrieval-types.js";

export const DEFAULT_RETRIEVAL_POLICY: RetrievalPolicy = {
  requireTenantIdForNamespaces: ["client_docs", "attribution_memory"],
  readOnlyNamespaces: ["audit_memory", "attribution_memory"],
  globalNamespaces: ["system_docs", "tool_docs"],
  restrictedNamespaces: ["audit_memory"],
};

function isProductionEnv(env: string | undefined): boolean {
  return env === "production";
}

/**
 * Evaluate a retrieval REQUEST (search) against the policy.
 *
 * 1. production requests require tenantId
 * 2. client_docs requires tenantId
 * 3. cross-tenant retrieval — handled in search (chunk-level), but if request
 *    includes namespaces the actor cannot read for their tenant, we flag here
 * 4. restricted namespaces — flagged in result, not blocked
 * 5. audit_memory / attribution_memory — read-only (search is reads, so no block;
 *    ingest path enforces this separately)
 */
export function evaluateRetrievalPolicy(
  request: RetrievalSearchRequest,
  policy: RetrievalPolicy = DEFAULT_RETRIEVAL_POLICY,
): RetrievalPolicyEvaluation {
  const warnings: string[] = [];
  const restrictedUsed: RetrievalNamespace[] = [];

  if (isProductionEnv(request.environment) && !request.tenantId) {
    return {
      approved: false,
      reason: "production retrieval requires tenantId",
      warnings,
      restrictedNamespacesUsed: restrictedUsed,
    };
  }

  for (const ns of request.namespaces) {
    if (policy.requireTenantIdForNamespaces.includes(ns) && !request.tenantId) {
      return {
        approved: false,
        reason: `namespace '${ns}' requires tenantId`,
        warnings,
        restrictedNamespacesUsed: restrictedUsed,
      };
    }

    if (policy.restrictedNamespaces.includes(ns)) {
      restrictedUsed.push(ns);
      warnings.push(
        `namespace '${ns}' is restricted — pending enforcement approval (allowed for now)`,
      );
    }
  }

  return {
    approved: true,
    warnings,
    restrictedNamespacesUsed: restrictedUsed,
  };
}

/**
 * Evaluate an INGEST request against the policy.
 *
 * Read-only namespaces cannot be written from the public ingest path
 * (audit_memory, attribution_memory). Production ingest requires tenantId
 * for tenant-scoped namespaces.
 */
export function evaluateIngestPolicy(
  request: RetrievalIngestRequest,
  policy: RetrievalPolicy = DEFAULT_RETRIEVAL_POLICY,
): RetrievalPolicyEvaluation {
  const warnings: string[] = [];
  const restrictedUsed: RetrievalNamespace[] = [];

  if (policy.readOnlyNamespaces.includes(request.namespace)) {
    return {
      approved: false,
      reason: `namespace '${request.namespace}' is read-only`,
      warnings,
      restrictedNamespacesUsed: restrictedUsed,
    };
  }

  if (
    policy.requireTenantIdForNamespaces.includes(request.namespace) &&
    !request.tenantId
  ) {
    return {
      approved: false,
      reason: `namespace '${request.namespace}' requires tenantId`,
      warnings,
      restrictedNamespacesUsed: restrictedUsed,
    };
  }

  if (
    isProductionEnv(request.environment) &&
    !request.tenantId &&
    !policy.globalNamespaces.includes(request.namespace)
  ) {
    return {
      approved: false,
      reason: "production ingest requires tenantId for non-global namespaces",
      warnings,
      restrictedNamespacesUsed: restrictedUsed,
    };
  }

  if (policy.restrictedNamespaces.includes(request.namespace)) {
    restrictedUsed.push(request.namespace);
    warnings.push(
      `namespace '${request.namespace}' is restricted — pending enforcement approval`,
    );
  }

  return {
    approved: true,
    warnings,
    restrictedNamespacesUsed: restrictedUsed,
  };
}

/**
 * Cross-tenant chunk filter — true if a chunk is readable by the request actor.
 *
 * - global namespaces: chunk readable if it has no tenantId
 * - tenant-scoped namespaces: chunk readable if its tenantId matches
 *   the request's tenantId
 * - if a chunk has a tenantId different from the requester's tenantId, BLOCK
 */
export function isChunkReadable(
  chunkTenantId: string | undefined,
  chunkNamespace: RetrievalNamespace,
  requestTenantId: string | undefined,
  policy: RetrievalPolicy = DEFAULT_RETRIEVAL_POLICY,
): boolean {
  if (chunkTenantId && requestTenantId && chunkTenantId !== requestTenantId) {
    return false;
  }

  if (policy.globalNamespaces.includes(chunkNamespace)) {
    if (!chunkTenantId) return true;
    return chunkTenantId === requestTenantId;
  }

  if (!chunkTenantId) return true;
  return chunkTenantId === requestTenantId;
}
