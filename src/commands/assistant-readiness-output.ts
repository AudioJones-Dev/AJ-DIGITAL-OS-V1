import type { AssistantReadinessResult } from "../services/runtime/assistant-readiness.js";

export const renderAssistantReadiness = (
  title: string,
  readiness: AssistantReadinessResult,
): void => {
  console.log(title);
  console.log("=".repeat(title.length));
  console.log(`Status: ${readiness.ok ? "ready" : "not-ready"}`);
  console.log(`Provider Scope: ${readiness.supportedProviderScope}`);
  console.log(`Active Provider: ${readiness.activeProvider}`);
  console.log(`Enabled Providers: ${readiness.enabledProviders.join(", ")}`);
  console.log(`Ollama Base URL: ${readiness.baseUrl}`);
  console.log(`Requested Model: ${readiness.requestedModel}`);
  console.log(`Available Models: ${readiness.availableModels.length > 0 ? readiness.availableModels.join(", ") : "-"}`);
  console.log(`Ollama Executable: ${readiness.executablePath ?? "-"}`);
  console.log(`Build Output: ${readiness.buildOutputPath}`);

  if (readiness.initializedDirectories.length > 0) {
    console.log("");
    console.log("Initialized Directories");
    for (const directoryPath of readiness.initializedDirectories) {
      console.log(`- ${directoryPath}`);
    }
  }

  console.log("");
  console.log("Checks");
  for (const check of readiness.checks) {
    console.log(`- [${check.status.toUpperCase()}] ${check.message}`);
  }

  if (readiness.limitations.length > 0) {
    console.log("");
    console.log("Current Limitations");
    for (const limitation of readiness.limitations) {
      console.log(`- ${limitation}`);
    }
  }

  if (readiness.nextSteps.length > 0) {
    console.log("");
    console.log("Next Steps");
    for (const nextStep of readiness.nextSteps) {
      console.log(`- ${nextStep}`);
    }
  }

  if (readiness.warnings.length > 0) {
    console.log("");
    console.log("Warnings");
    for (const warning of readiness.warnings) {
      console.log(`- ${warning}`);
    }
  }

  if (readiness.errors.length > 0) {
    console.log("");
    console.log("Errors");
    for (const error of readiness.errors) {
      console.log(`- ${error}`);
    }
  }
};

export const printJson = (payload: unknown): void => {
  console.log(JSON.stringify(payload, null, 2));
};
