import type { ChannelAdapterDefinition } from "./channel-adapter-types.js";
import type { ConnectorDefinition } from "./connector-types.js";
import type { IntegrationRegistrySnapshot } from "./integration-types.js";
import type { IntegrationConfigRecord } from "../types/integration-config.types.js";

export class IntegrationRegistry {
  private readonly channelAdapters = new Map<string, ChannelAdapterDefinition>();
  private readonly connectors = new Map<string, ConnectorDefinition>();
  private readonly configs = new Map<string, IntegrationConfigRecord>();

  registerChannelAdapter(adapter: ChannelAdapterDefinition): void {
    this.channelAdapters.set(adapter.id, adapter);
  }

  registerConnector(connector: ConnectorDefinition): void {
    this.connectors.set(connector.id, connector);
  }

  saveConfig(config: IntegrationConfigRecord): void {
    this.configs.set(config.integrationId, config);
  }

  getChannelAdapter(id: string): ChannelAdapterDefinition | undefined {
    return this.channelAdapters.get(id);
  }

  getConnector(id: string): ConnectorDefinition | undefined {
    return this.connectors.get(id);
  }

  getConfig(integrationId: string): IntegrationConfigRecord | undefined {
    return this.configs.get(integrationId);
  }

  listChannelAdapters(): ChannelAdapterDefinition[] {
    return [...this.channelAdapters.values()].sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  listConnectors(): ConnectorDefinition[] {
    return [...this.connectors.values()].sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  listConfigs(): IntegrationConfigRecord[] {
    return [...this.configs.values()].sort((left, right) => left.displayName.localeCompare(right.displayName));
  }

  snapshot(): IntegrationRegistrySnapshot {
    return {
      channelAdapters: this.listChannelAdapters(),
      connectors: this.listConnectors(),
      configs: this.listConfigs(),
    };
  }
}
