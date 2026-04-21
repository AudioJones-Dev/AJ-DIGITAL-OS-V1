import type { WorkflowJobDefinition } from "./workflow-types.js";

/**
 * Default workflow definition for login-export-config.
 *
 * Override individual fields via CLI flags or a job config file.
 */
export function createLoginExportConfigJob(
  overrides: Partial<WorkflowJobDefinition> = {},
): WorkflowJobDefinition {
  return {
    name: "login-export-config",
    mode: overrides.mode ?? "agent",
    startUrl: overrides.startUrl ?? "",
    configUrl: overrides.configUrl ?? "",
    allowedDomains: overrides.allowedDomains ?? [],
    targetFields: overrides.targetFields ?? [],
    sessionFile: overrides.sessionFile ?? "",
    outputPrefix: overrides.outputPrefix ?? "config-export",
    maxSteps: overrides.maxSteps ?? 25,
    maxRetries: overrides.maxRetries ?? 2,
    authSelector: overrides.authSelector ?? "",
  };
}
