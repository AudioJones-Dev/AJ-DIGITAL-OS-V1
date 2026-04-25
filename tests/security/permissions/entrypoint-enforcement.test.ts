import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { writeMissionState } from "../../../src/agent-roles/shared-memory.js";
import { safeWriteFile } from "../../../src/local-agent/file-tools.js";
import type { MissionState } from "../../../src/agent-roles/mission-types.js";

describe("mutation entrypoint enforcement", () => {
  const tempDirs: string[] = [];

  afterEach(async () => {
    await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
    tempDirs.length = 0;
  });

  it("blocks local safeWriteFile when permission level is read-only", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "aj-enforced-write-"));
    tempDirs.push(dir);

    const target = path.join(dir, "blocked.txt");
    const result = await safeWriteFile(target, "blocked", [dir], {
      agentId: "local-agent-file-tools",
      permissionLevel: 0,
    });

    expect(result.ok).toBe(false);
    await expect(access(target)).rejects.toThrowError();
  });

  it("allows local safeWriteFile when permission level supports write", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "aj-enforced-write-"));
    tempDirs.push(dir);

    const target = path.join(dir, "allowed.txt");
    const result = await safeWriteFile(target, "allowed", [dir], {
      agentId: "local-agent-file-tools",
      permissionLevel: 2,
    });

    expect(result.ok).toBe(true);
    const content = await readFile(target, "utf-8");
    expect(content).toBe("allowed");
  });

  it("blocks shared-memory mission state writes for read-only permission", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "aj-shared-memory-"));
    tempDirs.push(dir);

    const state: MissionState = {
      missionId: "mission-1",
      status: "pending",
      plan: null,
      executionOutput: null,
      validationResult: null,
      alerts: [],
      escalations: [],
      memoryRefs: [],
      sharedData: {},
    };

    await expect(
      writeMissionState(state, {
        root: dir,
        enforcement: {
          agentId: "shared-memory",
          permissionLevel: 0,
        },
      }),
    ).rejects.toThrowError(/blocked|approval/i);
  });
});
