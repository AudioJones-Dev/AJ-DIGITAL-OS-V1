#!/usr/bin/env node
import "./env.js";
import { fileURLToPath } from "node:url";

import {
  AssistantCommand,
  AssistantDoctorCommand,
  AssistantHistoryCommand,
  AssistantShellCommand,
  AssistantSetupCommand,
  AssistantStartCommand,
  ApproveDeliverableCommand,
  ApproveRunCommand,
  ConversationHistoryCommand,
  ConversationThreadCommand,
  DashboardCommand,
  DeliverablesCommand,
  ExecuteRunCommand,
  HealthcheckCommand,
  HelpCommand,
  IntegrationProfilesCommand,
  MemoryIndexCommand,
  MemorySearchCommand,
  MemoryStatsCommand,
  ListApprovedRunsCommand,
  ListExecutedRunsCommand,
  ListFailedRunsCommand,
  ListPendingDeliverablesCommand,
  ListPendingApprovalsCommand,
  ModelProfilesCommand,
  OllamaProbeCommand,
  OperatorConsoleCommand,
  PublishDeliverableCommand,
  ResumeRunCommand,
  RunEventsCommand,
  RunSummaryCommand,
  N8nHealthcheckCommand,
  N8nTriggerTestCommand,
  BrowserAgentCommand,
  MissionRunCommand,
  HermesStartCommand,
  HermesStopCommand,
  HermesStatusCommand,
  ScoreOpportunitiesCommand,
  SeedDemoCommand,
  SubmitForApprovalCommand,
  ToolRegistryCommand,
  TrackRunCommand,
  UiStartCommand,
  normalizeAssistantMode,
  type TrackRunViewMode,
} from "./commands/index.js";
import type { RunModelFilter } from "./services/observability/run-dashboard.js";
import type { ApprovalDecision } from "./types/run.types.js";
import type { ExecutionMode, ExecutionTarget } from "./services/execution/execution-policy.js";

interface ParsedArgs {
  command?: string;
  flags: Record<string, string | boolean | undefined>;
}

/**
 * Parses positional command and `--flag value` arguments from the CLI.
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean | undefined> = {};
  let command: string | undefined;
  const booleanFlags = new Set([
    "json",
    "reverse",
    "watch",
    "autoSubmitForApproval",
    "rebuild",
    "use-config-webhook",
    "validate-only",
    "post-agent",
    "modelAttempted",
    "modelSucceeded",
    "repairedSuccess",
    "modelFailed",
    "fallbackUsed",
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token) {
      continue;
    }

    if (!token.startsWith("--")) {
      if (!command) {
        command = token;
      }
      continue;
    }

    const rawFlag = token.slice(2);
    const separatorIndex = rawFlag.indexOf("=");
    const key = separatorIndex >= 0 ? rawFlag.slice(0, separatorIndex) : rawFlag;
    const inlineValue = separatorIndex >= 0 ? rawFlag.slice(separatorIndex + 1) : undefined;
    if (booleanFlags.has(key)) {
      if (inlineValue !== undefined) {
        const parsedInlineBoolean = parseBooleanFlagValue(inlineValue);
        flags[key] = parsedInlineBoolean ?? true;
        continue;
      }

      const nextToken = argv[index + 1];
      const parsedBoolean = parseBooleanFlagValue(nextToken);
      if (parsedBoolean !== undefined) {
        flags[key] = parsedBoolean;
        index += 1;
        continue;
      }

      flags[key] = true;
      continue;
    }

    if (inlineValue !== undefined) {
      flags[key] = inlineValue;
      continue;
    }

    const nextToken = argv[index + 1];
    if (!nextToken || nextToken.startsWith("--")) {
      flags[key] = undefined;
      continue;
    }

    flags[key] = nextToken;
    index += 1;
  }

  return {
    ...(command ? { command } : {}),
    flags,
  };
}

/**
 * Runs the AJ Digital OS CLI for the provided argument vector.
 */
