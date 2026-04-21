import { createServer, type IncomingMessage } from "node:http";

import { OllamaProvider } from "./ollama.provider.js";

const EXPECTED_RESOLVED_MODEL = "llama3.1:8b";

interface CapturedRequest {
  method: string | undefined;
  url: string | undefined;
  body?: unknown;
}

const main = async (): Promise<void> => {
  const receivedRequests: CapturedRequest[] = [];

  const server = createServer(async (request, response) => {
    const body = await readBody(request);
    const parsedBody = body ? JSON.parse(body) as Record<string, unknown> : undefined;
    receivedRequests.push({
      method: request.method,
      url: request.url,
      ...(parsedBody ? { body: parsedBody } : {}),
    });

    if (request.method === "GET" && request.url === "/api/tags") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        models: [
          { name: EXPECTED_RESOLVED_MODEL, model: EXPECTED_RESOLVED_MODEL },
        ],
      }));
      return;
    }

    if (request.method === "POST" && request.url === "/api/chat") {
      const userMessage = Array.isArray(parsedBody?.messages)
        ? parsedBody.messages
          .filter((entry): entry is { role?: unknown; content?: unknown } => Boolean(entry) && typeof entry === "object")
          .find((entry) => entry.role === "user")
        : undefined;
      const userContent = typeof userMessage?.content === "string" ? userMessage.content : "";

      if (userContent.includes("legacy_probe")) {
        response.writeHead(400, { "Content-Type": "application/json" });
        response.end(JSON.stringify({ error: "invalid messages payload for this Ollama build" }));
        return;
      }

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        model: EXPECTED_RESOLVED_MODEL,
        message: {
          role: "assistant",
          content: "{\"status\":\"ok\",\"echo\":\"ollama_probe\"}",
        },
        prompt_eval_count: 12,
        eval_count: 8,
      }));
      return;
    }

    if (request.method === "POST" && request.url === "/api/generate") {
      const prompt = typeof parsedBody?.prompt === "string" ? parsedBody.prompt : "";

      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        model: EXPECTED_RESOLVED_MODEL,
        response: prompt.includes("legacy_probe")
          ? "{\"status\":\"ok\",\"echo\":\"legacy_probe\"}"
          : "{\"status\":\"ok\",\"echo\":\"ollama_probe\"}",
        prompt_eval_count: 10,
        eval_count: 6,
      }));
      return;
    }

    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "404 page not found" }));
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Smoke server failed to bind to a local port.");
  }

  try {
    const provider = new OllamaProvider(`http://127.0.0.1:${address.port}`);
    const result = await provider.generate({
      model: "llama3.1:8b",
      system: "Return strict JSON only.",
      user: "Return {\"status\":\"ok\",\"echo\":\"ollama_probe\"}.",
      responseFormat: "json",
      temperature: 0,
      maxTokens: 120,
    });

    expect(result.model === EXPECTED_RESOLVED_MODEL, `Expected resolved model "${EXPECTED_RESOLVED_MODEL}", got "${result.model}".`);
    expect(result.content.includes("\"status\":\"ok\""), "Expected JSON content from mock Ollama chat response.");

    const chatRequest = receivedRequests.find((entry) => entry.method === "POST" && entry.url === "/api/chat");
    if (!chatRequest || !chatRequest.body || typeof chatRequest.body !== "object") {
      throw new Error("Expected /api/chat request body to be captured.");
    }

    const chatBody = chatRequest.body as {
      model?: unknown;
      messages?: unknown;
      format?: unknown;
      options?: unknown;
    };

    expect(chatBody.model === EXPECTED_RESOLVED_MODEL, "Expected provider to resolve the installed Ollama model tag.");
    expect(Array.isArray(chatBody.messages) && chatBody.messages.length === 2, "Expected system/user messages to be sent to /api/chat.");
    expect(chatBody.format === "json", "Expected JSON response format to be requested for structured workflows.");
    expect(chatBody.options && typeof chatBody.options === "object", "Expected Ollama options payload to be forwarded.");

    const fallbackResult = await provider.generate({
      model: "llama3.1:8b",
      system: "Return strict JSON only.",
      user: "Return {\"status\":\"ok\",\"echo\":\"legacy_probe\"}.",
      responseFormat: "json",
      temperature: 0,
      maxTokens: 120,
    });

    expect(fallbackResult.content.includes("\"echo\":\"legacy_probe\""), "Expected provider to recover through the legacy generate endpoint.");

    const generateRequest = receivedRequests.find((entry) =>
      entry.method === "POST"
      && entry.url === "/api/generate"
      && typeof (entry.body as { prompt?: unknown } | undefined)?.prompt === "string"
      && ((entry.body as { prompt?: string }).prompt?.includes("legacy_probe") ?? false),
    );

    if (!generateRequest || !generateRequest.body || typeof generateRequest.body !== "object") {
      throw new Error("Expected /api/generate request body to be captured for the legacy fallback path.");
    }

    const generateBody = generateRequest.body as {
      model?: unknown;
      format?: unknown;
      options?: unknown;
    };

    expect(generateBody.model === EXPECTED_RESOLVED_MODEL, "Expected provider to keep the resolved model when retrying /api/generate.");
    expect(generateBody.format === "json", "Expected provider to preserve JSON mode when retrying /api/generate.");
    expect(generateBody.options && typeof generateBody.options === "object", "Expected Ollama options payload to be forwarded to /api/generate.");

    console.log("ollama-provider-smoke:pass");
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }
};

const readBody = async (request: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }

  return Buffer.concat(chunks).toString("utf-8");
};

const expect = (condition: unknown, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

void main();
