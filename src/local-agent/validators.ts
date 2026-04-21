import fs from "node:fs/promises";
import path from "node:path";

export interface ValidationCheck {
  name: string;
  passed: boolean;
  reason?: string | undefined;
}

export interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
}

/**
 * Run a set of post-write validations on an output file.
 */
export async function validateOutput(
  filePath: string,
  rules: ValidationRule[],
): Promise<ValidationResult> {
  const checks: ValidationCheck[] = [];

  for (const rule of rules) {
    const check = await runValidation(filePath, rule);
    checks.push(check);
  }

  return {
    passed: checks.every((c) => c.passed),
    checks,
  };
}

export type ValidationRule =
  | { type: "exists" }
  | { type: "nonEmpty" }
  | { type: "validJson" }
  | { type: "validEnv" }
  | { type: "hasKeys"; keys: string[] }
  | { type: "maxSize"; bytes: number };

async function runValidation(filePath: string, rule: ValidationRule): Promise<ValidationCheck> {
  try {
    switch (rule.type) {
      case "exists": {
        const stat = await fs.stat(filePath).catch(() => null);
        return stat
          ? { name: "exists", passed: true }
          : { name: "exists", passed: false, reason: "File does not exist" };
      }

      case "nonEmpty": {
        const content = await fs.readFile(filePath, "utf-8").catch(() => "");
        return content.trim().length > 0
          ? { name: "nonEmpty", passed: true }
          : { name: "nonEmpty", passed: false, reason: "File is empty" };
      }

      case "validJson": {
        const content = await fs.readFile(filePath, "utf-8");
        try {
          JSON.parse(content);
          return { name: "validJson", passed: true };
        } catch {
          return { name: "validJson", passed: false, reason: "Invalid JSON" };
        }
      }

      case "validEnv": {
        const content = await fs.readFile(filePath, "utf-8");
        const lines = content.split("\n").filter((l) => l.trim().length > 0 && !l.startsWith("#"));
        const allValid = lines.every((l) => /^[A-Z_][A-Z0-9_]*=/.test(l));
        return allValid
          ? { name: "validEnv", passed: true }
          : { name: "validEnv", passed: false, reason: "Invalid .env format" };
      }

      case "hasKeys": {
        const content = await fs.readFile(filePath, "utf-8");
        const missing = rule.keys.filter((k) => !content.includes(k));
        return missing.length === 0
          ? { name: "hasKeys", passed: true }
          : { name: "hasKeys", passed: false, reason: `Missing keys: ${missing.join(", ")}` };
      }

      case "maxSize": {
        const stat = await fs.stat(filePath);
        return stat.size <= rule.bytes
          ? { name: "maxSize", passed: true }
          : { name: "maxSize", passed: false, reason: `File exceeds ${rule.bytes} bytes (${stat.size})` };
      }
    }
  } catch (err) {
    return {
      name: rule.type,
      passed: false,
      reason: err instanceof Error ? err.message : "Validation error",
    };
  }
}
