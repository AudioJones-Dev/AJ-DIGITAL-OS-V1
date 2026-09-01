/**
 * Reader routes for the Hermes status API: retrieval documents/traces and
 * decision MAP evaluations / CERA cycles.
 *
 * These four GETs back the dashboard's /retrieval and /decision pages. The
 * store layer was already in place and tested; what was missing was the HTTP
 * surface, so these tests pin the response envelope ({ ok, data }) and the
 * query-param filters the dashboard client sends.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { existsSync, rmSync } from "node:fs";

import { startHermesApi, stopHermesApi } from "../../src/hermes/hermes-status-api.js";
import { createCeraCycle, evaluateMap } from "../../src/decision/decision-engine.js";
import {
  DECISION_PATHS,
  saveCycle,
  saveEvaluation,
} from "../../src/decision/decision-store.js";
import {
  RETRIEVAL_STORE_PATHS,
  appendRetrievalTrace,
  saveDocument,
} from "../../src/retrieval/retrieval-store.js";
import type { DecisionInput } from "../../src/decision/decision-types.js";
import type { RetrievalDocument, RetrievalTrace } from "../../src/retrieval/retrieval-types.js";

// Distinct from the auth suite's 17420: vitest runs test files in parallel
// workers, and a shared port is a flake waiting to happen.
const PORT = 17421;
const BASE = `http://127.0.0.1:${PORT}`;
const KEY = "test-hermes-reader-key";

let savedKey: string | undefined;

function clearStores(): void {
  for (const p of [
    RETRIEVAL_STORE_PATHS.DOCS_PATH,
    RETRIEVAL_STORE_PATHS.CHUNKS_PATH,
    RETRIEVAL_STORE_PATHS.TRACES_PATH,
    DECISION_PATHS.evaluationsFile,
    DECISION_PATHS.cyclesFile,
    DECISION_PATHS.auditFile,
  ]) {
    if (existsSync(p)) rmSync(p);
  }
}

function doc(overrides: Partial<RetrievalDocument> & { documentId: string }): RetrievalDocument {
  return {
    namespace: "system_docs",
    title: "Doc",
    sourceType: "markdown",
    hash: "0".repeat(64),
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function trace(overrides: Partial<RetrievalTrace> & { traceId: string }): RetrievalTrace {
  return {
    query: "q",
    namespaces: ["system_docs"],
    resultCount: 0,
    selectedChunkIds: [],
    createdAt: "2025-01-01T00:00:00.000Z",
    environment: "test",
    ...overrides,
  };
}

function decisionInput(overrides: Partial<DecisionInput> = {}): DecisionInput {
  return {
    title: "Initiative",
    description: "Description",
    category: "offer",
    meaningfulScore: 3,
    actionableScore: 3,
    profitableScore: 3,
    createdBy: "test-user",
    environment: "local",
    ...overrides,
  };
}

function seed(): void {
  saveDocument(doc({ documentId: "doc-sys", namespace: "system_docs", title: "System" }));
  saveDocument(
    doc({
      documentId: "doc-client",
      namespace: "client_docs",
      title: "Client",
      tenantId: "tenant-a",
    }),
  );

  appendRetrievalTrace(trace({ traceId: "trace-1", runId: "run-1", tenantId: "tenant-a" }));
  appendRetrievalTrace(trace({ traceId: "trace-2", runId: "run-2" }));

  saveEvaluation(evaluateMap(decisionInput({ title: "Eval one" })));
  const second = evaluateMap(decisionInput({ title: "Eval two" }));
  saveEvaluation(second);
  saveCycle(
    createCeraCycle(
      { evaluationId: second.evaluationId, mapScore: second.mapScore },
      {
        captureSignals: ["signal"],
        extractedInsights: ["insight"],
        refinementActions: ["refine"],
        amplificationActions: ["amplify"],
      },
    ),
  );
}

async function get(
  path: string,
): Promise<{ status: number; body: { ok: boolean; data?: unknown[] } }> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  return { status: res.status, body: (await res.json()) as { ok: boolean; data?: unknown[] } };
}

beforeEach(() => {
  savedKey = process.env.HERMES_STATUS_API_KEY;
  process.env.HERMES_STATUS_API_KEY = KEY;
  clearStores();
  seed();
  startHermesApi(PORT);
});

afterEach(() => {
  stopHermesApi();
  clearStores();
  if (savedKey === undefined) delete process.env.HERMES_STATUS_API_KEY;
  else process.env.HERMES_STATUS_API_KEY = savedKey;
});

describe("GET /retrieval/documents", () => {
  it("returns every document in the { ok, data } envelope", async () => {
    const { status, body } = await get("/retrieval/documents");
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it("filters by namespace", async () => {
    const { body } = await get("/retrieval/documents?namespace=client_docs");
    expect(body.data).toHaveLength(1);
    expect((body.data as RetrievalDocument[])[0]?.documentId).toBe("doc-client");
  });

  it("filters by tenantId", async () => {
    const { body } = await get("/retrieval/documents?tenantId=tenant-a");
    expect(body.data).toHaveLength(1);
    expect((body.data as RetrievalDocument[])[0]?.tenantId).toBe("tenant-a");
  });

  it("caps results with limit", async () => {
    const { body } = await get("/retrieval/documents?limit=1");
    expect(body.data).toHaveLength(1);
  });

  it("rejects an unknown namespace with 400 rather than a silent empty list", async () => {
    const res = await fetch(`${BASE}/retrieval/documents?namespace=not_a_namespace`, {
      headers: { Authorization: `Bearer ${KEY}` },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { ok: boolean; error?: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain("not_a_namespace");
  });
});

describe("GET /retrieval/traces", () => {
  it("returns every trace, newest first", async () => {
    const { status, body } = await get("/retrieval/traces");
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toHaveLength(2);
    expect((body.data as RetrievalTrace[])[0]?.traceId).toBe("trace-2");
  });

  it("filters by runId", async () => {
    const { body } = await get("/retrieval/traces?runId=run-1");
    expect(body.data).toHaveLength(1);
    expect((body.data as RetrievalTrace[])[0]?.traceId).toBe("trace-1");
  });

  it("filters by tenantId", async () => {
    const { body } = await get("/retrieval/traces?tenantId=tenant-a");
    expect(body.data).toHaveLength(1);
  });

  it("caps results with limit", async () => {
    const { body } = await get("/retrieval/traces?limit=1");
    expect(body.data).toHaveLength(1);
  });
});

describe("GET /decision/map/evaluations", () => {
  it("returns stored MAP evaluations", async () => {
    const { status, body } = await get("/decision/map/evaluations");
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toHaveLength(2);
  });

  it("caps results with limit", async () => {
    const { body } = await get("/decision/map/evaluations?limit=1");
    expect(body.data).toHaveLength(1);
  });
});

describe("GET /decision/cera/cycles", () => {
  it("returns stored CERA cycles", async () => {
    const { status, body } = await get("/decision/cera/cycles");
    expect(status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.data).toHaveLength(1);
  });

  it("caps results with limit", async () => {
    const { body } = await get("/decision/cera/cycles?limit=1");
    expect(body.data).toHaveLength(1);
  });
});

describe("reader route auth", () => {
  it("gates all four routes behind the bearer token", async () => {
    for (const path of [
      "/retrieval/documents",
      "/retrieval/traces",
      "/decision/map/evaluations",
      "/decision/cera/cycles",
    ]) {
      const res = await fetch(`${BASE}${path}`);
      expect(res.status, path).toBe(401);
    }
  });
});
