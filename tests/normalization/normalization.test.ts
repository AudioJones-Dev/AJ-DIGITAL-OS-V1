import { describe, it, expect, beforeEach, vi } from "vitest";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";

const NORMALIZATION_DIR = join(process.cwd(), "runtime", "normalization");
const AUDIT_FILE = join(NORMALIZATION_DIR, "normalization-audit.jsonl");
const ENTITY_FILES = [
  "tenant",
  "contact",
  "lead",
  "offer",
  "asset",
  "workflow",
  "knowledge_document",
].map((t) => join(NORMALIZATION_DIR, `${t}.json`));

beforeEach(() => {
  for (const path of [...ENTITY_FILES, AUDIT_FILE]) {
    if (existsSync(path)) rmSync(path);
  }
});

import {
  normalizeTenant,
  normalizeContact,
  normalizeLead,
  normalizeOffer,
  normalizeAsset,
  normalizeWorkflow,
  normalizeKnowledgeDocument,
  saveEntity,
  getEntity,
  listEntities,
  appendNormalizationAudit,
  getNormalizationAuditEvents,
  emitEntityNormalized,
  mapFields,
  requireFields,
} from "../../src/normalization/index.js";

import * as attributionTracker from "../../src/attribution/attribution-tracker.js";
import { listSchemas } from "../../src/core/schemas/schema-registry.js";
import { evaluateMap } from "../../src/decision/decision-engine.js";

// 1. normalize tenant with all required fields
describe("normalizeTenant", () => {
  it("normalizes tenant with all required fields", () => {
    const tenant = normalizeTenant({
      tenantId: "tenant-001",
      companyName: "Acme Corp",
      industry: "saas",
      tier: "growth",
      primaryContact: { name: "Jane Doe", email: "jane@acme.test" },
      timezone: "America/New_York",
      currency: "USD",
      status: "active",
    });
    expect(tenant.tenantId).toBe("tenant-001");
    expect(tenant.companyName).toBe("Acme Corp");
    expect(tenant.tier).toBe("growth");
    expect(tenant.primaryContact.email).toBe("jane@acme.test");
    expect(tenant.schemaVersion).toBe("1.0.0");
    expect(tenant.entityId).toMatch(/^tenant_/);
  });

  // 2. normalize tenant generates entityId if not provided
  it("generates entityId if not provided", () => {
    const t1 = normalizeTenant({
      tenantId: "t-1",
      companyName: "A",
      primaryContact: { name: "X", email: "x@y.z" },
    });
    const t2 = normalizeTenant({
      tenantId: "t-2",
      companyName: "B",
      primaryContact: { name: "Y", email: "y@y.z" },
    });
    expect(t1.entityId).not.toBe(t2.entityId);
    expect(t1.entityId).toMatch(/^tenant_/);
  });

  // 3. normalize tenant rejects missing companyName
  it("rejects missing companyName", () => {
    expect(() =>
      normalizeTenant({
        tenantId: "t-1",
        primaryContact: { name: "x", email: "x@y.z" },
      }),
    ).toThrow(/companyName/);
  });
});

// 4. normalize contact maps source correctly
describe("normalizeContact", () => {
  it("maps source field correctly", () => {
    const contact = normalizeContact({
      first_name: "John",
      last_name: "Smith",
      email: "john@example.test",
      source: "crm",
    });
    expect(contact.firstName).toBe("John");
    expect(contact.lastName).toBe("Smith");
    expect(contact.source).toBe("crm");
    expect(contact.status).toBe("active");
  });
});

// 5. normalize lead sets default stage=new when missing
describe("normalizeLead", () => {
  it("sets default stage=new when missing", () => {
    const lead = normalizeLead({
      firstName: "Alice",
      lastName: "Brown",
      email: "alice@lead.test",
    });
    expect(lead.stage).toBe("new");
    expect(lead.source).toBe("unknown");
  });
});

