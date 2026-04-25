import type { BelToolName, BelExecutionMode } from "./bel-types.js";

export interface BelCapabilities {
  tools: BelToolName[];
  modes: BelExecutionMode[];
  version: "v3";
  ready: boolean;
}

export function getCapabilities(): BelCapabilities {
  return {
    tools: ["filesystem", "browser", "shell"],
    modes: ["explore", "script", "supervisor"],
    version: "v3",
    ready: true,
  };
}
