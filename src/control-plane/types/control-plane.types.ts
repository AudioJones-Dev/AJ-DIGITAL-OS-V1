export type TelegramCommandName =
  | "help"
  | "status"
  | "ops-dashboard"
  | "ops-pending"
  | "ops-track";

export interface TelegramInboundMessage {
  updateId: number;
  messageId: number;
  telegramUserId: string;
  telegramChatId: string;
  text: string;
  timestamp: string;
}

export interface ParsedTelegramCommand {
  ok: true;
  command: TelegramCommandName;
  args: {
    runId?: string;
  };
  normalizedText: string;
}

export interface RejectedTelegramCommand {
  ok: false;
  reason: string;
  normalizedText: string;
}

export type TelegramParseResult = ParsedTelegramCommand | RejectedTelegramCommand;

export interface TelegramAuthResult {
  authorized: boolean;
  reason?: string;
}

export interface CommandExecutionResult {
  ok: boolean;
  responseText: string;
  details?: Record<string, unknown>;
}

export interface CliExecutionResult {
  ok: boolean;
  commandId: "ops-dashboard" | "ops-pending" | "ops-track";
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  usedJsonMode: boolean;
}

export interface ControlPlaneHealthReport {
  ok: boolean;
  checks: {
    botTokenConfigured: boolean;
    allowlistConfigured: boolean;
    cliAvailable: boolean;
    modelRootMounted: "mounted" | "not configured" | "not mounted";
  };
  errors: string[];
}

export interface AuditLogRecord {
  requestId: string;
  telegramUserId: string;
  telegramChatId: string;
  rawText: string;
  parsedCommand: string;
  authorized: boolean;
  status: "success" | "failure";
  durationMs: number;
  timestamp: string;
  errorMessage?: string;
}
