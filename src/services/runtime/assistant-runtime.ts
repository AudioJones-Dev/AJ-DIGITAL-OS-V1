import { randomUUID } from "node:crypto";

import { loadContextBundle } from "../../agents/context-loader.agent.js";
import { BrandRegistry } from "../../brands/brand-registry.js";
import type { BrandContext } from "../../brands/brand-context.js";
import { ConversationStore } from "../../conversation/conversation-store.js";
import { ConversationThreadRegistry } from "../../conversation/conversation-thread-registry.js";
import { ContextStitcher } from "../../conversation/context-stitcher.js";
import type { ConversationSourceCommand, ConversationThreadRecord } from "../../conversation/conversation-types.js";
import { ApiIntegrationRegistry } from "../../integrations/api-integration-registry.js";
import type { ModelProfileRecord } from "../../integrations/model-profile-types.js";
import { orchestrateTask } from "../../agents/orchestrator.agent.js";
import { retrieveRelevantMemorySummary } from "../../memory/memory-retriever.js";
import { buildPrompt } from "../../prompt/prompt-builder.js";
import { createProviderRegistry } from "../../providers/index.js";
import { createScaffoldedToolRegistry } from "../../tools/tool-registry.js";
import type { ToolDescriptor, ToolRegistrySnapshot } from "../../tools/tool-types.js";
import { resolveModelRoute } from "../../routing/model-router.js";
import { SkillExecutor } from "../../skills/skill-executor.js";
import { SkillLoader } from "../../skills/skill-loader.js";
import { SkillRegistry } from "../../skills/skill-registry.js";
import type { SkillDefinition, SkillExecutionPlan } from "../../skills/skill-types.js";
import { parseModelOutputObject } from "../../workflows/model-output-parser.js";
import { createDefaultWorkflowRegistry } from "../../workflows/workflow-registry.js";
import { AgentProfileRegistry } from "./agent-profile-registry.js";
import type { AgentProfileRecord } from "./agent-profile-types.js";

export type AssistantRuntimeMode = "advisory" | "orchestrated";
export type AssistantExecutionDisposition = "advisory" | "orchestrated";

export interface AssistantRuntimeInput {
  task: string;
  clientId?: string;
  brandId?: string;
  sourceCommand?: ConversationSourceCommand;
  conversationThreadId?: string;
  skillName?: string;
  mode?: AssistantRuntimeMode;
  agentProfileId?: string;
  modelProfileId?: string;
  taskType?: string;
  sourceText?: string;
  autoSubmitForApproval?: boolean;
}

export interface AssistantRouteSummary {
  provider: string;
  model: string;
  reason: string;
}

export interface AssistantSkillMatch {
  selectedSkillName?: string;
  selectedWorkflowId?: string;
  candidateSkillNames: string[];
  matchedBy: "requested" | "trigger" | "none";
  approvalRequired?: boolean;
  allowedTools: string[];
}

export interface AssistantWorkflowMatch {
  workflowId?: string;
  taskType?: string;
  matchedBy: "requested_task_type" | "skill" | "heuristic" | "none";
}

export interface AssistantAdvisoryPayload {
  summary: string;
  response: string;
  nextSteps: string[];
  risks: string[];
}

export interface AssistantOrchestrationPayload {
  runId: string;
  workflowId: string;
  status: string;
  approvalRequired: boolean;
  approvalStatus: string;
  warnings: string[];
  errors: string[];
}

export interface AssistantBrandContextSummary {
  selectedBrandId?: string;
  brandName?: string;
  clientId?: string;
  manifestPath?: string;
  resolution: "explicit" | "default" | "none";
  voice?: {
    tone: string[];
    styleNotes: string[];
    preferredCtas: string[];
    bannedPhrases: string[];
  };
  contentRules?: {
    requiredDisclaimers: string[];
    forbiddenClaims: string[];
    formattingRules: string[];
  };
  outputDirectories?: {
    brandRoot: string;
    drafts: string;
    pending: string;
    approved: string;
    published: string;
  };
  approvalPolicy?: {
    mode: string;
    approverRoles: string[];
    approverChannels: string[];
  };
  publishPolicy?: {
    mode: string;
    defaultTarget: string;
    allowedTargets: string[];
    pathStrategy: string;
  };
}

export interface AssistantModelProfileSummary {
  profileId: string;
  displayName: string;
  provider: string;
  modelReference: string;
  appliedModel: string;
  selectionReason: string;
  fineTuneReference?: string;
}

export interface AssistantAgentProfileSummary {
  profileId: string;
  displayName: string;
  allowedToolNames: string[];
  allowedCapabilityIds: string[];
  allowedExecutionModes: AssistantRuntimeMode[];
}

export interface AssistantExecutionPolicySummary {
  sideEffectsAllowed: boolean;
  deliverablePersistenceAllowed: boolean;
  allowedExecutionModes: AssistantRuntimeMode[];
}

export interface AssistantConversationSummary {
  threadId: string;
  title: string;
  resolution: "created" | "existing";
  turnCount: number;
  sourceCommand: ConversationSourceCommand;
  lastTurnAt?: string;
}

export interface AssistantStitchedContextSummary {
  bundleId: string;
  threadId?: string;
  sourceCount: number;
  recentTurnCount: number;
  sessionSourceCount: number;
  deliverableSourceCount: number;
  semanticSourceCount: number;
  maxRecentTurns: number;
  maxCharacters: number;
  totalCharacters: number;
  truncated: boolean;
}

export interface AssistantSemanticMemorySummary {
  query: string;
  resultCount: number;
  selectedCount: number;
  sources: Array<{
    chunkId: string;
    memoryId?: string;
    label: string;
    sourceType?: string;
    score?: number;
    deliverableId?: string;
  }>;
}

export interface AssistantRuntimeResult {
  ok: boolean;
  mode: AssistantRuntimeMode;
  execution: AssistantExecutionDisposition;
  clientId: string;
  task: string;
  brandContext: AssistantBrandContextSummary;
  agentProfile?: AssistantAgentProfileSummary;
  modelProfile?: AssistantModelProfileSummary;
  executionPolicy: AssistantExecutionPolicySummary;
  conversation?: AssistantConversationSummary;
  stitchedContext?: AssistantStitchedContextSummary;
  semanticMemory?: AssistantSemanticMemorySummary;
  skillMatch: AssistantSkillMatch;
  workflowMatch: AssistantWorkflowMatch;
  route: AssistantRouteSummary;
  promptMetadata: {
    systemLength: number;
    userLength: number;
  };
  advisory?: AssistantAdvisoryPayload;
  orchestration?: AssistantOrchestrationPayload;
  warnings: string[];
  errors: string[];
}

