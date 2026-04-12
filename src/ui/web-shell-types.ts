import type { BrandManifest } from "../brands/brand-manifest-types.js";
import type { ConversationThreadRecord, ConversationTurnRecord } from "../conversation/conversation-types.js";
import type { ApiIntegrationRegistrySnapshot } from "../integrations/api-integration-registry.js";
import type { SemanticMemoryStats } from "../memory/semantic-memory-types.js";
import type { AssistantReadinessResult } from "../services/runtime/assistant-readiness.js";
import type { AssistantRuntimeMode, AssistantRuntimeResult } from "../services/runtime/assistant-runtime.js";
import type { ToolRegistrySnapshot } from "../tools/tool-types.js";
import type { AssistantSessionRecord } from "../types/assistant-session.types.js";
import type { DeliverableRecord } from "../types/deliverable.types.js";

export interface UiAgentOption {
  id: string;
  label: string;
  description: string;
  source: "runtime-default" | "agent-profile" | "model-profile";
  enabled: boolean;
}

export interface UiBootstrapPayload {
  readiness: AssistantReadinessResult;
  brands: BrandManifest[];
  history: AssistantSessionRecord[];
  conversationThreads: ConversationThreadRecord[];
  deliverables: DeliverableRecord[];
  memoryStats: SemanticMemoryStats;
  toolRegistry: ToolRegistrySnapshot;
  integrationRegistry: ApiIntegrationRegistrySnapshot;
  agentOptions: UiAgentOption[];
  defaultBrandId?: string | undefined;
  defaultAgentId: string;
  uiCapabilities: {
    fileAttach: "scaffold";
    localPath: "scaffold";
    modelProfileRouting: "scaffold" | "enforced";
  };
  notes: string[];
}

export interface UiAssistantRunRequest {
  task: string;
  mode?: AssistantRuntimeMode;
  executionMode?: AssistantRuntimeMode;
  brandId?: string;
  clientId?: string;
  skillName?: string;
  taskType?: string;
  sourceText?: string;
  modelProfileId?: string;
  agentProfileId?: string;
  conversationThreadId?: string;
  localPathHint?: string;
  autoSubmitForApproval?: boolean;
}

export interface UiDeliverableActionRequest {
  deliverableId: string;
  actor?: string;
  notes?: string;
}

export interface UiConversationThreadResponse {
  ok: boolean;
  thread?: ConversationThreadRecord | undefined;
  turns: ConversationTurnRecord[];
  warnings: string[];
  errors: string[];
}

export interface UiAssistantRunResponse {
  ok: boolean;
  assistant: AssistantRuntimeResult;
  session?: AssistantSessionRecord | undefined;
  deliverable?: DeliverableRecord | undefined;
  warnings: string[];
  errors: string[];
}

export interface UiDeliverableActionResponse {
  ok: boolean;
  deliverable?: DeliverableRecord | undefined;
  warnings: string[];
  errors: string[];
}
