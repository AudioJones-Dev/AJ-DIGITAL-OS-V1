/**
 * Governance — SOP Policy
 *
 * Provides Standard Operating Procedure definitions per workflow type and
 * validates a candidate step list against required/forbidden steps.
 */

import { loadPolicy } from "../../core/policy/policy-loader.js";
import type { SOPDefinition, SOPValidationResult } from "../governance-types.js";

const POLICY_FILE = "sop-constraints.policy.json";

interface RawWorkflow {
  requiredSteps?: unknown;
  forbiddenSteps?: unknown;
  requiredApprovals?: unknown;
  maxRetries?: unknown;
  timeoutSeconds?: unknown;
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
}

function readWorkflows(): Record<string, RawWorkflow> {
  const doc = loadPolicy(POLICY_FILE);
  const wf = doc.rules["workflows"];
  return wf && typeof wf === "object" ? (wf as Record<string, RawWorkflow>) : {};
}

export function getSOPForWorkflow(workflowType: string): SOPDefinition | null {
  const workflows = readWorkflows();
  const raw = workflows[workflowType];
  if (!raw) return null;

  return {
    workflowType,
    requiredSteps: asStringArray(raw.requiredSteps),
    forbiddenSteps: asStringArray(raw.forbiddenSteps),
    requiredApprovals: asStringArray(raw.requiredApprovals),
    maxRetries: typeof raw.maxRetries === "number" ? raw.maxRetries : 3,
    timeoutSeconds: typeof raw.timeoutSeconds === "number" ? raw.timeoutSeconds : 3600,
  };
}

export function listSOPWorkflows(): string[] {
  return Object.keys(readWorkflows()).sort();
}

export function validateWorkflowSteps(
  workflowType: string,
  steps: string[],
): SOPValidationResult {
  const sop = getSOPForWorkflow(workflowType);
  if (!sop) {
    return {
      valid: false,
      missingSteps: [],
      forbiddenStepsFound: [],
      errors: [`Unknown workflow type: ${workflowType}`],
    };
  }

  const stepSet = new Set(steps);
  const missingSteps = sop.requiredSteps.filter((s) => !stepSet.has(s));
  const forbiddenStepsFound = sop.forbiddenSteps.filter((s) => stepSet.has(s));

  const errors: string[] = [];
  if (missingSteps.length > 0) {
    errors.push(`Missing required steps: ${missingSteps.join(", ")}`);
  }
  if (forbiddenStepsFound.length > 0) {
    errors.push(`Forbidden steps present: ${forbiddenStepsFound.join(", ")}`);
  }

  return {
    valid: errors.length === 0,
    missingSteps,
    forbiddenStepsFound,
    errors,
  };
}
