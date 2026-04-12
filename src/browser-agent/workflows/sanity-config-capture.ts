import type { WorkflowJobDefinition } from "../workflow-types.js";

/**
 * Default job definition for sanity-config-capture.
 *
 * Tuned for extracting project/workspace configuration from Sanity Studio
 * or the Sanity management dashboard. Navigate-and-extract only — no
 * destructive actions.
 */
export function createSanityConfigCaptureJob(
  overrides: Partial<WorkflowJobDefinition> = {},
): WorkflowJobDefinition {
  const baseUrl = overrides.configUrl ?? overrides.startUrl ?? "";

  return {
    name: "sanity-config-capture",
    mode: overrides.mode ?? "direct",
    startUrl: overrides.startUrl ?? "",
    configUrl: overrides.configUrl ?? "",
    allowedDomains: overrides.allowedDomains ?? ["sanity.io", "www.sanity.io"],
    targetFields: overrides.targetFields ?? [
      "project_id",
      "organization_id",
      "title",
      "dataset",
    ],
    steps: overrides.steps ?? (baseUrl
      ? [
          { type: "goto" as const, url: baseUrl },
          { type: "extract" as const, fields: ["project_id", "organization_id", "title"] },
          { type: "goto" as const, url: `${baseUrl.replace(/\/$/, "")}/datasets` },
          { type: "extract" as const, fields: ["dataset"], selector: "a[href*='datasets?name=']" },
        ]
      : undefined),
    sessionFile: overrides.sessionFile ?? "",
    outputPrefix: overrides.outputPrefix ?? "sanity-config",
    maxSteps: overrides.maxSteps ?? 15,
    maxRetries: overrides.maxRetries ?? 2,
    authSelector: overrides.authSelector ?? "",
  };
}
