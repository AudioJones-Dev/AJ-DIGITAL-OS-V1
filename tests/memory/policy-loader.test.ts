import os from "node:os";
import path from "node:path";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";

import { loadRetrievalPolicy, MemoryPolicyError } from "../../src/memory/policy-loader.js";

let tmpDir = "";

afterEach(async () => {
  if (tmpDir) {
    await rm(tmpDir, { recursive: true, force: true });
    tmpDir = "";
  }
});

describe("loadRetrievalPolicy", () => {
  it("loads and normalizes checked-in retrieval policy JSON", () => {
    const policy = loadRetrievalPolicy("codex");

    expect(policy.policyId).toBe("codex");
    expect(policy.allowedTypes).toContain("decision");
    expect(policy.retrievalOrder[0]).toBe("working_context");
    expect(policy.citationsRequired).toBe(true);
    expect(policy.tenantIsolationRequired).toBe(true);
  });

  it("throws a typed error for invalid policy JSON", async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "memory-policy-json-"));
    await writeFile(path.join(tmpDir, "retrieval-policy-bad.json"), "{", "utf-8");

    expect(() => loadRetrievalPolicy("bad", { policyDirectory: tmpDir })).toThrow(MemoryPolicyError);

    try {
      loadRetrievalPolicy("bad", { policyDirectory: tmpDir });
    } catch (error) {
      expect(error).toBeInstanceOf(MemoryPolicyError);
      expect((error as MemoryPolicyError).code).toBe("invalid_policy_json");
    }
  });

  it("throws a typed error for missing required policy fields", async () => {
    tmpDir = await mkdtemp(path.join(os.tmpdir(), "memory-policy-shape-"));
    await writeFile(path.join(tmpDir, "retrieval-policy-incomplete.json"), JSON.stringify({ policy_id: "incomplete" }), "utf-8");

    try {
      loadRetrievalPolicy("incomplete", { policyDirectory: tmpDir });
    } catch (error) {
      expect(error).toBeInstanceOf(MemoryPolicyError);
      expect((error as MemoryPolicyError).code).toBe("invalid_policy_shape");
      return;
    }

    throw new Error("Expected invalid policy shape error.");
  });

  it("rejects policy names that could escape the policy directory", () => {
    expect(() => loadRetrievalPolicy("../codex")).toThrow(MemoryPolicyError);
  });
});
