/**
 * L12 Application Layer — Offer Engine types.
 */

import type {
  GovernanceOutcome,
  GovernanceResult,
} from "../../governance/governance-types.js";
import type {
  MapDecision,
  MapDecisionBand,
  MapEvaluation,
} from "../../decision/decision-types.js";
import type { NormalizedOffer } from "../../normalization/normalization-types.js";

export interface CreateOfferInput {
  title: string;
  type: string;
  price: number;
  currency: string;
  deliverables: string[];
  guarantees?: string[];
  timeline?: string;
  scope?: string;
  tenantId?: string;
  createdBy: string;
  meaningfulScore?: number;
  actionableScore?: number;
  profitableScore?: number;
}

export interface OfferEngineResult {
  ok: boolean;
  offer?: NormalizedOffer;
  mapEvaluation?: MapEvaluation;
  mapScore?: number;
  decisionBand?: MapDecisionBand;
  decision?: MapDecision;
  governanceStatus: GovernanceOutcome | "skipped" | "error";
  governance?: GovernanceResult;
  blockedReasons?: string[];
  warnings?: string[];
  error?: string;
}
