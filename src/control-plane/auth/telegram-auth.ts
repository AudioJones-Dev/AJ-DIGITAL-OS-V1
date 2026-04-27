import type { TelegramAuthResult } from "../types/control-plane.types.js";

function parseCsvSet(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set<string>();
  }

  return new Set(
    raw
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );
}

export class TelegramAuthService {
  private readonly allowedUserIds: Set<string>;
  private readonly allowedChatIds: Set<string>;

  constructor(
    allowedUsersCsv = process.env.AJ_ALLOWED_TELEGRAM_USER_IDS,
    allowedChatsCsv = process.env.AJ_ALLOWED_TELEGRAM_CHAT_IDS,
  ) {
    this.allowedUserIds = parseCsvSet(allowedUsersCsv);
    this.allowedChatIds = parseCsvSet(allowedChatsCsv);
  }

  isConfigured(): boolean {
    return this.allowedUserIds.size > 0 && this.allowedChatIds.size > 0;
  }

  authorize(telegramUserId: string, telegramChatId: string): TelegramAuthResult {
    if (!this.isConfigured()) {
      return {
        authorized: false,
        reason: "Allowlist configuration missing. AJ_ALLOWED_TELEGRAM_USER_IDS and AJ_ALLOWED_TELEGRAM_CHAT_IDS are required.",
      };
    }

    if (!this.allowedUserIds.has(telegramUserId)) {
      return {
        authorized: false,
        reason: `Unauthorized telegram user ID: ${telegramUserId}`,
      };
    }

    if (!this.allowedChatIds.has(telegramChatId)) {
      return {
        authorized: false,
        reason: `Unauthorized telegram chat ID: ${telegramChatId}`,
      };
    }

    return { authorized: true };
  }
}
