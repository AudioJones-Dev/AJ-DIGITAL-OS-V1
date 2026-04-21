export type ConversationThreadStatus = "active" | "archived";
export type ConversationTurnRole = "user" | "assistant" | "system";
export type ConversationSourceCommand =
  | "assistant"
  | "assistant-start"
  | "assistant-shell"
  | "assistant-ui";
export type ContextSourceKind =
  | "current_task"
  | "conversation_turn"
  | "brand_context"
  | "session_metadata"
  | "deliverable_metadata"
  | "semantic_memory";

export interface ConversationThreadRecord {
  threadId: string;
  title: string;
  sourceCommand: ConversationSourceCommand;
  status: ConversationThreadStatus;
  clientId?: string | undefined;
  brandId?: string | undefined;
  brandName?: string | undefined;
  createdAt: string;
  updatedAt: string;
  lastTurnAt?: string | undefined;
  turnCount: number;
  latestSessionId?: string | undefined;
  latestRunId?: string | undefined;
  latestUserTask?: string | undefined;
  shellSessionId?: string | undefined;
  shellSessionLabel?: string | undefined;
  metadata: Record<string, unknown>;
}

export interface ConversationTurnRecord {
  turnId: string;
  threadId: string;
  createdAt: string;
  role: ConversationTurnRole;
  sourceCommand: ConversationSourceCommand;
  mode: string;
  clientId?: string | undefined;
  brandId?: string | undefined;
  brandName?: string | undefined;
  sessionId?: string | undefined;
  runId?: string | undefined;
  model?: string | undefined;
  provider?: string | undefined;
  taskType?: string | undefined;
  selectedWorkflowId?: string | undefined;
  selectedSkillName?: string | undefined;
  agentProfileId?: string | undefined;
  modelProfileId?: string | undefined;
  status: "recorded" | "error";
  content: string;
  metadata: Record<string, unknown>;
}

export interface ContextSourceMetadata {
  sourceId: string;
  kind: ContextSourceKind;
  label: string;
  createdAt?: string | undefined;
  threadId?: string | undefined;
  turnId?: string | undefined;
  sessionId?: string | undefined;
  deliverableId?: string | undefined;
  chunkId?: string | undefined;
  characterCount: number;
  included: boolean;
  truncated: boolean;
  metadata: Record<string, unknown>;
}

export interface StitchedContextBundle {
  bundleId: string;
  createdAt: string;
  threadId?: string | undefined;
  maxRecentTurns: number;
  maxCharacters: number;
  totalCharacters: number;
  truncated: boolean;
  semanticQuery?: string | undefined;
  semanticResultCount?: number | undefined;
  semanticSelectedCount?: number | undefined;
  sources: ContextSourceMetadata[];
  sourceMaterials: Array<Record<string, unknown>>;
}
