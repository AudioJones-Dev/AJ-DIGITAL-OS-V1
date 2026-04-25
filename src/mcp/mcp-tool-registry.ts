import type { BelToolName } from "../bel/bel-types.js";

export interface ToolRegistryEntry {
  name: string;
  description: string;
  available: boolean;
  tier: "read" | "execute" | "full";
}

const registryMap = new Map<string, ToolRegistryEntry>();

export function registerTool(entry: ToolRegistryEntry): void {
  registryMap.set(entry.name, entry);
}

export function getTool(name: string): ToolRegistryEntry | undefined {
  return registryMap.get(name);
}

export function listTools(): ToolRegistryEntry[] {
  return Array.from(registryMap.values());
}

const BEL_TOOLS: Array<{
  name: BelToolName;
  description: string;
  tier: ToolRegistryEntry["tier"];
}> = [
  {
    name: "filesystem",
    description: "Read files and list directories within allowed project paths.",
    tier: "read",
  },
  {
    name: "shell",
    description: "Execute approved shell commands in the project environment.",
    tier: "execute",
  },
  {
    name: "browser",
    description: "Automate browser interactions for web research and automation.",
    tier: "full",
  },
];

for (const tool of BEL_TOOLS) {
  registerTool({ name: tool.name, description: tool.description, available: true, tier: tool.tier });
}
