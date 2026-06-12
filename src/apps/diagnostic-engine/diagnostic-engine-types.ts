/**
 * L12 Application Layer — Diagnostic Engine types.
 */

import type { MapEvaluation } from "../../decision/decision-types.js";
import type {
  RetrievalEnvironment,
  RetrievalResult,
} from "../../retrieval/retrieval-types.js";

export type DiagnosticCategory =
  | "lead_gen"
  | "content"
  | "conversion"
  | "operations"
  | "offer"
  | "general";

export type DiagnosticPriority = "high" | "medium" | "low";

export interface DiagnosticInput {
  description: string;
  category: DiagnosticCategory;
  keywords?: string[];
  proposedActions?: string[];
  tenantId?: string;
  environment?: RetrievalEnvironment;
  createdBy?: string;
}

export interface DiagnosticRecommendation {
  action: string;
  rationale: string;
  mapScore?: number;
  priority: DiagnosticPriority;
}

export interface DiagnosticResult {
  ok: boolean;
  constraints: string[];
  recommendations: DiagnosticRecommendation[];
  retrievalContext: RetrievalResult[];
  retrievalTraceId?: string;
  mapEvaluations?: MapEvaluation[];
  warnings?: string[];
  error?: string;
}
