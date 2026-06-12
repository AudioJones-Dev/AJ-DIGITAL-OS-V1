/**
 * @layer L11 — Interface / Shell Layer
 * @purpose Lightweight Telegram approval bot for mobile operators
 *
 * Polls Telegram getUpdates every few seconds, dispatches /approve, /reject,
 * /approvals, /status, /runs, and /help commands. Uses Node's global fetch
 * for HTTP calls — no external bot library.
 */

import { defaultApprovalService } from "../security/approvals/approval-service.js";
import type { ApprovalRequest } from "../security/approvals/approval-types.js";
import { ApprovalResolver } from "../services/approval/approval-resolver.js";
import { listControlRuns } from "../control-plane/run-registry/run-control-store.js";
import type { ControlRunRecord } from "../control-plane/run-registry/run-control-types.js";
import { logger } from "../core/logger.js";
import {
  parseTelegramCommand,
  formatApprovalList,
  formatRunList,
  formatHelp,
  formatStatus,
} from "./telegram-formatters.js";
import type {
  ParsedTelegramCommand,
  TelegramBotConfig,
  TelegramBotStatus,
  TelegramUpdate,
} from "./telegram-types.js";

const DEFAULT_POLL_INTERVAL_MS = 5000;

interface BotState {
  config: TelegramBotConfig;
  running: boolean;
  offset: number;
  timer: NodeJS.Timeout | null;
  lastPolledAt: string | null;
}

let state: BotState | null = null;

export function readTelegramConfig(): TelegramBotConfig | null {
  const botToken = process.env["TELEGRAM_BOT_TOKEN"];
  const chatId = process.env["TELEGRAM_CHAT_ID"];
  if (!botToken || !chatId) return null;
  return { botToken, chatId };
}

export function getTelegramStatus(): TelegramBotStatus {
  const cfg = readTelegramConfig();
  const running = state !== null && state.running;
  const status: TelegramBotStatus = {
    configured: cfg !== null,
    running,
    hasToken: cfg !== null,
  };
  if (cfg) status.chatId = cfg.chatId;
  if (state?.lastPolledAt) status.lastPolledAt = state.lastPolledAt;
  return status;
}

