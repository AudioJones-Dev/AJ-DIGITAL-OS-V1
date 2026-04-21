export type McpToolAdapterTransport = "stdio" | "http" | "websocket";
export type McpToolAdapterStatus = "scaffolded" | "configured" | "disabled";

export interface McpToolAdapterDefinition {
  adapterId: string;
  providerId: string;
  displayName: string;
  enabled: boolean;
  transport: McpToolAdapterTransport;
  endpoint?: string | undefined;
  command?: string | undefined;
  args: string[];
  envReferenceIds: string[];
  toolNameMap: Record<string, string>;
  status: McpToolAdapterStatus;
  metadata: Record<string, unknown>;
}
