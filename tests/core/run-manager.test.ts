import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { RunManager } from "../../src/core/run-manager.js";
import { RunStore } from "../../src/core/run-store.js";

const FIXTURE_PATH = path.resolve("tests", "fixtures", "runs", "sample-run.json");

describe("RunManager", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it("creates and transitions a run through approval and execution states", { timeout: 15_000 }, async () => {
    const runsDir = await mkdtemp(path.join(os.tmpdir(), "aj-runs-"));
    tempDirs.push(runsDir);
    const manager = new RunManager(new RunStore(runsDir));

    const run = await manager.createRun({
      workflowId: "blog-authority",
      taskType: "blog_post",
      clientId: "client_alpha",
    });

    await manager.updateStatus(run.runId, "context_loaded");
    await manager.updateStatus(run.runId, "in_progress");
    await manager.updateStatus(run.runId, "draft_complete");
    await manager.updateStatus(run.runId, "validation_passed");
    const pending = await manager.markPendingApproval(run.runId);
    expect(pending.status).toBe("pending_approval");

    const approved = await manager.markApproved(run.runId, "operator_1");
    expect(approved.status).toBe("approved");
    expect(approved.approvalStatus).toBe("approved");

    const executed = await manager.markExecuted(run.runId, {
      publishedPath: "dist/out.md",
      publishedFiles: ["dist/out.md"],
    });

    expect(executed.status).toBe("executed");
    expect(executed.publishedPath).toBe("dist/out.md");
    expect(executed.publishedFiles).toEqual(["dist/out.md"]);
  });

  it("increments revision count from fixture data", async () => {
    const runsDir = await mkdtemp(path.join(os.tmpdir(), "aj-runs-"));
    tempDirs.push(runsDir);

    const fixtureRaw = await readFile(FIXTURE_PATH, "utf-8");
    const fixture = JSON.parse(fixtureRaw) as { runId: string };
    await writeFile(path.join(runsDir, `${fixture.runId}.json`), `${fixtureRaw}\n`, "utf-8");

    const manager = new RunManager(new RunStore(runsDir));
    const revised = await manager.markRevisionRequested(fixture.runId, "reviewer_1");

    expect(revised.status).toBe("revision_requested");
    expect(revised.approvalStatus).toBe("revision_requested");
    expect(revised.revisionCount).toBe(1);
  });

  const createPendingRun = async () => {
    const runsDir = await mkdtemp(path.join(os.tmpdir(), "aj-runs-"));
    tempDirs.push(runsDir);
    const manager = new RunManager(new RunStore(runsDir));

    const run = await manager.createRun({
      workflowId: "blog-authority",
      taskType: "blog_post",
      clientId: "client_alpha",
    });

    await manager.updateStatus(run.runId, "context_loaded");
    await manager.updateStatus(run.runId, "in_progress");
    await manager.updateStatus(run.runId, "draft_complete");
    await manager.updateStatus(run.runId, "validation_passed");
    await manager.markPendingApproval(run.runId);

    return { manager, runId: run.runId };
  };

  it("creates runs without approval when disabled", async () => {
    const runsDir = await mkdtemp(path.join(os.tmpdir(), "aj-runs-"));
    tempDirs.push(runsDir);
    const manager = new RunManager(new RunStore(runsDir));

    const run = await manager.createRun({
      workflowId: "blog-authority",
      taskType: "blog_post",
      clientId: "client_alpha",
      approvalRequired: false,
    });

    expect(run.approvalRequired).toBe(false);
    expect(run.approvalStatus).toBe("not_required");
  });

  it("returns undefined for unknown runs", async () => {
    const runsDir = await mkdtemp(path.join(os.tmpdir(), "aj-runs-"));
    tempDirs.push(runsDir);
    const manager = new RunManager(new RunStore(runsDir));

    await expect(manager.getRun("run_missing")).resolves.toBeUndefined();
  });

  it("marks a run approved without an approver", { timeout: 15_000 }, async () => {
    const { manager, runId } = await createPendingRun();

    const approved = await manager.markApproved(runId);

    expect(approved.status).toBe("approved");
    expect(approved.approvalStatus).toBe("approved");
    expect(approved.approvedBy).toBeUndefined();
    expect(approved.approvedAt).toBeDefined();
  });

  it("marks a run rejected and records the approver", { timeout: 15_000 }, async () => {
    const { manager, runId } = await createPendingRun();

    const rejected = await manager.markRejected(runId, "operator_2");

    expect(rejected.status).toBe("rejected");
    expect(rejected.approvalStatus).toBe("rejected");
    expect(rejected.approvedBy).toBe("operator_2");
  });

  it("marks a run rejected without an approver", { timeout: 15_000 }, async () => {
    const { manager, runId } = await createPendingRun();

    const rejected = await manager.markRejected(runId);

    expect(rejected.status).toBe("rejected");
    expect(rejected.approvedBy).toBeUndefined();
  });

  it("requests revision without an approver", { timeout: 15_000 }, async () => {
    const { manager, runId } = await createPendingRun();

    const revised = await manager.markRevisionRequested(runId);

    expect(revised.status).toBe("revision_requested");
    expect(revised.revisionCount).toBe(1);
    expect(revised.approvedBy).toBeUndefined();
  });

  it("throws when requesting revision for a missing run", async () => {
    const runsDir = await mkdtemp(path.join(os.tmpdir(), "aj-runs-"));
    tempDirs.push(runsDir);
    const manager = new RunManager(new RunStore(runsDir));

    await expect(manager.markRevisionRequested("run_missing")).rejects.toThrow(
      'Run "run_missing" was not found.',
    );
  });
});
