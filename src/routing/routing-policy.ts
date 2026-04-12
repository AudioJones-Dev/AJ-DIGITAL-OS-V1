export interface RoutingDecision {
  provider: string;
  model: string;
  reason: string;
}

export interface RoutingOverride {
  provider: string;
  model: string;
  reason: string;
}

export interface RoutingSelectionOptions {
  override?: RoutingOverride;
}

const getDefaultOllamaModel = (): string => {
  const overrideModel = process.env.OLLAMA_MODEL?.trim();
  return overrideModel && overrideModel.length > 0 ? overrideModel : "llama3.1:8b";
};

export const selectRoute = (taskType: string, options: RoutingSelectionOptions = {}): RoutingDecision => {
  if (options.override) {
    return {
      provider: options.override.provider,
      model: options.override.model,
      reason: options.override.reason,
    };
  }

  const defaultOllamaModel = getDefaultOllamaModel();

  switch (taskType) {
    case "transcript_to_content":
      return {
        provider: "ollama",
        model: defaultOllamaModel,
        reason: "Local model is the default starting point for transcript repurposing tasks.",
      };
    case "blog_generation":
    case "authority_blog":
      return {
        provider: "ollama",
        model: defaultOllamaModel,
        reason: "Local model is sufficient for first-pass authority drafting in the scaffold.",
      };
    case "formatting":
    case "classification":
    case "extraction":
      return {
        provider: "ollama",
        model: defaultOllamaModel,
        reason: "Local model is sufficient for low-risk structured tasks.",
      };
    default:
      return {
        provider: "ollama",
        model: defaultOllamaModel,
        reason: "Defaulting to the local model until provider routing expands beyond the scaffold.",
      };
  }
};
