import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { z } from "zod";

import { buildUiStylesheet } from "./theme.js";
import { buildWebShellClientScript } from "./web-shell-client.js";
import { renderWebShellHtml } from "./web-shell-html.js";
import { WebShellService } from "./web-shell-service.js";
import type { UiAssistantRunRequest, UiDeliverableActionRequest } from "./web-shell-types.js";

const UiAssistantRunRequestSchema = z.object({
  task: z.string(),
  mode: z.enum(["advisory", "orchestrated"]).optional(),
  executionMode: z.enum(["advisory", "orchestrated"]).optional(),
  brandId: z.string().min(1).optional(),
  clientId: z.string().min(1).optional(),
  skillName: z.string().min(1).optional(),
  taskType: z.string().min(1).optional(),
  sourceText: z.string().optional(),
  modelProfileId: z.string().min(1).optional(),
  agentProfileId: z.string().min(1).optional(),
  conversationThreadId: z.string().min(1).optional(),
  localPathHint: z.string().optional(),
  autoSubmitForApproval: z.boolean().optional(),
});

const UiDeliverableActionRequestSchema = z.object({
  deliverableId: z.string().min(1),
  actor: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export interface WebShellServerStartOptions {
  host: string;
  port: number;
}

export class WebShellServer {
  private readonly html = renderWebShellHtml();
  private readonly css = buildUiStylesheet();
  private readonly clientScript = buildWebShellClientScript();
  private server?: Server;

  constructor(private readonly service = new WebShellService()) {}

  async start(options: WebShellServerStartOptions): Promise<{ host: string; port: number; url: string }> {
    if (this.server) {
      throw new Error("Web shell server is already running.");
    }

    this.server = createServer(async (request, response) => {
      try {
        await this.handleRequest(request, response);
      } catch (error) {
        this.sendJson(response, 500, {
          ok: false,
          error: error instanceof Error ? error.message : "Unknown UI server error.",
        });
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.server?.once("error", reject);
      this.server?.listen(options.port, options.host, () => resolve());
    });

    return {
      host: options.host,
      port: options.port,
      url: `http://${options.host}:${options.port}`,
    };
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    switch (`${request.method ?? "GET"} ${url.pathname}`) {
      case "GET /":
        this.sendText(response, 200, this.html, "text/html; charset=utf-8");
        return;
      case "GET /ui.css":
        this.sendText(response, 200, this.css, "text/css; charset=utf-8");
        return;
      case "GET /ui.js":
        this.sendText(response, 200, this.clientScript, "application/javascript; charset=utf-8");
        return;
      case "GET /api/bootstrap":
        this.sendJson(response, 200, await this.service.getBootstrap());
        return;
      case "GET /api/conversation-thread":
        this.sendJson(response, 200, await this.service.getConversationThread(url.searchParams.get("threadId") ?? ""));
        return;
      case "POST /api/assistant":
        const validatedRequest = UiAssistantRunRequestSchema.parse(
          await this.readJsonBody<UiAssistantRunRequest>(request),
        );
        this.sendJson(
          response,
          200,
          await this.service.runAssistant(this.normalizeAssistantRequest(validatedRequest)),
        );
        return;
      case "POST /api/deliverables/submit":
        this.sendJson(
          response,
          200,
          await this.service.submitDeliverableForApproval(...this.normalizeDeliverableActionRequest(
            UiDeliverableActionRequestSchema.parse(await this.readJsonBody<UiDeliverableActionRequest>(request)),
          )),
        );
        return;
      case "POST /api/deliverables/approve":
        this.sendJson(
          response,
          200,
          await this.service.approveDeliverable(...this.normalizeDeliverableActionRequest(
            UiDeliverableActionRequestSchema.parse(await this.readJsonBody<UiDeliverableActionRequest>(request)),
          )),
        );
        return;
      case "POST /api/deliverables/publish":
        this.sendJson(
          response,
          200,
          await this.service.publishDeliverable(...this.normalizeDeliverableActionRequest(
            UiDeliverableActionRequestSchema.parse(await this.readJsonBody<UiDeliverableActionRequest>(request)),
          )),
        );
        return;
      case "GET /favicon.ico":
        response.writeHead(204);
        response.end();
        return;
      default:
        this.sendJson(response, 404, {
          ok: false,
          error: `No local UI route exists for ${url.pathname}.`,
        });
    }
  }

  private async readJsonBody<T>(request: IncomingMessage): Promise<T> {
    const chunks: Buffer[] = [];
    for await (const chunk of request) {
      const value = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
      chunks.push(value);
      const size = chunks.reduce((sum, entry) => sum + entry.length, 0);
      if (size > 1_000_000) {
        throw new Error("UI request body exceeded the 1 MB limit.");
      }
    }

    const raw = Buffer.concat(chunks).toString("utf-8").trim();
    return (raw.length === 0 ? {} : JSON.parse(raw)) as T;
  }

  private sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
    this.sendText(response, statusCode, `${JSON.stringify(payload, null, 2)}\n`, "application/json; charset=utf-8");
  }

  private normalizeAssistantRequest(input: z.infer<typeof UiAssistantRunRequestSchema>): UiAssistantRunRequest {
    return {
      task: input.task,
      ...(input.mode ? { mode: input.mode } : {}),
      ...(input.executionMode ? { executionMode: input.executionMode } : {}),
      ...(input.brandId ? { brandId: input.brandId } : {}),
      ...(input.clientId ? { clientId: input.clientId } : {}),
      ...(input.skillName ? { skillName: input.skillName } : {}),
      ...(input.taskType ? { taskType: input.taskType } : {}),
      ...(input.sourceText !== undefined ? { sourceText: input.sourceText } : {}),
      ...(input.modelProfileId ? { modelProfileId: input.modelProfileId } : {}),
      ...(input.agentProfileId ? { agentProfileId: input.agentProfileId } : {}),
      ...(input.conversationThreadId ? { conversationThreadId: input.conversationThreadId } : {}),
      ...(input.localPathHint !== undefined ? { localPathHint: input.localPathHint } : {}),
      ...(input.autoSubmitForApproval !== undefined ? { autoSubmitForApproval: input.autoSubmitForApproval } : {}),
    };
  }

  private normalizeDeliverableActionRequest(
    input: z.infer<typeof UiDeliverableActionRequestSchema>,
  ): [string, string | undefined, string | undefined] {
    return [
      input.deliverableId,
      input.actor,
      input.notes,
    ];
  }

  private sendText(response: ServerResponse, statusCode: number, body: string, contentType: string): void {
    response.writeHead(statusCode, {
      "content-type": contentType,
      "cache-control": "no-store",
    });
    response.end(body);
  }
}
