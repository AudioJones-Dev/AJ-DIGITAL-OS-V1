import { randomUUID } from "node:crypto";

import { AssistantSessionStore } from "../../core/assistant-session-store.js";
import type { AssistantRuntimeMode, AssistantRuntimeResult } from "./assistant-runtime.js";
import type {
  AssistantSessionRecord,
  AssistantSessionSourceCommand,
  AssistantSessionStatus,
} from "../../types/assistant-session.types.js";

export interface RecordAssistantSessionInput {
  sourceCommand: AssistantSessionSourceCommand;
  mode: AssistantRuntimeMode;
  task: string;
  clientId?: string;
  brandId?: string;
  brandName?: string;
  brandManifestPath?: string;
  shellSessionId?: string;
  shellSessionLabel?: string;
  turnIndex?: number;
  launched: boolean;
  warnings: string[];
  errors: string[];
  assistant?: AssistantRuntimeResult;
}

export class AssistantSessionRecorder {
  constructor(private readonly sessionStore = new AssistantSessionStore()) {}

  async record(input: RecordAssistantSessionInput): Promise<AssistantSessionRecord> {
    const timestamp = new Date().toISOString();
    const assistant = input.assistant;
    const session: AssistantSessionRecord = {
      sessionId: randomUUID(),
      timestamp,
      sourceCommand: input.sourceCommand,
      launched: input.launched,
      mode: assistant?.mode ?? input.mode,
      ...(assistant?.execution ? { execution: assistant.execution } : {}),
      task: assistant?.task ?? input.task,
      ...(assistant?.clientId || input.clientId ? { clientId: assistant?.clientId ?? input.clientId } : {}),
      ...(assistant?.brandContext.selectedBrandId || input.brandId
        ? { brandId: assistant?.brandContext.selectedBrandId ?? input.brandId }
        : {}),
      ...(assistant?.brandContext.brandName || input.brandName
        ? { brandName: assistant?.brandContext.brandName ?? input.brandName }
        : {}),
      ...(assistant?.brandContext.manifestPath || input.brandManifestPath
        ? { brandManifestPath: assistant?.brandContext.manifestPath ?? input.brandManifestPath }
        : {}),
      ...(assistant?.conversation?.threadId
        ? { conversationThreadId: assistant.conversation.threadId }
        : {}),
      ...(input.shellSessionId ? { shellSessionId: input.shellSessionId } : {}),
      ...(input.shellSessionLabel ? { shellSessionLabel: input.shellSessionLabel } : {}),
      ...(typeof input.turnIndex === "number" ? { turnIndex: input.turnIndex } : {}),
      ...(assistant?.skillMatch.selectedSkillName ? { selectedSkillName: assistant.skillMatch.selectedSkillName } : {}),
      ...(assistant?.workflowMatch.workflowId || assistant?.skillMatch.selectedWorkflowId
        ? { selectedWorkflowId: assistant?.workflowMatch.workflowId ?? assistant?.skillMatch.selectedWorkflowId }
        : {}),
      ...(assistant?.modelProfile?.profileId ? { modelProfileId: assistant.modelProfile.profileId } : {}),
      ...(assistant?.modelProfile?.displayName ? { modelProfileName: assistant.modelProfile.displayName } : {}),
      ...(assistant?.agentProfile?.profileId ? { agentProfileId: assistant.agentProfile.profileId } : {}),
      ...(assistant?.agentProfile?.displayName ? { agentProfileName: assistant.agentProfile.displayName } : {}),
      ...(assistant?.route
        ? {
            route: {
              provider: assistant.route.provider,
              model: assistant.route.model,
              ...(assistant.route.reason ? { reason: assistant.route.reason } : {}),
            },
          }
        : {}),
      ok: assistant?.ok ?? false,
      status: this.resolveStatus(input.launched, assistant?.ok ?? false),
      warnings: [...input.warnings],
      errors: [...input.errors],
      ...(assistant?.orchestration?.runId ? { runId: assistant.orchestration.runId } : {}),
    };

    return this.sessionStore.save(session);
  }

  private resolveStatus(launched: boolean, ok: boolean): AssistantSessionStatus {
    if (!launched) {
      return "blocked";
    }

    return ok ? "succeeded" : "failed";
  }
}
