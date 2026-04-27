/**
 * Governance — Offer Policy
 *
 * Validates an offer description against price floors, scope limits,
 * guarantee constraints, discount rules, and required components.
 */

import { loadPolicy } from "../../core/policy/policy-loader.js";
import type {
  OfferGovernanceResult,
  OfferInput,
  OfferViolation,
} from "../governance-types.js";

const POLICY_FILE = "offer-governance.policy.json";

interface DiscountRules {
  maxAutoApprovedPercent: number;
  maxApprovedPercent: number;
  blockBeyondMaxApproved: boolean;
}

interface OfferPolicyShape {
  priceFloor: { default: number; byType: Record<string, number> };
  currency: string;
  maxDeliverablesByType: Record<string, number>;
  allowedGuarantees: string[];
  forbiddenGuarantees: string[];
  discountRules: DiscountRules;
  requiredComponents: string[];
}

function readPolicy(): OfferPolicyShape {
  const doc = loadPolicy(POLICY_FILE);
  const r = doc.rules;
  const priceFloorRaw = (r["priceFloor"] as Record<string, unknown> | undefined) ?? {};
  const priceFloor = {
    default: typeof priceFloorRaw["default"] === "number" ? (priceFloorRaw["default"] as number) : 0,
    byType: (priceFloorRaw["byType"] as Record<string, number> | undefined) ?? {},
  };
  const discountRaw = (r["discountRules"] as Record<string, unknown> | undefined) ?? {};
  const discountRules: DiscountRules = {
    maxAutoApprovedPercent:
      typeof discountRaw["maxAutoApprovedPercent"] === "number"
        ? (discountRaw["maxAutoApprovedPercent"] as number)
        : 15,
    maxApprovedPercent:
      typeof discountRaw["maxApprovedPercent"] === "number"
        ? (discountRaw["maxApprovedPercent"] as number)
        : 35,
    blockBeyondMaxApproved: discountRaw["blockBeyondMaxApproved"] === true,
  };

  return {
    priceFloor,
    currency: typeof r["currency"] === "string" ? (r["currency"] as string) : "USD",
    maxDeliverablesByType:
      (r["maxDeliverablesByType"] as Record<string, number> | undefined) ?? {},
    allowedGuarantees: Array.isArray(r["allowedGuarantees"])
      ? (r["allowedGuarantees"] as string[])
      : [],
    forbiddenGuarantees: Array.isArray(r["forbiddenGuarantees"])
      ? (r["forbiddenGuarantees"] as string[])
      : [],
    discountRules,
    requiredComponents: Array.isArray(r["requiredComponents"])
      ? (r["requiredComponents"] as string[])
      : [],
  };
}

export function getOfferPolicy(): OfferPolicyShape {
  return readPolicy();
}

function checkRequiredComponents(offer: OfferInput, required: string[]): OfferViolation[] {
  const violations: OfferViolation[] = [];
  const present = new Set<string>();
  if (offer.title) present.add("title");
  if (offer.type) present.add("type");
  if (typeof offer.price === "number") present.add("price");
  if (offer.currency) present.add("currency");
  if (Array.isArray(offer.deliverables) && offer.deliverables.length > 0) present.add("deliverables");
  if (offer.timeline) present.add("timeline");
  if (Array.isArray(offer.guarantees) && offer.guarantees.length > 0) present.add("guarantees");

  for (const field of required) {
    if (!present.has(field)) {
      violations.push({
        field,
        reason: `Required component missing: ${field}`,
        severity: "block",
      });
    }
  }
  return violations;
}

export function evaluateOffer(offer: OfferInput): OfferGovernanceResult {
  const policy = readPolicy();
  const violations: OfferViolation[] = [];
  const warnings: string[] = [];

  violations.push(...checkRequiredComponents(offer, policy.requiredComponents));

  const floor = policy.priceFloor.byType[offer.type] ?? policy.priceFloor.default;
  if (typeof offer.price === "number" && offer.price < floor) {
    violations.push({
      field: "price",
      reason: `Price ${offer.price} ${offer.currency} below floor ${floor} ${policy.currency} for type "${offer.type}"`,
      severity: "block",
    });
  }

  const maxDeliverables = policy.maxDeliverablesByType[offer.type];
  if (typeof maxDeliverables === "number" && Array.isArray(offer.deliverables)) {
    if (offer.deliverables.length > maxDeliverables) {
      violations.push({
        field: "deliverables",
        reason: `Too many deliverables (${offer.deliverables.length} > ${maxDeliverables}) for type "${offer.type}"`,
        severity: "warn",
      });
    }
  }

  if (Array.isArray(offer.guarantees)) {
    for (const g of offer.guarantees) {
      if (policy.forbiddenGuarantees.includes(g)) {
        violations.push({
          field: "guarantees",
          reason: `Forbidden guarantee: ${g}`,
          severity: "block",
        });
      } else if (!policy.allowedGuarantees.includes(g)) {
        warnings.push(`Guarantee "${g}" is not in the allowed list — review required`);
      }
    }
  }

  let requiresApproval = false;
  if (typeof offer.discountPercent === "number" && offer.discountPercent > 0) {
    if (offer.discountPercent > policy.discountRules.maxApprovedPercent) {
      if (policy.discountRules.blockBeyondMaxApproved) {
        violations.push({
          field: "discountPercent",
          reason: `Discount ${offer.discountPercent}% exceeds maximum allowed ${policy.discountRules.maxApprovedPercent}%`,
          severity: "block",
        });
      } else {
        violations.push({
          field: "discountPercent",
          reason: `Discount ${offer.discountPercent}% exceeds maximum approved ${policy.discountRules.maxApprovedPercent}%`,
          severity: "approval",
        });
        requiresApproval = true;
      }
    } else if (offer.discountPercent > policy.discountRules.maxAutoApprovedPercent) {
      violations.push({
        field: "discountPercent",
        reason: `Discount ${offer.discountPercent}% exceeds auto-approve threshold ${policy.discountRules.maxAutoApprovedPercent}%`,
        severity: "approval",
      });
      requiresApproval = true;
    }
  }

  if (offer.currency && offer.currency !== policy.currency) {
    warnings.push(`Currency ${offer.currency} differs from policy currency ${policy.currency}`);
  }

  const blocking = violations.some((v) => v.severity === "block");

  return {
    compliant: !blocking,
    requiresApproval,
    violations,
    warnings,
  };
}
