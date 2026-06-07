import { readFileSync } from "node:fs";
import path from "node:path";

import type { MemoryConfidence, MemoryRetrievalPolicy, MemoryType } from "./memory-types.js";

export type MemoryPolicyErrorCode =
  | "invalid_policy_name"
  | "policy_not_found"
  | "invalid_policy_json"
  | "invalid_policy_shape";

export class MemoryPolicyError extends Error {
  constructor(
    public readonly code: MemoryPolicyErrorCode,
    message: string,
    public readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "MemoryPolicyError";
  }
}

export interface LoadRetrievalPolicyOptions {
  policyDirectory?: string;
}

const MEMORY_TYPES: readonly MemoryType[] = [
  "working_context",
  "run_log",
  "decision",
  "sop",
  "client_profile",
  "project",
  "mistake",
  "research",
  "agent_profile",
  "brand_memory",
  "retrieval_policy",
  "write_policy",
];

const CONFIDENCE_LEVELS: readonly MemoryConfidence[] = ["low", "medium", "high"];

const DEFAULT_POLICY_DIRECTORY = path.resolve(process.cwd(), "memory", "retrieval");

export function loadRetrievalPolicy(
  policyName: string,
  options: LoadRetrievalPolicyOptions = {},
): MemoryRetrievalPolicy {
  const normalizedPolicyName = normalizePolicyName(policyName);
  const policyDirectory = options.policyDirectory ?? DEFAULT_POLICY_DIRECTORY;
  const policyPath = path.join(policyDirectory, `retrieval-policy-${normalizedPolicyName}.json`);

  let rawText: string;
  try {
    rawText = readFileSync(policyPath, "utf-8");
  } catch (error) {
    if (isNodeError(error) && error.code === "ENOENT") {
      throw new MemoryPolicyError(
        "policy_not_found",
        `Memory retrieval policy '${normalizedPolicyName}' was not found.`,
        { policyName: normalizedPolicyName, policyPath },
      );
    }

    throw error;
  }

  let rawPolicy: unknown;
  try {
    rawPolicy = JSON.parse(rawText);
  } catch (error) {
    throw new MemoryPolicyError(
      "invalid_policy_json",
      `Memory retrieval policy '${normalizedPolicyName}' contains invalid JSON.`,
      {
        policyName: normalizedPolicyName,
        policyPath,
        message: error instanceof Error ? error.message : String(error),
      },
    );
  }

  return normalizeRawPolicy(rawPolicy, normalizedPolicyName, policyPath);
}

export function normalizePolicyName(policyName: string): string {
  const trimmed = policyName.trim();

  if (trimmed.length === 0 || trimmed.includes("/") || trimmed.includes("\\")) {
    throw new MemoryPolicyError("invalid_policy_name", "Policy name must be a local policy id.", { policyName });
  }

  const withoutPrefix = trimmed.startsWith("retrieval-policy-")
    ? trimmed.slice("retrieval-policy-".length)
    : trimmed;
  const withoutExtension = withoutPrefix.endsWith(".json")
    ? withoutPrefix.slice(0, -".json".length)
    : withoutPrefix;

  if (!/^[a-z0-9-]+$/i.test(withoutExtension)) {
    throw new MemoryPolicyError("invalid_policy_name", "Policy name contains unsupported characters.", {
      policyName,
    });
  }

  return withoutExtension;
}

function normalizeRawPolicy(rawPolicy: unknown, normalizedPolicyName: string, policyPath: string): MemoryRetrievalPolicy {
  if (!isRecord(rawPolicy)) {
    throwPolicyShapeError(normalizedPolicyName, policyPath, "Policy JSON must be an object.");
  }

  const policyId = getString(rawPolicy, "policy_id", "policyId") ?? normalizedPolicyName;
  const allowedTypes = getMemoryTypeArray(rawPolicy, "allowed_memory_types", "allowedTypes", normalizedPolicyName, policyPath);
  const retrievalOrder = getMemoryTypeArray(rawPolicy, "retrieval_order", "retrievalOrder", normalizedPolicyName, policyPath);
  const maxTotalTokens = getRequiredNumber(rawPolicy, "max_total_tokens", "maxTotalTokens", normalizedPolicyName, policyPath);
  const maxTokensPerMemoryType = getTokenBudgetMap(rawPolicy, normalizedPolicyName, policyPath);
  const minimumConfidence = getConfidence(rawPolicy, normalizedPolicyName, policyPath);
  const freshnessCutoffDays = getOptionalNumber(rawPolicy, "freshness_cutoff_days", "freshnessCutoffDays");
  const citationsRequired = getRequiredBoolean(rawPolicy, "citations_required", "citationsRequired", normalizedPolicyName, policyPath);
  const tenantIsolationRequired = getRequiredBoolean(
    rawPolicy,
    "tenant_isolation_required",
    "tenantIsolationRequired",
    normalizedPolicyName,
    policyPath,
  );

  return {
    policyId,
    allowedTypes,
    maxTotalTokens,
    maxTokensPerMemoryType,
    ...(freshnessCutoffDays === undefined ? {} : { freshnessCutoffDays }),
    minimumConfidence,
    citationsRequired,
    tenantIsolationRequired,
    retrievalOrder,
  };
}

