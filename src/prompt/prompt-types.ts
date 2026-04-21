import type { RetrievedContext } from "../memory-runtime/retrieval.js";

// ── Prompt Injection Layer Types ───────────────────────────────────

/** Input for building a retrieval-aware model prompt. */
export interface ModelPromptInput {
  /** Short description of the task for the model. */
  task: string;
  /** Retrieved memory context (from retrieval layer). */
  retrievedContext?: RetrievedContext | undefined;
  /** Raw user/caller input to include in the user section. */
  input: string;
  /** Output schema hint (e.g. "Return ONLY valid JSON"). */
  outputSchema?: string | undefined;
  /** Extra system-level constraints (appended to system section). */
  constraints?: string[] | undefined;
}

/** Structured model prompt with bounded sections. */
export interface ModelPrompt {
  /** System instructions, output schema, constraints. */
  system: string;
  /** Summarized memory context from retrieval. */
  context: string;
  /** Raw task input from the caller. */
  user: string;
}

/** Diagnostics returned alongside the prompt. */
export interface PromptBuildDiagnostics {
  /** Character count per section. */
  sectionChars: {
    system: number;
    context: number;
    user: number;
  };
  /** Total prompt character count. */
  totalChars: number;
  /** Which context sections were populated. */
  sectionsUsed: string[];
  /** Whether any section was truncated. */
  truncated: boolean;
  /** Details of any truncations applied. */
  truncations: string[];
}

/** Full return value from buildModelPrompt(). */
export interface ModelPromptResult {
  prompt: ModelPrompt;
  diagnostics: PromptBuildDiagnostics;
}

/** Budget limits per prompt section. */
export interface PromptBudget {
  /** Max chars for the system section. */
  system: number;
  /** Max chars for the context section. */
  context: number;
  /** Max chars for the user section. */
  user: number;
}

/** Default budget: 12K total (2K system, 6K context, 4K user). */
export const DEFAULT_PROMPT_BUDGET: PromptBudget = {
  system: 2_000,
  context: 6_000,
  user: 4_000,
};
