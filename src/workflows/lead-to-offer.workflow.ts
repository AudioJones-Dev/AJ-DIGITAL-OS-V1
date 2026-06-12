import { randomUUID } from "node:crypto";
import { normalizeLead } from "../normalization/normalizer.js";
import { runDiagnosis } from "../apps/diagnostic-engine/diagnostic-engine.js";
import { createOffer } from "../apps/offer-engine/offer-engine.js";
import { createContentBrief } from "../apps/content-engine/content-engine.js";
import { evaluateGovernance } from "../governance/governance-engine.js";
import { evaluateMap } from "../decision/decision-engine.js";
import { executeConnector } from "../connectors/connector-executor.js";
import { getConnector } from "../connectors/connector-registry.js";
import { emitEvent } from "../attribution/attribution-tracker.js";
import { createDagRun, completeNode, failNode } from "../bel/dag/dag-runtime.js";
import { saveDagRun } from "../bel/dag/dag-store.js";
import type { BelDagPlan } from "../bel/dag/dag-types.js";
import type { LeadToOfferInput, LeadToOfferResult, LeadToOfferStages } from "./lead-to-offer.types.js";
import type { NormalizedLead } from "../normalization/normalization-types.js";

const LEAD_TO_OFFER_PLAN: Omit<BelDagPlan, "dagId" | "runId" | "createdAt"> = {
  name: "Lead to Offer Pipeline",
  version: "1.0.0",
  environment: "development",
  policyVersion: "sop-v1",
  createdBy: "system",
  nodes: [
    { nodeId: "fetch-lead", type: "retrieve", name: "Fetch Lead", status: "pending", riskLevel: "medium", inputRefs: [], outputRefs: [], attempts: 0, maxAttempts: 3 },
    { nodeId: "normalize-lead", type: "transform", name: "Normalize Lead", status: "pending", riskLevel: "low", inputRefs: [], outputRefs: [], attempts: 0, maxAttempts: 2 },
    { nodeId: "diagnose", type: "score", name: "Run Diagnosis", status: "pending", riskLevel: "low", inputRefs: [], outputRefs: [], attempts: 0, maxAttempts: 2 },
    { nodeId: "score-map", type: "score", name: "MAP Evaluation", status: "pending", riskLevel: "low", inputRefs: [], outputRefs: [], attempts: 0, maxAttempts: 1 },
    { nodeId: "create-offer", type: "generate", name: "Generate Offer", status: "pending", riskLevel: "medium", inputRefs: [], outputRefs: [], attempts: 0, maxAttempts: 2 },
    { nodeId: "governance-check", type: "audit", name: "Governance Review", status: "pending", riskLevel: "low", inputRefs: [], outputRefs: [], attempts: 0, maxAttempts: 1 },
    { nodeId: "content-brief", type: "publish", name: "Create Content Brief", status: "pending", riskLevel: "low", inputRefs: [], outputRefs: [], attempts: 0, maxAttempts: 2 },
    { nodeId: "emit-attribution", type: "attribution", name: "Emit Attribution", status: "pending", riskLevel: "low", inputRefs: [], outputRefs: [], attempts: 0, maxAttempts: 1 },
  ],
  edges: [
    { from: "fetch-lead", to: "normalize-lead" },
    { from: "normalize-lead", to: "diagnose" },
    { from: "normalize-lead", to: "score-map" },
    { from: "diagnose", to: "create-offer" },
    { from: "score-map", to: "create-offer" },
    { from: "create-offer", to: "governance-check" },
    { from: "governance-check", to: "content-brief" },
    { from: "governance-check", to: "emit-attribution" },
  ],
};

function mockLead(input: LeadToOfferInput): Record<string, unknown> {
  return {
    firstName: input.leadData?.firstName ?? "Demo",
    lastName: input.leadData?.lastName ?? "Lead",
    email: input.leadData?.email ?? "demo@example.com",
    company: input.leadData?.company ?? "Demo Corp",
    source: input.leadData?.source ?? "outbound",
  };
}

