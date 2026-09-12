// DECOY: code-like content under an otherwise unenumerated dot-directory.
export interface AgentDraft {
  id: string;
  enabled: boolean;
}

export const abandonedDraft: AgentDraft = {
  id: "fixture-only",
  enabled: false,
};
