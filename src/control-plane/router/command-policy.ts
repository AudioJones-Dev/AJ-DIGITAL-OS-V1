import type { TelegramCommandName } from "../types/control-plane.types.js";

export interface CommandPolicy {
  commandId: TelegramCommandName;
  cliArgs?: string[];
}

export const COMMAND_POLICY: Record<TelegramCommandName, CommandPolicy> = {
  help: {
    commandId: "help",
  },
  status: {
    commandId: "status",
  },
  "ops-dashboard": {
    commandId: "ops-dashboard",
    cliArgs: ["dashboard"],
  },
  "ops-pending": {
    commandId: "ops-pending",
    cliArgs: ["list-pending-approvals"],
  },
  "ops-track": {
    commandId: "ops-track",
    cliArgs: ["track-run"],
  },
};
