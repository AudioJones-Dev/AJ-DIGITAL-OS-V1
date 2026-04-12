import { config } from "../core/config.js";

export interface N8nClientOptions {
  baseUrl?: string;
  mcpToken?: string;
  timeoutMs?: number;
  userAgent?: string;
}

export interface N8nHealthcheckResult {
  ok: boolean;
  status: number;
  url: string;
  authMode: "bearer";
  message: string;
}

export interface N8nRequestOptions extends RequestInit {
  timeoutMs?: number;
  query?: Record<string, string | number | boolean | undefined>;
}

export interface N8nWorkflowTriggerInput {
  workflowIdOrPath: string;
  payload?: unknown;
  method?: "POST" | "GET";
  useWebhookUrl?: boolean;
}

export interface N8nWorkflowTriggerResult<T = unknown> {
  ok: boolean;
  status: number;
  url: string;
  data: T | null;
  rawText: string;
}

export class N8nClientError extends Error {
  public readonly status: number | undefined;
  public readonly url: string | undefined;
  public readonly body: string | undefined;

  constructor(message: string, details?: { status?: number; url?: string; body?: string }) {
    super(message);
    this.name = "N8nClientError";
    this.status = details?.status;
    this.url = details?.url;
    this.body = details?.body;
  }
}

export class N8nClient {
  private readonly baseUrl: string;
  private readonly mcpToken: string;
  private readonly timeoutMs: number;
  private readonly userAgent: string;

  constructor(options: N8nClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? config.n8nBaseUrl).replace(/\/+$/, "");
    this.mcpToken = options.mcpToken ?? config.n8nMcpToken;
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.userAgent = options.userAgent ?? "aj-digital-os/0.1 n8n-client";

    if (!this.baseUrl) {
      throw new N8nClientError("Missing n8n base URL. Set N8N_BASE_URL in runtime config.");
    }

    if (!this.mcpToken) {
      throw new N8nClientError("Missing n8n MCP token. Set N8N_MCP_TOKEN in runtime config.");
    }
  }

  public async healthcheck(): Promise<N8nHealthcheckResult> {
    const url = this.resolveUrl("/mcp-server/http");
    const response = await this.request(url, {
      method: "GET",
      headers: {
        Accept: "application/json, text/plain, */*",
      },
    });

    return {
      ok: response.ok,
      status: response.status,
      url,
      authMode: "bearer",
      message: response.ok
        ? "n8n MCP endpoint reachable."
        : `n8n MCP endpoint returned non-OK status (${response.status}).`,
    };
  }

  public async triggerWorkflow<T = unknown>(
    input: N8nWorkflowTriggerInput,
  ): Promise<N8nWorkflowTriggerResult<T>> {
    const method = input.method ?? "POST";

    const url = input.useWebhookUrl
      ? this.resolveWebhookUrl(input.workflowIdOrPath)
      : this.resolveUrl(`/webhook/${input.workflowIdOrPath.replace(/^\/+/, "")}`);

    const response = await this.request(url, {
      method,
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
      },
      body: method === "GET" ? null : JSON.stringify(input.payload ?? {}),
    });

    const rawText = await response.text();
    const data = this.safeParseJson<T>(rawText);

    return {
      ok: response.ok,
      status: response.status,
      url,
      data,
      rawText,
    };
  }

  public async requestJson<T = unknown>(path: string, options: N8nRequestOptions = {}): Promise<T> {
    const url = this.resolveUrl(path, options.query);
    const response = await this.request(url, {
      ...options,
      headers: {
        Accept: "application/json, text/plain, */*",
        ...(options.headers as Record<string, string> | undefined),
      },
    });

    const rawText = await response.text();

    if (!response.ok) {
      throw new N8nClientError("n8n request failed.", {
        status: response.status,
        url,
        body: rawText,
      });
    }

    const data = this.safeParseJson<T>(rawText);

    if (data === null) {
      throw new N8nClientError("n8n returned non-JSON response when JSON was expected.", {
        status: response.status,
        url,
        body: rawText,
      });
    }

    return data;
  }

  private async request(url: string, options: N8nRequestOptions = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? this.timeoutMs);

    try {
      const headers = new Headers(options.headers as HeadersInit | undefined);
      headers.set("Authorization", `Bearer ${this.mcpToken}`);
      headers.set("User-Agent", this.userAgent);

      return await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown request failure.";
      throw new N8nClientError(`Failed to reach n8n: ${message}`, { url });
    } finally {
      clearTimeout(timeout);
    }
  }

  private resolveUrl(
    path: string,
    query?: Record<string, string | number | boolean | undefined>,
  ): string {
    const normalizedPath =
      path.startsWith("http://") || path.startsWith("https://")
        ? path
        : `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;

    const url = new URL(normalizedPath);

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    return url.toString();
  }

  private resolveWebhookUrl(workflowIdOrPath: string): string {
    const configuredWebhookUrl = config.n8nWebhookUrl.trim();

    if (configuredWebhookUrl) {
      return configuredWebhookUrl;
    }

    return this.resolveUrl(`/webhook/${workflowIdOrPath.replace(/^\/+/, "")}`);
  }

  private safeParseJson<T>(rawText: string): T | null {
    if (!rawText.trim()) {
      return null;
    }

    try {
      return JSON.parse(rawText) as T;
    } catch {
      return null;
    }
  }
}

export function createN8nClient(options: N8nClientOptions = {}): N8nClient {
  return new N8nClient(options);
}
