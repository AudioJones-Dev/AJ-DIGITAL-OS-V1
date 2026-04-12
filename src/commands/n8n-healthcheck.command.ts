import { createN8nClient, N8nClientError } from "../services/n8n-client.js";
import type { N8nHealthcheckResult } from "../services/n8n-client.js";

export interface N8nHealthcheckCommandInput {
  json?: boolean;
}

export interface N8nHealthcheckCommandResult {
  ok: boolean;
  command: "n8n-healthcheck";
  rendered: boolean;
  healthcheck: N8nHealthcheckResult | null;
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing command for verifying n8n MCP connectivity.
 */
export class N8nHealthcheckCommand {
  async run(input: N8nHealthcheckCommandInput = {}): Promise<N8nHealthcheckCommandResult> {
    try {
      const client = createN8nClient();
      const healthcheck = await client.healthcheck();

      const result: N8nHealthcheckCommandResult = {
        ok: healthcheck.ok,
        command: "n8n-healthcheck",
        rendered: true,
        healthcheck,
        warnings: healthcheck.ok ? [] : [`n8n returned status ${healthcheck.status}`],
        errors: [],
      };

      if (input.json === true) {
        this.printJson(result);
      } else {
        this.renderHuman(healthcheck);
      }

      return result;
    } catch (error) {
      const message =
        error instanceof N8nClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown n8n healthcheck failure.";

      const result: N8nHealthcheckCommandResult = {
        ok: false,
        command: "n8n-healthcheck",
        rendered: true,
        healthcheck: null,
        warnings: [],
        errors: [message],
      };

      if (input.json === true) {
        this.printJson(result);
      } else {
        console.log("N8N HEALTHCHECK");
        console.log("===============");
        console.log(`Status: fail`);
        console.log(`Error: ${message}`);
      }

      return result;
    }
  }

  private renderHuman(healthcheck: N8nHealthcheckResult): void {
    console.log("N8N HEALTHCHECK");
    console.log("===============");
    console.log(`Status: ${healthcheck.ok ? "pass" : "fail"}`);
    console.log(`URL: ${healthcheck.url}`);
    console.log(`HTTP Status: ${healthcheck.status}`);
    console.log(`Auth Mode: ${healthcheck.authMode}`);
    console.log(`Message: ${healthcheck.message}`);
  }

  private printJson(payload: N8nHealthcheckCommandResult): void {
    console.log(JSON.stringify(payload, null, 2));
  }
}