interface ResolvedWorkflowTarget {
  workflowId: string;
  taskType: string;
  matchedBy: AssistantWorkflowMatch["matchedBy"];
}

interface ResolvedSkillSelection {
  skill?: SkillDefinition;
  matchedBy: AssistantSkillMatch["matchedBy"];
}

interface ResolvedModelProfileSelection {
  profile: ModelProfileRecord;
  appliedModel: string;
  selectionReason: string;
}

interface ResolvedAgentTooling {
  allowedTools: string[];
  allowedCapabilityIds: string[];
}

const ADVISORY_WORKFLOW_ID = "assistant.advisory.v1";
const DEFAULT_CLIENT_ID = "_template";
const ADVISORY_TASK_TYPE = "classification";

/**
 * Narrow assistant runtime layer that stays local-first and routes governed work
 * through the existing orchestration flow.
 */
export class AssistantRuntimeService {
  constructor(
    private readonly skillLoader = new SkillLoader(),
    private readonly skillRegistry = new SkillRegistry(),
    private readonly skillExecutor = new SkillExecutor(),
    private readonly workflowRegistry = createDefaultWorkflowRegistry(),
    private readonly providerRegistry = createProviderRegistry(),
    private readonly brandRegistry = new BrandRegistry(),
    private readonly integrationRegistry = new ApiIntegrationRegistry(),
    private readonly agentProfileRegistry = new AgentProfileRegistry(),
    private readonly conversationStore = new ConversationStore(),
    private readonly conversationThreadRegistry = new ConversationThreadRegistry(),
    private readonly contextStitcher = new ContextStitcher(),
  ) {}

