import axios from "axios";

export class TelegramResponder {
  private readonly botToken: string;
  private readonly baseUrl: string;

  constructor(botToken = process.env.AJ_TELEGRAM_BOT_TOKEN ?? "") {
    this.botToken = botToken;
    this.baseUrl = `https://api.telegram.org/bot${this.botToken}`;
  }

  async sendMessage(chatId: string, text: string): Promise<void> {
    if (!this.botToken) {
      throw new Error("Cannot send Telegram response without AJ_TELEGRAM_BOT_TOKEN.");
    }

    const boundedText = text.length > 3500 ? `${text.slice(0, 3500)}\n\n[truncated]` : text;

    await axios.post(`${this.baseUrl}/sendMessage`, {
      chat_id: chatId,
      text: boundedText,
    });
  }
}
