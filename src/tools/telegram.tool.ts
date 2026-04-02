import axios from "axios";

export interface TelegramMessagePayload {
  chatId: string;
  text: string;
}

export interface TelegramResponse {
  ok: boolean;
  messageId?: number;
  error?: string;
}

/**
 * Thin Telegram API wrapper for approval notifications.
 */
export class TelegramTool {
  private readonly botToken: string;
  private readonly baseUrl: string;

  constructor(botToken = process.env.TELEGRAM_BOT_TOKEN ?? "") {
    this.botToken = botToken;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  /**
   * Sends a Markdown-formatted Telegram message.
   */
  async sendMessage(payload: TelegramMessagePayload): Promise<TelegramResponse> {
    try {
      if (!this.botToken) {
        throw new Error("Missing TELEGRAM_BOT_TOKEN");
      }

      if (!payload.chatId.trim()) {
        throw new Error("Missing Telegram chat ID");
      }

      const response = await axios.post<{ result?: { message_id?: number } }>(
        `${this.baseUrl}/sendMessage`,
        {
          chat_id: payload.chatId,
          text: payload.text,
          parse_mode: "Markdown",
        },
      );

      const messageId = response.data.result?.message_id;
      return messageId === undefined
        ? { ok: true }
        : {
            ok: true,
            messageId,
          };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Telegram send failed.",
      };
    }
  }
}
