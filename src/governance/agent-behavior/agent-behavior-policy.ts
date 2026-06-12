/**
 * Governance — Agent Behavior Policy
 *
 * Resolves the per-role policy and evaluates a candidate action + tool set
 * against allowed tools, forbidden actions, and approval requirements.
 */

import { loadPolicy } from "../../core/policy/policy-loader.js";
import type {
  AgentBehaviorResult,
  AgentRolePolicy,
  ClientOverrides,
} from "../governance-types.js";

const POLICY_FILE = "agent-behavior.policy.json";

interface RawRole {
  allowedTools?: unknown;
  forbiddenActions?: unknown;
  memoryScope?: unknown;
  maxConcurrentRuns?: unknown;
  requiredApprovals?: unknown;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function readPolicy(): { default: RawRole; roles: Record<string, RawRole> } {
  const doc = loadPolicy(POLICY_FILE);
  const r = doc.rules;
  return {
    default: (r["default"] as RawRole | undefined) ?? {},
    roles: (r["roles"] as Record<string, RawRole> | undefined) ?? {},
  };
}

function rolePolicyFromRaw(role: string, raw: RawRole, fallback: RawRole): AgentRolePolicy {
  return {
    role,
    allowedTools: asStringArray(raw.allowedTools).length > 0
      ? asStringArray(raw.allowedTools)
      : asStringArray(fallback.allowedTools),
    forbiddenActions: asStringArray(raw.forbiddenActions).length > 0
      ? asStringArray(raw.forbiddenActions)
      : asStringArray(fallback.forbiddenActions),
    memoryScope:
      typeof raw.memoryScope === "string"
        ? raw.memoryScope
        : typeof fallback.memoryScope === "string"
        ? fallback.memoryScope
        : "session",
    maxConcurrentRuns:
      typeof raw.maxConcurrentRuns === "number"
        ? raw.maxConcurrentRuns
        : typeof fallback.maxConcurrentRuns === "number"
        ? fallback.maxConcurrentRuns
        : 3,
    requiredApprovals:
      asStringArray(raw.requiredApprovals).length > 0
        ? asStringArray(raw.requiredApprovals)
        : asStringArray(fallback.requiredApprovals),
  };
}

export function getAgentPolicy(agentRole: string): AgentRolePolicy | null {
  const policy = readPolicy();
  const raw = policy.roles[agentRole];
  if (!raw) return null;
  return rolePolicyFromRaw(agentRole, raw, policy.default);
}

export function listAgentRoles(): string[] {
  return Object.keys(readPolicy().roles).sort();
}

/**
 * Evaluate whether an agent role can take an action with a given tool set.
 * Optional overrides apply approval-required toggles per action.
 */
export function evaluateAgentAction(
  agentRole: string,
  action: string,
  tools: string[],
  options: { overrides?: ClientOverrides } = {},
): AgentBehaviorResult {
  const policy = readPolicy();
  const raw = policy.roles[agentRole];
  const merged = rolePolicyFromRaw(agentRole, raw ?? {}, policy.default);

  const violations: string[] = [];
  if (!raw) {
    violations.push(`Unknown agent role: ${agentRole} (using default policy)`);
  }

  const allowed = new Set(merged.allowedTools);
  const forbiddenTools = tools.filter((t) => !allowed.has(t));
  if (forbiddenTools.length > 0) {
    violations.push(`Forbidden tools for role ${agentRole}: ${forbiddenTools.join(", ")}`);
  }

  if (merged.forbiddenActions.includes(action)) {
    violations.push(`Action "${action}" is forbidden for role ${agentRole}`);
  }

  let requiresApproval = merged.requiredApprovals.includes(action);

  const override = options.overrides?.approvalOverrides?.[action];
  if (override === "always_required") requiresApproval = true;
  if (override === "never_required" && !merged.forbiddenActions.includes(action)) {
    requiresApproval = false;
  }

  return {
    allowed: violations.length === 0,
    requiresApproval,
    forbiddenTools,
    violations,
  };
}
