import path from "node:path";
import { validateOutputTargets } from "./allowlist.js";
import { safeReadFile, safeWriteFile } from "./file-tools.js";
import { generateEnvFile, patchEnvFile, serializeEnv } from "./env-tools.js";
import { validateOutput, type ValidationCheck, type ValidationRule } from "./validators.js";
import { mapTask, type AgentMode, type ValidationProfile } from "./task-mapper.js";
import { routeModelTask } from "../model-routing/model-router.js";

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

    // ── generate_env mode ────────────────────────────────────────
    if (mode === "generate_env") {
      const envPrefix = typeof context.envPrefix === "string" ? context.envPrefix : undefined;
      const prefixed = envPrefix
        ? Object.fromEntries(
            Object.entries(extractedFields).map(([k, v]) => {
              const upper = k.replace(/([a-z])([A-Z])/g, "$1_$2").replace(/[\s\-.]+/g, "_").toUpperCase();
              return [upper.startsWith(envPrefix) ? upper : `${envPrefix}${upper}`, v];
            }),
          )
        : extractedFields;

      return await executeGenerateEnv(
        prefixed,
        outputTargets,
        allowedPaths,
        validationRules,
        filesRead,
        warnings,
        context.requiredKeys as string[] | undefined,
      );
    }

    // ── normalize_config mode ────────────────────────────────────
    if (mode === "normalize_config") {
      return await executeNormalizeConfig(
        task,
        extractedFields,
        outputTargets,
        allowedPaths,
        validationRules,
        filesRead,
        warnings,
        context.requiredKeys as string[] | undefined,
      );
    }

    // ── Generic mode dispatch (write/patch/transform/read) ───────
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

// ── Mode executors ─────────────────────────────────────────────

async function executeGenerateEnv(
  fields: Record<string, string>,
  outputTargets: string[],
  allowedPaths: string[] | undefined,
  validationRules: ValidationRule[],
  filesRead: string[],
  warnings: string[],
  requiredKeys?: string[],
): Promise<LocalAgentResult> {
  const mode: AgentMode = "generate_env";
  const filesWritten: string[] = [];

  for (const target of outputTargets) {
    const result = await generateEnvFile(target, fields, allowedPaths);
    if (result.ok) {
      filesWritten.push(target);
    } else {
      return failure(mode, filesRead, filesWritten, warnings, result.error ?? "Env generation failed");
    }
  }

  // Validate: nonEmpty + validEnv + required keys
  const rules: ValidationRule[] = validationRules.length > 0
    ? validationRules
    : [
        { type: "exists" },
        { type: "nonEmpty" },
        { type: "validEnv" },
        ...(requiredKeys ? [{ type: "hasKeys" as const, keys: requiredKeys }] : []),
      ];

  const allChecks: ValidationCheck[] = [{ name: "path", passed: true }];
  for (const written of filesWritten) {
    const vr = await validateOutput(written, rules);
    allChecks.push(...vr.checks);
  }

  const validationPassed = allChecks.every((c) => c.passed);
  return {
    ok: true,
    mode,
    filesRead,
    filesWritten,
    summary: `Generated ${filesWritten.length} .env file(s)`,
    validation: { passed: validationPassed, checks: allChecks },
    warnings,
    error: null,
  };
}

async function executeNormalizeConfig(
  task: string,
  rawFields: Record<string, string>,
  outputTargets: string[],
  allowedPaths: string[] | undefined,
  validationRules: ValidationRule[],
  filesRead: string[],
  warnings: string[],
  requiredKeys?: string[],
): Promise<LocalAgentResult> {
  const mode: AgentMode = "normalize_config";
  const filesWritten: string[] = [];

  // Route through local model for structured normalization
  const prompt = [
    "You are a config normalization tool.",
    "Given raw extracted key-value fields, produce a clean JSON object with this shape:",
    '{ "project": { "id": "...", "title": "..." }, "dataset": "...", "meta": { "organization_id": "...", "source": "extracted" } }',
    "Map the input fields into the correct positions. Output ONLY valid JSON, nothing else.",
  ].join("\n");

  const result = await routeModelTask<Record<string, string>, unknown>(
    {
      taskType: "transform",
      task: prompt,
      context: rawFields,
      constraints: { mustBeLocal: true },
      allowEscalation: false,
    },
    {},
  );

  if (!result.ok || result.output === null) {
    // Fallback: deterministic normalization without model
    warnings.push(`Local model failed (${result.error ?? "unknown"}), using deterministic fallback`);
    const normalized = deterministicNormalize(rawFields);
    return await writeNormalizedOutput(normalized, outputTargets, allowedPaths, validationRules, filesRead, filesWritten, warnings, requiredKeys);
  }

  // Parse model output — must be valid JSON
  let normalized: unknown;
  if (typeof result.output === "string") {
    try {
      normalized = JSON.parse(result.output);
    } catch {
      warnings.push("Local model returned non-JSON, using deterministic fallback");
      normalized = deterministicNormalize(rawFields);
    }
  } else {
    normalized = result.output;
  }

  return await writeNormalizedOutput(normalized, outputTargets, allowedPaths, validationRules, filesRead, filesWritten, warnings, requiredKeys);
}

async function writeNormalizedOutput(
  normalized: unknown,
  outputTargets: string[],
  allowedPaths: string[] | undefined,
  validationRules: ValidationRule[],
  filesRead: string[],
  filesWritten: string[],
  warnings: string[],
  requiredKeys?: string[],
): Promise<LocalAgentResult> {
  const mode: AgentMode = "normalize_config";
  const content = JSON.stringify(normalized, null, 2) + "\n";

  for (const target of outputTargets) {
    const result = await safeWriteFile(target, content, allowedPaths);
    if (result.ok) {
      filesWritten.push(target);
    } else {
      return failure(mode, filesRead, filesWritten, warnings, result.error ?? "JSON write failed");
    }
  }

  // Validate: validJson + required keys
  const rules: ValidationRule[] = validationRules.length > 0
    ? validationRules
    : [
        { type: "exists" },
        { type: "nonEmpty" },
        { type: "validJson" },
        ...(requiredKeys ? [{ type: "hasKeys" as const, keys: requiredKeys }] : []),
      ];

  const allChecks: ValidationCheck[] = [{ name: "path", passed: true }];
  for (const written of filesWritten) {
    const vr = await validateOutput(written, rules);
    allChecks.push(...vr.checks);
  }

  const validationPassed = allChecks.every((c) => c.passed);
  return {
    ok: true,
    mode,
    filesRead,
    filesWritten,
    summary: `Normalized config → ${filesWritten.length} JSON file(s)`,
    validation: { passed: validationPassed, checks: allChecks },
    warnings,
    error: null,
  };
}

function deterministicNormalize(fields: Record<string, string>): Record<string, unknown> {
  return {
    project: {
      id: fields.project_id ?? fields.projectId ?? "",
      title: fields.title ?? fields.name ?? "",
    },
    dataset: fields.dataset ?? "",
    meta: {
      organization_id: fields.organization_id ?? fields.organizationId ?? "",
      source: "extracted",
    },
  };
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
