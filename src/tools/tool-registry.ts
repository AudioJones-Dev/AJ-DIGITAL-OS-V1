import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { ToolCapabilityDefinition } from "./tool-capability-types.js";
import type { McpToolAdapterDefinition } from "./mcp-tool-adapter-types.js";
import type { ToolProviderDefinition } from "./tool-provider-types.js";
import type { ToolDefinition, ToolDescriptor, ToolRegistrySnapshot } from "./tool-types.js";

interface ToolCatalogRecord {
  recordType: "tool_provider" | "tool_capability" | "mcp_tool_adapter";
}

/**
 * Registry for scaffolded tool definitions.
 */
export class ToolRegistry {
  private readonly tools = new Map<string, ToolDefinition>();
  private readonly providers = new Map<string, ToolProviderDefinition>();
  private readonly capabilities = new Map<string, ToolCapabilityDefinition>();
  private readonly mcpAdapters = new Map<string, McpToolAdapterDefinition>();
  private readonly toolsDirectory: string;

  constructor(toolsDirectory = path.resolve("data", "tools")) {
    this.toolsDirectory = toolsDirectory;
  }

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  registerProvider(provider: ToolProviderDefinition): void {
    this.providers.set(provider.providerId, provider);
  }

  registerCapability(capability: ToolCapabilityDefinition): void {
    this.capabilities.set(capability.capabilityId, capability);
  }

  registerMcpAdapter(adapter: McpToolAdapterDefinition): void {
    this.mcpAdapters.set(adapter.adapterId, adapter);
  }

