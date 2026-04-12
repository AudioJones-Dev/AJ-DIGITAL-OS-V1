/**
 * Task mapper — determines the local agent operation mode
 * based on intent and target analysis.
 */

export type AgentMode = "read" | "write" | "patch" | "transform";

export interface TaskMapping {
  mode: AgentMode;
  validationProfile: ValidationProfile;
}

export type ValidationProfile = "env" | "json" | "markdown" | "csv" | "generic";

/**
 * Infer the local agent mode from the task intent and output targets.
 */
export function mapTask(
  intent: string,
  outputTargets: string[],
  inputFiles: string[],
): TaskMapping {
  const intentLower = intent.toLowerCase();

  // Read-only intents
  if (
    intentLower.includes("read") ||
    intentLower.includes("inspect") ||
    intentLower.includes("check")
  ) {
    if (outputTargets.length === 0) {
      return { mode: "read", validationProfile: "generic" };
    }
  }

  // Patch intents
  if (
    intentLower.includes("patch") ||
    intentLower.includes("update") ||
    intentLower.includes("modify")
  ) {
    if (inputFiles.length > 0) {
      return { mode: "patch", validationProfile: inferProfile(outputTargets) };
    }
  }

  // Transform intents
  if (
    intentLower.includes("transform") ||
    intentLower.includes("convert") ||
    intentLower.includes("normalize")
  ) {
    return { mode: "transform", validationProfile: inferProfile(outputTargets) };
  }

  // Default: write
  return { mode: "write", validationProfile: inferProfile(outputTargets) };
}

function inferProfile(targets: string[]): ValidationProfile {
  if (targets.length === 0) return "generic";
  const first = targets[0]!;
  if (first.endsWith(".env")) return "env";
  if (first.endsWith(".json")) return "json";
  if (first.endsWith(".md")) return "markdown";
  if (first.endsWith(".csv")) return "csv";
  return "generic";
}