// 6. normalize offer validates price is positive
describe("normalizeOffer", () => {
  it("validates price is positive", () => {
    expect(() =>
      normalizeOffer({
        title: "Audit Package",
        price: -100,
      }),
    ).toThrow(/positive/);

    expect(() =>
      normalizeOffer({
        title: "Audit Package",
        price: 0,
      }),
    ).toThrow(/positive/);

    const offer = normalizeOffer({
      title: "Audit Package",
      type: "audit",
      tier: "growth",
      price: 5000,
      currency: "USD",
    });
    expect(offer.price).toBe(5000);
    expect(offer.status).toBe("draft");
  });
});

// 7. normalize asset coerces type to allowed enum value
describe("normalizeAsset", () => {
  it("coerces unknown type to 'other'", () => {
    const asset = normalizeAsset({
      title: "Random Doc",
      type: "totally-unknown-type",
      format: "markdown",
    });
    expect(asset.type).toBe("other");
    expect(asset.format).toBe("markdown");
  });
});

// 8. normalize workflow validates executionModel
describe("normalizeWorkflow", () => {
  it("validates executionModel is in allowed enum", () => {
    expect(() =>
      normalizeWorkflow({
        name: "Test Flow",
        type: "ingest",
        executionModel: "graph",
      }),
    ).toThrow(/executionModel/);

    const wf = normalizeWorkflow({
      name: "Test Flow",
      type: "ingest",
      executionModel: "dag",
      steps: [{ stepId: "s1", name: "Start", type: "task", order: 1, required: true }],
    });
    expect(wf.executionModel).toBe("dag");
    expect(wf.steps).toHaveLength(1);
    expect(wf.steps[0]?.stepId).toBe("s1");
  });
});

// 9. normalize knowledge document links namespace
describe("normalizeKnowledgeDocument", () => {
  it("links namespace correctly", () => {
    const doc = normalizeKnowledgeDocument({
      title: "Onboarding Guide",
      namespace: "client_docs",
      sourceType: "markdown",
      retrievalDocumentId: "doc_abc123",
    });
    expect(doc.namespace).toBe("client_docs");
    expect(doc.sourceType).toBe("markdown");
    expect(doc.retrievalDocumentId).toBe("doc_abc123");
  });
});

// 10. field mapper maps raw field names
describe("mapFields", () => {
  it("maps raw field names via aliases", () => {
    const out = mapFields(
      { first_name: "Jane", email_address: "jane@x.y" },
      {
        firstName: ["firstName", "first_name"],
        email: ["email", "email_address"],
      },
    );
    expect(out["firstName"]).toBe("Jane");
    expect(out["email"]).toBe("jane@x.y");
  });
});

// 11. requireFields throws on missing field
describe("requireFields", () => {
  it("throws when a required field is missing", () => {
    expect(() => requireFields({ a: "x" }, ["a", "b"], "test")).toThrow(/b/);
    expect(() => requireFields({ a: "x", b: "y" }, ["a", "b"], "test")).not.toThrow();
  });
});

// 12. save and retrieve entity from store
describe("normalization store", () => {
  it("saves and retrieves an entity", () => {
    const tenant = normalizeTenant({
      tenantId: "tenant-store",
      companyName: "Store Co",
      primaryContact: { name: "S", email: "s@store.test" },
    });
    saveEntity("tenant", tenant);
    const fetched = getEntity("tenant", tenant.entityId);
    expect(fetched).toBeDefined();
    expect(fetched?.companyName).toBe("Store Co");
  });
});

// 13. normalization audit event written
describe("normalization audit", () => {
  it("writes an audit event to disk", () => {
    appendNormalizationAudit({
      eventType: "entity_normalized",
      entityType: "lead",
      entityId: "lead_x",
      payload: { source: "test" },
    });
    const events = getNormalizationAuditEvents({ entityId: "lead_x" });
    expect(events.length).toBeGreaterThan(0);
    expect(events[0]?.eventType).toBe("entity_normalized");
    expect(existsSync(AUDIT_FILE)).toBe(true);
  });
});