  get(name: string): ToolDefinition {
    const tool = this.tools.get(name);

    if (!tool) {
      throw new Error(`Tool "${name}" is not registered.`);
    }

    return tool;
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  list(): string[] {
    return Array.from(this.tools.keys()).sort();
  }

  listEnabled(): ToolDefinition[] {
    return Array.from(this.tools.values()).filter((t) => t.enabled !== false);
  }

  findByCapability(capabilityId: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(
      (t) => t.capabilityIds?.includes(capabilityId) === true,
    );
  }

  listProviders(): ToolProviderDefinition[] {
    return Array.from(this.providers.values()).sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  listCapabilities(): ToolCapabilityDefinition[] {
    return Array.from(this.capabilities.values()).sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  listMcpAdapters(): McpToolAdapterDefinition[] {
    return Array.from(this.mcpAdapters.values()).sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  listToolDescriptors(): ToolDescriptor[] {
    return Array.from(this.tools.values())
      .map((tool) => ({
        name: tool.name,
        displayName: tool.displayName ?? tool.name,
        ...(tool.description ? { description: tool.description } : {}),
        ...(tool.inputSchema ? { inputSchema: tool.inputSchema } : {}),
        ...(tool.providerId ? { providerId: tool.providerId } : {}),
        kind: tool.kind ?? "native",
        capabilityIds: tool.capabilityIds ?? [],
        permissionClassification: tool.permissionClassification ?? "read_only",
        approvalClassification: tool.approvalClassification ?? "none",
        enabled: tool.enabled ?? true,
      }))
      .sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  getDescriptor(name: string): ToolDescriptor | undefined {
    const tool = this.tools.get(name);
    if (!tool) return undefined;
    return {
      name: tool.name,
      displayName: tool.displayName ?? tool.name,
      ...(tool.description ? { description: tool.description } : {}),
      ...(tool.inputSchema ? { inputSchema: tool.inputSchema } : {}),
      ...(tool.providerId ? { providerId: tool.providerId } : {}),
      kind: tool.kind ?? "native",
      capabilityIds: tool.capabilityIds ?? [],
      permissionClassification: tool.permissionClassification ?? "read_only",
      approvalClassification: tool.approvalClassification ?? "none",
      enabled: tool.enabled ?? true,
    };
  }

  snapshot(): ToolRegistrySnapshot {
    return {
      providers: this.listProviders(),
      capabilities: this.listCapabilities(),
      mcpAdapters: this.listMcpAdapters(),
      tools: this.listToolDescriptors(),
    };
  }

  async loadFromDisk(): Promise<void> {
    await mkdir(this.toolsDirectory, { recursive: true });
    const entries = await readdir(this.toolsDirectory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));

    for (const fileName of files) {
      const raw = await readFile(path.join(this.toolsDirectory, fileName), "utf-8");
      const parsed = JSON.parse(raw) as Partial<ToolCatalogRecord> & Record<string, unknown>;
      switch (parsed.recordType) {
        case "tool_provider":
          if (isToolProviderDefinition(parsed)) {
            this.registerProvider(parsed);
          }
          break;
        case "tool_capability":
          if (isToolCapabilityDefinition(parsed)) {
            this.registerCapability(parsed);
          }
          break;
        case "mcp_tool_adapter":
          if (isMcpToolAdapterDefinition(parsed)) {
            this.registerMcpAdapter(parsed);
          }
          break;
        default:
          break;
      }
    }
  }
}

export const createScaffoldedToolRegistry = (): ToolRegistry => {
  const registry = new ToolRegistry();

  registry.registerCapability({
    capabilityId: "filesystem.read",
    displayName: "Filesystem Read",
    description: "Read-only access to local workspace files.",
    domain: "filesystem",
    scopes: ["read"],
    requiresNetwork: false,
    requiresSecretReference: false,
    metadata: {},
  });
  registry.registerCapability({
    capabilityId: "filesystem.write",
    displayName: "Filesystem Write",
    description: "Local file mutation capability under guarded execution.",
    domain: "filesystem",
    scopes: ["write"],
    requiresNetwork: false,
    requiresSecretReference: false,
    metadata: {},
  });
  registry.registerCapability({
    capabilityId: "external.api",
    displayName: "External API",
    description: "Outbound API-backed tool calls routed through an integration profile.",
    domain: "web",
    scopes: ["api"],
    requiresNetwork: true,
    requiresSecretReference: true,
    metadata: {},
  });
  registry.registerCapability({
    capabilityId: "messaging.channel",
    displayName: "Messaging Channel",
    description: "Messaging surface access for adapters such as Discord or Telegram.",
    domain: "messaging",
    scopes: ["send", "receive"],
    requiresNetwork: true,
    requiresSecretReference: true,
    metadata: {},
  });

  registry.registerProvider({
    providerId: "native.local",
    displayName: "Native Local Tools",
    kind: "native",
    enabled: true,
    transport: "in_process",
    secretReferenceIds: [],
    capabilityIds: ["filesystem.read", "filesystem.write"],
    status: "ready",
    metadata: {},
  });
  registry.registerProvider({
    providerId: "mcp.scaffold",
    displayName: "MCP Scaffold",
    kind: "mcp",
    enabled: false,
    transport: "stdio",
    secretReferenceIds: [],
    capabilityIds: ["external.api", "messaging.channel"],
    status: "scaffolded",
    metadata: {},
  });
  registry.registerMcpAdapter({
    adapterId: "mcp.local.scaffold",
    providerId: "mcp.scaffold",
    displayName: "Local MCP Adapter Scaffold",
    enabled: false,
    transport: "stdio",
    args: [],
    envReferenceIds: [],
    toolNameMap: {},
    status: "scaffolded",
    metadata: {},
  });

  return registry;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

const isToolProviderDefinition = (value: unknown): value is ToolProviderDefinition => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.providerId === "string"
    && typeof value.displayName === "string"
    && typeof value.kind === "string"
    && typeof value.enabled === "boolean"
    && typeof value.transport === "string"
    && Array.isArray(value.secretReferenceIds)
    && Array.isArray(value.capabilityIds)
    && typeof value.status === "string"
    && isRecord(value.metadata);
};

const isToolCapabilityDefinition = (value: unknown): value is ToolCapabilityDefinition => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.capabilityId === "string"
    && typeof value.displayName === "string"
    && typeof value.description === "string"
    && typeof value.domain === "string"
    && Array.isArray(value.scopes)
    && typeof value.requiresNetwork === "boolean"
    && typeof value.requiresSecretReference === "boolean"
    && isRecord(value.metadata);
};

const isMcpToolAdapterDefinition = (value: unknown): value is McpToolAdapterDefinition => {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.adapterId === "string"
    && typeof value.providerId === "string"
    && typeof value.displayName === "string"
    && typeof value.enabled === "boolean"
    && typeof value.transport === "string"
    && Array.isArray(value.args)
    && Array.isArray(value.envReferenceIds)
    && isRecord(value.toolNameMap)
    && typeof value.status === "string"
    && isRecord(value.metadata);
};
