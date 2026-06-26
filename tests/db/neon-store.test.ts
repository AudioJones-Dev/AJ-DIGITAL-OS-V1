/**
 * Neon-backed store tests — fallback mode.
 *
 * These tests run without NEON_DATABASE_URL set, exercising the
 * file-backed fallback path of each store. Real-Neon behaviour is
 * tested separately in integration tests when a database is available.
 *
 * The file-backed stores honor AJ_RUNTIME_DIR, which the Vitest setup
 * points at a per-worker temp directory so parallel forks cannot clobber
 * the same runtime files.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  neonGetControlRun,
  neonListControlRuns,
  neonSaveControlRun,
  neonUpdateControlState,
} from "../../src/db/neon-run-store.js";
import {
  neonGetDagRun,
  neonListDagRuns,
  neonSaveDagRun,
} from "../../src/db/neon-dag-store.js";
import { NeonApprovalStore } from "../../src/db/neon-approval-store.js";
import { PersistentApprovalStore } from "../../src/security/approvals/persistent-approval-store.js";
import { DbStatusCommand } from "../../src/commands/db.commands.js";
import type { ControlRunRecord } from "../../src/control-plane/run-registry/run-control-types.js";
import type { BelDagRunState } from "../../src/bel/dag/dag-types.js";
import type { ApprovalRequest } from "../../src/security/approvals/approval-types.js";

const ORIGINAL_NEON_URL = process.env.NEON_DATABASE_URL;
const RUN_ID_NS = `neon-store-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
const AGENT_ID = `agent-${RUN_ID_NS}`;
const DAG_ID = `dag-${RUN_ID_NS}`;

beforeEach(() => {
  delete process.env.NEON_DATABASE_URL;
});

afterEach(() => {
  if (ORIGINAL_NEON_URL !== undefined) {
    process.env.NEON_DATABASE_URL = ORIGINAL_NEON_URL;
  } else {
    delete process.env.NEON_DATABASE_URL;
  }
});

function makeControlRun(suffix: string, state: ControlRunRecord["controlState"] = "queued"): ControlRunRecord {
  const now = new Date().toISOString();
  return {
    runId: `${RUN_ID_NS}-${suffix}`,
    agentId: AGENT_ID,
    controlState: state,
    createdAt: now,
    updatedAt: now,
  };
}

function makeDagRun(suffix: string, status: BelDagRunState["status"] = "pending"): BelDagRunState {
  const now = new Date().toISOString();
  return {
    runId: `${RUN_ID_NS}-${suffix}`,
    dagId: DAG_ID,
    status,
    nodes: [],
    edges: [],
    environment: "development",
    createdAt: now,
    updatedAt: now,
  };
}

// ── Control Run Store ────────────────────────────────────────────────────

describe("neonGetControlRun (fallback mode)", () => {
  it("returns null when run does not exist", async () => {
    const result = await neonGetControlRun(`${RUN_ID_NS}-missing`);
    expect(result).toBeNull();
  });

  it("returns null when Neon not configured and file store empty", async () => {
    expect(process.env.NEON_DATABASE_URL).toBeUndefined();
    const result = await neonGetControlRun(`${RUN_ID_NS}-never-saved`);
    expect(result).toBeNull();
  });
});

describe("neonSaveControlRun + neonGetControlRun (fallback mode)", () => {
  it("round-trips a saved record", async () => {
    const record = makeControlRun("rt-1", "queued");
    await neonSaveControlRun(record);
    const fetched = await neonGetControlRun(record.runId);
    expect(fetched).not.toBeNull();
    expect(fetched?.runId).toBe(record.runId);
    expect(fetched?.agentId).toBe(AGENT_ID);
    expect(fetched?.controlState).toBe("queued");
  });
});

describe("neonListControlRuns (fallback mode)", () => {
  it("returns an empty array for an unused agent filter", async () => {
    const list = await neonListControlRuns({ agentId: `${AGENT_ID}-unused-${Date.now()}` });
    expect(list).toEqual([]);
  });
});

describe("neonUpdateControlState (fallback mode)", () => {
  it("updates state correctly", async () => {
    const record = makeControlRun("update-1", "queued");
    await neonSaveControlRun(record);
    const updated = await neonUpdateControlState(record.runId, "planning");
    expect(updated.controlState).toBe("planning");
    expect(updated.previousState).toBe("queued");
  });
});

// ── DAG Run Store ────────────────────────────────────────────────────────

describe("neonGetDagRun (fallback mode)", () => {
  it("returns null for unknown runId", async () => {
    const result = await neonGetDagRun(`${RUN_ID_NS}-missing-dag`);
    expect(result).toBeNull();
  });
});

describe("neonSaveDagRun + neonGetDagRun (fallback mode)", () => {
  it("round-trips a DAG run", async () => {
    const run = makeDagRun("dag-rt", "pending");
    await neonSaveDagRun(run);
    const fetched = await neonGetDagRun(run.runId);
    expect(fetched).not.toBeNull();
    expect(fetched?.runId).toBe(run.runId);
    expect(fetched?.status).toBe("pending");
  });
});

describe("neonListDagRuns (fallback mode)", () => {
  it("filters by tenantId", async () => {
    const tenantId = `tenant-${RUN_ID_NS}`;
    const r1 = { ...makeDagRun("dag-list-1", "pending"), tenantId };
    const r2 = { ...makeDagRun("dag-list-2", "completed"), tenantId };
    await neonSaveDagRun(r1);
    await neonSaveDagRun(r2);

    const matched = await neonListDagRuns({ tenantId });
    const ids = matched.map((r) => r.runId).sort();
    expect(ids).toContain(r1.runId);
    expect(ids).toContain(r2.runId);
    expect(matched.every((r) => r.tenantId === tenantId)).toBe(true);
  });
});

// ── DB Status Command ────────────────────────────────────────────────────

describe("DbStatusCommand", () => {
  it("returns ok:false when NEON_DATABASE_URL not set", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const result = await new DbStatusCommand().run({ json: true });
    logSpy.mockRestore();
    expect(result.ok).toBe(false);
    expect(result.connected).toBe(false);
  });
});

// ── Approval Store Fallback ──────────────────────────────────────────────

describe("NeonApprovalStore (fallback mode)", () => {
  it("falls back to file store when Neon not configured", async () => {
    const tmp = mkdtempSync(join(tmpdir(), "aj-approvals-"));
    const file = join(tmp, "approvals.json");
    const store = new NeonApprovalStore(new PersistentApprovalStore(file));

    const request: ApprovalRequest = {
      approvalId: `appr-${RUN_ID_NS}`,
      requestedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      requestedByAgentId: AGENT_ID,
      permissionLevel: 2,
      actionCategory: "GIT_PUSH",
      risk: "medium",
      reason: "test",
      target: null,
      command: null,
      clientId: null,
      environment: "local",
      status: "pending",
      approvedBy: null,
      approvalChannel: null,
      auditId: null,
    };

    await store.save(request);
    const fetched = await store.getById(request.approvalId);
    expect(fetched).not.toBeNull();
    expect(fetched?.approvalId).toBe(request.approvalId);

    rmSync(tmp, { recursive: true, force: true });
  });
});
