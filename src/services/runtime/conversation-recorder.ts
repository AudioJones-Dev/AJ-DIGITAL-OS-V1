import { randomUUID } from "node:crypto";

import { ConversationStore } from "../../conversation/conversation-store.js";
import { ConversationThreadRegistry } from "../../conversation/conversation-thread-registry.js";
import { SemanticMemoryIndexer } from "../../memory/semantic-memory-indexer.js";
import type { ConversationSourceCommand, ConversationTurnRecord } from "../../conversation/conversation-types.js";
import type { AssistantRuntimeResult } from "./assistant-runtime.js";

export interface RecordConversationExchangeInput {
  sourceCommand: ConversationSourceCommand;
  task: string;
  assistant: AssistantRuntimeResult;
  sessionId?: string;
  shellSessionId?: string;
  shellSessionLabel?: string;
  turnIndex?: number;
}

export class ConversationRecorder {
  constructor(
    private readonly store = new ConversationStore(),
    private readonly threadRegistry = new ConversationThreadRegistry(),
    private readonly semanticMemoryIndexer = new SemanticMemoryIndexer(),
  ) {}

  async recordExchange(input: RecordConversationExchangeInput): Promise<void> {
    const threadId = input.assistant.conversation?.threadId;
    if (!threadId) {
      return;
    }

    const timestamp = new Date().toISOString();
    const userTurn: ConversationTurnRecord = {
      turnId: randomUUID(),
      threadId,
      createdAt: timestamp,
      role: "user",
      sourceCommand: input.sourceCommand,
      mode: input.assistant.mode,
      ...(input.assistant.clientId ? { clientId: input.assistant.clientId } : {}),
      ...(input.assistant.brandContext.selectedBrandId ? { brandId: input.assistant.brandContext.selectedBrandId } : {}),
      ...(input.assistant.brandContext.brandName ? { brandName: input.assistant.brandContext.brandName } : {}),
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.assistant.workflowMatch.taskType ? { taskType: input.assistant.workflowMatch.taskType } : {}),
      ...(input.assistant.workflowMatch.workflowId ? { selectedWorkflowId: input.assistant.workflowMatch.workflowId } : {}),
      ...(input.assistant.skillMatch.selectedSkillName ? { selectedSkillName: input.assistant.skillMatch.selectedSkillName } : {}),
      ...(input.assistant.agentProfile?.profileId ? { agentProfileId: input.assistant.agentProfile.profileId } : {}),
      ...(input.assistant.modelProfile?.profileId ? { modelProfileId: input.assistant.modelProfile.profileId } : {}),
      status: "recorded",
      content: input.task,
      metadata: {
        shellSessionId: input.shellSessionId,
        shellSessionLabel: input.shellSessionLabel,
        turnIndex: input.turnIndex,
      },
    };

    const assistantTurn: ConversationTurnRecord = {
      turnId: randomUUID(),
      threadId,
      createdAt: timestamp,
      role: "assistant",
      sourceCommand: input.sourceCommand,
      mode: input.assistant.mode,
      ...(input.assistant.clientId ? { clientId: input.assistant.clientId } : {}),
      ...(input.assistant.brandContext.selectedBrandId ? { brandId: input.assistant.brandContext.selectedBrandId } : {}),
      ...(input.assistant.brandContext.brandName ? { brandName: input.assistant.brandContext.brandName } : {}),
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.assistant.orchestration?.runId ? { runId: input.assistant.orchestration.runId } : {}),
      provider: input.assistant.route.provider,
      model: input.assistant.route.model,
      ...(input.assistant.workflowMatch.taskType ? { taskType: input.assistant.workflowMatch.taskType } : {}),
      ...(input.assistant.workflowMatch.workflowId ? { selectedWorkflowId: input.assistant.workflowMatch.workflowId } : {}),
      ...(input.assistant.skillMatch.selectedSkillName ? { selectedSkillName: input.assistant.skillMatch.selectedSkillName } : {}),
      ...(input.assistant.agentProfile?.profileId ? { agentProfileId: input.assistant.agentProfile.profileId } : {}),
      ...(input.assistant.modelProfile?.profileId ? { modelProfileId: input.assistant.modelProfile.profileId } : {}),
      status: input.assistant.ok ? "recorded" : "error",
      content: this.buildAssistantTurnContent(input.assistant),
      metadata: {
        routeReason: input.assistant.route.reason,
        shellSessionId: input.shellSessionId,
        shellSessionLabel: input.shellSessionLabel,
        turnIndex: input.turnIndex,
        ...(input.assistant.stitchedContext
          ? {
              stitchedContext: {
                bundleId: input.assistant.stitchedContext.bundleId,
                sourceCount: input.assistant.stitchedContext.sourceCount,
                recentTurnCount: input.assistant.stitchedContext.recentTurnCount,
              },
            }
          : {}),
      },
    };

    await this.store.saveTurn(userTurn);
    await this.store.saveTurn(assistantTurn);
    await this.safeIndexTurn(userTurn);
    await this.safeIndexTurn(assistantTurn);
    await this.threadRegistry.touchThreadAfterTurn({
      threadId,
      task: input.task,
      ...(input.sessionId ? { sessionId: input.sessionId } : {}),
      ...(input.assistant.orchestration?.runId ? { runId: input.assistant.orchestration.runId } : {}),
      updatedAt: timestamp,
      increment: 2,
    });
  }

  private async safeIndexTurn(turn: ConversationTurnRecord): Promise<void> {
    try {
      await this.semanticMemoryIndexer.indexConversationTurn(turn);
    } catch {
      // Memory indexing is best-effort and must not block conversation persistence.
    }
  }

  private buildAssistantTurnContent(assistant: AssistantRuntimeResult): string {
    if (assistant.advisory) {
      return [
        assistant.advisory.summary,
        "",
        assistant.advisory.response,
        assistant.advisory.nextSteps.length > 0
          ? `Next Steps: ${assistant.advisory.nextSteps.join(" | ")}`
          : "",
        assistant.advisory.risks.length > 0
          ? `Risks: ${assistant.advisory.risks.join(" | ")}`
          : "",
      ].filter((entry) => entry.trim().length > 0).join("\n");
    }

    if (assistant.orchestration) {
      return [
        `Run ID: ${assistant.orchestration.runId}`,
        `Workflow: ${assistant.orchestration.workflowId}`,
        `Status: ${assistant.orchestration.status}`,
        `Approval Status: ${assistant.orchestration.approvalStatus}`,
      ].join("\n");
    }

    if (assistant.errors.length > 0) {
      return assistant.errors.join("\n");
    }

    return assistant.task;
  }
}