export async function startTelegramBot(
  override?: Partial<TelegramBotConfig>,
): Promise<{ ok: boolean; reason?: string }> {
  const env = readTelegramConfig();
  const merged: TelegramBotConfig | null =
    override?.botToken && override?.chatId
      ? {
          botToken: override.botToken,
          chatId: override.chatId,
          ...(override.pollIntervalMs !== undefined
            ? { pollIntervalMs: override.pollIntervalMs }
            : {}),
        }
      : env;

  if (!merged) {
    logger.info("Telegram bot not configured.", {
      hint: "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to enable.",
    });
    return { ok: false, reason: "not_configured" };
  }

  if (state?.running) {
    return { ok: true, reason: "already_running" };
  }

  state = {
    config: merged,
    running: true,
    offset: 0,
    timer: null,
    lastPolledAt: null,
  };

  await sendTelegramMessage(merged, "AJ Digital OS Telegram bot online. Send /help for commands.").catch(
    () => undefined,
  );

  const intervalMs = merged.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const tick = async (): Promise<void> => {
    if (!state?.running) return;
    try {
      await pollOnce();
    } catch (err) {
      logger.warn("Telegram poll failed.", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    if (state?.running) {
      state.timer = setTimeout(tick, intervalMs);
    }
  };
  state.timer = setTimeout(tick, intervalMs);
  logger.info("Telegram bot started.", { chatId: merged.chatId });
  return { ok: true };
}

export async function stopTelegramBot(): Promise<void> {
  if (!state) return;
  state.running = false;
  if (state.timer) clearTimeout(state.timer);
  state = null;
  logger.info("Telegram bot stopped.");
}

async function pollOnce(): Promise<void> {
  if (!state) return;
  const url = `https://api.telegram.org/bot${state.config.botToken}/getUpdates?timeout=0&offset=${state.offset}`;
  const res = await fetch(url, { method: "GET" });
  state.lastPolledAt = new Date().toISOString();
  if (!res.ok) {
    return;
  }
  const data = (await res.json().catch(() => null)) as
    | { ok: boolean; result?: TelegramUpdate[] }
    | null;
  if (!data?.ok || !Array.isArray(data.result)) return;

  for (const update of data.result) {
    state.offset = Math.max(state.offset, update.update_id + 1);
    const msg = update.message ?? update.edited_message;
    if (!msg?.text) continue;
    if (String(msg.chat.id) !== String(state.config.chatId)) continue;
    const parsed = parseTelegramCommand(msg.text);
    if (!parsed) continue;
    await handleCommand(parsed).catch((err) => {
      logger.warn("Telegram command handler failed.", {
        command: parsed.command,
        error: err instanceof Error ? err.message : String(err),
      });
    });
  }
}

async function handleCommand(parsed: ParsedTelegramCommand): Promise<void> {
  if (!state) return;
  const cfg = state.config;
  switch (parsed.command) {
    case "help":
      await sendTelegramMessage(cfg, formatHelp());
      return;
    case "approvals": {
      const pending = await listPendingApprovalsSafe();
      await sendTelegramMessage(cfg, formatApprovalList(pending));
      return;
    }
    case "runs": {
      const runs = listRecentRunsSafe(5);
      await sendTelegramMessage(cfg, formatRunList(runs));
      return;
    }
    case "status": {
      await sendTelegramMessage(cfg, formatStatus(getTelegramStatus()));
      return;
    }
    case "approve": {
      const approvalId = parsed.args[0];
      if (!approvalId) {
        await sendTelegramMessage(cfg, "Usage: /approve <approvalId>");
        return;
      }
      const result = await approveApprovalById(approvalId);
      await sendTelegramMessage(cfg, result);
      return;
    }
    case "reject": {
      const approvalId = parsed.args[0];
      if (!approvalId) {
        await sendTelegramMessage(cfg, "Usage: /reject <approvalId>");
        return;
      }
      const result = await rejectApprovalById(approvalId);
      await sendTelegramMessage(cfg, result);
      return;
    }
  }
}

async function listPendingApprovalsSafe(): Promise<ApprovalRequest[]> {
  try {
    return await defaultApprovalService.listPendingApprovals();
  } catch {
    return [];
  }
}

function listRecentRunsSafe(limit: number): ControlRunRecord[] {
  try {
    return listControlRuns({ limit });
  } catch {
    return [];
  }
}

async function approveApprovalById(approvalId: string): Promise<string> {
  try {
    const approved = await defaultApprovalService.approvePendingRequest({
      approvalId,
      actorId: "telegram-operator",
      channel: "telegram",
    });
    void new ApprovalResolver()
      .resolve({ runId: approvalId, decision: "approve", actor: "telegram-operator" })
      .catch(() => undefined);
    return `Approved ${approved.approvalId} (${approved.actionCategory}).`;
  } catch (err) {
    return `Could not approve: ${err instanceof Error ? err.message : "unknown error"}`;
  }
}

async function rejectApprovalById(approvalId: string): Promise<string> {
  try {
    const denied = await defaultApprovalService.denyPendingRequest({
      approvalId,
      actorId: "telegram-operator",
      channel: "telegram",
    });
    void new ApprovalResolver()
      .resolve({ runId: approvalId, decision: "reject", actor: "telegram-operator" })
      .catch(() => undefined);
    return `Rejected ${denied.approvalId} (${denied.actionCategory}).`;
  } catch (err) {
    return `Could not reject: ${err instanceof Error ? err.message : "unknown error"}`;
  }
}

export async function sendTelegramMessage(
  config: TelegramBotConfig,
  text: string,
): Promise<void> {
  const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: config.chatId,
      text,
      disable_web_page_preview: true,
    }),
  }).catch(() => undefined);
}

export { parseTelegramCommand, formatApprovalList, formatRunList } from "./telegram-formatters.js";
