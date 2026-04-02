#!/usr/bin/env node
import { fileURLToPath } from "node:url";

import {
  ApproveRunCommand,
  DashboardCommand,
  ExecuteRunCommand,
  HelpCommand,
  ListApprovedRunsCommand,
  ListExecutedRunsCommand,
  ListFailedRunsCommand,
  ListPendingApprovalsCommand,
  OperatorConsoleCommand,
  ResumeRunCommand,
  RunEventsCommand,
  RunSummaryCommand,
  TrackRunCommand,
  type TrackRunViewMode,
} from "./commands/index.js";
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

    const key = token.slice(2);
    if (key === "json" || key === "reverse") {
      flags[key] = true;
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
  const view = normalizeTrackRunView(getStringFlag(parsed.flags, "view"));
  const decision = normalizeApprovalDecision(getStringFlag(parsed.flags, "decision"));
  const approvalSource = normalizeApprovalSource(source);

  try {
    switch (command) {
      case "help":
        await new HelpCommand().run({
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
      case "dashboard":
        await new DashboardCommand().run({
          ...(limit !== undefined ? { limit } : {}),
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
      case "operator-console":
        await new OperatorConsoleCommand().run({
          ...(limit !== undefined ? { limit } : {}),
          json: hasFlag(parsed.flags, "json"),
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
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
      case "approve-run":
        await new ApproveRunCommand().run({
          runId,
          decision: (decision ?? "") as ApprovalDecision,
          ...(approvalSource ? { source: approvalSource } : {}),
          ...(actor ? { actor } : {}),
          json: hasFlag(parsed.flags, "json"),
        });
        return 0;
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
