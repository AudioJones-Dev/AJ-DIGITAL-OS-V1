import axios from "axios";
import { randomUUID } from "node:crypto";

import { logger } from "../../core/logger.js";
import { TelegramAuthService } from "../auth/telegram-auth.js";
import { ControlPlaneAuditLogger } from "../observability/control-plane-audit.js";
import { ControlPlaneHealthService } from "../observability/health.service.js";
import { TaskRouter } from "../router/task-router.js";
import type { AuditLogRecord, TelegramInboundMessage } from "../types/control-plane.types.js";
import { TelegramParser } from "./telegram-parser.js";
import { TelegramResponder } from "./telegram-responder.js";

interface TelegramGetUpdatesResponse {
  ok: boolean;
  result?: TelegramUpdate[];
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    text?: string;
    date?: number;
    from?: {
      id?: number;
    };
    chat?: {
      id?: number;
    };
  };
}

export class TelegramListenerService {
  private readonly botToken: string;
  private readonly baseUrl: string;
  private readonly pollIntervalMs: number;
  private offset = 0;
  private shouldRun = true;

  constructor(
    private readonly parser = new TelegramParser(),
    private readonly authService = new TelegramAuthService(),
    private readonly router = new TaskRouter(authService),
    private readonly responder = new TelegramResponder(),
    private readonly auditLogger = new ControlPlaneAuditLogger(),
    private readonly healthService = new ControlPlaneHealthService(authService),
  ) {
    this.botToken = process.env.AJ_TELEGRAM_BOT_TOKEN ?? "";
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
    this.pollIntervalMs = Number(process.env.AJ_CONTROL_PLANE_POLL_INTERVAL_MS ?? "5000");
  }

  async start(): Promise<void> {
    const health = await this.healthService.validateStartup();
    if (!health.ok) {
      throw new Error(`Control plane startup failed: ${health.errors.join(" ")}`);
    }

    logger.info("Telegram control plane listener started.", {
      pollIntervalMs: this.pollIntervalMs,
    });

    while (this.shouldRun) {
      const updates = await this.fetchUpdates();
      for (const update of updates) {
        await this.handleUpdate(update);
      }

      await sleep(this.pollIntervalMs);
    }
  }

  stop(): void {
    this.shouldRun = false;
  }

  private async fetchUpdates(): Promise<TelegramUpdate[]> {
    const response = await axios.get<TelegramGetUpdatesResponse>(`${this.baseUrl}/getUpdates`, {
      params: {
        timeout: 30,
        offset: this.offset,
      },
    });

    if (!response.data.ok || !response.data.result) {
      return [];
    }

    return response.data.result;
  }

  private normalizeUpdate(update: TelegramUpdate): TelegramInboundMessage | undefined {
    const text = update.message?.text?.trim();
    const userId = update.message?.from?.id;
    const chatId = update.message?.chat?.id;
    const messageId = update.message?.message_id;

    if (!text || userId === undefined || chatId === undefined || messageId === undefined) {
      return undefined;
    }

    return {
      updateId: update.update_id,
      messageId,
      telegramUserId: String(userId),
      telegramChatId: String(chatId),
      text,
      timestamp: new Date((update.message?.date ?? Math.floor(Date.now() / 1000)) * 1000).toISOString(),
    };
  }

  private async handleUpdate(update: TelegramUpdate): Promise<void> {
    this.offset = update.update_id + 1;
    const normalized = this.normalizeUpdate(update);
    if (!normalized) {
      return;
    }

    const requestId = randomUUID();
    const startedAt = Date.now();
    const parsed = this.parser.parse(normalized.text);
    const authResult = this.authService.authorize(normalized.telegramUserId, normalized.telegramChatId);

    if (!authResult.authorized) {
      const message = "Unauthorized request. This control plane is private and allowlist-only.";
      await this.safeRespond(normalized.telegramChatId, message);
      await this.writeAudit({
        requestId,
        normalized,
        parsedCommand: parsed.ok ? parsed.command : "parse-rejected",
        authorized: false,
        status: "failure",
        durationMs: Date.now() - startedAt,
        ...(authResult.reason ? { errorMessage: authResult.reason } : {}),
      });
      logger.warn("Telegram auth rejected.", {
        requestId,
        telegramUserId: normalized.telegramUserId,
        telegramChatId: normalized.telegramChatId,
      });
      return;
    }

    if (!parsed.ok) {
      await this.safeRespond(normalized.telegramChatId, parsed.reason);
      await this.writeAudit({
        requestId,
        normalized,
        parsedCommand: "parse-rejected",
        authorized: true,
        status: "failure",
        durationMs: Date.now() - startedAt,
        errorMessage: parsed.reason,
      });
      return;
    }

    try {
      const result = await this.router.route(parsed);
      await this.safeRespond(normalized.telegramChatId, result.responseText);
      await this.writeAudit({
        requestId,
        normalized,
        parsedCommand: parsed.command,
        authorized: true,
        status: result.ok ? "success" : "failure",
        durationMs: Date.now() - startedAt,
        ...(result.ok ? {} : { errorMessage: "Command execution failed." }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Control plane command failed.";
      await this.safeRespond(normalized.telegramChatId, `Request failed: ${message}`);
      await this.writeAudit({
        requestId,
        normalized,
        parsedCommand: parsed.command,
        authorized: true,
        status: "failure",
        durationMs: Date.now() - startedAt,
        errorMessage: message,
      });
    }
  }

  private async safeRespond(chatId: string, text: string): Promise<void> {
    try {
      await this.responder.sendMessage(chatId, text);
    } catch (error) {
      logger.error("Telegram send response failed.", {
        error: error instanceof Error ? error.message : "Unknown Telegram send error.",
      });
    }
  }

  private async writeAudit(payload: {
    requestId: string;
    normalized: TelegramInboundMessage;
    parsedCommand: string;
    authorized: boolean;
    status: "success" | "failure";
    durationMs: number;
    errorMessage?: string;
  }): Promise<void> {
    const record: AuditLogRecord = {
      requestId: payload.requestId,
      telegramUserId: payload.normalized.telegramUserId,
      telegramChatId: payload.normalized.telegramChatId,
      rawText: payload.normalized.text,
      parsedCommand: payload.parsedCommand,
      authorized: payload.authorized,
      status: payload.status,
      durationMs: payload.durationMs,
      timestamp: new Date().toISOString(),
      ...(payload.errorMessage ? { errorMessage: payload.errorMessage } : {}),
    };
    await this.auditLogger.log(record);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
