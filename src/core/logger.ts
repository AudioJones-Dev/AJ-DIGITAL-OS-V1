import { formatWithOptions } from "node:util";

type LogLevel = "info" | "warn" | "error" | "silent";

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  info: 10,
  warn: 20,
  error: 30,
  silent: 40,
};

const resolveLogLevel = (): LogLevel => {
  switch (process.env.AJ_OS_LOG_LEVEL?.trim().toLowerCase()) {
    case "info":
      return "info";
    case "error":
      return "error";
    case "silent":
      return "silent";
    case "warn":
    default:
      return "warn";
  }
};

const activeLogLevel = resolveLogLevel();

const shouldLog = (level: Exclude<LogLevel, "silent">): boolean => {
  return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[activeLogLevel];
};

const writeLog = (
  level: Exclude<LogLevel, "silent">,
  message: string,
  data?: Record<string, unknown>,
): void => {
  if (!shouldLog(level)) {
    return;
  }

  const payload = data ? ` ${formatWithOptions({ colors: false, depth: null }, data)}` : "";
  process.stderr.write(`${message}${payload}\n`);
};

/**
 * Minimal logger wrapper to keep the starter scaffold explicit and testable.
 * Logs are written to stderr so JSON-mode commands can keep stdout machine-readable.
 */
export const logger = {
  info(message: string, data?: Record<string, unknown>): void {
    writeLog("info", message, data);
  },
  warn(message: string, data?: Record<string, unknown>): void {
    writeLog("warn", message, data);
  },
  error(message: string, data?: Record<string, unknown>): void {
    writeLog("error", message, data);
  },
};
