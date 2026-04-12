export type AssistantSessionSourceCommand = "assistant" | "assistant-start" | "assistant-shell" | "assistant-ui";
export type AssistantSessionStatus = "succeeded" | "failed" | "blocked";

export interface AssistantSessionRouteSummary {
  provider: string;
  model: string;
  reason?: string | undefined;
}

export interface AssistantSessionRecord {
  sessionId: string;
  timestamp: string;
  sourceCommand: AssistantSessionSourceCommand;
  launched: boolean;
  mode: string;
  execution?: string | undefined;
  task: string;
  clientId?: string | undefined;
  brandId?: string | undefined;
  brandName?: string | undefined;
  brandManifestPath?: string | undefined;
  conversationThreadId?: string | undefined;
  shellSessionId?: string | undefined;
  shellSessionLabel?: string | undefined;
  turnIndex?: number | undefined;
  selectedSkillName?: string | undefined;
  selectedWorkflowId?: string | undefined;
  modelProfileId?: string | undefined;
  modelProfileName?: string | undefined;
  agentProfileId?: string | undefined;
  agentProfileName?: string | undefined;
  route?: AssistantSessionRouteSummary | undefined;
  ok: boolean;
  status: AssistantSessionStatus;
  warnings: string[];
  errors: string[];
  runId?: string | undefined;
}
