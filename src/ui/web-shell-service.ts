import { BrandRegistry } from "../brands/brand-registry.js";
import { ConversationStore } from "../conversation/conversation-store.js";
import { AssistantSessionStore } from "../core/assistant-session-store.js";
import { DeliverableStore } from "../core/deliverable-store.js";
import { ApiIntegrationRegistry } from "../integrations/api-integration-registry.js";
import { SemanticMemoryStore } from "../memory/semantic-memory-store.js";
import { resolveModelRoute } from "../routing/model-router.js";
import { AgentProfileRegistry } from "../services/runtime/agent-profile-registry.js";
import { AssistantReadinessService } from "../services/runtime/assistant-readiness.js";
import {
  AssistantRuntimeService,
  type AssistantRuntimeMode,
  type AssistantRuntimeResult,
} from "../services/runtime/assistant-runtime.js";
import { AssistantSessionRecorder } from "../services/runtime/assistant-session-recorder.js";
import { ConversationRecorder } from "../services/runtime/conversation-recorder.js";
import { DeliverableLifecycleService } from "../services/runtime/deliverable-lifecycle.js";
import { DeliverableRecorder } from "../services/runtime/deliverable-recorder.js";
import { createScaffoldedToolRegistry } from "../tools/tool-registry.js";
import type { AssistantSessionRecord } from "../types/assistant-session.types.js";
import type { DeliverableRecord } from "../types/deliverable.types.js";
import type {
  UiAgentOption,
  UiAssistantRunRequest,
  UiAssistantRunResponse,
  UiBootstrapPayload,
  UiConversationThreadResponse,
  UiDeliverableActionResponse,
} from "./web-shell-types.js";

export class WebShellService {
  constructor(
    private readonly readinessService = new AssistantReadinessService(),
    private readonly assistantRuntime = new AssistantRuntimeService(),
    private readonly sessionRecorder = new AssistantSessionRecorder(),
    private readonly conversationRecorder = new ConversationRecorder(),
    private readonly deliverableRecorder = new DeliverableRecorder(),
    private readonly deliverableLifecycle = new DeliverableLifecycleService(),
    private readonly conversationStore = new ConversationStore(),
    private readonly sessionStore = new AssistantSessionStore(),
    private readonly deliverableStore = new DeliverableStore(),
    private readonly semanticMemoryStore = new SemanticMemoryStore(),
    private readonly brandRegistry = new BrandRegistry(),
    private readonly integrationRegistry = new ApiIntegrationRegistry(),
    private readonly agentProfileRegistry = new AgentProfileRegistry(),
  ) {}

  async getBootstrap(): Promise<UiBootstrapPayload> {
    const [readiness, brands, history, conversationThreads, deliverables, memoryStats, toolRegistry, integrationRegistry] = await Promise.all([
      this.readinessService.run(),
      this.brandRegistry.listManifests(),
      this.sessionStore.list({ limit: 40 }),
      this.conversationStore.listThreads({ limit: 20 }),
      this.deliverableStore.list({ limit: 30 }),
      this.semanticMemoryStore.getStats(),
      this.getToolRegistrySnapshot(),
      this.integrationRegistry.snapshot(),
    ]);

    const defaultBrandId = brands.find((brand) => brand.defaultBrand)?.brandId ?? brands[0]?.brandId;
    const agentOptions = this.buildAgentOptions(integrationRegistry);

    return {
      readiness,
      brands,
      history,
      conversationThreads,
      deliverables,
      memoryStats,
      toolRegistry,
      integrationRegistry,
      agentOptions,
      ...(defaultBrandId ? { defaultBrandId } : {}),
      defaultAgentId: agentOptions[0]?.id ?? "runtime-default",
      uiCapabilities: {
        fileAttach: "scaffold",
        localPath: "scaffold",
        modelProfileRouting: "enforced",
      },
      notes: [
        "The local web shell reuses the existing assistant runtime and local file-backed stores.",
        "Conversation threads and turns are stored locally under data/conversations and stitched back into runtime prompts with bounded limits.",
        "File attach and local path input are scaffold-level UI controls in this patch.",
        "Brand selection, execution mode, model profiles, and agent profiles now flow into the runtime contract used by the local web shell.",
      ],
    };
  }

