import { config } from "../core/config.js";
import { createN8nClient, N8nClientError } from "../services/n8n-client.js";

export interface N8nTriggerTestCommandInput {
  path?: string | undefined;
  useConfigWebhook?: boolean;
  payload?: string | undefined;
  json?: boolean;
}

export interface N8nTriggerTestCommandResult {
  ok: boolean;
  command: "n8n:trigger-test";
  url: string;
  status: number;
  payloadSent: Record<string, unknown>;
  responseData: unknown;
  responseText: string;
  errors: string[];
}

/**
 * End-to-end trigger test proving AJ Digital OS can reach, authenticate,
 * and invoke an n8n workflow/webhook with a diagnostic payload.
 */
export class N8nTriggerTestCommand {
  async run(input: N8nTriggerTestCommandInput = {}): Promise<N8nTriggerTestCommandResult> {
    try {
      const resolved = this.resolveTarget(input);
      const payload = this.resolvePayload(input.payload);

      const client = createN8nClient();
      const triggerResult = await client.triggerWorkflow({
        workflowIdOrPath: resolved.workflowIdOrPath,
        useWebhookUrl: resolved.useWebhookUrl,
        payload,
        method: "POST",
      });

      const result: N8nTriggerTestCommandResult = {
        ok: triggerResult.ok,
        command: "n8n:trigger-test",
        url: triggerResult.url,
        status: triggerResult.status,
        payloadSent: payload,
        responseData: triggerResult.data,
        responseText: triggerResult.rawText,
        errors: triggerResult.ok ? [] : [`n8n returned status ${triggerResult.status}`],
      };

      if (input.json === true) {
        this.printJson(result);
      } else {
        this.renderHuman(result);
      }

      return result;
    } catch (error) {
      const message =
        error instanceof N8nClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Unknown n8n trigger test failure.";

      const result: N8nTriggerTestCommandResult = {
        ok: false,
        command: "n8n:trigger-test",
        url: "",
        status: 0,
        payloadSent: {},
        responseData: null,
        responseText: "",
        errors: [message],
      };

      if (input.json === true) {
        this.printJson(result);
      } else {
        console.log("N8N TRIGGER TEST");
        console.log("=================");
        console.log("Status: fail");
        console.log(`Error: ${message}`);
      }

      return result;
    }
  }

  private resolveTarget(input: N8nTriggerTestCommandInput): {
    workflowIdOrPath: string;
    useWebhookUrl: boolean;
  } {
    if (input.path && input.useConfigWebhook) {
      throw new N8nClientError(
        "Provide either --path or --use-config-webhook, not both.",
      );
    }

    if (input.useConfigWebhook) {
      const webhookUrl = config.n8nWebhookUrl.trim();
      if (!webhookUrl) {
        throw new N8nClientError(
          "N8N_WEBHOOK_URL is not configured. Cannot use --use-config-webhook.",
        );
      }
      return { workflowIdOrPath: "", useWebhookUrl: true };
    }

    if (input.path) {
      return { workflowIdOrPath: input.path, useWebhookUrl: false };
    }

    throw new N8nClientError(
      "Provide --path=<webhook-path> or --use-config-webhook to specify a target.",
    );
  }

  private resolvePayload(rawPayload: string | undefined): Record<string, unknown> {
    const defaultPayload: Record<string, unknown> = {
      source: "aj-digital-os",
      type: "n8n_trigger_test",
      timestamp: new Date().toISOString(),
      test: true,
    };

    if (!rawPayload) {
      return defaultPayload;
    }

    try {
      const parsed: unknown = JSON.parse(rawPayload);
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new N8nClientError("--payload must be a JSON object (not an array or primitive).");
      }
      return { ...defaultPayload, ...(parsed as Record<string, unknown>) };
    } catch (error) {
      if (error instanceof N8nClientError) {
        throw error;
      }
      throw new N8nClientError(
        `Invalid --payload JSON: ${error instanceof Error ? error.message : "parse error"}`,
      );
    }
  }

  private renderHuman(result: N8nTriggerTestCommandResult): void {
    console.log("N8N TRIGGER TEST");
    console.log("=================");
    console.log(`Status: ${result.ok ? "pass" : "fail"}`);
    console.log(`URL: ${result.url}`);
    console.log(`HTTP Status: ${result.status}`);
    console.log(`Payload Keys: ${Object.keys(result.payloadSent).join(", ")}`);
    console.log(`Response JSON Parsed: ${result.responseData !== null ? "yes" : "no"}`);

    if (result.responseData !== null) {
      console.log("");
      console.log("Response Data");
      console.log(JSON.stringify(result.responseData, null, 2));
    } else if (result.responseText) {
      console.log("");
      console.log("Response Text (raw)");
      console.log(result.responseText.slice(0, 500));
    }

    if (result.errors.length > 0) {
      console.log("");
      console.log("Errors");
      for (const err of result.errors) {
        console.log(`- ${err}`);
      }
    }
  }

  private printJson(payload: N8nTriggerTestCommandResult): void {
    console.log(JSON.stringify(payload, null, 2));
  }
}
