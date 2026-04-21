/**
 * Telegram Control Plane Types
 *
 * Defines types for the Telegram local control interface to AJ OS operations.
 */

export interface TelegramMessage {
  messageId: number;
  chatId: number;
  userId: number;
  userName?: string | undefined;
  firstName?: string | undefined;
  text: string;
  timestamp: number;
}

export interface ControlPlaneCommand {
  command: string;
  args: string[];
  rawMessage: TelegramMessage;
}

export interface ControlPlaneResponse {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
}

export interface AuthContext {
  userId: number;
  chatId: number;
  userName?: string | undefined;
  isAuthorized: boolean;
}

export interface AJOSCommand {
  operation: string;
  params: Record<string, unknown>;
}

export interface AJOSCommandResult {
  ok: boolean;
  operation: string;
  result?: unknown;
  error?: string;
}

export interface OllamaHealthStatus {
  enabled: boolean;
  healthy: boolean;
  baseUrl: string;
  model: string;
  error?: string;
}

export interface OllamaAskResult {
  ok: boolean;
  answer?: string;
  error?: string;
}

export interface ControlPlaneConfig {
  botToken: string;
  allowedUserIds: number[];
  allowedChatIds: number[];
  pollIntervalMs: number;
}