  async runAssistant(input: UiAssistantRunRequest): Promise<UiAssistantRunResponse> {
    const task = input.task.trim();
    const executionMode = input.executionMode ?? input.mode ?? "advisory";
    if (!task) {
      return {
        ok: false,
        assistant: this.buildErrorAssistant("UI requests require a non-empty task.", executionMode, input.brandId),
        warnings: [],
        errors: ["UI requests require a non-empty task."],
      };
    }

    const assistant = await this.assistantRuntime.run({
      task,
      mode: executionMode,
      ...(input.brandId ? { brandId: input.brandId } : {}),
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.skillName ? { skillName: input.skillName } : {}),
      ...(input.taskType ? { taskType: input.taskType } : {}),
      ...(input.sourceText ? { sourceText: input.sourceText } : {}),
      ...(input.modelProfileId ? { modelProfileId: input.modelProfileId } : {}),
      ...(input.agentProfileId ? { agentProfileId: input.agentProfileId } : {}),
      ...(input.conversationThreadId ? { conversationThreadId: input.conversationThreadId } : {}),
      ...(input.autoSubmitForApproval ? { autoSubmitForApproval: input.autoSubmitForApproval } : {}),
      sourceCommand: "assistant-ui",
    });

    if (input.localPathHint?.trim()) {
      assistant.warnings.push(
        `Local path hint "${input.localPathHint.trim()}" was captured by the UI but not automatically read in this patch.`,
      );
    }