// 14. attribution emits after normalize (fire-and-forget, no throw)
describe("normalization attribution fire-and-forget", () => {
  it("emitEntityNormalized does not throw and triggers emitEvent", () => {
    const spy = vi.spyOn(attributionTracker, "emitEvent").mockResolvedValue({
      eventId: "x",
      eventType: "entity_normalized",
      runId: "r",
      agentId: "a",
      channel: "unknown",
      timestamp: new Date().toISOString(),
    });

    const tenant = normalizeTenant({
      tenantId: "ten-attr",
      companyName: "Attr",
      primaryContact: { name: "n", email: "e@x.y" },
    });
    expect(() => emitEntityNormalized("tenant", tenant)).not.toThrow();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  // 15. attribution failure does not throw
  it("emitEntityNormalized swallows rejected promise", async () => {
    const spy = vi
      .spyOn(attributionTracker, "emitEvent")
      .mockRejectedValue(new Error("boom"));

    const tenant = normalizeTenant({
      tenantId: "ten-fail",
      companyName: "Fail",
      primaryContact: { name: "n", email: "e@x.y" },
    });
    expect(() => emitEntityNormalized("tenant", tenant)).not.toThrow();
    await Promise.resolve();
    spy.mockRestore();
  });

});

// 16. schema registry has all 7 entity schemas registered
describe("schema registry", () => {
  it("has all 7 normalized entity schemas registered", () => {
    const names = listSchemas().map((s) => s.name);
    for (const name of [
      "NormalizedTenant",
      "NormalizedContact",
      "NormalizedLead",
      "NormalizedOffer",
      "NormalizedAsset",
      "NormalizedWorkflow",
      "NormalizedKnowledgeDocument",
    ]) {
      expect(names).toContain(name);
    }
  });
});

// 17. full round-trip: raw lead → normalize → store → retrieve → verify
describe("round-trip", () => {
  it("raw lead → normalize → store → retrieve → matches", () => {
    const raw = {
      first_name: "Round",
      last_name: "Trip",
      email: "round@trip.test",
      source: "outbound",
      score: 85,
      stage: "qualified",
      tenantId: "tenant-rt",
    };
    const normalized = normalizeLead(raw);
    saveEntity("lead", normalized);

    const fetched = getEntity("lead", normalized.entityId);
    expect(fetched).toBeDefined();
    expect(fetched?.firstName).toBe("Round");
    expect(fetched?.lastName).toBe("Trip");
    expect(fetched?.score).toBe(85);
    expect(fetched?.stage).toBe("qualified");
    expect(fetched?.tenantId).toBe("tenant-rt");

    const list = listEntities("lead", { tenantId: "tenant-rt" });
    expect(list.some((l) => l.entityId === normalized.entityId)).toBe(true);
  });
});

// 18. governance/decision engine can receive normalized offer for evaluation
describe("normalized offer feeds decision engine", () => {
  it("normalized offer can be passed to MAP evaluation", () => {
    const offer = normalizeOffer({
      title: "Premium Audit",
      type: "audit",
      tier: "growth",
      price: 9500,
      currency: "USD",
      governanceStatus: "pending",
    });

    const evaluation = evaluateMap({
      title: offer.title,
      description: `Offer: ${offer.title} (${offer.type}, ${offer.tier})`,
      category: "offer",
      meaningfulScore: 3,
      actionableScore: 2,
      profitableScore: 3,
      createdBy: "test-user",
      environment: "local",
    });

    expect(evaluation.evaluationId).toBeDefined();
    expect(evaluation.title).toBe("Premium Audit");
    expect(evaluation.mapScore).toBeGreaterThanOrEqual(0);
    expect(evaluation.mapScore).toBeLessThanOrEqual(9);

    // also verify the audit log captures the linkage
    appendNormalizationAudit({
      eventType: "entity_normalized",
      entityType: "offer",
      entityId: offer.entityId,
      payload: { evaluationId: evaluation.evaluationId, mapScore: evaluation.mapScore },
    });
    const audit = getNormalizationAuditEvents({ entityId: offer.entityId });
    expect(audit.length).toBeGreaterThan(0);
    expect(audit[0]?.payload["evaluationId"]).toBe(evaluation.evaluationId);

    // confirm audit file is created
    expect(existsSync(AUDIT_FILE)).toBe(true);
    const auditLines = readFileSync(AUDIT_FILE, "utf-8").trim().split("\n");
    expect(auditLines.length).toBeGreaterThan(0);
  });
});
