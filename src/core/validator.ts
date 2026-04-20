import { ZodError } from "zod";

import { ContextBundleSchema } from "../schemas/context-bundle.schema.js";
import { WorkflowResultSchema } from "../schemas/workflow-result.schema.js";
import type { WorkflowContext, WorkflowExecutionResult } from "../types/workflow.types.js";

export interface ValidationCheck {
  name: string;
  status: "pass" | "fail" | "warning";
  notes?: string;
}

export interface ValidationReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
  checks: ValidationCheck[];
}

const REQUIRED_ASSETS_BY_TASK_TYPE: Partial<
  Record<string, WorkflowExecutionResult["assets"][number]["type"][]>
> = {
  authority_blog: ["title", "outline", "blog_draft", "cta", "seo_notes", "hook_set"],
  blog_generation: ["title", "outline", "blog_draft", "cta", "seo_notes", "hook_set"],
  transcript_to_content: ["hook_set", "title", "caption_set"],
};

/**
 * Validates a workflow context using the shared schema plus starter business rules.
 */
export const validateContext = (input: unknown): ValidationReport => {
  const checks: ValidationCheck[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const parsed = ContextBundleSchema.safeParse(input);

  if (!parsed.success) {
    errors.push(...formatZodIssues(parsed.error));
    checks.push({
      name: "schema_compliance",
      status: "fail",
      notes: "Context bundle did not match the expected schema.",
    });

    return { ok: false, errors, warnings, checks };
  }

  const context = parsed.data;
  checks.push({ name: "schema_compliance", status: "pass" });

  if (context.sourceMaterials.length === 0) {
    warnings.push("No source materials supplied; output quality may be limited.");
    checks.push({
      name: "source_materials_present",
      status: "warning",
      notes: "Workflow can run, but source materials are empty.",
    });
  } else {
    checks.push({ name: "source_materials_present", status: "pass" });
  }

  const hasBrandName = getString(context.brandDNA, "brandName");
  if (!hasBrandName) {
    warnings.push("Brand DNA is missing a brandName field.");
    checks.push({
      name: "brand_identity_presence",
      status: "warning",
      notes: "Brand DNA is present but only partially populated.",
    });
  } else {
    checks.push({ name: "brand_identity_presence", status: "pass" });
  }

  const hasMessagePillars = getStringArray(context.brandDNA, "messagePillars").length > 0;
  if (!hasMessagePillars) {
    warnings.push("Brand DNA has no messagePillars; messaging consistency may suffer.");
    checks.push({
      name: "message_pillars_presence",
      status: "warning",
      notes: "Add at least one message pillar to improve content direction.",
    });
  } else {
    checks.push({ name: "message_pillars_presence", status: "pass" });
  }

  const hasProofPoints = getStringArray(context.brandDNA, "proofPoints").length > 0;
  if (!hasProofPoints) {
    warnings.push("Brand DNA has no proofPoints; credibility signals are limited.");
    checks.push({
      name: "proof_points_presence",
      status: "warning",
      notes: "Add proof points to improve trust and conversion quality.",
    });
  } else {
    checks.push({ name: "proof_points_presence", status: "pass" });
  }

  return { ok: errors.length === 0, errors, warnings, checks };
};

/**
 * Validates workflow output with schema checks and task-specific completeness rules.
 */
export const validateWorkflowResult = (input: unknown): ValidationReport => {
  const checks: ValidationCheck[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const parsed = WorkflowResultSchema.safeParse(input);

  if (!parsed.success) {
    errors.push(...formatZodIssues(parsed.error));
    checks.push({
      name: "schema_compliance",
      status: "fail",
      notes: "Workflow result did not match the expected schema.",
    });

    return { ok: false, errors, warnings, checks };
  }

  const result = parsed.data;
  checks.push({ name: "schema_compliance", status: "pass" });

  const requiredAssetTypes = REQUIRED_ASSETS_BY_TASK_TYPE[result.taskType] ?? [];
  const missingAssetTypes = requiredAssetTypes.filter(
    (assetType) => !result.assets.some((asset) => asset.type === assetType),
  );

  if (missingAssetTypes.length > 0) {
    errors.push(`Workflow result is missing required assets: ${missingAssetTypes.join(", ")}.`);
    checks.push({
      name: "required_assets",
      status: "fail",
      notes: `Required assets for task type \"${result.taskType}\" were not all present.`,
    });
  } else {
    checks.push({ name: "required_assets", status: "pass" });
  }

  if (result.summary.length < 20) {
    warnings.push("Workflow summary is very short.");
    checks.push({
      name: "summary_quality",
      status: "warning",
      notes: "Consider returning a more descriptive summary.",
    });
  } else {
    checks.push({ name: "summary_quality", status: "pass" });
  }

  return { ok: errors.length === 0, errors, warnings, checks };
};

const formatZodIssues = (error: ZodError): string[] =>
  error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "root";
    return `${path}: ${issue.message}`;
  });

const getString = (record: WorkflowContext["brandDNA"], key: string): string | undefined => {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : undefined;
};

const getStringArray = (record: WorkflowContext["brandDNA"], key: string): string[] => {
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};