    const session = await this.safeRecordSession({
      sourceCommand: "assistant-ui",
      mode: assistant.mode,
      task,
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.brandId ? { brandId: input.brandId } : {}),
      launched: true,
      assistant,
      warnings: assistant.warnings,
      errors: assistant.errors,
    });
    await this.safeRecordConversation(task, assistant, session?.sessionId);
    const deliverable = await this.safeRecordDeliverable(assistant, input.autoSubmitForApproval);

    return {
      ok: assistant.ok,
      assistant,
      ...(session ? { session } : {}),
      ...(deliverable ? { deliverable } : {}),
      warnings: assistant.warnings,
      errors: assistant.errors,
    };
  }

  private async getToolRegistrySnapshot(): Promise<UiBootstrapPayload["toolRegistry"]> {
    const registry = createScaffoldedToolRegistry();
    await registry.loadFromDisk();
    return registry.snapshot();
  }

  private buildAgentOptions(
    integrationRegistry: Awaited<ReturnType<ApiIntegrationRegistry["snapshot"]>>,
  ): UiAgentOption[] {
    const defaultRoute = resolveModelRoute("classification");
    const options: UiAgentOption[] = this.agentProfileRegistry.list().map((profile) => ({
      id: profile.profileId,
      label: profile.profileId === "runtime-default"
        ? `${profile.displayName} (${defaultRoute.model})`
        : profile.displayName,
      description: profile.description,
      source: profile.profileId === "runtime-default" ? "runtime-default" : "agent-profile",
      enabled: profile.enabled,
    }));

    for (const profile of integrationRegistry.modelProfiles) {
      options.push({
        id: profile.profileId,
        label: profile.displayName,
        description: `${profile.provider}/${profile.baseModel}${profile.fineTuneReference ? ` | ${profile.fineTuneReference}` : ""}`,
        source: "model-profile",
        enabled: profile.enabled,
      });
    }

    return options;
  }

  private async safeRecordSession(input: {
    sourceCommand: "assistant-ui";
    mode: AssistantRuntimeMode;
    task: string;
    clientId?: string;
    brandId?: string;
    launched: boolean;
    assistant: AssistantRuntimeResult;
    warnings: string[];
    errors: string[];
  }): Promise<AssistantSessionRecord | undefined> {
    try {
      return await this.sessionRecorder.record(input);
    } catch (error) {
      input.warnings.push(
        `Assistant history persistence failed: ${error instanceof Error ? error.message : "Unknown error."}`,
      );
      return undefined;
    }
  }

  private async safeRecordDeliverable(
    assistant: AssistantRuntimeResult,
    autoSubmitForApproval?: boolean,
  ): Promise<DeliverableRecord | undefined> {
    try {
      return await this.deliverableRecorder.recordAssistantResult({
        sourceCommand: "assistant-ui",
        assistant,
        ...(autoSubmitForApproval ? { autoSubmitForApproval } : {}),
      });
    } catch (error) {
      assistant.warnings.push(
        `Deliverable registry persistence failed: ${error instanceof Error ? error.message : "Unknown error."}`,
      );
      return undefined;
    }
  }

  async getConversationThread(threadId: string): Promise<UiConversationThreadResponse> {
    const normalized = threadId.trim();
    if (!normalized) {
      return {
        ok: false,
        turns: [],
        warnings: [],
        errors: ["Conversation thread lookup requires a non-empty thread id."],
      };
    }

    const thread = await this.conversationStore.getThread(normalized);
    if (!thread) {
      return {
        ok: false,
        turns: [],
        warnings: [],
        errors: [`Conversation thread "${normalized}" was not found.`],
      };
    }

    const turns = await this.conversationStore.listTurns({ threadId: normalized, limit: 30 });
    return {
      ok: true,
      thread,
      turns,
      warnings: [],
      errors: [],
    };
  }

  async submitDeliverableForApproval(deliverableId: string, actor?: string, notes?: string): Promise<UiDeliverableActionResponse> {
    return this.toDeliverableActionResponse(
      await this.deliverableLifecycle.submitForApproval({
        deliverableId: deliverableId.trim(),
        ...(actor ? { actor } : {}),
        ...(notes !== undefined ? { notes } : {}),
      }),
    );
  }

  async approveDeliverable(deliverableId: string, actor?: string, notes?: string): Promise<UiDeliverableActionResponse> {
    return this.toDeliverableActionResponse(
      await this.deliverableLifecycle.approveDeliverable({
        deliverableId: deliverableId.trim(),
        ...(actor ? { actor } : {}),
        ...(notes !== undefined ? { notes } : {}),
      }),
    );
  }

  async publishDeliverable(deliverableId: string, actor?: string, notes?: string): Promise<UiDeliverableActionResponse> {
    return this.toDeliverableActionResponse(
      await this.deliverableLifecycle.publishDeliverable({
        deliverableId: deliverableId.trim(),
        ...(actor ? { actor } : {}),
        ...(notes !== undefined ? { notes } : {}),
      }),
    );
  }

  private async safeRecordConversation(
    task: string,
    assistant: AssistantRuntimeResult,
    sessionId?: string,
  ): Promise<void> {
    try {
      await this.conversationRecorder.recordExchange({
        sourceCommand: "assistant-ui",
        task,
        assistant,
        ...(sessionId ? { sessionId } : {}),
      });
    } catch (error) {
      assistant.warnings.push(
        `Conversation persistence failed: ${error instanceof Error ? error.message : "Unknown error."}`,
      );
    }
  }

  private buildErrorAssistant(
    error: string,
    mode: AssistantRuntimeMode,
    brandId?: string,
  ): AssistantRuntimeResult {
    const route = resolveModelRoute("classification");
    return {
      ok: false,
      mode,
      execution: mode,
      clientId: "_template",
      task: "",
      brandContext: {
        ...(brandId?.trim() ? { selectedBrandId: brandId.trim() } : {}),
        resolution: "none",
      },
      executionPolicy: {
        sideEffectsAllowed: false,
        deliverablePersistenceAllowed: false,
        allowedExecutionModes: ["advisory", "orchestrated"],
      },
      skillMatch: {
        candidateSkillNames: [],
        matchedBy: "none",
        allowedTools: [],
      },
      workflowMatch: {
        matchedBy: "none",
      },
      route,
      promptMetadata: {
        systemLength: 0,
        userLength: 0,
      },
      warnings: [],
      errors: [error],
    };
  }

  private toDeliverableActionResponse(
    result: Awaited<ReturnType<DeliverableLifecycleService["submitForApproval"]>>,
  ): UiDeliverableActionResponse {
    return {
      ok: result.ok,
      ...(result.deliverable ? { deliverable: result.deliverable } : {}),
      warnings: result.warnings,
      errors: result.errors,
    };
  }
}
