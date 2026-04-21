import { createScaffoldedToolRegistry } from "../tools/tool-registry.js";
import type { ToolRegistrySnapshot } from "../tools/tool-types.js";

export interface ToolRegistryCommandInput {
  json?: boolean;
}

export interface ToolRegistryCommandResult {
  ok: boolean;
  command: "tool-registry";
  rendered: boolean;
  snapshot: ToolRegistrySnapshot;
  warnings: string[];
  errors: string[];
}

export class ToolRegistryCommand {
  async run(input: ToolRegistryCommandInput = {}): Promise<ToolRegistryCommandResult> {
    const registry = createScaffoldedToolRegistry();
    await registry.loadFromDisk();
    const snapshot = registry.snapshot();

    if (input.json === true) {
      console.log(JSON.stringify({ ok: true, snapshot }, null, 2));
    } else {
      this.renderHuman(snapshot);
    }

    return {
      ok: true,
      command: "tool-registry",
      rendered: true,
      snapshot,
      warnings: [],
      errors: [],
    };
  }

  private renderHuman(snapshot: ToolRegistrySnapshot): void {
    console.log("AJ DIGITAL OS TOOL REGISTRY");
    console.log("===========================");
    console.log(`Providers: ${snapshot.providers.length}`);
    console.log(`Capabilities: ${snapshot.capabilities.length}`);
    console.log(`MCP Adapters: ${snapshot.mcpAdapters.length}`);
    console.log(`Tools: ${snapshot.tools.length}`);
    console.log("");
    console.log("Providers");

    if (snapshot.providers.length === 0) {
      console.log("- None");
      return;
    }

    for (const provider of snapshot.providers) {
      console.log(`- ${provider.displayName} | ${provider.kind} | ${provider.status} | enabled=${provider.enabled}`);
    }
  }
}