  async run(input: AssistantRuntimeInput): Promise<AssistantRuntimeResult> {
    const task = input.task.trim();
    const mode = input.mode ?? "advisory";
    const sourceCommand = input.sourceCommand ?? "assistant";
    const warnings: string[] = [];
    const errors: string[] = [];
    const brandContext = await this.resolveBrandContext(input.brandId, warnings, errors);
    const clientId = input.clientId?.trim() || brandContext?.clientId || DEFAULT_CLIENT_ID;
    const brandSummary = this.toBrandSummary(brandContext, input.brandId);
    const agentProfile = this.resolveAgentProfile(input.agentProfileId, warnings, errors);
    const executionPolicy = this.resolveExecutionPolicy(mode, agentProfile);
    const toolRegistry = await this.loadToolRegistry(warnings);
    const modelProfile = await this.resolveModelProfile(
      input.modelProfileId,
      brandContext,
      input.taskType,
      mode,
      warnings,
      errors,
    );
    const threadResolution = task
      ? await this.resolveConversationThread({
          ...(input.conversationThreadId ? { requestedThreadId: input.conversationThreadId } : {}),
          sourceCommand,
          task,
          clientId,
          ...(brandContext ? { brandContext } : {}),
          warnings,
          errors,
        })
      : undefined;
    const stitchedContextBundle = task && threadResolution
      ? await this.buildStitchedContext({
          thread: threadResolution.thread,
          task,
          mode,
          clientId,
          ...(brandContext ? { brandContext } : {}),
          warnings,
        })
      : undefined;

    if (!task) {
      return {
        ok: false,
        mode,
        execution: mode,
        clientId,
        task,
        brandContext: brandSummary,
        ...(agentProfile ? { agentProfile: this.toAgentProfileSummary(agentProfile) } : {}),
        ...(modelProfile ? { modelProfile: this.toModelProfileSummary(modelProfile) } : {}),
        executionPolicy,
        ...(threadResolution ? { conversation: this.toConversationSummary(threadResolution) } : {}),
        skillMatch: {
          candidateSkillNames: [],
          matchedBy: "none",
          allowedTools: [],
        },
        workflowMatch: {
          matchedBy: "none",
        },
        route: resolveModelRoute(ADVISORY_TASK_TYPE),
        promptMetadata: {
          systemLength: 0,
          userLength: 0,
        },
        warnings,
        errors: ["Assistant runtime requires a non-empty task."],
      };
    }

    if (errors.length > 0) {
      return this.buildResult({
        ok: false,
        mode,
        execution: mode,
        clientId,
        task,
        brandSummary,
        ...(agentProfile ? { agentProfile } : {}),
        ...(modelProfile ? { modelProfile } : {}),
        executionPolicy,
        ...(threadResolution ? { conversation: threadResolution } : {}),
        skillMatchedBy: "none",
        route: this.resolveRoute(input.taskType ?? ADVISORY_TASK_TYPE, modelProfile),
        promptMetadata: { systemLength: 0, userLength: 0 },
        warnings,
        errors,
      });
    }

    if (!executionPolicy.allowedExecutionModes.includes(mode)) {
      return this.buildResult({
        ok: false,
        mode,
        execution: mode,
        clientId,
        task,
        brandSummary,
        ...(agentProfile ? { agentProfile } : {}),
        ...(modelProfile ? { modelProfile } : {}),
        executionPolicy,
        ...(threadResolution ? { conversation: threadResolution } : {}),
        skillMatchedBy: "none",
        route: this.resolveRoute(input.taskType ?? ADVISORY_TASK_TYPE, modelProfile),
        promptMetadata: { systemLength: 0, userLength: 0 },
        warnings,
        errors: [
          ...errors,
          agentProfile
            ? `Agent profile "${agentProfile.displayName}" does not allow ${mode} execution.`
            : `Execution mode "${mode}" is not allowed by the active runtime profile.`,
        ],
      });
    }

    const skills = await this.loadSkills(warnings);
    const selectedSkillSelection = this.resolveSkill(skills, task, input.skillName, warnings);
    const selectedSkill = selectedSkillSelection.skill;
    const skillPlan = selectedSkill
      ? this.skillExecutor.prepare({
          skill: selectedSkill,
          objective: task,
          context: {
            clientId,
            ...(input.sourceText ? { sourceText: input.sourceText } : {}),
          },
        })
      : undefined;

    const workflowTarget = this.resolveWorkflowTarget(task, input.taskType, selectedSkill, warnings);
    const routeTaskType = workflowTarget?.taskType ?? ADVISORY_TASK_TYPE;
    const route = this.resolveRoute(routeTaskType, modelProfile);
    const tooling = this.resolveAgentTooling(
      skillPlan?.allowedTools ?? [],
      toolRegistry,
      agentProfile,
      warnings,
    );

    if (mode === "orchestrated") {
      if (!workflowTarget) {
        return this.buildResult({
          ok: false,
          mode,
          execution: "orchestrated",
          clientId,
          task,
          brandSummary,
          ...(agentProfile ? { agentProfile } : {}),
          ...(modelProfile ? { modelProfile } : {}),
          executionPolicy,
          ...(threadResolution ? { conversation: threadResolution } : {}),
          ...(stitchedContextBundle ? { stitchedContext: stitchedContextBundle } : {}),
          ...(selectedSkill ? { selectedSkill } : {}),
          skillMatchedBy: selectedSkillSelection.matchedBy,
          ...(skillPlan ? { skillPlan } : {}),
          tooling,
          route,
          promptMetadata: { systemLength: 0, userLength: 0 },
          warnings,
          errors: [...errors, "No governed workflow could be resolved for orchestrated mode."],
        });
      }

      const sourceMaterials = this.buildSourceMaterials(input.sourceText, skillPlan);
      if (stitchedContextBundle) {
        sourceMaterials.push(...stitchedContextBundle.sourceMaterials);
      }
      if (brandContext) {
        sourceMaterials.push(this.buildBrandSourceMaterial(brandContext));
      }
      const orchestration = await orchestrateTask({
        taskType: workflowTarget.taskType,
        objective: task,
        clientId,
        approvalRequired: selectedSkill?.approvalRequired ?? true,
        sourceMaterials,
        constraints: {
          assistantMode: mode,
          allowedTools: tooling.allowedTools,
          allowedCapabilities: tooling.allowedCapabilityIds,
          ...(stitchedContextBundle
            ? {
                stitchedContextBundleId: stitchedContextBundle.bundleId,
                stitchedContextCharacters: stitchedContextBundle.totalCharacters,
              }
            : {}),
        },
        metadata: {
          assistantRuntime: true,
          ...(brandContext ? this.buildBrandMetadata(brandContext) : {}),
          ...(selectedSkill ? { assistantSkill: selectedSkill.name } : {}),
          ...(agentProfile ? this.buildAgentMetadata(agentProfile) : {}),
          ...(modelProfile ? this.buildModelProfileMetadata(modelProfile) : {}),
          ...(threadResolution ? this.buildConversationMetadata(threadResolution.thread) : {}),
          ...(stitchedContextBundle ? this.buildStitchedContextMetadata(stitchedContextBundle) : {}),
        },
      });

      const orchestrationWarnings = [...warnings, ...orchestration.warnings];
      const orchestrationErrors = [...errors, ...orchestration.errors];

      return this.buildResult({
        ok: orchestration.ok,
        mode,
        execution: "orchestrated",
        clientId,
        task,
        brandSummary,
        ...(agentProfile ? { agentProfile } : {}),
        ...(modelProfile ? { modelProfile } : {}),
        executionPolicy,
        ...(threadResolution ? { conversation: threadResolution } : {}),
        ...(stitchedContextBundle ? { stitchedContext: stitchedContextBundle } : {}),
        ...(selectedSkill ? { selectedSkill } : {}),
        skillMatchedBy: selectedSkillSelection.matchedBy,
        ...(skillPlan ? { skillPlan } : {}),
        tooling,
        workflowTarget,
        route,
        promptMetadata: { systemLength: 0, userLength: 0 },
        ...(orchestration.output
          ? {
              orchestration: {
                runId: orchestration.output.runId,
                workflowId: orchestration.output.workflowId,
                status: orchestration.output.status,
                approvalRequired: orchestration.output.approvalRequired,
                approvalStatus: orchestration.output.approvalStatus,
                warnings: orchestration.output.warnings,
                errors: orchestration.output.errors,
              },
            }
          : {}),
        warnings: orchestrationWarnings,
        errors: orchestrationErrors,
      });
    }

    const advisoryOutcome = await this.runAdvisoryMode({
      task,
      clientId,
      ...(brandContext ? { brandContext } : {}),
      ...(agentProfile ? { agentProfile } : {}),
      ...(selectedSkill ? { selectedSkill } : {}),
      ...(skillPlan ? { skillPlan } : {}),
      ...(workflowTarget ? { workflowTarget } : {}),
      routeTaskType,
      route,
      tooling,
      ...(modelProfile ? { modelProfile } : {}),
      ...(threadResolution ? { conversationThread: threadResolution.thread } : {}),
      ...(stitchedContextBundle ? { stitchedContextBundle } : {}),
      ...(input.sourceText ? { sourceText: input.sourceText } : {}),
    });

    return this.buildResult({
      ok: advisoryOutcome.ok,
      mode,
      execution: "advisory",
      clientId,
      task,
      brandSummary,
      ...(agentProfile ? { agentProfile } : {}),
      ...(modelProfile ? { modelProfile } : {}),
      executionPolicy,
      ...(threadResolution ? { conversation: threadResolution } : {}),
      ...(stitchedContextBundle ? { stitchedContext: stitchedContextBundle } : {}),
      ...(selectedSkill ? { selectedSkill } : {}),
      skillMatchedBy: selectedSkillSelection.matchedBy,
      ...(skillPlan ? { skillPlan } : {}),
      tooling,
      ...(workflowTarget ? { workflowTarget } : {}),
      route,
      promptMetadata: advisoryOutcome.promptMetadata,
      ...(advisoryOutcome.advisory ? { advisory: advisoryOutcome.advisory } : {}),
      warnings: [...warnings, ...advisoryOutcome.warnings],
      errors: [...errors, ...advisoryOutcome.errors],
    });
  }

