/**
 * @layer L11 — Interface / Shell Layer
 * @purpose Telegram approval bot types
 */

export interface TelegramBotConfig {
  botToken: string;
  chatId: string;
  pollIntervalMs?: number;
}

export interface TelegramUser {
  id: number;
  is_bot?: boolean;
  first_name?: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type?: string;
  title?: string;
  username?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

export type TelegramCommandName =
  | "approvals"
  | "approve"
  | "reject"
  | "status"
  | "runs"
  | "help";

export interface ParsedTelegramCommand {
  command: TelegramCommandName;
  args: string[];
  raw: string;
}

export interface TelegramBotStatus {
  configured: boolean;
  running: boolean;
  chatId?: string;
  hasToken: boolean;
  lastPolledAt?: string;
}