export async function main(argv = process.argv.slice(2)): Promise<number> {
  const parsed = parseArgs(argv);
  const command = parsed.command ?? "help";
  const limit = getOptionalLimit(parsed.flags);
  const runId = getStringFlag(parsed.flags, "runId") ?? "";
  const actor = getStringFlag(parsed.flags, "actor");
  const source = getStringFlag(parsed.flags, "source");
  const target = normalizeExecutionTarget(getStringFlag(parsed.flags, "target"));
  const mode = normalizeExecutionMode(getStringFlag(parsed.flags, "mode"));
  const assistantMode = normalizeAssistantMode(getStringFlag(parsed.flags, "mode"));
  const assistantTask = getStringFlag(parsed.flags, "task") ?? "";
  const assistantClientId = getStringFlag(parsed.flags, "clientId");
  const assistantBrandId = getStringFlag(parsed.flags, "brand");
  const assistantThreadId = getStringFlag(parsed.flags, "threadId");
  const assistantSkill = getStringFlag(parsed.flags, "skill");
  const assistantTaskType = getStringFlag(parsed.flags, "taskType");
  const assistantLabel = getStringFlag(parsed.flags, "label");
  const autoSubmitForApproval = hasFlag(parsed.flags, "autoSubmitForApproval");
  const deliverableStatus = getStringFlag(parsed.flags, "status");
  const deliverableId = getStringFlag(parsed.flags, "deliverableId") ?? "";
  const notes = getStringFlag(parsed.flags, "notes");
  const query = getStringFlag(parsed.flags, "query") ?? "";
  const memoryText = getStringFlag(parsed.flags, "text");
  const memoryFilePath = getStringFlag(parsed.flags, "file");
  const memoryUrl = getStringFlag(parsed.flags, "url");
  const memoryKind = getStringFlag(parsed.flags, "kind");
  const host = getStringFlag(parsed.flags, "host");
  const port = getOptionalPort(parsed.flags);
  const view = normalizeTrackRunView(getStringFlag(parsed.flags, "view"));
  const decision = normalizeApprovalDecision(getStringFlag(parsed.flags, "decision"));
  const approvalSource = normalizeApprovalSource(source);
  const modelFilter = getModelFilter(parsed.flags);

  try {
    switch (command) {
      case "assistant":
        {
          const result = await new AssistantCommand().run({
            task: assistantTask,
            ...(assistantClientId ? { clientId: assistantClientId } : {}),
            ...(assistantBrandId ? { brandId: assistantBrandId } : {}),
            ...(assistantSkill ? { skillName: assistantSkill } : {}),
            ...(assistantMode ? { mode: assistantMode } : {}),
            ...(assistantTaskType ? { taskType: assistantTaskType } : {}),
            ...(assistantThreadId ? { conversationThreadId: assistantThreadId } : {}),
            ...(source ? { sourceText: source } : {}),
            ...(autoSubmitForApproval ? { autoSubmitForApproval } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "assistant-start":
        {
          const result = await new AssistantStartCommand().run({
            task: assistantTask,
            ...(assistantClientId ? { clientId: assistantClientId } : {}),
            ...(assistantBrandId ? { brandId: assistantBrandId } : {}),
            ...(assistantSkill ? { skillName: assistantSkill } : {}),
            ...(assistantMode ? { mode: assistantMode } : {}),
            ...(assistantTaskType ? { taskType: assistantTaskType } : {}),
            ...(assistantThreadId ? { conversationThreadId: assistantThreadId } : {}),
            ...(source ? { sourceText: source } : {}),
            ...(autoSubmitForApproval ? { autoSubmitForApproval } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "assistant-setup":
        {
          const result = await new AssistantSetupCommand().run({
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "assistant-history":
        {
          const result = await new AssistantHistoryCommand().run({
            ...(limit !== undefined ? { limit } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "conversation-history":
        {
          const result = await new ConversationHistoryCommand().run({
            ...(limit !== undefined ? { limit } : {}),
            ...(assistantBrandId ? { brandId: assistantBrandId } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "conversation-thread":
        {
          const result = await new ConversationThreadCommand().run({
            threadId: assistantThreadId ?? "",
            ...(limit !== undefined ? { limit } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "list-deliverables":
      case "deliverables":
        {
          const result = await new DeliverablesCommand().run({
            ...(limit !== undefined ? { limit } : {}),
            ...(assistantBrandId ? { brandId: assistantBrandId } : {}),
            ...(isDeliverableStatus(deliverableStatus) ? { status: deliverableStatus } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "list-pending-deliverables":
        {
          const result = await new ListPendingDeliverablesCommand().run({
            ...(limit !== undefined ? { limit } : {}),
            ...(assistantBrandId ? { brandId: assistantBrandId } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "submit-for-approval":
        {
          const result = await new SubmitForApprovalCommand().run({
            deliverableId,
            ...(actor ? { actor } : {}),
            ...(notes ? { notes } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "approve-deliverable":
        {
          const result = await new ApproveDeliverableCommand().run({
            deliverableId,
            ...(actor ? { actor } : {}),
            ...(notes ? { notes } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "publish-deliverable":
        {
          const result = await new PublishDeliverableCommand().run({
            deliverableId,
            ...(actor ? { actor } : {}),
            ...(notes ? { notes } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "tools":
      case "tool-registry":
        {
          const result = await new ToolRegistryCommand().run({
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "integration-profiles":
        {
          const result = await new IntegrationProfilesCommand().run({
            ...(assistantBrandId ? { brandId: assistantBrandId } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "model-profiles":
        {
          const result = await new ModelProfilesCommand().run({
            ...(assistantBrandId ? { brandId: assistantBrandId } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "memory-index":
        {
          const result = await new MemoryIndexCommand().run({
            rebuild: hasFlag(parsed.flags, "rebuild"),
            ...(memoryText ? { text: memoryText } : {}),
            ...(memoryFilePath ? { filePath: memoryFilePath } : {}),
            ...(memoryUrl ? { url: memoryUrl } : {}),
            ...(memoryKind ? { kind: memoryKind } : {}),
            ...(assistantLabel ? { label: assistantLabel } : {}),
            ...(assistantBrandId ? { brandId: assistantBrandId } : {}),
            ...(assistantClientId ? { clientId: assistantClientId } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "memory-search":
        {
          const result = await new MemorySearchCommand().run({
            query,
            ...(limit !== undefined ? { limit } : {}),
            ...(assistantBrandId ? { brandId: assistantBrandId } : {}),
            ...(assistantClientId ? { clientId: assistantClientId } : {}),
            ...(assistantThreadId ? { threadId: assistantThreadId } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "memory-stats":
        {
          const result = await new MemoryStatsCommand().run({
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "assistant-chat":
      case "assistant-shell":
        {
          const result = await new AssistantShellCommand().run({
            ...(assistantClientId ? { clientId: assistantClientId } : {}),
            ...(assistantBrandId ? { brandId: assistantBrandId } : {}),
            ...(assistantSkill ? { skillName: assistantSkill } : {}),
            ...(assistantMode ? { mode: assistantMode } : {}),
            ...(assistantTaskType ? { taskType: assistantTaskType } : {}),
            ...(assistantLabel ? { label: assistantLabel } : {}),
            ...(assistantThreadId ? { threadId: assistantThreadId } : {}),
            ...(source ? { sourceText: source } : {}),
            ...(autoSubmitForApproval ? { autoSubmitForApproval } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "assistant-doctor":
        {
          const result = await new AssistantDoctorCommand().run({
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "ui-start":
        {
          const result = await new UiStartCommand().run({
            ...(host ? { host } : {}),
            ...(port !== undefined ? { port } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "help":
        await new HelpCommand().run({
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
      case "doctor":
      case "healthcheck":
        {
          const result = await new HealthcheckCommand().run({
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "dash":
      case "dashboard":
        await new DashboardCommand().run({
          ...(limit !== undefined ? { limit } : {}),
          ...(modelFilter ? { modelFilter } : {}),
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
      case "ollama-probe":
        {
          const result = await new OllamaProbeCommand().run({
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "console":
      case "operator-console":
        await new OperatorConsoleCommand().run({
          ...(limit !== undefined ? { limit } : {}),
          json: hasFlag(parsed.flags, "json"),
          watch: hasFlag(parsed.flags, "watch"),
        });
        return 0;
      case "run-summary":
        await new RunSummaryCommand().run({
          runId,
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
      case "run-events":
        await new RunEventsCommand().run({
          runId,
          ...(limit !== undefined ? { limit } : {}),
          json: hasFlag(parsed.flags, "json"),
          reverse: hasFlag(parsed.flags, "reverse"),
        });
        return 0;
      case "track-run":
        await new TrackRunCommand().run({
          runId,
          ...(view ? { view } : {}),
          ...(limit !== undefined ? { limit } : {}),
          json: hasFlag(parsed.flags, "json"),
          reverse: hasFlag(parsed.flags, "reverse"),
        });
        return 0;
      case "list-pending-approvals":
        await new ListPendingApprovalsCommand().run({
          ...(limit !== undefined ? { limit } : {}),
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
      case "list-approved-runs":
        await new ListApprovedRunsCommand().run({
          ...(limit !== undefined ? { limit } : {}),
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
      case "list-failed-runs":
        await new ListFailedRunsCommand().run({
          ...(limit !== undefined ? { limit } : {}),
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
      case "list-executed-runs":
        await new ListExecutedRunsCommand().run({
          ...(limit !== undefined ? { limit } : {}),
          ...(modelFilter ? { modelFilter } : {}),
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
      case "approve":
      case "approve-run":
        await new ApproveRunCommand().run({
          runId,
          decision: (decision ?? "") as ApprovalDecision,
          ...(approvalSource ? { source: approvalSource } : {}),
          ...(actor ? { actor } : {}),
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
      case "exec":
      case "execute-run":
        await new ExecuteRunCommand().run({
          runId,
          ...(target ? { target } : {}),
          ...(mode ? { mode } : {}),
          ...(source ? { source } : {}),
          ...(actor ? { actor } : {}),
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
      case "resume":
      case "resume-run":
        await new ResumeRunCommand().run({
          runId,
          ...(target ? { target } : {}),
          ...(mode ? { mode } : {}),
          ...(source ? { source } : {}),
          ...(actor ? { actor } : {}),
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
      case "seed-demo":
        await new SeedDemoCommand().run({
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
      case "n8n:healthcheck":
      case "n8n-healthcheck":
        {
          const result = await new N8nHealthcheckCommand().run({
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "n8n:trigger-test":
      case "n8n-trigger-test":
        {
          const result = await new N8nTriggerTestCommand().run({
            path: getStringFlag(parsed.flags, "path"),
            useConfigWebhook: hasFlag(parsed.flags, "use-config-webhook"),
            payload: getStringFlag(parsed.flags, "payload"),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "browser-agent":
      case "browser:agent":
        {
          const result = await new BrowserAgentCommand().run({
            workflow: getStringFlag(parsed.flags, "workflow"),
            mode: getStringFlag(parsed.flags, "mode"),
            startUrl: getStringFlag(parsed.flags, "start-url"),
            loginUrl: getStringFlag(parsed.flags, "login-url"),
            configUrl: getStringFlag(parsed.flags, "config-url"),
            allowedDomains: getStringFlag(parsed.flags, "allowed-domains"),
            targetFields: getStringFlag(parsed.flags, "target-fields"),
            sessionFile: getStringFlag(parsed.flags, "session-file"),
            outputPrefix: getStringFlag(parsed.flags, "output-prefix"),
            maxSteps: getStringFlag(parsed.flags, "max-steps"),
            maxRetries: getStringFlag(parsed.flags, "max-retries"),
            authSelector: getStringFlag(parsed.flags, "auth-selector"),
            loginTimeout: getStringFlag(parsed.flags, "login-timeout"),
            validateOnly: hasFlag(parsed.flags, "validate-only"),
            postAgent: hasFlag(parsed.flags, "post-agent"),
            postAgentTarget: getStringFlag(parsed.flags, "post-agent-target"),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "mission":
      case "mission:run":
      case "mission-run":
        {
          const result = await new MissionRunCommand().run({
            file: getStringFlag(parsed.flags, "file"),
            envelope: getStringFlag(parsed.flags, "envelope"),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "hermes:start":
      case "hermes-start":
        {
          const result = await new HermesStartCommand().run({
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "hermes:stop":
      case "hermes-stop":
        {
          const result = await new HermesStopCommand().run({
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "hermes:status":
      case "hermes-status":
        {
          const result = await new HermesStatusCommand().run({
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "score-opportunities":
        {
          const topRaw = getStringFlag(parsed.flags, "top");
          const topN = topRaw !== undefined ? parseInt(topRaw, 10) : undefined;
          const tierRaw = getStringFlag(parsed.flags, "tier");
          const result = await new ScoreOpportunitiesCommand().run({
            ...(topN !== undefined && !isNaN(topN) ? { top: topN } : {}),
            ...(isOpportunityTier(tierRaw) ? { tier: tierRaw } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      default:
        printUnknownCommand(command);
        return 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown CLI error.";
    console.error(`CLI error: ${message}`);
    return 1;
  }
}

function getStringFlag(
  flags: Record<string, string | boolean | undefined>,
  key: string,
): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function hasFlag(flags: Record<string, string | boolean | undefined>, key: string): boolean {
  return flags[key] === true;
}

function parseBooleanFlagValue(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  return undefined;
}

function getOptionalLimit(flags: Record<string, string | boolean | undefined>): number | undefined {
  const raw = flags.limit;
  if (raw === undefined) {
    return undefined;
  }

  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("--limit requires a numeric value.");
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid --limit value: ${raw}`);
  }

  return parsed;
}

function getOptionalPort(flags: Record<string, string | boolean | undefined>): number | undefined {
  const raw = flags.port;
  if (raw === undefined) {
    return undefined;
  }

  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("--port requires a numeric value.");
  }

  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid --port value: ${raw}`);
  }

  return Math.floor(parsed);
}

function getModelFilter(flags: Record<string, string | boolean | undefined>): RunModelFilter | undefined {
  const modelFilter: RunModelFilter = {
    ...(hasFlag(flags, "modelAttempted") ? { attempted: true } : {}),
    ...(hasFlag(flags, "modelSucceeded") ? { succeeded: true } : {}),
    ...(hasFlag(flags, "repairedSuccess") ? { repairedSuccess: true } : {}),
    ...(hasFlag(flags, "modelFailed") ? { failed: true } : {}),
    ...(hasFlag(flags, "fallbackUsed") ? { fallbackUsed: true } : {}),
    ...(typeof flags.provider === "string" && flags.provider.trim().length > 0
      ? { provider: flags.provider.trim() }
      : {}),
  };

  return Object.keys(modelFilter).length > 0 ? modelFilter : undefined;
}

function normalizeApprovalDecision(value: string | undefined): ApprovalDecision | undefined {
  switch (value) {
    case "approve":
    case "reject":
    case "request_revision":
      return value;
    default:
      return undefined;
  }
}

function normalizeApprovalSource(
  value: string | undefined,
): "manual" | "terminal" | "system" | undefined {
  switch (value) {
    case "manual":
    case "terminal":
    case "system":
      return value;
    default:
      return undefined;
  }
}

function normalizeExecutionTarget(value: string | undefined): ExecutionTarget | undefined {
  switch (value) {
    case "local":
      return value;
    default:
      return undefined;
  }
}

function normalizeExecutionMode(value: string | undefined): ExecutionMode | undefined {
  switch (value) {
    case "manual":
    case "auto":
      return value;
    default:
      return undefined;
  }
}

function normalizeTrackRunView(value: string | undefined): TrackRunViewMode | undefined {
  switch (value) {
    case "summary":
    case "events":
    case "full":
      return value;
    default:
      return undefined;
  }
}

function isOpportunityTier(value: string | undefined): value is "high" | "medium" | "low" {
  return value === "high" || value === "medium" || value === "low";
}

function isDeliverableStatus(value: string | undefined): value is "draft" | "pending_approval" | "approved" | "published" | "failed" | "archived" {
  switch (value) {
    case "draft":
    case "pending_approval":
    case "approved":
    case "published":
    case "failed":
    case "archived":
      return true;
    default:
      return false;
  }
}

function printUnknownCommand(command: string): void {
  console.error(`Unknown command: ${command}`);
  console.error("");
  console.error("Use:");
  console.error("  node dist/cli.js help");
}

async function runCli(): Promise<void> {
  const exitCode = await main();
  if (exitCode !== 0) {
    process.exitCode = exitCode;
  }
}

const isDirectExecution = process.argv[1] === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  void runCli();
}