  private async runAdvisoryMode(input: {
    task: string;
    clientId: string;
    brandContext?: BrandContext;
    agentProfile?: AgentProfileRecord;
    conversationThread?: ConversationThreadRecord;
    selectedSkill?: SkillDefinition;
    skillPlan?: SkillExecutionPlan;
    workflowTarget?: ResolvedWorkflowTarget;
    routeTaskType: string;
    route: AssistantRouteSummary;
    tooling: ResolvedAgentTooling;
    modelProfile?: ResolvedModelProfileSelection;
    stitchedContextBundle?: Awaited<ReturnType<AssistantRuntimeService["buildStitchedContext"]>>;
    sourceText?: string;
  }): Promise<{
    ok: boolean;
    advisory?: AssistantAdvisoryPayload;
    promptMetadata: { systemLength: number; userLength: number };
    warnings: string[];
    errors: string[];
  }> {
    const warnings: string[] = [];
    const errors: string[] = [];
    const pseudoRunId = `assistant-${randomUUID()}`;
    const sourceMaterials = this.buildSourceMaterials(input.sourceText, input.skillPlan);
    if (input.stitchedContextBundle) {
      sourceMaterials.push(...input.stitchedContextBundle.sourceMaterials);
    }
    if (input.brandContext) {
      sourceMaterials.push(this.buildBrandSourceMaterial(input.brandContext));
    }
    const contextResponse = await loadContextBundle({
      runId: pseudoRunId,
      taskType: input.routeTaskType,
      objective: this.composeAssistantObjective(input.task, input.skillPlan, input.brandContext),
      clientId: input.clientId,
      sourceMaterials,
      constraints: {
        assistantMode: "advisory",
        allowedTools: input.tooling.allowedTools,
        allowedCapabilities: input.tooling.allowedCapabilityIds,
        ...(input.stitchedContextBundle
          ? {
              stitchedContextBundleId: input.stitchedContextBundle.bundleId,
              stitchedContextCharacters: input.stitchedContextBundle.totalCharacters,
            }
          : {}),
      },
      metadata: {
        assistantRuntime: true,
        ...(input.brandContext ? this.buildBrandMetadata(input.brandContext) : {}),
        ...(input.selectedSkill ? { assistantSkill: input.selectedSkill.name } : {}),
        ...(input.agentProfile ? this.buildAgentMetadata(input.agentProfile) : {}),
        ...(input.modelProfile ? this.buildModelProfileMetadata(input.modelProfile) : {}),
        ...(input.conversationThread ? this.buildConversationMetadata(input.conversationThread) : {}),
        ...(input.stitchedContextBundle ? this.buildStitchedContextMetadata(input.stitchedContextBundle) : {}),
      },
    });

    if (!contextResponse.ok || !contextResponse.output) {
      return {
        ok: false,
        promptMetadata: { systemLength: 0, userLength: 0 },
        warnings: [...warnings, ...contextResponse.warnings],
        errors: [...errors, ...contextResponse.errors],
      };
    }

    warnings.push(...contextResponse.warnings);

    const memorySummary = await retrieveRelevantMemorySummary(input.task);
    const builtPrompt = buildPrompt({
      clientId: input.clientId,
      workflowId: input.workflowTarget?.workflowId ?? ADVISORY_WORKFLOW_ID,
      objective: this.composeAssistantObjective(input.task, input.skillPlan, input.brandContext),
      sourceMaterials: sourceMaterials,
      clientConstraints: contextResponse.output.constraints,
      memorySummary,
      outputContract: [
        "Output contract: return strict JSON with keys `summary`, `response`, `nextSteps`, and `risks`.",
        "`summary` and `response` must be strings.",
        "`nextSteps` and `risks` must each be arrays of strings.",
        "Keep the output practical, operator-oriented, and free of markdown fences.",
      ].join(" "),
    });

    try {
      const provider = this.providerRegistry.get(input.route.provider);
      const generated = await provider.generate({
        model: input.route.model,
        system: builtPrompt.system,
        user: builtPrompt.user,
        responseFormat: "json",
        temperature: 0,
        maxTokens: 900,
        metadata: {
          assistantRuntime: true,
          ...(input.brandContext ? this.buildBrandMetadata(input.brandContext) : {}),
          routeTaskType: input.routeTaskType,
          ...(input.workflowTarget ? { workflowId: input.workflowTarget.workflowId } : {}),
          ...(input.selectedSkill ? { skillName: input.selectedSkill.name } : {}),
          ...(input.agentProfile ? this.buildAgentMetadata(input.agentProfile) : {}),
          ...(input.modelProfile ? this.buildModelProfileMetadata(input.modelProfile) : {}),
          ...(input.conversationThread ? this.buildConversationMetadata(input.conversationThread) : {}),
          ...(input.stitchedContextBundle ? this.buildStitchedContextMetadata(input.stitchedContextBundle) : {}),
        },
      });
      const parsed = parseModelOutputObject(generated.content);

      if (!parsed.ok || !parsed.value) {
        warnings.push(...parsed.warnings);
        return {
          ok: true,
          advisory: {
            summary: "Assistant advisory response returned in unstructured form.",
            response: generated.content.trim(),
            nextSteps: [],
            risks: ["Model output did not fully match the structured advisory contract."],
          },
          promptMetadata: {
            systemLength: builtPrompt.system.length,
            userLength: builtPrompt.user.length,
          },
          warnings,
          errors,
        };
      }

      return {
        ok: true,
        advisory: this.extractAdvisoryPayload(parsed.value),
        promptMetadata: {
          systemLength: builtPrompt.system.length,
          userLength: builtPrompt.user.length,
        },
        warnings: [...warnings, ...parsed.warnings],
        errors,
      };
    } catch (error) {
      return {
        ok: false,
        promptMetadata: {
          systemLength: builtPrompt.system.length,
          userLength: builtPrompt.user.length,
        },
        warnings,
        errors: [
          ...errors,
          error instanceof Error ? error.message : "Unknown assistant advisory runtime error.",
        ],
      };
    }
  }

  private async loadSkills(warnings: string[]): Promise<SkillDefinition[]> {
    try {
      const skills = await this.skillLoader.loadAll();
      this.skillRegistry.registerMany(skills);
      return this.skillRegistry.list();
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Failed to load local skills.");
      return [];
    }
  }

  private resolveSkill(
    skills: SkillDefinition[],
    task: string,
    requestedSkillName: string | undefined,
    warnings: string[],
  ): ResolvedSkillSelection {
    if (requestedSkillName) {
      const skill = skills.find((candidate) => candidate.name === requestedSkillName.trim());
      if (!skill) {
        warnings.push(`Requested skill "${requestedSkillName}" was not found in local skill definitions.`);
        return {
          matchedBy: "none",
        };
      }

      return {
        skill,
        matchedBy: "requested",
      };
    }

    const normalizedTask = task.toLowerCase();
    const scoredSkills = skills
      .map((skill) => ({
        skill,
        score: skill.triggers.reduce((count, trigger) =>
          normalizedTask.includes(trigger.toLowerCase()) ? count + 1 : count,
        0),
      }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score || left.skill.name.localeCompare(right.skill.name));

    return scoredSkills[0]
      ? {
          skill: scoredSkills[0].skill,
          matchedBy: "trigger",
        }
      : {
          matchedBy: "none",
        };
  }

  private resolveWorkflowTarget(
    task: string,
    requestedTaskType: string | undefined,
    selectedSkill: SkillDefinition | undefined,
    warnings: string[],
  ): ResolvedWorkflowTarget | undefined {
    if (requestedTaskType) {
      try {
        const workflow = this.workflowRegistry.resolveByTaskType(requestedTaskType);
        return {
          workflowId: workflow.id,
          taskType: requestedTaskType,
          matchedBy: "requested_task_type",
        };
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : "Requested task type could not be resolved.");
      }
    }

    if (selectedSkill?.workflowId) {
      try {
        const workflow = this.workflowRegistry.resolveById(selectedSkill.workflowId);
        return {
          workflowId: workflow.id,
          taskType: workflow.supportedTaskTypes[0] ?? ADVISORY_TASK_TYPE,
          matchedBy: "skill",
        };
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : "Selected skill workflow could not be resolved.");
      }
    }