export async function runLeadToOfferWorkflow(input: LeadToOfferInput): Promise<LeadToOfferResult> {
  const start = Date.now();
  const errors: string[] = [];
  const stages: LeadToOfferStages = {};
  const nodeOutputs: Record<string, unknown> = {};

  const rawEnv = input.environment ?? process.env["HERMES_ENVIRONMENT"] ?? "local";
  // Map "local" → "development" for typed env unions
  const env = rawEnv === "local" ? "development" : rawEnv;
  const createdBy = input.createdBy ?? "lead-to-offer-workflow";

  const plan: BelDagPlan = {
    ...LEAD_TO_OFFER_PLAN,
    dagId: "lead-to-offer-v1",
    runId: randomUUID(),
    createdAt: new Date().toISOString(),
    ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
    environment: (env === "local" ? "development" : env) as BelDagPlan["environment"],
  };

  let dagState = createDagRun(plan, { actor: createdBy });
  const dagRunId = dagState.runId;

  // ── Step 1: fetch-lead ──────────────────────────────────────────
  try {
    let rawLead: Record<string, unknown>;
    const airtable = getConnector("airtable");
    if (input.airtableRecordId && airtable?.enabled) {
      const result = await executeConnector({
        connectorId: "airtable",
        action: "read",
        payload: { recordId: input.airtableRecordId },
        ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
        environment: env,
      });
      rawLead = result.ok ? (result.data as Record<string, unknown> ?? mockLead(input)) : mockLead(input);
    } else {
      rawLead = mockLead(input);
    }
    nodeOutputs["fetch-lead"] = rawLead;
    dagState = completeNode(dagState, "fetch-lead", rawLead);
    stages.leadFetched = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch-lead failed";
    errors.push(msg);
    dagState = failNode(dagState, "fetch-lead", msg);
  }

  // ── Step 2: normalize-lead ──────────────────────────────────────
  let lead: NormalizedLead | undefined;
  try {
    const raw = nodeOutputs["fetch-lead"] as Record<string, unknown> ?? mockLead(input);
    lead = normalizeLead(raw);
    nodeOutputs["normalize-lead"] = lead;
    dagState = completeNode(dagState, "normalize-lead", lead);
    stages.leadNormalized = true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "normalize-lead failed";
    errors.push(msg);
    dagState = failNode(dagState, "normalize-lead", msg);
  }

  // ── Steps 3+4 in parallel: diagnose + score-map ─────────────────
  const diagnosisPromise = (async () => {
    try {
      const desc = lead ? `${lead.company ?? "Company"} lead qualification — ${lead.stage}` : "Lead qualification";
      const diag = await runDiagnosis({
        description: desc,
        category: "lead_gen" as import("../apps/diagnostic-engine/diagnostic-engine-types.js").DiagnosticCategory,
        keywords: [lead?.company ?? "", lead?.source ?? ""].filter(Boolean),
        ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
        environment: env as "production" | "staging" | "development" | "test",
      });
      nodeOutputs["diagnose"] = diag;
      dagState = completeNode(dagState, "diagnose", diag as unknown as Record<string, unknown>);
      stages.diagnosed = true;
      return diag;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "diagnose failed";
      errors.push(msg);
      dagState = failNode(dagState, "diagnose", msg);
      return undefined;
    }
  })();

  const mapPromise = (async () => {
    try {
      const mapEval = evaluateMap({
        title: `Lead Qualification — ${lead?.company ?? "Unknown"}`,
        description: `Evaluate lead ${lead?.email ?? "unknown"} for offer potential`,
        category: "workflow" as import("../decision/decision-types.js").DecisionCategory,
        meaningfulScore: 2,
        actionableScore: 3,
        profitableScore: 2,
        createdBy,
        environment: (env === "development" ? "local" : env) as "local" | "dev" | "staging" | "production",
        policyVersion: "sop-v1",
      });
      nodeOutputs["score-map"] = mapEval;
      dagState = completeNode(dagState, "score-map", mapEval as unknown as Record<string, unknown>);
      stages.mapScored = true;
      return mapEval;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "score-map failed";
      errors.push(msg);
      dagState = failNode(dagState, "score-map", msg);
      return undefined;
    }
  })();

  const [diagnosis, mapEval] = await Promise.all([diagnosisPromise, mapPromise]);

  // ── Step 5: create-offer ────────────────────────────────────────
  let offerResult: import("../apps/offer-engine/offer-engine-types.js").OfferEngineResult | undefined;
  try {
    offerResult = await createOffer({
      title: input.offerTitle ?? `Consultation — ${lead?.company ?? "Client"}`,
      type: input.offerType ?? "consulting",
      price: 1500,
      currency: "USD",
      deliverables: ["discovery-call", "assessment", "recommendations"],
      guarantees: [],
      createdBy,
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
    });
    nodeOutputs["create-offer"] = offerResult;
    dagState = completeNode(dagState, "create-offer", offerResult as unknown as Record<string, unknown>);
    stages.offerCreated = offerResult.ok;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "create-offer failed";
    errors.push(msg);
    dagState = failNode(dagState, "create-offer", msg);
  }

  // ── Step 6: governance-check ────────────────────────────────────
  let governancePassed = false;
  try {
    const govResult = await evaluateGovernance({
      content: offerResult?.offer?.title ?? input.offerTitle ?? "Consultation Offer",
      contentCategory: "offer",
      agentRole: "workflow",
      ...(offerResult?.offer ? { offer: { title: offerResult.offer.title, type: offerResult.offer.type, price: offerResult.offer.price, currency: offerResult.offer.currency, deliverables: offerResult.offer.deliverables, guarantees: offerResult.offer.guarantees ?? [] } } : {}),
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
    });
    const blocked = govResult.overall === "block";
    if (blocked) {
      errors.push(`Governance blocked: ${govResult.blockedReasons?.join(", ") ?? "policy violation"}`);
      dagState = failNode(dagState, "governance-check", govResult.blockedReasons?.join(", ") ?? "blocked");
    } else {
      nodeOutputs["governance-check"] = govResult;
      dagState = completeNode(dagState, "governance-check", govResult as unknown as Record<string, unknown>);
      governancePassed = true;
      stages.governancePassed = true;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "governance-check failed";
    errors.push(msg);
    dagState = failNode(dagState, "governance-check", msg);
  }

  // ── Step 7: content-brief (only if governance passed) ──────────
  let briefResult: import("../apps/content-engine/content-engine-types.js").ContentBriefResult | undefined;
  if (governancePassed) {
    try {
      briefResult = await createContentBrief({
        title: `Proposal — ${lead?.firstName ?? "Client"} ${lead?.lastName ?? ""}`.trim(),
        description: `Customized offer for ${lead?.company ?? "client"} based on diagnostic findings`,
        contentType: "email",
        channel: "email",
        createdBy,
        ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      });
      nodeOutputs["content-brief"] = briefResult;
      dagState = completeNode(dagState, "content-brief", briefResult as unknown as Record<string, unknown>);
      stages.contentBriefCreated = briefResult.ok;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "content-brief failed";
      errors.push(msg);
      dagState = failNode(dagState, "content-brief", msg);
    }
  } else {
    dagState = failNode(dagState, "content-brief", "skipped — governance blocked");
    dagState = failNode(dagState, "emit-attribution", "skipped — governance blocked");
  }

  // ── Step 8: emit-attribution ────────────────────────────────────
  try {
    void emitEvent({
      eventType: "content_published",
      runId: dagRunId,
      agentId: createdBy,
      channel: "email",
      metadata: {
        workflow: "lead-to-offer",
        leadEmail: lead?.email,
        offerTitle: offerResult?.offer?.title,
        mapScore: mapEval?.mapScore,
        governancePassed,
      },
    });
    if (governancePassed) {
      dagState = completeNode(dagState, "emit-attribution", { emitted: true });
    }
    stages.attributionEmitted = true;
  } catch {
    // fire-and-forget
    stages.attributionEmitted = false;
  }

  saveDagRun(dagState);
  const ok = errors.length === 0 || governancePassed;

  return {
    ok,
    dagRunId,
    dagStatus: dagState.status,
    stages,
    ...(lead !== undefined ? { lead } : {}),
    ...(diagnosis !== undefined ? { diagnosis } : {}),
    ...(offerResult !== undefined ? { offer: offerResult } : {}),
    ...(briefResult !== undefined ? { contentBrief: briefResult } : {}),
    ...(errors.length > 0 ? { errors } : {}),
    durationMs: Date.now() - start,
  };
}

export { LEAD_TO_OFFER_PLAN };
