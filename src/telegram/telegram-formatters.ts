/**
 * Pure Telegram-message formatting helpers. Kept stateless so they can be
 * unit-tested without booting the bot.
 */

import type { ApprovalRequest } from "../security/approvals/approval-types.js";
import type { ControlRunRecord } from "../control-plane/run-registry/run-control-types.js";
import type {
  ParsedTelegramCommand,
  TelegramBotStatus,
  TelegramCommandName,
} from "./telegram-types.js";

const VALID_COMMANDS: ReadonlySet<TelegramCommandName> = new Set([
  "approvals",
  "approve",
  "reject",
  "status",
  "runs",
  "help",
]);

export function parseTelegramCommand(text: string | undefined | null): ParsedTelegramCommand | null {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const tokens = trimmed.split(/\s+/);
  const head = tokens[0] ?? "";
  const cmdRaw = head.slice(1).split("@")[0]?.toLowerCase() ?? "";
  if (!cmdRaw) return null;
  if (!VALID_COMMANDS.has(cmdRaw as TelegramCommandName)) return null;
  return {
    command: cmdRaw as TelegramCommandName,
    args: tokens.slice(1),
    raw: trimmed,
  };
}

export function formatApprovalList(approvals: readonly ApprovalRequest[]): string {
  if (approvals.length === 0) return "No pending approvals";
  const lines = ["Pending approvals:"];
  for (const a of approvals) {
    lines.push(
      `• ${a.approvalId} — ${a.actionCategory} (${a.risk}) requested by ${a.requestedByAgentId}`,
    );
  }
  lines.push("");
  lines.push("Use /approve <id> or /reject <id>.");
  return lines.join("\n");
}

export function formatRunList(runs: readonly ControlRunRecord[]): string {
  if (runs.length === 0) return "No runs found";
  const lines = ["Recent runs:"];
  for (const r of runs) {
    lines.push(`• ${r.runId} [${r.controlState}] agent=${r.agentId}`);
  }
  return lines.join("\n");
}

export function formatHelp(): string {
  return [
    "AJ Digital OS — Telegram operator commands:",
    "/approvals — list pending approvals",
    "/approve <id> — approve a request",
    "/reject <id> — reject a request",
    "/runs — last 5 control runs",
    "/status — bot status",
    "/help — this message",
  ].join("\n");
}

export function formatStatus(status: TelegramBotStatus): string {
  const lines = [
    `Configured: ${status.configured ? "yes" : "no"}`,
    `Running: ${status.running ? "yes" : "no"}`,
  ];
  if (status.chatId) lines.push(`Chat: ${status.chatId}`);
  if (status.lastPolledAt) lines.push(`Last poll: ${status.lastPolledAt}`);
  return lines.join("\n");
}
