import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import {
  loadApprovedMarkdownRecordsForRouter,
  loadMarkdownMemoryRecords,
} from "../../src/memory/markdown-memory-source.js";
import { MarkdownFrontmatterError } from "../../src/memory/markdown-frontmatter.js";
import { MemorySourceAllowlistError } from "../../src/memory/memory-source-allowlist.js";
import { routeMemoryRequest } from "../../src/memory/memory-router.js";
import type { AgentMemoryRequest } from "../../src/memory/memory-types.js";

const FIXTURE_ROOT = path.resolve("tests", "memory", "fixtures", "approved-markdown");
let tmpDir = "";

afterEach(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
    tmpDir = "";
  }
});

describe("Markdown Memory Source Adapter v0", () => {
  it("loads only approved Markdown records", async () => {
    const directory = await createFixtureDirectory([
      "valid-decision.md",
      "valid-sop.md",
      "valid-client-memory.md",
      "draft-not-approved.md",
      "deprecated-record.md",
    ]);
    await writeFile(path.join(directory, "not-markdown.txt"), "ignore me", "utf-8");

    const result = await loadMarkdownMemoryRecords(
      { source: "approved_markdown_exports" },
      { trustedSourceDirectory: directory },
    );

    expect(result.records.map((record) => record.type)).toEqual([
      "client_profile",
      "decision",
      "sop",
    ]);
    expect(result.skipped).toEqual(
      expect.arrayContaining([
        { fileName: "draft-not-approved.md", reason: "not_approved" },
        { fileName: "deprecated-record.md", reason: "deprecated" },
        { fileName: "not-markdown.txt", reason: "not_markdown" },
      ]),
    );
  });

  it("ignores draft records", async () => {
    const directory = await createFixtureDirectory(["draft-not-approved.md"]);
    const result = await loadMarkdownMemoryRecords(
      { source: "approved_markdown_exports" },
      { trustedSourceDirectory: directory },
    );

    expect(result.records).toHaveLength(0);
    expect(result.skipped).toEqual([{ fileName: "draft-not-approved.md", reason: "not_approved" }]);
  });

  it("ignores deprecated records", async () => {
    const directory = await createFixtureDirectory(["deprecated-record.md"]);
    const result = await loadMarkdownMemoryRecords(
      { source: "approved_markdown_exports" },
      { trustedSourceDirectory: directory },
    );

    expect(result.records).toHaveLength(0);
    expect(result.skipped).toEqual([{ fileName: "deprecated-record.md", reason: "deprecated" }]);
  });

  it("rejects missing required frontmatter", async () => {
    const directory = await createFixtureDirectory(["invalid-missing-status.md"]);

    await expect(loadMarkdownMemoryRecords(
      { source: "approved_markdown_exports" },
      { trustedSourceDirectory: directory },
    )).rejects.toMatchObject({
      name: "MarkdownFrontmatterError",
      code: "missing_required_field",
    } satisfies Partial<MarkdownFrontmatterError>);
  });

  it("rejects unsupported logical sources", async () => {
    await expect(loadMarkdownMemoryRecords({ source: "full_vault" })).rejects.toMatchObject({
      name: "MemorySourceAllowlistError",
      code: "unsupported_source",
    } satisfies Partial<MemorySourceAllowlistError>);
  });

  it("rejects path traversal source names", async () => {
    await expect(loadMarkdownMemoryRecords({ source: "../approved_markdown_exports" })).rejects.toMatchObject({
      name: "MemorySourceAllowlistError",
      code: "path_like_source",
    } satisfies Partial<MemorySourceAllowlistError>);
  });

  it("does not allow absolute paths as sources", async () => {
    await expect(loadMarkdownMemoryRecords({ source: path.resolve("memory", "exports", "approved-markdown") }))
      .rejects
      .toMatchObject({
        name: "MemorySourceAllowlistError",
        code: "path_like_source",
      } satisfies Partial<MemorySourceAllowlistError>);
  });

  it("maps frontmatter into MemoryRecord correctly", async () => {
    const directory = await createFixtureDirectory(["valid-decision.md"]);
    const result = await loadMarkdownMemoryRecords(
      { source: "approved_markdown_exports" },
      { trustedSourceDirectory: directory },
    );
    const record = result.records[0];

    expect(record).toMatchObject({
      type: "decision",
      status: "approved",
      scope: "system",
      projectId: "project-memory-layer",
      confidence: "high",
      approvedBy: "audio",
      requiresApproval: false,
      sourceUrl: "memory/exports/approved-markdown/valid-decision.md",
    });
    expect(record?.source.kind).toBe("obsidian_export");
    expect(record?.tags).toEqual(["memory", "router", "architecture"]);
    expect(record?.body).toContain("AJ Digital OS agents request memory");
  });

  it("produces deterministic content hashes", async () => {
    const directory = await createFixtureDirectory(["valid-sop.md"]);
    const first = await loadMarkdownMemoryRecords(
      { source: "approved_markdown_exports" },
      { trustedSourceDirectory: directory },
    );
    const second = await loadMarkdownMemoryRecords(
      { source: "approved_markdown_exports" },
      { trustedSourceDirectory: directory },
    );

    expect(first.records[0]?.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(first.records[0]?.contentHash).toBe(second.records[0]?.contentHash);
  });

  it("produces deterministic ids", async () => {
    const directory = await createFixtureDirectory(["valid-sop.md"]);
    const first = await loadMarkdownMemoryRecords(
      { source: "approved_markdown_exports" },
      { trustedSourceDirectory: directory },
    );
    const second = await loadMarkdownMemoryRecords(
      { source: "approved_markdown_exports" },
      { trustedSourceDirectory: directory },
    );

    expect(first.records[0]?.id).toMatch(/^markdown_[0-9a-f]{32}$/);
    expect(first.records[0]?.id).toBe(second.records[0]?.id);
  });

  it("does not expose raw filesystem paths outside approved sourceUrl", async () => {
    const directory = await createFixtureDirectory(["valid-client-memory.md"]);
    const result = await loadMarkdownMemoryRecords(
      { source: "approved_markdown_exports" },
      { trustedSourceDirectory: directory },
    );
    const record = result.records[0];

    expect(record?.sourceUrl).toBe("memory/exports/approved-markdown/valid-client-memory.md");
    expect(path.isAbsolute(record?.sourceUrl ?? "")).toBe(false);
    expect(record?.sourceUrl).not.toContain(directory);
    expect(record?.source.uri).toBe(record?.sourceUrl);
  });

  it("router accepts loaded Markdown records through the existing records option", async () => {
    const directory = await createFixtureDirectory(["valid-decision.md", "valid-sop.md"]);
    const records = await loadApprovedMarkdownRecordsForRouter({ trustedSourceDirectory: directory });

    const result = routeMemoryRequest(makeRouterRequest(), {
      policyName: "agent-default",
      records,
      now: new Date("2026-06-06T12:00:00.000Z"),
    });

    expect(result.decision.approved).toBe(true);
    expect(result.bundle?.items.map((item) => item.record.type)).toEqual(["decision", "sop"]);
    expect(result.bundle?.items.every((item) => item.citation.includes("memory/exports/approved-markdown/"))).toBe(true);
  });

  it("router still defaults to mock records when no records option is passed", () => {
    const result = routeMemoryRequest({
      requestId: "mock-default-request",
      agentId: "codex",
      sessionId: "session-1",
      task: "Use default mock records.",
      purpose: "implementation",
      tenantId: "aj-digital",
      projectId: "agent-os",
      requestedTypes: ["decision"],
      query: "memory router mandatory",
      retrievalPolicyId: "agent-default",
      createdAt: "2026-06-06T12:00:00.000Z",
    }, {
      policyName: "agent-default",
      now: new Date("2026-06-06T12:00:00.000Z"),
    });

    expect(result.decision.approved).toBe(true);
    expect(result.bundle?.items[0]?.record.id).toBe("mock-governance-decision");
  });
});

async function createFixtureDirectory(fileNames: string[]): Promise<string> {
  tmpDir = await mkdtemp(path.join(os.tmpdir(), "approved-markdown-fixtures-"));

  for (const fileName of fileNames) {
    const source = path.join(FIXTURE_ROOT, fileName);
    const target = path.join(tmpDir, fileName);
    await writeFile(target, await readFile(source, "utf-8"), "utf-8");
  }

  return tmpDir;
}

function makeRouterRequest(): AgentMemoryRequest {
  return {
    requestId: "markdown-router-request",
    agentId: "codex",
    sessionId: "markdown-session",
    task: "Load approved Markdown records.",
    purpose: "implementation",
    tenantId: "aj-digital",
    projectId: "project-memory-layer",
    requestedTypes: ["decision", "sop"],
    query: "router approved markdown export loading",
    retrievalPolicyId: "agent-default",
    createdAt: "2026-06-06T12:00:00.000Z",
  };
}
