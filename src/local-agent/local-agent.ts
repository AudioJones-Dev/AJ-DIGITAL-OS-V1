import path from "node:path";
import { validateOutputTargets } from "./allowlist.js";
import { safeReadFile, safeWriteFile } from "./file-tools.js";
import { generateEnvFile, patchEnvFile, serializeEnv } from "./env-tools.js";
import { validateOutput, type ValidationCheck, type ValidationRule } from "./validators.js";
import { mapTask, type AgentMode, type ValidationProfile } from "./task-mapper.js";

// ── Types ──────────────────────────────────────────────────────────

export interface LocalAgentTaskInput {
  task: string;
  allowedPaths?: string[] | undefined;
  mode?: AgentMode | undefined;
  inputFiles?: string[] | undefined;
  outputTargets: string[];
  validationRules?: ValidationRule[] | undefined;
  context?: Record<string, unknown> | undefined;
}

export interface LocalAgentResult {
  ok: boolean;
  mode: AgentMode;
  filesRead: string[];
  filesWritten: string[];
  summary: string;
  validation: {
    passed: boolean;
    checks: ValidationCheck[];
  };
  warnings: string[];
  error: string | null;
}

// ── Main entry point ───────────────────────────────────────────────

/**
 * Run a bounded local agent task.
 *
 * The local agent operates only within the allowlist, validates all
 * writes, and returns a structured result envelope.
 */
export async function runLocalAgentTask(input: LocalAgentTaskInput): Promise<LocalAgentResult> {
  const {
    task,
    allowedPaths,
    inputFiles = [],
    outputTargets,
    validationRules = [],
    context = {},
  } = input;

  // Step 1: Determine mode
  const mapping = mapTask(task, outputTargets, inputFiles);
  const mode = input.mode ?? mapping.mode;

  const filesRead: string[] = [];
  const filesWritten: string[] = [];
  const warnings: string[] = [];

  // Step 2: Validate output targets
  const pathCheck = validateOutputTargets(outputTargets, allowedPaths);
  if (!pathCheck.ok) {
    return {
      ok: false,
      mode,
      filesRead,
      filesWritten,
      summary: "Blocked — unauthorized path",
      validation: {
        passed: false,
        checks: [{ name: "path", passed: false, reason: pathCheck.reason ?? undefined }],
      },
      warnings,
      error: `Unauthorized path: ${pathCheck.denied}`,
    };
  }

  try {
    // Step 3: Read input files if specified
    const inputData: Record<string, string> = {};
    for (const inputFile of inputFiles) {
      const result = await safeReadFile(inputFile, allowedPaths);
      if (result.ok && result.content !== null) {
        inputData[inputFile] = result.content;
        filesRead.push(inputFile);
      } else {
        warnings.push(`Could not read input: ${inputFile} — ${result.error}`);
      }
    }

    // Step 4: Execute based on mode and context
    const extractedFields = (context.extractedFields ?? {}) as Record<string, string>;

    for (const target of outputTargets) {
      const ext = path.extname(target).toLowerCase();

      if (mode === "patch" && ext === ".env") {
        const result = await patchEnvFile(target, extractedFields, allowedPaths);
        if (result.ok) {
          filesWritten.push(target);
        } else {
          return failure(mode, filesRead, filesWritten, warnings, result.error ?? "Patch failed");
        }
      } else if (ext === ".env") {
        const result = await generateEnvFile(target, extractedFields, allowedPaths);
        if (result.ok) {
          filesWritten.push(target);
        } else {
          return failure(mode, filesRead, filesWritten, warnings, result.error ?? "Env write failed");
        }
      } else if (ext === ".json") {
        const content = JSON.stringify(extractedFields, null, 2) + "\n";
        const result = await safeWriteFile(target, content, allowedPaths);
        if (result.ok) {
          filesWritten.push(target);
        } else {
          return failure(mode, filesRead, filesWritten, warnings, result.error ?? "JSON write failed");
        }
      } else if (ext === ".md") {
        const content = generateMarkdown(task, extractedFields);
        const result = await safeWriteFile(target, content, allowedPaths);
        if (result.ok) {
          filesWritten.push(target);
        } else {
          return failure(mode, filesRead, filesWritten, warnings, result.error ?? "Markdown write failed");
        }
      } else if (ext === ".csv") {
        const content = generateCsv(extractedFields);
        const result = await safeWriteFile(target, content, allowedPaths);
        if (result.ok) {
          filesWritten.push(target);
        } else {
          return failure(mode, filesRead, filesWritten, warnings, result.error ?? "CSV write failed");
        }
      } else {
        warnings.push(`Unsupported output format: ${ext} for ${target}`);
      }
    }

    // Step 5: Post-write validation
    const allChecks: ValidationCheck[] = [
      { name: "path", passed: true },
    ];

    // Infer default validation rules based on profile
    const effectiveRules = validationRules.length > 0
      ? validationRules
      : inferDefaultRules(mapping.validationProfile);

    for (const written of filesWritten) {
      const result = await validateOutput(written, effectiveRules);
      allChecks.push(...result.checks);
    }

    const validationPassed = allChecks.every((c) => c.passed);

    return {
      ok: true,
      mode,
      filesRead,
      filesWritten,
      summary: `Generated ${filesWritten.length} file(s)`,
      validation: { passed: validationPassed, checks: allChecks },
      warnings,
      error: null,
    };
  } catch (err) {
    return failure(
      mode,
      filesRead,
      filesWritten,
      warnings,
      err instanceof Error ? err.message : "Unknown error",
    );
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function failure(
  mode: AgentMode,
  filesRead: string[],
  filesWritten: string[],
  warnings: string[],
  error: string,
): LocalAgentResult {
  return {
    ok: false,
    mode,
    filesRead,
    filesWritten,
    summary: "Task failed",
    validation: { passed: false, checks: [] },
    warnings,
    error,
  };
}

function generateMarkdown(task: string, fields: Record<string, string>): string {
  const lines: string[] = [
    `# ${task}`,
    "",
    `> Generated: ${new Date().toISOString()}`,
    "",
    "| Field | Value |",
    "|-------|-------|",
  ];

  for (const [key, value] of Object.entries(fields)) {
    lines.push(`| ${key} | ${value} |`);
  }

  return lines.join("\n") + "\n";
}

function generateCsv(fields: Record<string, string>): string {
  const keys = Object.keys(fields);
  const values = Object.values(fields).map(csvEscape);
  return keys.join(",") + "\n" + values.join(",") + "\n";
}

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function inferDefaultRules(profile: ValidationProfile): ValidationRule[] {
  switch (profile) {
    case "env":
      return [{ type: "exists" }, { type: "nonEmpty" }, { type: "validEnv" }];
    case "json":
      return [{ type: "exists" }, { type: "nonEmpty" }, { type: "validJson" }];
    case "markdown":
      return [{ type: "exists" }, { type: "nonEmpty" }];
    case "csv":
      return [{ type: "exists" }, { type: "nonEmpty" }];
    case "generic":
      return [{ type: "exists" }];
  }
}
