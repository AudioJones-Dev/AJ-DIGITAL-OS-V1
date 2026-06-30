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
  AttributionReportCommand,
  ScoreOpportunitiesCommand,
  ListRunsCommand,
  InspectRunCommand,
  ControlRunCommand,
  AuditRunCommand,
  CoreHealthCommand,
  StateValidateCommand,
  StateTransitionsCommand,
  PolicyEvaluateCommand,
  GovernanceBrandCheckCommand,
  GovernanceLegalCheckCommand,
  GovernanceSopValidateCommand,
  GovernanceOfferCheckCommand,
  GovernanceEvaluateCommand,
  EventsListCommand,
  EventsRunCommand,
  EventsTenantCommand,
  EventsReplayCommand,
  SchemasListCommand,
  SchemaInspectCommand,
  IdempotencyCheckCommand,
  MetricsSnapshotCommand,
  CacheLookupCommand,
  CacheWriteCommand,
  CacheInvalidateCommand,
  CacheListCommand,
  CacheAuditCommand,
  CacheStatsCommand,
  ConnectorListCommand,
  ConnectorEnableCommand,
  ConnectorDisableCommand,
  ConnectorExecuteCommand,
  ConnectorAuditCommand,
  DagCreateCommand,
  DagListCommand,
  DagInspectCommand,
  DagExecuteCommand,
  DagRetryNodeCommand,
  DagSkipNodeCommand,
  DagAuditCommand,
  DagOutputsCommand,
  LeadToOfferCommand,
  CrmCommand,
  NormalizeEntityCommand,
  ListEntitiesCommand,
  GetEntityCommand,
  TelegramStartCommand,
  TelegramStatusCommand,
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
import type {
  RetrievalEnvironment,
  RetrievalNamespace,
  RetrievalSourceType,
} from "./retrieval/retrieval-types.js";

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
    "approval-granted",
    "map",
    "force",
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
      case "attribution-report":
        {
          const agentFlag = getStringFlag(parsed.flags, "agent");
          const daysFlag = getStringFlag(parsed.flags, "days");
          const result = await new AttributionReportCommand().run({
            ...(agentFlag ? { agent: agentFlag } : {}),
            ...(daysFlag ? { days: Number(daysFlag) } : {}),
            json: hasFlag(parsed.flags, "json"),
            ...(hasFlag(parsed.flags, "map") ? { map: true } : {}),
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
      case "list-runs":
        {
          const stateFlag = getStringFlag(parsed.flags, "state");
          const limitRaw = getStringFlag(parsed.flags, "limit");
          const result = await new ListRunsCommand().run({
            json: hasFlag(parsed.flags, "json"),
            ...(stateFlag ? { state: stateFlag } : {}),
            ...(limitRaw ? { limit: parseInt(limitRaw, 10) } : {}),
          });
          return result.ok ? 0 : 1;
        }
      case "inspect-run":
        {
          const runId = getStringFlag(parsed.flags, "runId") ?? "";
          if (!runId) { console.error("Usage: inspect-run --runId <id>"); return 1; }
          const result = await new InspectRunCommand().run({
            runId,
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "control-run":
        {
          const runId = getStringFlag(parsed.flags, "runId") ?? "";
          const action = getStringFlag(parsed.flags, "action") ?? "";
          if (!runId || !action) { console.error("Usage: control-run --runId <id> --action <action> [--by <user>] [--reason <text>]"); return 1; }
          const controlRunInput: import("./commands/control-run.command.js").ControlRunCommandInput = { runId, action };
          const byFlag = getStringFlag(parsed.flags, "by");
          if (byFlag !== undefined) controlRunInput.by = byFlag;
          const reasonFlag = getStringFlag(parsed.flags, "reason");
          if (reasonFlag !== undefined) controlRunInput.reason = reasonFlag;
          if (hasFlag(parsed.flags, "approval-granted")) controlRunInput.approvalGranted = true;
          if (hasFlag(parsed.flags, "json")) controlRunInput.json = true;
          const result = await new ControlRunCommand().run(controlRunInput);
          return result.ok ? 0 : 1;
        }
      case "audit-run":
        {
          const runId = getStringFlag(parsed.flags, "runId") ?? "";
          if (!runId) { console.error("Usage: audit-run --runId <id>"); return 1; }
          const limitRaw = getStringFlag(parsed.flags, "limit");
          const result = await new AuditRunCommand().run({
            runId,
            json: hasFlag(parsed.flags, "json"),
            ...(limitRaw ? { limit: parseInt(limitRaw, 10) } : {}),
          });
          return result.ok ? 0 : 1;
        }
      case "core-health":
        {
          const result = await new CoreHealthCommand().run({ json: hasFlag(parsed.flags, "json") });
          return result.ok ? 0 : 1;
        }
      case "state-validate":
        {
          const from = getStringFlag(parsed.flags, "from");
          const to = getStringFlag(parsed.flags, "to");
          if (!from || !to) {
            console.error("Usage: state-validate --from <state> --to <state> [--force]");
            return 1;
          }
          const result = await new StateValidateCommand().run({
            from,
            to,
            force: hasFlag(parsed.flags, "force"),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "state-transitions":
        {
          const stateFlag = getStringFlag(parsed.flags, "state");
          const result = await new StateTransitionsCommand().run({
            ...(stateFlag ? { state: stateFlag } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "policy-evaluate":
        {
          const action = getStringFlag(parsed.flags, "action");
          const envFlag = getStringFlag(parsed.flags, "environment") ?? "local";
          if (!action) {
            console.error("Usage: policy-evaluate --action <action> [--environment <env>] [--tenantId <id>]");
            return 1;
          }
          const tenantIdFlag = getStringFlag(parsed.flags, "tenantId");
          const env = (envFlag === "local" || envFlag === "dev" || envFlag === "staging" || envFlag === "production")
            ? envFlag
            : "local";
          const result = await new PolicyEvaluateCommand().run({
            action,
            environment: env,
            ...(tenantIdFlag ? { tenantId: tenantIdFlag } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "governance-brand-check":
        {
          const text = getStringFlag(parsed.flags, "text");
          const category = getStringFlag(parsed.flags, "category");
          if (!text) {
            console.error("Usage: governance-brand-check --text <text> [--category <cat>]");
            return 1;
          }
          const result = await new GovernanceBrandCheckCommand().run({
            text,
            ...(category ? { category } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok && result.result.compliant ? 0 : 1;
        }
      case "governance-legal-check":
        {
          const content = getStringFlag(parsed.flags, "content");
          const category = getStringFlag(parsed.flags, "category");
          if (!content || !category) {
            console.error("Usage: governance-legal-check --content <text> --category <cat>");
            return 1;
          }
          const result = await new GovernanceLegalCheckCommand().run({
            content,
            category,
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok && result.result.compliant ? 0 : 1;
        }
      case "governance-sop-validate":
        {
          const workflowType = getStringFlag(parsed.flags, "workflowType");
          const stepsRaw = getStringFlag(parsed.flags, "steps");
          if (!workflowType) {
            console.error("Usage: governance-sop-validate --workflowType <type> --steps <s1,s2,...>");
            return 1;
          }
          const steps = stepsRaw ? stepsRaw.split(",").map((s) => s.trim()).filter(Boolean) : [];
          const result = await new GovernanceSopValidateCommand().run({
            workflowType,
            steps,
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok && result.result.valid ? 0 : 1;
        }
      case "governance-offer-check":
        {
          const offerJson = getStringFlag(parsed.flags, "offer");
          if (!offerJson) {
            console.error("Usage: governance-offer-check --offer '<json>'");
            return 1;
          }
          let offer: Parameters<GovernanceOfferCheckCommand["run"]>[0]["offer"];
          try {
            offer = JSON.parse(offerJson) as Parameters<GovernanceOfferCheckCommand["run"]>[0]["offer"];
          } catch (err) {
            console.error(`Invalid offer JSON: ${err instanceof Error ? err.message : String(err)}`);
            return 1;
          }
          const result = await new GovernanceOfferCheckCommand().run({
            offer,
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok && result.result.compliant ? 0 : 1;
        }
      case "governance-evaluate":
        {
          const content = getStringFlag(parsed.flags, "content");
          const contentCategory = getStringFlag(parsed.flags, "category");
          const workflowType = getStringFlag(parsed.flags, "workflowType");
          const stepsRaw = getStringFlag(parsed.flags, "steps");
          const agentRole = getStringFlag(parsed.flags, "agentRole");
          const action = getStringFlag(parsed.flags, "action");
          const toolsRaw = getStringFlag(parsed.flags, "tools");
          const offerJson = getStringFlag(parsed.flags, "offer");
          const tenantIdFlag = getStringFlag(parsed.flags, "tenantId");
          const input: Parameters<GovernanceEvaluateCommand["run"]>[0] = {
            json: hasFlag(parsed.flags, "json"),
          };
          if (content) input.content = content;
          if (contentCategory) input.contentCategory = contentCategory;
          if (workflowType) input.workflowType = workflowType;
          if (stepsRaw) input.workflowSteps = stepsRaw.split(",").map((s) => s.trim()).filter(Boolean);
          if (agentRole) input.agentRole = agentRole;
          if (action) input.action = action;
          if (toolsRaw) input.tools = toolsRaw.split(",").map((s) => s.trim()).filter(Boolean);
          if (tenantIdFlag) input.tenantId = tenantIdFlag;
          if (offerJson) {
            try {
              const parsedOffer = JSON.parse(offerJson) as Parameters<GovernanceEvaluateCommand["run"]>[0]["offer"];
              if (parsedOffer) input.offer = parsedOffer;
            } catch (err) {
              console.error(`Invalid offer JSON: ${err instanceof Error ? err.message : String(err)}`);
              return 1;
            }
          }
          const result = await new GovernanceEvaluateCommand().run(input);
          return result.ok && result.result.overall !== "block" ? 0 : 1;
        }
      case "events-list":
        {
          const categoryFlag = getStringFlag(parsed.flags, "category");
          const runIdFlag = getStringFlag(parsed.flags, "runId");
          const tenantIdFlag = getStringFlag(parsed.flags, "tenantId");
          const result = await new EventsListCommand().run({
            ...(categoryFlag ? { category: categoryFlag } : {}),
            ...(runIdFlag ? { runId: runIdFlag } : {}),
            ...(tenantIdFlag ? { tenantId: tenantIdFlag } : {}),
            ...(limit !== undefined ? { limit } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "events-run":
        {
          const runIdFlag = getStringFlag(parsed.flags, "runId");
          if (!runIdFlag) {
            console.error("Usage: events-run --runId <id>");
            return 1;
          }
          const result = await new EventsRunCommand().run({
            runId: runIdFlag,
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "events-tenant":
        {
          const tenantIdFlag = getStringFlag(parsed.flags, "tenantId");
          if (!tenantIdFlag) {
            console.error("Usage: events-tenant --tenantId <id>");
            return 1;
          }
          const result = await new EventsTenantCommand().run({
            tenantId: tenantIdFlag,
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "events-replay":
        {
          const runIdFlag = getStringFlag(parsed.flags, "runId");
          if (!runIdFlag) {
            console.error("Usage: events-replay --runId <id>");
            return 1;
          }
          const result = await new EventsReplayCommand().run({
            runId: runIdFlag,
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "schemas-list":
        {
          const result = await new SchemasListCommand().run({ json: hasFlag(parsed.flags, "json") });
          return result.ok ? 0 : 1;
        }
      case "schema-inspect":
        {
          const nameFlag = getStringFlag(parsed.flags, "name");
          if (!nameFlag) {
            console.error("Usage: schema-inspect --name <SchemaName>");
            return 1;
          }
          const result = await new SchemaInspectCommand().run({
            name: nameFlag,
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "idempotency-check":
        {
          const keyFlag = getStringFlag(parsed.flags, "idempotencyKey");
          const hashFlag = getStringFlag(parsed.flags, "commandHash");
          if (!keyFlag || !hashFlag) {
            console.error("Usage: idempotency-check --idempotencyKey <key> --commandHash <hash>");
            return 1;
          }
          const result = await new IdempotencyCheckCommand().run({
            idempotencyKey: keyFlag,
            commandHash: hashFlag,
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "metrics-snapshot":
        {
          const result = await new MetricsSnapshotCommand().run({ json: hasFlag(parsed.flags, "json") });
          return result.ok ? 0 : 1;
        }
      case "cache-lookup":
        {
          const ns = getStringFlag(parsed.flags, "namespace");
          const cacheKey = getStringFlag(parsed.flags, "cacheKey");
          const result = await new CacheLookupCommand().run({
            ...(ns !== undefined ? { namespace: ns } : {}),
            ...(cacheKey !== undefined ? { cacheKey } : {}),
            ...(getStringFlag(parsed.flags, "tenantId") !== undefined ? { tenantId: getStringFlag(parsed.flags, "tenantId")! } : {}),
            ...(getStringFlag(parsed.flags, "environment") !== undefined ? { environment: getStringFlag(parsed.flags, "environment")! } : {}),
            ...(getStringFlag(parsed.flags, "policyVersion") !== undefined ? { policyVersion: getStringFlag(parsed.flags, "policyVersion")! } : {}),
            ...(getStringFlag(parsed.flags, "formulaVersion") !== undefined ? { formulaVersion: getStringFlag(parsed.flags, "formulaVersion")! } : {}),
            ...(getStringFlag(parsed.flags, "riskLevel") !== undefined ? { riskLevel: getStringFlag(parsed.flags, "riskLevel")! } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "cache-write":
        {
          const ns = getStringFlag(parsed.flags, "namespace");
          const cacheKey = getStringFlag(parsed.flags, "cacheKey");
          const data = getStringFlag(parsed.flags, "data");
          const ttlRaw = getStringFlag(parsed.flags, "ttlSeconds");
          const result = await new CacheWriteCommand().run({
            ...(ns !== undefined ? { namespace: ns } : {}),
            ...(cacheKey !== undefined ? { cacheKey } : {}),
            ...(data !== undefined ? { data } : {}),
            ...(getStringFlag(parsed.flags, "tenantId") !== undefined ? { tenantId: getStringFlag(parsed.flags, "tenantId")! } : {}),
            ...(getStringFlag(parsed.flags, "environment") !== undefined ? { environment: getStringFlag(parsed.flags, "environment")! } : {}),
            ...(getStringFlag(parsed.flags, "policyVersion") !== undefined ? { policyVersion: getStringFlag(parsed.flags, "policyVersion")! } : {}),
            ...(getStringFlag(parsed.flags, "riskLevel") !== undefined ? { riskLevel: getStringFlag(parsed.flags, "riskLevel")! } : {}),
            ...(getStringFlag(parsed.flags, "createdBy") !== undefined ? { createdBy: getStringFlag(parsed.flags, "createdBy")! } : {}),
            ...(ttlRaw !== undefined ? { ttlSeconds: parseInt(ttlRaw, 10) } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "cache-invalidate":
        {
          const ns = getStringFlag(parsed.flags, "namespace");
          const result = await new CacheInvalidateCommand().run({
            ...(ns !== undefined ? { namespace: ns } : {}),
            ...(getStringFlag(parsed.flags, "cacheKey") !== undefined ? { cacheKey: getStringFlag(parsed.flags, "cacheKey")! } : {}),
            ...(getStringFlag(parsed.flags, "tenantId") !== undefined ? { tenantId: getStringFlag(parsed.flags, "tenantId")! } : {}),
            ...(getStringFlag(parsed.flags, "reason") !== undefined ? { reason: getStringFlag(parsed.flags, "reason")! } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "cache-list":
        {
          const ns = getStringFlag(parsed.flags, "namespace");
          const result = await new CacheListCommand().run({
            ...(ns !== undefined ? { namespace: ns } : {}),
            ...(getStringFlag(parsed.flags, "tenantId") !== undefined ? { tenantId: getStringFlag(parsed.flags, "tenantId")! } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "cache-audit":
        {
          const limitRaw = getStringFlag(parsed.flags, "limit");
          const result = await new CacheAuditCommand().run({
            ...(getStringFlag(parsed.flags, "namespace") !== undefined ? { namespace: getStringFlag(parsed.flags, "namespace")! } : {}),
            ...(getStringFlag(parsed.flags, "tenantId") !== undefined ? { tenantId: getStringFlag(parsed.flags, "tenantId")! } : {}),
            ...(getStringFlag(parsed.flags, "cacheKey") !== undefined ? { cacheKey: getStringFlag(parsed.flags, "cacheKey")! } : {}),
            ...(limitRaw !== undefined ? { limit: parseInt(limitRaw, 10) } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "cache-stats":
        {
          const result = await new CacheStatsCommand().run({
            ...(getStringFlag(parsed.flags, "namespace") !== undefined ? { namespace: getStringFlag(parsed.flags, "namespace")! } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "connector-list":
        {
          const result = await new ConnectorListCommand().run({ json: hasFlag(parsed.flags, "json"), enabledOnly: hasFlag(parsed.flags, "enabled-only") });
          return result.ok ? 0 : 1;
        }
      case "connector-enable":
        {
          const idFlag = getStringFlag(parsed.flags, "id");
          const result = await new ConnectorEnableCommand().run({ json: hasFlag(parsed.flags, "json"), ...(idFlag !== undefined ? { id: idFlag } : {}) });
          return result.ok ? 0 : 1;
        }
      case "connector-disable":
        {
          const idFlag = getStringFlag(parsed.flags, "id");
          const result = await new ConnectorDisableCommand().run({ json: hasFlag(parsed.flags, "json"), ...(idFlag !== undefined ? { id: idFlag } : {}) });
          return result.ok ? 0 : 1;
        }
      case "connector-execute":
        {
          const idFlag = getStringFlag(parsed.flags, "id");
          const actionFlag = getStringFlag(parsed.flags, "action");
          const payloadFlag = getStringFlag(parsed.flags, "payload");
          const result = await new ConnectorExecuteCommand().run({
            json: hasFlag(parsed.flags, "json"),
            ...(idFlag !== undefined ? { id: idFlag } : {}),
            ...(actionFlag !== undefined ? { action: actionFlag } : {}),
            ...(payloadFlag !== undefined ? { payload: payloadFlag } : {}),
            ...(getStringFlag(parsed.flags, "tenantId") !== undefined ? { tenantId: getStringFlag(parsed.flags, "tenantId")! } : {}),
          });
          return result.ok ? 0 : 1;
        }
      case "connector-audit":
        {
          const limitRaw = getStringFlag(parsed.flags, "limit");
          const result = await new ConnectorAuditCommand().run({ json: hasFlag(parsed.flags, "json"), ...(limitRaw !== undefined ? { limit: parseInt(limitRaw, 10) } : {}) });
          return result.ok ? 0 : 1;
        }
      case "dag-create":
      case "dag:create":
        {
          const file = getStringFlag(parsed.flags, "file");
          const actorFlag = getStringFlag(parsed.flags, "actor");
          const result = await new DagCreateCommand().run({
            ...(file !== undefined ? { file } : {}),
            ...(actorFlag !== undefined ? { actor: actorFlag } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "dag-list":
      case "dag:list":
        {
          const statusFlag = getStringFlag(parsed.flags, "status");
          const tenantFlag = getStringFlag(parsed.flags, "tenantId");
          const limitRaw = getStringFlag(parsed.flags, "limit");
          const result = await new DagListCommand().run({
            json: hasFlag(parsed.flags, "json"),
            ...(statusFlag !== undefined ? { status: statusFlag } : {}),
            ...(tenantFlag !== undefined ? { tenantId: tenantFlag } : {}),
            ...(limitRaw ? { limit: parseInt(limitRaw, 10) } : {}),
          });
          return result.ok ? 0 : 1;
        }
      case "dag-inspect":
      case "dag:inspect":
        {
          const runIdFlag = getStringFlag(parsed.flags, "runId") ?? "";
          const result = await new DagInspectCommand().run({
            runId: runIdFlag,
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "dag-execute":
      case "dag:execute":
        {
          const runIdFlag = getStringFlag(parsed.flags, "runId") ?? "";
          const result = await new DagExecuteCommand().run({
            runId: runIdFlag,
            force: hasFlag(parsed.flags, "force"),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "dag-retry-node":
      case "dag:retry-node":
        {
          const runIdFlag = getStringFlag(parsed.flags, "runId") ?? "";
          const nodeIdFlag = getStringFlag(parsed.flags, "nodeId") ?? "";
          const result = await new DagRetryNodeCommand().run({
            runId: runIdFlag,
            nodeId: nodeIdFlag,
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "dag-skip-node":
      case "dag:skip-node":
        {
          const runIdFlag = getStringFlag(parsed.flags, "runId") ?? "";
          const nodeIdFlag = getStringFlag(parsed.flags, "nodeId") ?? "";
          const result = await new DagSkipNodeCommand().run({
            runId: runIdFlag,
            nodeId: nodeIdFlag,
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "dag-audit":
      case "dag:audit":
        {
          const runIdFlag = getStringFlag(parsed.flags, "runId") ?? "";
          const limitRaw = getStringFlag(parsed.flags, "limit");
          const result = await new DagAuditCommand().run({
            runId: runIdFlag,
            json: hasFlag(parsed.flags, "json"),
            ...(limitRaw ? { limit: parseInt(limitRaw, 10) } : {}),
          });
          return result.ok ? 0 : 1;
        }
      case "dag-outputs":
      case "dag:outputs":
        {
          const runIdFlag = getStringFlag(parsed.flags, "runId") ?? "";
          const nodeIdFlag = getStringFlag(parsed.flags, "nodeId");
          const result = await new DagOutputsCommand().run({
            runId: runIdFlag,
            json: hasFlag(parsed.flags, "json"),
            ...(nodeIdFlag !== undefined ? { nodeId: nodeIdFlag } : {}),
          });
          return result.ok ? 0 : 1;
        }
      case "normalize-entity":
        {
          const entityType = getStringFlag(parsed.flags, "entityType");
          const data = getStringFlag(parsed.flags, "data");
          const file = getStringFlag(parsed.flags, "file");
          if (!entityType) {
            console.error(
              "Usage: normalize-entity --entityType <type> (--data '<json>' | --file <path>) [--json]",
            );
            return 1;
          }
          const result = await new NormalizeEntityCommand().run({
            entityType,
            ...(data !== undefined ? { data } : {}),
            ...(file !== undefined ? { file } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "list-entities":
        {
          const entityType = getStringFlag(parsed.flags, "entityType");
          const tenantIdFlag = getStringFlag(parsed.flags, "tenantId");
          const limitRaw = getStringFlag(parsed.flags, "limit");
          if (!entityType) {
            console.error("Usage: list-entities --entityType <type> [--tenantId <id>] [--limit <n>] [--json]");
            return 1;
          }
          const result = await new ListEntitiesCommand().run({
            entityType,
            ...(tenantIdFlag !== undefined ? { tenantId: tenantIdFlag } : {}),
            ...(limitRaw !== undefined ? { limit: parseInt(limitRaw, 10) } : {}),
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "get-entity":
        {
          const entityType = getStringFlag(parsed.flags, "entityType");
          const entityIdFlag = getStringFlag(parsed.flags, "entityId");
          if (!entityType || !entityIdFlag) {
            console.error("Usage: get-entity --entityType <type> --entityId <id> [--json]");
            return 1;
          }
          const result = await new GetEntityCommand().run({
            entityType,
            entityId: entityIdFlag,
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "telegram-start":
        {
          const result = await new TelegramStartCommand().run({
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "telegram-status":
        {
          const result = await new TelegramStatusCommand().run({
            json: hasFlag(parsed.flags, "json"),
          });
          return result.ok ? 0 : 1;
        }
      case "lead-to-offer":
        {
          const result = await new LeadToOfferCommand().run({
            json: hasFlag(parsed.flags, "json"),
            ...(getStringFlag(parsed.flags, "firstName") !== undefined ? { firstName: getStringFlag(parsed.flags, "firstName")! } : {}),
            ...(getStringFlag(parsed.flags, "lastName") !== undefined ? { lastName: getStringFlag(parsed.flags, "lastName")! } : {}),
            ...(getStringFlag(parsed.flags, "email") !== undefined ? { email: getStringFlag(parsed.flags, "email")! } : {}),
            ...(getStringFlag(parsed.flags, "company") !== undefined ? { company: getStringFlag(parsed.flags, "company")! } : {}),
            ...(getStringFlag(parsed.flags, "source") !== undefined ? { source: getStringFlag(parsed.flags, "source")! } : {}),
            ...(getStringFlag(parsed.flags, "offerType") !== undefined ? { offerType: getStringFlag(parsed.flags, "offerType")! } : {}),
            ...(getStringFlag(parsed.flags, "offerTitle") !== undefined ? { offerTitle: getStringFlag(parsed.flags, "offerTitle")! } : {}),
            ...(getStringFlag(parsed.flags, "tenantId") !== undefined ? { tenantId: getStringFlag(parsed.flags, "tenantId")! } : {}),
            ...(getStringFlag(parsed.flags, "airtableRecordId") !== undefined ? { airtableRecordId: getStringFlag(parsed.flags, "airtableRecordId")! } : {}),
          });
          return result.ok ? 0 : 1;
        }
      case "crm":
        {
          const result = await new CrmCommand().run({
            json: hasFlag(parsed.flags, "json"),
            ...(getStringFlag(parsed.flags, "object") !== undefined ? { object: getStringFlag(parsed.flags, "object")! } : {}),
            ...(getStringFlag(parsed.flags, "action") !== undefined ? { action: getStringFlag(parsed.flags, "action")! } : {}),
            ...(getStringFlag(parsed.flags, "tenant") !== undefined ? { tenantId: getStringFlag(parsed.flags, "tenant")! } : {}),
            ...(getStringFlag(parsed.flags, "actor") !== undefined ? { actorId: getStringFlag(parsed.flags, "actor")! } : {}),
            ...(getStringFlag(parsed.flags, "actorType") !== undefined ? { actorType: getStringFlag(parsed.flags, "actorType")! } : {}),
            ...(getStringFlag(parsed.flags, "id") !== undefined ? { id: getStringFlag(parsed.flags, "id")! } : {}),
            ...(getStringFlag(parsed.flags, "data") !== undefined ? { payload: getStringFlag(parsed.flags, "data")! } : {}),
            ...(getStringFlag(parsed.flags, "approvalStatus") !== undefined ? { approvalStatus: getStringFlag(parsed.flags, "approvalStatus")! } : {}),
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

function parseRetrievalNamespace(value: string | undefined): RetrievalNamespace | undefined {
  switch (value) {
    case "system_docs":
    case "client_docs":
    case "brand_voice":
    case "workflow_docs":
    case "content_assets":
    case "aeo_research":
    case "attribution_memory":
    case "audit_memory":
    case "tool_docs":
      return value;
    default:
      return undefined;
  }
}

function parseRetrievalNamespaces(value: string): RetrievalNamespace[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .map((s) => parseRetrievalNamespace(s))
    .filter((s): s is RetrievalNamespace => s !== undefined);
}

function parseRetrievalSourceType(value: string | undefined): RetrievalSourceType | undefined {
  switch (value) {
    case "markdown":
    case "text":
    case "json":
    case "jsonl":
    case "pdf_stub":
    case "docx_stub":
      return value;
    default:
      return undefined;
  }
}

function parseRetrievalEnvironment(value: string | undefined): RetrievalEnvironment | undefined {
  switch (value) {
    case "production":
    case "staging":
    case "development":
    case "test":
      return value;
    default:
      return undefined;
  }
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
