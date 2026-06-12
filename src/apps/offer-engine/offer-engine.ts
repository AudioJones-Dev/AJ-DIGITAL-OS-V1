/**
 * L12 Application Layer — Offer Engine.
 *
 * Creates, governs, and persists service offers using the
 * MAP-CERA Decision Engine and the Governance Layer.
 */

import { emitEvent } from "../../attribution/attribution-tracker.js";
import { evaluateMap } from "../../decision/decision-engine.js";
import type { DecisionInput } from "../../decision/decision-types.js";
import { evaluateGovernance } from "../../governance/governance-engine.js";
import type {
  GovernanceRequest,
  OfferInput,
} from "../../governance/governance-types.js";
import { normalizeOffer } from "../../normalization/normalizer.js";
import { saveEntity } from "../../normalization/normalization-store.js";

import type {
  CreateOfferInput,
  OfferEngineResult,
} from "./offer-engine-types.js";

const TAG = "[OFFER-ENGINE]";
const OFFER_ENGINE_AGENT_ID = "offer-engine";

function fireAttribution(
  eventType: "offer_engine_created" | "offer_engine_blocked",
  runId: string,
  metadata: Record<string, unknown>,
  tenantId: string | undefined,
): void {
  try {
    void emitEvent({
      eventType,
      runId,
      agentId: OFFER_ENGINE_AGENT_ID,
      channel: "unknown",
      ...(tenantId !== undefined ? { clientId: tenantId } : {}),
      metadata,
    }).catch((err: unknown) => {
      console.warn(
        `${TAG} attribution emit failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  } catch (err) {
    console.warn(
      `${TAG} attribution emit threw: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function buildGovernanceOffer(input: CreateOfferInput): OfferInput {
  const offer: OfferInput = {
    title: input.title,
    type: input.type,
    price: input.price,
    currency: input.currency,
    deliverables: input.deliverables,
  };
  if (input.guarantees !== undefined) offer.guarantees = input.guarantees;
  if (input.timeline !== undefined) offer.timeline = input.timeline;
  return offer;
}

function buildGovernanceRequest(input: CreateOfferInput): GovernanceRequest {
  const request: GovernanceRequest = {
    content: `${input.title}\n\n${input.scope ?? ""}`.trim(),
    offer: buildGovernanceOffer(input),
  };
  if (input.tenantId !== undefined) request.tenantId = input.tenantId;
  return request;
}

function buildDecisionInput(input: CreateOfferInput): DecisionInput {
  const dec: DecisionInput = {
    title: input.title,
    description: input.scope ?? input.title,
    category: "offer",
    meaningfulScore: input.meaningfulScore ?? 2,
    actionableScore: input.actionableScore ?? 2,
    profitableScore: input.profitableScore ?? 2,
    createdBy: input.createdBy,
    environment: "local",
  };
  if (input.tenantId !== undefined) dec.tenantId = input.tenantId;
  return dec;
}

export async function createOffer(
  input: CreateOfferInput,
): Promise<OfferEngineResult> {
  if (!input.title || !input.type || !input.createdBy) {
    return {
      ok: false,
      governanceStatus: "error",
      error: "title, type, and createdBy are required",
    };
  }
  if (typeof input.price !== "number" || input.price <= 0) {
    return {
      ok: false,
      governanceStatus: "error",
      error: "price must be a positive number",
    };
  }

  try {
    const governance = evaluateGovernance(buildGovernanceRequest(input));
    if (governance.overall === "block") {
      fireAttribution(
        "offer_engine_blocked",
        `offer:${input.title}`,
        {
          reason: "governance_block",
          blockedReasons: governance.blockedReasons,
          title: input.title,
        },
        input.tenantId,
      );
      return {
        ok: false,
        governanceStatus: "block",
        governance,
        blockedReasons: governance.blockedReasons,
        warnings: governance.warnings,
      };
    }

    const mapEvaluation = evaluateMap(buildDecisionInput(input));

    const normalized = normalizeOffer({
      title: input.title,
      type: input.type,
      price: input.price,
      currency: input.currency,
      deliverables: input.deliverables,
      ...(input.guarantees !== undefined ? { guarantees: input.guarantees } : {}),
      ...(input.timeline !== undefined ? { timeline: input.timeline } : {}),
      ...(input.scope !== undefined ? { scope: input.scope } : {}),
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
      mapScore: mapEvaluation.mapScore,
      governanceStatus: governance.requiresApproval ? "pending" : "approved",
    });

    const saved = saveEntity("offer", normalized);

    fireAttribution(
      "offer_engine_created",
      saved.entityId,
      {
        entityId: saved.entityId,
        mapScore: mapEvaluation.mapScore,
        decision: mapEvaluation.decision,
        governanceOutcome: governance.overall,
      },
      input.tenantId,
    );

    return {
      ok: true,
      offer: saved,
      mapEvaluation,
      mapScore: mapEvaluation.mapScore,
      decisionBand: mapEvaluation.decisionBand,
      decision: mapEvaluation.decision,
      governanceStatus: governance.overall,
      governance,
      warnings: governance.warnings,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "offer engine error";
    return {
      ok: false,
      governanceStatus: "error",
      error: message,
    };
  }
}
