import { describe, it, expect, beforeEach, vi } from "vitest";
import { existsSync, rmSync } from "node:fs";
import { join } from "node:path";

const NORMALIZATION_DIR = join(process.cwd(), "runtime", "normalization");
const OFFER_FILE = join(NORMALIZATION_DIR, "offer.json");
const AUDIT_FILE = join(NORMALIZATION_DIR, "normalization-audit.jsonl");

beforeEach(() => {
  for (const path of [OFFER_FILE, AUDIT_FILE]) {
    if (existsSync(path)) rmSync(path);
  }
});

import { createOffer } from "../../src/apps/offer-engine/index.js";
import { listEntities } from "../../src/normalization/normalization-store.js";
import { defaultApprovalService } from "../../src/security/approvals/approval-service.js";
import * as attributionTracker from "../../src/attribution/attribution-tracker.js";

function baseOffer(overrides: Partial<Parameters<typeof createOffer>[0]> = {}) {
  return {
    title: "Strategy Audit",
    type: "audit",
    price: 1500,
    currency: "USD",
    deliverables: ["assessment", "report", "recommendations"],
    timeline: "4 weeks",
    createdBy: "test-user",
    meaningfulScore: 3,
    actionableScore: 3,
    profitableScore: 2,
    ...overrides,
  };
}

describe("Offer Engine", () => {
  // 1. creates offer that passes governance and MAP scoring
  it("creates offer that passes governance and MAP scoring", async () => {
    const result = await createOffer(baseOffer());
    expect(result.ok).toBe(true);
    expect(result.offer).toBeDefined();
    expect(result.offer?.title).toBe("Strategy Audit");
    expect(result.governanceStatus).not.toBe("block");
    expect(typeof result.mapScore).toBe("number");
    expect(result.decisionBand).toBeDefined();
    expect(result.decision).toBeDefined();
  });

  // 2. blocks offer with forbidden phrase in title (brand voice violation)
  it("blocks offer with forbidden phrase in title (brand voice violation)", async () => {
    const result = await createOffer(
      baseOffer({ title: "Game Changer Audit Package" }),
    );
    expect(result.ok).toBe(false);
    expect(result.governanceStatus).toBe("block");
    expect(result.blockedReasons?.some((r) => r.includes("brand_voice"))).toBe(
      true,
    );
  });

  // 3. blocks offer with price below minimum floor (offer governance violation)
  it("blocks offer with price below minimum floor", async () => {
    const result = await createOffer(
      baseOffer({ type: "audit", price: 100 }),
    );
    expect(result.ok).toBe(false);
    expect(result.governanceStatus).toBe("block");
    expect(result.blockedReasons?.some((r) => r.includes("offer:price"))).toBe(
      true,
    );
  });

  // 4. MAP score is calculated correctly from offer data
  it("MAP score is calculated correctly from offer data", async () => {
    const result = await createOffer(
      baseOffer({
        meaningfulScore: 3,
        actionableScore: 3,
        profitableScore: 3,
      }),
    );
    expect(result.ok).toBe(true);
    expect(result.mapScore).toBe(9);
    expect(result.decisionBand).toBe("strong_alignment");
    expect(result.decision).toBe("execute");
  });

  // 5. normalized offer is persisted to store
  it("normalized offer is persisted to store", async () => {
    const result = await createOffer(baseOffer({ title: "Audit Persistence" }));
    expect(result.ok).toBe(true);
    const offers = listEntities("offer");
    expect(offers.length).toBeGreaterThan(0);
    expect(offers.some((o) => o.title === "Audit Persistence")).toBe(true);
  });

  // 6. attribution emits after successful offer creation (no throw)
  it("attribution emits after successful offer creation (no throw)", async () => {
    const spy = vi.spyOn(attributionTracker, "emitEvent").mockResolvedValue({
      eventId: "x",
      eventType: "offer_engine_created",
      runId: "r",
      agentId: "offer-engine",
      channel: "unknown",
      timestamp: new Date().toISOString(),
    });

    const result = await createOffer(baseOffer({ title: "Attr Audit" }));
    expect(result.ok).toBe(true);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  // 7. blocked offer does not get persisted
  it("blocked offer does not get persisted", async () => {
    const before = listEntities("offer").length;
    const result = await createOffer(
      baseOffer({ title: "Revolutionary Audit" }),
    );
    expect(result.ok).toBe(false);
    const after = listEntities("offer").length;
    expect(after).toBe(before);
  });

  // 8. result includes governanceStatus field
  it("result includes governanceStatus field", async () => {
    const result = await createOffer(baseOffer({ title: "Status Field Audit" }));
    expect(result.governanceStatus).toBeDefined();
    expect(typeof result.governanceStatus).toBe("string");
  });

  // 9. G4: a discount needing approval creates a real ApprovalRequest
  it("creates a real approval request when a discount needs approval", async () => {
    const result = await createOffer(baseOffer({ title: "Discounted Audit", discountPercent: 20 }));
    expect(result.ok).toBe(true);
    expect(result.governanceStatus).toBe("approval_required");
    expect(typeof result.approvalId).toBe("string");
    expect(result.approvalId!.length).toBeGreaterThan(0);
    // proves the request was persisted + retrievable, not just an id minted
    const persisted = await defaultApprovalService.getApprovalById(result.approvalId!);
    expect(persisted).not.toBeNull();
    expect(persisted?.status).toBe("pending");
  });

  // 10. G4: a clean offer auto-approves with no approval request
  it("does not create an approval request for a clean offer", async () => {
    const result = await createOffer(baseOffer({ title: "Clean Audit" }));
    expect(result.ok).toBe(true);
    expect(result.governanceStatus).not.toBe("approval_required");
    expect(result.approvalId).toBeUndefined();
  });

  // 11. G4: discountPercent threads through to the offer policy (blocks over-max)
  it("blocks an offer whose discount exceeds the maximum approved tier", async () => {
    const result = await createOffer(baseOffer({ title: "Over Discount Audit", discountPercent: 50 }));
    expect(result.ok).toBe(false);
    expect(result.governanceStatus).toBe("block");
    expect(result.blockedReasons?.some((r) => r.includes("discountPercent"))).toBe(true);
  });
});
