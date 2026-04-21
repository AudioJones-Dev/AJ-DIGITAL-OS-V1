import type { ChannelAdapterDefinition } from "./channel-adapter-types.js";
import type { ConnectorDefinition } from "./connector-types.js";
import type { IntegrationConfigRecord } from "../types/integration-config.types.js";

export type IntegrationDefinition = ChannelAdapterDefinition | ConnectorDefinition;

export interface IntegrationRegistrySnapshot {
  channelAdapters: ChannelAdapterDefinition[];
  connectors: ConnectorDefinition[];
  configs: IntegrationConfigRecord[];
}
