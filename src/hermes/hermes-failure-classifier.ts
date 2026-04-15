/**
 * Hermes Failure Classifier — rule-based classification of failure errors.
 *
 * Classes:
 *   transient      — timeouts, rate limits, temporary unavailability
 *   network        — DNS, connection refused, SSL errors
 *   dependency     — external service failures (APIs, databases)
 *   data_schema    — validation errors, missing fields, format mismatches
 *   auth_config    — authentication/authorization failures, missing credentials
 *   unknown        — unrecognized patterns
 */

import type { FailureClassification } from "../db/db-types.js";

// ── Classification Rules ───────────────────────────────────────────

interface ClassificationRule {
  classification: FailureClassification;
  /** Patterns to match against error text (case-insensitive). */
  patterns: RegExp[];
}

const RULES: ClassificationRule[] = [
  {
    classification: "auth_config",
    patterns: [
      /\b(401|403)\b/,
      /\bunauthori[sz]ed\b/i,
      /\bforbidden\b/i,
      /\binvalid.*(token|key|credential|api.?key|secret)\b/i,
      /\bmissing.*(token|key|credential|api.?key|secret|auth)\b/i,
      /\bauth(entication|orization)?\s*(fail|error|denied|expired)\b/i,
      /\bpermission\s+denied\b/i,
      /\baccess\s+denied\b/i,
      /\bsigning\s+secret\b/i,
    ],
  },
  {
    classification: "network",
    patterns: [
      /\bENOTFOUND\b/,
      /\bECONNREFUSED\b/,
      /\bECONNRESET\b/,
      /\bEPIPE\b/,
      /\bEHOSTUNREACH\b/,
      /\bEADDRINUSE\b/,
      /\bdns\b/i,
      /\bconnection\s+refused\b/i,
      /\bssl\b.*\b(error|fail|handshake|cert)\b/i,
      /\bcertificate\b.*\b(expired|invalid|untrusted)\b/i,
      /\bsocket\s+hang\s+up\b/i,
      /\bnetwork\s+(error|unavailable|unreachable)\b/i,
    ],
  },
  {
    classification: "transient",
    patterns: [
      /\btimeout\b/i,
      /\b429\b/,
      /\brate\s*limit\b/i,
      /\btoo\s+many\s+requests\b/i,
      /\b(502|503|504)\b/,
      /\bservice\s+unavailable\b/i,
      /\bgateway\s+timeout\b/i,
      /\bbad\s+gateway\b/i,
      /\btemporar(y|ily)\b/i,
      /\bretry\s+after\b/i,
      /\bserver\s+overloaded\b/i,
      /\bbusy\b/i,
    ],
  },
  {
    classification: "dependency",
    patterns: [
      /\b(500)\b.*\b(api|service|endpoint|server)\b/i,
      /\bexternal\s+(service|api)\b/i,
      /\bupstream\b/i,
      /\bdatabase\s+(error|unavailable|connection)\b/i,
      /\bpostgres(ql)?\s+(error|connection)\b/i,
      /\bredis\s+(error|connection|timeout)\b/i,
      /\bsupabase\b.*\b(error|fail)\b/i,
      /\bneon\b.*\b(error|fail)\b/i,
      /\bthird.?party\b/i,
      /\bdownstream\b/i,
    ],
  },
  {
    classification: "data_schema",
    patterns: [
      /\bvalidation\s*(error|fail)\b/i,
      /\bmissing\s+(field|property|column|key|param)\b/i,
      /\binvalid\s+(format|type|value|input|payload|json|schema)\b/i,
      /\bschema\s*(mismatch|error|violation)\b/i,
      /\btype\s*error\b/i,
      /\bparse\s*(error|fail)\b/i,
      /\bjson\s*(parse|syntax)\b/i,
      /\bunexpected\s+token\b/i,
      /\bcolumn\b.*\bdoes\s+not\s+exist\b/i,
      /\bnull\s+constraint\b/i,
      /\bdata\s+truncat/i,
    ],
  },
];

// ── Public API ─────────────────────────────────────────────────────

/**
 * Classify a failure error string into one of the known categories.
 */
export function classifyFailure(error: string): FailureClassification {
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(error)) {
        return rule.classification;
      }
    }
  }
  return "unknown";
}

/**
 * Classify with confidence — returns the classification and the matched pattern.
 */
export function classifyFailureDetailed(error: string): {
  classification: FailureClassification;
  matchedPattern: string | null;
} {
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(error)) {
        return {
          classification: rule.classification,
          matchedPattern: pattern.source,
        };
      }
    }
  }
  return { classification: "unknown", matchedPattern: null };
}
