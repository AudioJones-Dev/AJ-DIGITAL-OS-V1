/**
 * Telegram Authorization Module
 *
 * Validates Telegram users and chats against configured allowlist.
 * Startup fails closed if configuration is missing.
 */

import type { AuthContext, ControlPlaneConfig, TelegramMessage } from "../types/control-plane.types.js";
import { logger } from "../../core/logger.js";

export class TelegramAuthService {
  constructor(private readonly config: ControlPlaneConfig) {
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.botToken || this.config.botToken.trim().length === 0) {
      throw new Error("FATAL: AJ_TELEGRAM_BOT_TOKEN environment variable is not set. Control plane will not start.");
    }

    if (!this.config.allowedUserIds || this.config.allowedUserIds.length === 0) {
      throw new Error(
        "FATAL: AJ_ALLOWED_TELEGRAM_USER_IDS environment variable is not set or is empty. At least one user ID is required."
      );
    }

    logger.info("Telegram auth service initialized", {
      botTokenLength: this.config.botToken.length,
      allowedUserCount: this.config.allowedUserIds.length,
      allowedChatCount: this.config.allowedChatIds.length,
    });
  }

  authorize(message: TelegramMessage): AuthContext {
    const isUserAuthorized = this.config.allowedUserIds.includes(message.userId);
    const isChatAuthorized =
      this.config.allowedChatIds.length === 0 || this.config.allowedChatIds.includes(message.chatId);

    const isAuthorized = isUserAuthorized && isChatAuthorized;

    const context: AuthContext = {
      userId: message.userId,
      chatId: message.chatId,
      userName: message.userName,
      isAuthorized,
    };

    if (!isAuthorized) {
      logger.warn("Unauthorized Telegram message rejected", {
        userId: message.userId,
        chatId: message.chatId,
        userName: message.userName,
        reason: isUserAuthorized ? "chat_not_allowed" : "user_not_allowed",
      });
    } else {
      logger.info("Telegram message authorized", {
        userId: message.userId,
        chatId: message.chatId,
        userName: message.userName,
      });
    }

    return context;
  }
}

export function createTelegramAuthService(): TelegramAuthService {
  const botToken = process.env.AJ_TELEGRAM_BOT_TOKEN;

  const allowedUserIdsRaw = process.env.AJ_ALLOWED_TELEGRAM_USER_IDS;
  const allowedUserIds = allowedUserIdsRaw
    ? allowedUserIdsRaw
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => !Number.isNaN(id))
    : [];

  const allowedChatIdsRaw = process.env.AJ_ALLOWED_TELEGRAM_CHAT_IDS || "";
  const allowedChatIds = allowedChatIdsRaw
    ? allowedChatIdsRaw
        .split(",")
        .map((id) => Number(id.trim()))
        .filter((id) => !Number.isNaN(id))
    : [];

  const pollIntervalMs = Number(process.env.AJ_CONTROL_PLANE_POLL_INTERVAL_MS) || 1000;

  return new TelegramAuthService({
    botToken: botToken || "",
    allowedUserIds,
    allowedChatIds,
    pollIntervalMs,
  });
}