    const normalizedTask = task.toLowerCase();
    if (containsAny(normalizedTask, ["transcript", "repurpose", "clips", "captions", "hooks"])) {
      return {
        workflowId: "workflow.transcript_to_content.v1",
        taskType: "transcript_to_content",
        matchedBy: "heuristic",
      };
    }

    if (containsAny(normalizedTask, ["blog", "authority", "thought leadership", "seo", "keyword"])) {
      return {
        workflowId: "blog-authority",
        taskType: "authority_blog",
        matchedBy: "heuristic",
      };
    }

    return undefined;
  }

  private composeAssistantObjective(
    task: string,
    skillPlan: SkillExecutionPlan | undefined,
    brandContext?: BrandContext,
  ): string {
    const sections = [task];

    if (brandContext) {
      sections.push(
        "",
        "Brand execution guidance:",
        `Write for ${brandContext.manifest.displayName}.`,
        `Tone: ${brandContext.manifest.voice.tone.join(", ") || "-"}.`,
        `Style notes: ${brandContext.manifest.voice.styleNotes.join("; ") || "-"}.`,
        `Preferred CTAs: ${brandContext.manifest.voice.preferredCtas.join("; ") || "-"}.`,
        `Avoid banned phrases: ${brandContext.manifest.voice.bannedPhrases.join("; ") || "-"}.`,
        `Required disclaimers: ${brandContext.manifest.contentRules.requiredDisclaimers.join("; ") || "-"}.`,
        `Forbidden claims: ${brandContext.manifest.contentRules.forbiddenClaims.join("; ") || "-"}.`,
        `Formatting rules: ${brandContext.manifest.contentRules.formattingRules.join("; ") || "-"}.`,
      );
    }

    if (skillPlan) {
      sections.push(
        "",
        "Skill guidance:",
        ...skillPlan.promptSections,
      );
    }

    return sections.join("\n");
  }

  private buildSourceMaterials(
    sourceText: string | undefined,
    skillPlan: SkillExecutionPlan | undefined,
  ): Array<Record<string, unknown>> {
    const sourceMaterials: Array<Record<string, unknown>> = [];

    if (sourceText && sourceText.trim().length > 0) {
      sourceMaterials.push({
        title: "assistant-source",
        text: sourceText.trim(),
      });
    }

    if (skillPlan) {
      sourceMaterials.push({
        title: `skill:${skillPlan.skillName}`,
        text: skillPlan.promptSections.join("\n\n"),
      });
    }

    return sourceMaterials;
  }

  private buildBrandSourceMaterial(brandContext: BrandContext): Record<string, unknown> {
    return {
      title: `brand:${brandContext.brandId}`,
      text: [
        `Brand: ${brandContext.manifest.displayName}`,
        `Brand ID: ${brandContext.brandId}`,
        `Audience: ${brandContext.manifest.voice.audience.join(", ") || "-"}`,
        `Tone: ${brandContext.manifest.voice.tone.join(", ") || "-"}`,
        `Style Notes: ${brandContext.manifest.voice.styleNotes.join("; ") || "-"}`,
        `Preferred CTAs: ${brandContext.manifest.voice.preferredCtas.join("; ") || "-"}`,
        `Required Disclaimers: ${brandContext.manifest.contentRules.requiredDisclaimers.join("; ") || "-"}`,
        `Forbidden Claims: ${brandContext.manifest.contentRules.forbiddenClaims.join("; ") || "-"}`,
      ].join("\n"),
    };
  }

  private extractAdvisoryPayload(parsed: Record<string, unknown>): AssistantAdvisoryPayload {
    return {
      summary: this.readFirstString(parsed, ["summary", "overview"]) ?? "Assistant advisory summary unavailable.",
      response: this.readFirstString(parsed, ["response", "answer", "content", "body"]) ?? "Assistant advisory response unavailable.",
      nextSteps: this.readFirstStringList(parsed, ["nextSteps", "next_steps", "actions"]),
      risks: this.readFirstStringList(parsed, ["risks", "riskFlags", "risk_flags"]),
    };
  }

  private buildResult(input: {
    ok: boolean;
    mode: AssistantRuntimeMode;
    execution: AssistantExecutionDisposition;
    clientId: string;
    task: string;
    brandSummary: AssistantBrandContextSummary;
    agentProfile?: AgentProfileRecord;
    modelProfile?: ResolvedModelProfileSelection;
    executionPolicy: AssistantExecutionPolicySummary;
    conversation?: Awaited<ReturnType<AssistantRuntimeService["resolveConversationThread"]>>;
    stitchedContext?: Awaited<ReturnType<AssistantRuntimeService["buildStitchedContext"]>>;
    selectedSkill?: SkillDefinition;
    skillMatchedBy: AssistantSkillMatch["matchedBy"];
    skillPlan?: SkillExecutionPlan;
    tooling?: ResolvedAgentTooling;
    workflowTarget?: ResolvedWorkflowTarget;
    route: AssistantRouteSummary;
    promptMetadata: { systemLength: number; userLength: number };
    advisory?: AssistantAdvisoryPayload;
    orchestration?: AssistantOrchestrationPayload;
    warnings: string[];
    errors: string[];
  }): AssistantRuntimeResult {
    const candidateSkillNames = this.skillRegistry.list().map((skill) => skill.name);
    const semanticMemory = input.stitchedContext ? this.toSemanticMemorySummary(input.stitchedContext) : undefined;

    return {
      ok: input.ok,
      mode: input.mode,
      execution: input.execution,
      clientId: input.clientId,
      task: input.task,
      brandContext: input.brandSummary,
      ...(input.agentProfile ? { agentProfile: this.toAgentProfileSummary(input.agentProfile) } : {}),
      ...(input.modelProfile ? { modelProfile: this.toModelProfileSummary(input.modelProfile) } : {}),
      executionPolicy: input.executionPolicy,
      ...(input.conversation ? { conversation: this.toConversationSummary(input.conversation) } : {}),
      ...(input.stitchedContext ? { stitchedContext: this.toStitchedContextSummary(input.stitchedContext) } : {}),
      ...(semanticMemory ? { semanticMemory } : {}),
      skillMatch: {
        ...(input.selectedSkill ? { selectedSkillName: input.selectedSkill.name } : {}),
        ...(input.selectedSkill?.workflowId ? { selectedWorkflowId: input.selectedSkill.workflowId } : {}),
        candidateSkillNames,
        matchedBy: input.skillMatchedBy,
        ...(input.selectedSkill ? { approvalRequired: input.selectedSkill.approvalRequired } : {}),
        allowedTools: input.tooling?.allowedTools ?? [],
      },
      workflowMatch: input.workflowTarget
        ? {
            workflowId: input.workflowTarget.workflowId,
            taskType: input.workflowTarget.taskType,
            matchedBy: input.workflowTarget.matchedBy,
          }
        : {
            matchedBy: "none",
          },
      route: input.route,
      promptMetadata: input.promptMetadata,
      ...(input.advisory ? { advisory: input.advisory } : {}),
      ...(input.orchestration ? { orchestration: input.orchestration } : {}),
      warnings: input.warnings,
      errors: input.errors,
    };
  }

  private resolveAgentProfile(
    requestedAgentProfileId: string | undefined,
    warnings: string[],
    errors: string[],
  ): AgentProfileRecord {
    const normalized = requestedAgentProfileId?.trim();
    if (!normalized) {
      return this.agentProfileRegistry.getDefault();
    }

    const profile = this.agentProfileRegistry.getById(normalized);
    if (!profile || !profile.enabled) {
      errors.push(`Requested agent profile "${normalized}" is not available in the local runtime scaffold.`);
      return this.agentProfileRegistry.getDefault();
    }

    if (normalized !== "runtime-default") {
      warnings.push(`Agent profile "${profile.displayName}" is active for this run.`);
    }

    return profile;
  }

  private resolveExecutionPolicy(
    mode: AssistantRuntimeMode,
    agentProfile: AgentProfileRecord,
  ): AssistantExecutionPolicySummary {
    const sideEffectsAllowed = mode === "orchestrated"
      ? agentProfile.executionConstraints.allowSideEffectsInOrchestrated
      : agentProfile.executionConstraints.allowSideEffectsInAdvisory;
    const deliverablePersistenceAllowed = mode === "orchestrated"
      ? agentProfile.executionConstraints.persistOrchestratedDeliverables
      : agentProfile.executionConstraints.persistAdvisoryDeliverables;

    return {
      sideEffectsAllowed,
      deliverablePersistenceAllowed,
      allowedExecutionModes: [...agentProfile.executionConstraints.allowedExecutionModes],
    };
  }

  private async loadToolRegistry(warnings: string[]): Promise<ToolRegistrySnapshot> {
    try {
      const registry = createScaffoldedToolRegistry();
      await registry.loadFromDisk();
      return registry.snapshot();
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Failed to load local tool registry.");
      return {
        providers: [],
        capabilities: [],
        mcpAdapters: [],
        tools: [],
      };
    }
  }

  private resolveAgentTooling(
    skillAllowedTools: string[],
    toolRegistry: ToolRegistrySnapshot,
    agentProfile: AgentProfileRecord,
    warnings: string[],
  ): ResolvedAgentTooling {
    let allowedTools = [...skillAllowedTools];
    const knownTools = new Map(toolRegistry.tools.map((tool) => [tool.name, tool]));
    const explicitToolAllowList = agentProfile.allowedToolNames;

    if (explicitToolAllowList.length > 0) {
      allowedTools = allowedTools.filter((toolName) => explicitToolAllowList.includes(toolName));
    }

    if (agentProfile.allowedCapabilityIds.length > 0) {
      const removedTools: string[] = [];
      allowedTools = allowedTools.filter((toolName) => {
        const descriptor = knownTools.get(toolName);
        if (!descriptor) {
          warnings.push(
            `Tool "${toolName}" is not registered in the local tool registry, so capability enforcement could not be verified.`,
          );
          return explicitToolAllowList.length === 0;
        }

        const allowed = this.toolMatchesCapabilities(descriptor, agentProfile.allowedCapabilityIds);
        if (!allowed) {
          removedTools.push(toolName);
        }
        return allowed;
      });

      if (removedTools.length > 0) {
        warnings.push(
          `Agent profile "${agentProfile.displayName}" filtered tools not allowed by its capability set: ${removedTools.join(", ")}.`,
        );
      }
    }

    return {
      allowedTools,
      allowedCapabilityIds: [...agentProfile.allowedCapabilityIds],
    };
  }

  private toolMatchesCapabilities(tool: ToolDescriptor, allowedCapabilityIds: string[]): boolean {
    if (tool.capabilityIds.length === 0) {
      return true;
    }

    return tool.capabilityIds.every((capabilityId) => allowedCapabilityIds.includes(capabilityId));
  }

  private async resolveModelProfile(
    requestedModelProfileId: string | undefined,
    brandContext: BrandContext | undefined,
    requestedTaskType: string | undefined,
    mode: AssistantRuntimeMode,
    warnings: string[],
    errors: string[],
  ): Promise<ResolvedModelProfileSelection | undefined> {
    const normalized = requestedModelProfileId?.trim();
    if (!normalized) {
      return undefined;
    }

    const profiles = await this.integrationRegistry.listModelProfiles();
    const profile = profiles.find((candidate) => candidate.profileId === normalized && candidate.enabled);
    if (!profile) {
      errors.push(`Requested model profile "${normalized}" is not available in the local model profile registry.`);
      return undefined;
    }

    const preferredUsageClass = mode === "orchestrated" ? "workflow" : "advisory";
    if (!profile.taskUsageClasses.includes(preferredUsageClass)) {
      warnings.push(
        `Model profile "${profile.displayName}" does not explicitly list ${preferredUsageClass} usage, but it was applied by explicit selection.`,
      );
    }

    let appliedModel = profile.taskTypePreferences[requestedTaskType ?? ""]?.trim()
      || profile.modelReference.trim()
      || profile.fineTuneReference?.trim()
      || profile.baseModel.trim();
    let selectionReason = `Model profile "${profile.displayName}" selected the runtime route.`;

    const brandOverride = brandContext
      ? profile.brandOverrides.find((override) => override.brandId === brandContext.brandId)
      : undefined;
    if (brandOverride?.fineTuneReference?.trim()) {
      appliedModel = brandOverride.fineTuneReference.trim();
      selectionReason = `Brand override from model profile "${profile.displayName}" selected the fine-tuned model for ${brandContext?.brandId}.`;
    } else if (brandOverride?.baseModel?.trim()) {
      appliedModel = brandOverride.baseModel.trim();
      selectionReason = `Brand override from model profile "${profile.displayName}" selected the brand-specific base model for ${brandContext?.brandId}.`;
    } else if (requestedTaskType && profile.taskTypePreferences[requestedTaskType]?.trim()) {
      selectionReason = `Task-type preference from model profile "${profile.displayName}" selected the route for ${requestedTaskType}.`;
    }

    try {
      this.providerRegistry.get(profile.provider);
    } catch (error) {
      errors.push(
        error instanceof Error
          ? error.message
          : `Provider "${profile.provider}" from model profile "${profile.displayName}" is not available.`,
      );
      return undefined;
    }

    return {
      profile,
      appliedModel,
      selectionReason,
    };
  }

  private resolveRoute(
    taskType: string,
    modelProfile?: ResolvedModelProfileSelection,
  ): AssistantRouteSummary {
    return resolveModelRoute(taskType, modelProfile
      ? {
          override: {
            provider: modelProfile.profile.provider,
            model: modelProfile.appliedModel,
            reason: modelProfile.selectionReason,
          },
        }
      : undefined);
  }

  private toModelProfileSummary(modelProfile: ResolvedModelProfileSelection): AssistantModelProfileSummary {
    return {
      profileId: modelProfile.profile.profileId,
      displayName: modelProfile.profile.displayName,
      provider: modelProfile.profile.provider,
      modelReference: modelProfile.profile.modelReference,
      appliedModel: modelProfile.appliedModel,
      selectionReason: modelProfile.selectionReason,
      ...(modelProfile.profile.fineTuneReference
        ? { fineTuneReference: modelProfile.profile.fineTuneReference }
        : {}),
    };
  }

  private toAgentProfileSummary(agentProfile: AgentProfileRecord): AssistantAgentProfileSummary {
    return {
      profileId: agentProfile.profileId,
      displayName: agentProfile.displayName,
      allowedToolNames: [...agentProfile.allowedToolNames],
      allowedCapabilityIds: [...agentProfile.allowedCapabilityIds],
      allowedExecutionModes: [...agentProfile.executionConstraints.allowedExecutionModes],
    };
  }

  private async resolveConversationThread(input: {
    requestedThreadId?: string;
    sourceCommand: ConversationSourceCommand;
    task: string;
    clientId: string;
    brandContext?: BrandContext;
    warnings: string[];
    errors: string[];
  }): Promise<{ thread: ConversationThreadRecord; resolution: "created" | "existing" } | undefined> {
    try {
      return await this.conversationThreadRegistry.resolveOrCreate({
        ...(input.requestedThreadId ? { threadId: input.requestedThreadId } : {}),
        sourceCommand: input.sourceCommand,
        task: input.task,
        clientId: input.clientId,
        ...(input.brandContext?.brandId ? { brandId: input.brandContext.brandId } : {}),
        ...(input.brandContext?.manifest.displayName ? { brandName: input.brandContext.manifest.displayName } : {}),
      });
    } catch (error) {
      input.errors.push(
        error instanceof Error ? error.message : "Failed to resolve local conversation thread.",
      );
      return undefined;
    }
  }

  private async buildStitchedContext(input: {
    thread: ConversationThreadRecord;
    task: string;
    mode: AssistantRuntimeMode;
    clientId: string;
    brandContext?: BrandContext;
    warnings: string[];
  }): Promise<Awaited<ReturnType<ContextStitcher["stitch"]>> | undefined> {
    try {
      const bundle = await this.contextStitcher.stitch({
        thread: input.thread,
        currentTask: input.task,
        mode: input.mode,
        clientId: input.clientId,
        ...(input.brandContext ? { brandContext: input.brandContext } : {}),
      });
      await this.conversationStore.saveContextBundle(bundle);
      return bundle;
    } catch (error) {
      input.warnings.push(
        error instanceof Error ? error.message : "Failed to stitch local conversation context.",
      );
      return undefined;
    }
  }

  private toConversationSummary(input: { thread: ConversationThreadRecord; resolution: "created" | "existing" }): AssistantConversationSummary {
    return {
      threadId: input.thread.threadId,
      title: input.thread.title,
      resolution: input.resolution,
      turnCount: input.thread.turnCount,
      sourceCommand: input.thread.sourceCommand,
      ...(input.thread.lastTurnAt ? { lastTurnAt: input.thread.lastTurnAt } : {}),
    };
  }

  private toStitchedContextSummary(bundle: Awaited<ReturnType<ContextStitcher["stitch"]>>): AssistantStitchedContextSummary {
    return {
      bundleId: bundle.bundleId,
      ...(bundle.threadId ? { threadId: bundle.threadId } : {}),
      sourceCount: bundle.sources.length,
      recentTurnCount: bundle.sources.filter((source) => source.kind === "conversation_turn" && source.included).length,
      sessionSourceCount: bundle.sources.filter((source) => source.kind === "session_metadata" && source.included).length,
      deliverableSourceCount: bundle.sources.filter((source) => source.kind === "deliverable_metadata" && source.included).length,
      semanticSourceCount: bundle.sources.filter((source) => source.kind === "semantic_memory" && source.included).length,
      maxRecentTurns: bundle.maxRecentTurns,
      maxCharacters: bundle.maxCharacters,
      totalCharacters: bundle.totalCharacters,
      truncated: bundle.truncated,
    };
  }

  private toSemanticMemorySummary(bundle: Awaited<ReturnType<ContextStitcher["stitch"]>>): AssistantSemanticMemorySummary | undefined {
    const sources = bundle.sources
      .filter((source) => source.kind === "semantic_memory")
      .map((source) => ({
        chunkId: source.chunkId ?? source.sourceId,
        ...(typeof source.metadata.memoryId === "string" ? { memoryId: source.metadata.memoryId } : {}),
        label: source.label,
        ...(typeof source.metadata.sourceType === "string" ? { sourceType: source.metadata.sourceType } : {}),
        ...(typeof source.metadata.score === "number" ? { score: source.metadata.score } : {}),
        ...(source.deliverableId ? { deliverableId: source.deliverableId } : {}),
      }));

    if (sources.length === 0 && !bundle.semanticQuery) {
      return undefined;
    }

    return {
      query: bundle.semanticQuery ?? "",
      resultCount: bundle.semanticResultCount ?? sources.length,
      selectedCount: bundle.semanticSelectedCount ?? sources.filter((source) => source.score !== undefined).length,
      sources,
    };
  }

  private readString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
  }

  private readFirstString(
    record: Record<string, unknown>,
    keys: string[],
  ): string | undefined {
    for (const key of keys) {
      const value = this.readString(record[key]);
      if (value) {
        return value;
      }
    }

    return undefined;
  }

  private readFirstStringList(
    record: Record<string, unknown>,
    keys: string[],
  ): string[] {
    for (const key of keys) {
      const value = this.readStringList(record[key]);
      if (value.length > 0) {
        return value;
      }
    }

    return [];
  }

  private readStringList(value: unknown): string[] {
    if (typeof value === "string") {
      return value
        .split(/\r?\n|;/)
        .map((item) => item.replace(/^[-*]\s*/, "").trim())
        .filter((item) => item.length > 0);
    }

    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private async resolveBrandContext(
    requestedBrandId: string | undefined,
    warnings: string[],
    errors: string[],
  ): Promise<BrandContext | undefined> {
    const normalizedBrandId = requestedBrandId?.trim();

    try {
      if (normalizedBrandId && normalizedBrandId.length > 0) {
        const explicitBrand = await this.brandRegistry.resolveBrand({ brandId: normalizedBrandId });
        if (!explicitBrand) {
          errors.push(`Requested brand "${normalizedBrandId}" was not found in local manifests under data/brands/manifests.`);
          return undefined;
        }

        return explicitBrand;
      }

      const defaultBrand = await this.brandRegistry.resolveBrand();
      if (!defaultBrand) {
        warnings.push("No brand manifest was resolved. Proceeding without brand context.");
      }

      return defaultBrand;
    } catch (error) {
      warnings.push(error instanceof Error ? error.message : "Failed to resolve local brand context.");
      return undefined;
    }
  }

  private toBrandSummary(
    brandContext: BrandContext | undefined,
    requestedBrandId: string | undefined,
  ): AssistantBrandContextSummary {
    if (!brandContext) {
      return {
        ...(requestedBrandId?.trim() ? { selectedBrandId: requestedBrandId.trim() } : {}),
        resolution: "none",
      };
    }

    return {
      selectedBrandId: brandContext.brandId,
      brandName: brandContext.manifest.displayName,
      clientId: brandContext.clientId,
      ...(brandContext.manifestPath ? { manifestPath: brandContext.manifestPath } : {}),
      voice: {
        tone: [...brandContext.manifest.voice.tone],
        styleNotes: [...brandContext.manifest.voice.styleNotes],
        preferredCtas: [...brandContext.manifest.voice.preferredCtas],
        bannedPhrases: [...brandContext.manifest.voice.bannedPhrases],
      },
      contentRules: {
        requiredDisclaimers: [...brandContext.manifest.contentRules.requiredDisclaimers],
        forbiddenClaims: [...brandContext.manifest.contentRules.forbiddenClaims],
        formattingRules: [...brandContext.manifest.contentRules.formattingRules],
      },
      outputDirectories: {
        ...brandContext.outputDirectories,
      },
      approvalPolicy: {
        mode: brandContext.approvalPolicy.mode,
        approverRoles: [...brandContext.approvalPolicy.approverRoles],
        approverChannels: [...brandContext.approvalPolicy.approverChannels],
      },
      publishPolicy: {
        mode: brandContext.publishPolicy.mode,
        defaultTarget: brandContext.publishPolicy.defaultTarget,
        allowedTargets: [...brandContext.publishPolicy.allowedTargets],
        pathStrategy: brandContext.publishPolicy.pathStrategy,
      },
      resolution: requestedBrandId?.trim() ? "explicit" : "default",
    };
  }

  private buildBrandMetadata(brandContext: BrandContext): Record<string, unknown> {
    return {
      brandId: brandContext.brandId,
      brandName: brandContext.manifest.displayName,
      ...(brandContext.manifestPath ? { brandManifestPath: brandContext.manifestPath } : {}),
      brandTone: brandContext.manifest.voice.tone,
      brandStyleNotes: brandContext.manifest.voice.styleNotes,
      brandOutputDirectories: brandContext.outputDirectories,
      brandApprovalMode: brandContext.approvalPolicy.mode,
      brandPublishMode: brandContext.publishPolicy.mode,
    };
  }

  private buildAgentMetadata(agentProfile: AgentProfileRecord): Record<string, unknown> {
    return {
      agentProfileId: agentProfile.profileId,
      agentProfileName: agentProfile.displayName,
      allowedToolNames: agentProfile.allowedToolNames,
      allowedCapabilityIds: agentProfile.allowedCapabilityIds,
      allowedExecutionModes: agentProfile.executionConstraints.allowedExecutionModes,
    };
  }

  private buildModelProfileMetadata(modelProfile: ResolvedModelProfileSelection): Record<string, unknown> {
    return {
      modelProfileId: modelProfile.profile.profileId,
      modelProfileName: modelProfile.profile.displayName,
      modelProfileProvider: modelProfile.profile.provider,
      modelProfileAppliedModel: modelProfile.appliedModel,
      modelProfileReason: modelProfile.selectionReason,
      ...(modelProfile.profile.fineTuneReference
        ? { modelProfileFineTuneReference: modelProfile.profile.fineTuneReference }
        : {}),
    };
  }

  private buildConversationMetadata(thread: ConversationThreadRecord): Record<string, unknown> {
    return {
      conversationThreadId: thread.threadId,
      conversationThreadTitle: thread.title,
      conversationTurnCount: thread.turnCount,
    };
  }

  private buildStitchedContextMetadata(bundle: Awaited<ReturnType<ContextStitcher["stitch"]>>): Record<string, unknown> {
    return {
      stitchedContextBundleId: bundle.bundleId,
      stitchedContextThreadId: bundle.threadId,
      stitchedContextSourceCount: bundle.sources.length,
      stitchedContextCharacters: bundle.totalCharacters,
      stitchedContextTruncated: bundle.truncated,
    };
  }
}

const containsAny = (value: string, candidates: string[]): boolean => {
  return candidates.some((candidate) => value.includes(candidate));
};
