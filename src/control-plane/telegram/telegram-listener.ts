/**
 * Telegram Listener Module
 *
 * Polls Telegram Bot API for incoming messages.
 * Uses long-polling strategy for simplicity (no webhooks needed).
 */

import { logger } from "../../core/logger.js";
import type { TelegramMessage } from "../types/control-plane.types.js";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    date: number;
    text?: string;
    from?: {
      id: number;
      is_bot: boolean;
      first_name: string;
      username?: string;
    };
    chat?: {
      id: number;
      type: string;
    };
  };
}

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
}

export class TelegramListener {
  private isRunning = false;
  private lastUpdateId = 0;
  private pollInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly botToken: string,
    private readonly pollIntervalMs: number,
    private readonly onMessage: (message: TelegramMessage) => Promise<void>
  ) {}

  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn("Telegram listener already running");
      return;
    }

    this.isRunning = true;
    logger.info("Telegram listener starting", {
      pollIntervalMs: this.pollIntervalMs,
    });

    // Start polling
    await this.poll();
  }

  async stop(): Promise<void> {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }

    logger.info("Telegram listener stopped");
  }

  private async poll(): Promise<void> {
    this.pollInterval = setInterval(async () => {
      try {
        const updates = await this.getUpdates();

        for (const update of updates) {
          if (update.message && update.message.text) {
            const message = this.mapUpdateToMessage(update);
            this.lastUpdateId = Math.max(this.lastUpdateId, update.update_id);

            try {
              await this.onMessage(message);
            } catch (error) {
              logger.error("Error processing Telegram message", {
                messageId: message.messageId,
                error: error instanceof Error ? error.message : String(error),
              });
            }
          }
        }
      } catch (error) {
        logger.error("Error polling Telegram API", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, this.pollIntervalMs);
  }

  private async getUpdates(): Promise<TelegramUpdate[]> {
    const url = `https://api.telegram.org/bot${this.botToken}/getUpdates`;
    const params = new URLSearchParams({
      offset: String(this.lastUpdateId + 1),
      timeout: "30",
    });

    const response = await fetch(`${url}?${params}`);
    const data: TelegramApiResponse<TelegramUpdate[]> = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description || "Unknown error"}`);
    }

    return data.result || [];
  }

  private mapUpdateToMessage(update: TelegramUpdate): TelegramMessage {
    const msg = update.message!;
    const from = msg.from!;
    const chat = msg.chat!;

    return {
      messageId: msg.message_id,
      chatId: chat.id,
      userId: from.id,
      userName: from.username,
      firstName: from.first_name,
      text: msg.text || "",
      timestamp: msg.date,
    };
  }
}