import { describe, it, expect, beforeEach, vi } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const NORMALIZATION_DIR = join(process.cwd(), "runtime", "normalization");
const ASSET_FILE = join(NORMALIZATION_DIR, "asset.json");
const AUDIT_FILE = join(NORMALIZATION_DIR, "normalization-audit.jsonl");

beforeEach(() => {
  for (const path of [ASSET_FILE, AUDIT_FILE]) {
    if (existsSync(path)) rmSync(path);
  }
});

import {
  createContentBrief,
  publishContent,
} from "../../src/apps/content-engine/index.js";
import * as attributionTracker from "../../src/attribution/attribution-tracker.js";

describe("Content Engine", () => {
  // 1. creates content brief with DAG run
  it("creates content brief with DAG run", async () => {
    const result = await createContentBrief({
      title: "Quarterly Update",
      description: "Summary of recent platform improvements.",
      contentType: "blog_post",
      channel: "blog",
      createdBy: "writer-1",
    });
    expect(result.ok).toBe(true);
    expect(result.briefId).toBeDefined();
    expect(result.dagRunId).toBeDefined();
    expect(result.asset?.status).toBe("draft");
  });

  // 2. governance check runs on brief creation
  it("governance check runs on brief creation", async () => {
    const result = await createContentBrief({
      title: "Plain Title",
      description: "Routine content.",
      contentType: "email",
      channel: "newsletter",
      createdBy: "writer-1",
    });
    expect(result.governanceStatus).toBeDefined();
    expect(["pass", "warn", "approval_required"]).toContain(
      result.governanceStatus,
    );
  });

  // 3. brief with forbidden phrase gets governance warning/block
  it("brief with forbidden phrase gets governance block", async () => {
    const result = await createContentBrief({
      title: "Game Changer Launch",
      description: "Revolutionary product update.",
      contentType: "blog_post",
      channel: "blog",
      createdBy: "writer-1",
    });
    expect(result.ok).toBe(false);
    expect(result.governanceStatus).toBe("block");
    expect(
      result.blockedReasons?.some((r) => r.includes("brand_voice")),
    ).toBe(true);
  });

  // 4. publishContent updates asset status to published
  it("publishContent updates asset status to published", async () => {
    const briefResult = await createContentBrief({
      title: "Publication Test",
      description: "Asset publication target.",
      contentType: "blog_post",
      channel: "blog",
      createdBy: "writer-1",
    });
    expect(briefResult.ok).toBe(true);
    const briefId = briefResult.briefId!;

    const pubResult = await publishContent(briefId, {
      publishedUri: "https://example.test/post-1",
    });
    expect(pubResult.ok).toBe(true);
    expect(pubResult.asset?.status).toBe("published");
    expect(pubResult.asset?.publishedUri).toBe("https://example.test/post-1");
  });

  // 5. attribution emits after publish (no throw)
  it("attribution emits after publish (no throw)", async () => {
    const briefResult = await createContentBrief({
      title: "Attribution Publish",
      description: "Publish attribution check.",
      contentType: "blog_post",
      channel: "blog",
      createdBy: "writer-1",
    });
    const briefId = briefResult.briefId!;

    const spy = vi.spyOn(attributionTracker, "emitEvent").mockResolvedValue({
      eventId: "x",
      eventType: "content_published",
      runId: "r",
      agentId: "content-engine",
      channel: "blog",
      timestamp: new Date().toISOString(),
    });

    const pubResult = await publishContent(briefId);
    expect(pubResult.ok).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  // 6. returned result includes briefId and dagRunId
  it("returned result includes briefId and dagRunId", async () => {
    const result = await createContentBrief({
      title: "Identifier Surface",
      description: "Confirm both identifiers are present.",
      contentType: "case_study",
      channel: "newsletter",
      createdBy: "writer-1",
    });
    expect(result.briefId).toBeDefined();
    expect(typeof result.briefId).toBe("string");
    expect(result.dagRunId).toBeDefined();
    expect(typeof result.dagRunId).toBe("string");
  });
});