function getMemoryTypeArray(
  rawPolicy: Record<string, unknown>,
  snakeKey: string,
  camelKey: string,
  policyName: string,
  policyPath: string,
): MemoryType[] {
  const value = rawPolicy[snakeKey] ?? rawPolicy[camelKey];

  if (!Array.isArray(value) || value.length === 0) {
    throwPolicyShapeError(policyName, policyPath, `${snakeKey} must be a non-empty array.`);
  }

  const invalidTypes = value.filter((entry) => typeof entry !== "string" || !isMemoryType(entry));
  if (invalidTypes.length > 0) {
    throwPolicyShapeError(policyName, policyPath, `${snakeKey} contains unsupported memory types: ${invalidTypes.join(", ")}.`);
  }

  return value as MemoryType[];
}

function getTokenBudgetMap(
  rawPolicy: Record<string, unknown>,
  policyName: string,
  policyPath: string,
): Partial<Record<MemoryType, number>> {
  const value = rawPolicy["max_tokens_per_memory_type"] ?? rawPolicy["maxTokensPerMemoryType"];

  if (!isRecord(value)) {
    throwPolicyShapeError(policyName, policyPath, "max_tokens_per_memory_type must be an object.");
  }

  const result: Partial<Record<MemoryType, number>> = {};
  for (const [key, budget] of Object.entries(value)) {
    if (!isMemoryType(key)) {
      throwPolicyShapeError(policyName, policyPath, `max_tokens_per_memory_type has unsupported key '${key}'.`);
    }

    if (typeof budget !== "number" || !Number.isFinite(budget) || budget < 0) {
      throwPolicyShapeError(policyName, policyPath, `max_tokens_per_memory_type.${key} must be a non-negative number.`);
    }

    result[key] = budget;
  }

  return result;
}

function getConfidence(
  rawPolicy: Record<string, unknown>,
  policyName: string,
  policyPath: string,
): MemoryConfidence {
  const value = getString(rawPolicy, "minimum_confidence", "minimumConfidence");

  if (!value || !isMemoryConfidence(value)) {
    throwPolicyShapeError(policyName, policyPath, "minimum_confidence must be low, medium, or high.");
  }

  return value;
}

function getString(rawPolicy: Record<string, unknown>, snakeKey: string, camelKey: string): string | undefined {
  const value = rawPolicy[snakeKey] ?? rawPolicy[camelKey];
  return typeof value === "string" ? value : undefined;
}

function getRequiredNumber(
  rawPolicy: Record<string, unknown>,
  snakeKey: string,
  camelKey: string,
  policyName: string,
  policyPath: string,
): number {
  const value = rawPolicy[snakeKey] ?? rawPolicy[camelKey];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throwPolicyShapeError(policyName, policyPath, `${snakeKey} must be a non-negative number.`);
  }

  return value;
}

function getOptionalNumber(rawPolicy: Record<string, unknown>, snakeKey: string, camelKey: string): number | undefined {
  const value = rawPolicy[snakeKey] ?? rawPolicy[camelKey];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function getRequiredBoolean(
  rawPolicy: Record<string, unknown>,
  snakeKey: string,
  camelKey: string,
  policyName: string,
  policyPath: string,
): boolean {
  const value = rawPolicy[snakeKey] ?? rawPolicy[camelKey];
  if (typeof value !== "boolean") {
    throwPolicyShapeError(policyName, policyPath, `${snakeKey} must be a boolean.`);
  }

  return value;
}

function isMemoryType(value: unknown): value is MemoryType {
  return typeof value === "string" && MEMORY_TYPES.includes(value as MemoryType);
}

function isMemoryConfidence(value: unknown): value is MemoryConfidence {
  return typeof value === "string" && CONFIDENCE_LEVELS.includes(value as MemoryConfidence);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && "code" in error;
}

function throwPolicyShapeError(policyName: string, policyPath: string, message: string): never {
  throw new MemoryPolicyError("invalid_policy_shape", `Memory retrieval policy '${policyName}' is invalid: ${message}`, {
    policyName,
    policyPath,
  });
}
