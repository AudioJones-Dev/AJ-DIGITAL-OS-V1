import type { RoleHandler, RoleStepInput, RoleStepOutput } from "../agent-role-types.js";

// ── Validator Input / Output ───────────────────────────────────────

export interface ValidatorRule {
  field: string;
  check: "exists" | "nonEmpty" | "isString" | "isArray" | "isObject" | "matches";
  pattern?: string | undefined;
}

export interface ValidatorInput {
  rules: ValidatorRule[];
}

export interface ValidatorCheck {
  field: string;
  check: string;
  passed: boolean;
  message: string;
}

export interface ValidatorOutput {
  passed: boolean;
  checks: ValidatorCheck[];
}

/**
 * Validator role handler — deterministic, rule-based validation.
 * No model calls. Directly inspects the preceding executor output.
 */
export function createValidatorHandler(): RoleHandler<ValidatorInput, ValidatorOutput> {
  return {
    role: "validator",
    async execute(input: RoleStepInput<ValidatorInput>): Promise<RoleStepOutput<ValidatorOutput>> {
      const start = Date.now();
      const rules = input.payload.rules;
      const target = input.previousOutput;

      if (target === undefined || target === null) {
        return {
          ok: false,
          role: "validator",
          output: { passed: false, checks: [] },
          durationMs: Date.now() - start,
          retries: 0,
          warnings: [],
          error: "Validator received no input to validate (previousOutput is null).",
        };
      }

      const data = typeof target === "object" ? target as Record<string, unknown> : { _raw: target };
      const checks: ValidatorCheck[] = [];

      for (const rule of rules) {
        const check = runCheck(rule, data);
        checks.push(check);
      }

      const passed = checks.every((c) => c.passed);

      return {
        ok: passed,
        role: "validator",
        output: { passed, checks },
        durationMs: Date.now() - start,
        retries: 0,
        warnings: checks.filter((c) => !c.passed).map((c) => c.message),
        error: passed ? null : `Validation failed: ${checks.filter((c) => !c.passed).length}/${checks.length} checks failed.`,
      };
    },
  };
}

// ── Rule Checks ────────────────────────────────────────────────────

function runCheck(rule: ValidatorRule, data: Record<string, unknown>): ValidatorCheck {
  const value = resolveField(rule.field, data);
  const base = { field: rule.field, check: rule.check };

  switch (rule.check) {
    case "exists":
      return value !== undefined
        ? { ...base, passed: true, message: `${rule.field} exists.` }
        : { ...base, passed: false, message: `${rule.field} does not exist.` };

    case "nonEmpty":
      if (value === undefined || value === null || value === "") {
        return { ...base, passed: false, message: `${rule.field} is empty or missing.` };
      }
      if (Array.isArray(value) && value.length === 0) {
        return { ...base, passed: false, message: `${rule.field} is an empty array.` };
      }
      return { ...base, passed: true, message: `${rule.field} is non-empty.` };

    case "isString":
      return typeof value === "string"
        ? { ...base, passed: true, message: `${rule.field} is a string.` }
        : { ...base, passed: false, message: `${rule.field} is not a string (got ${typeof value}).` };

    case "isArray":
      return Array.isArray(value)
        ? { ...base, passed: true, message: `${rule.field} is an array.` }
        : { ...base, passed: false, message: `${rule.field} is not an array.` };

    case "isObject":
      return typeof value === "object" && value !== null && !Array.isArray(value)
        ? { ...base, passed: true, message: `${rule.field} is an object.` }
        : { ...base, passed: false, message: `${rule.field} is not an object.` };

    case "matches":
      if (typeof value !== "string" || !rule.pattern) {
        return { ...base, passed: false, message: `${rule.field} cannot be matched (not a string or no pattern).` };
      }
      return new RegExp(rule.pattern).test(value)
        ? { ...base, passed: true, message: `${rule.field} matches pattern.` }
        : { ...base, passed: false, message: `${rule.field} does not match pattern /${rule.pattern}/.` };

    default:
      return { ...base, passed: false, message: `Unknown check type: ${rule.check}` };
  }
}

function resolveField(path: string, data: Record<string, unknown>): unknown {
  const parts = path.split(".");
  let current: unknown = data;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}
