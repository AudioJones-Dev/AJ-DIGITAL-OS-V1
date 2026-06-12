/**
 * L12 Application Layer — Diagnostic Engine.
 *
 * Analyzes business constraints, identifies bottlenecks, and recommends
 * actions using the Intelligence Layer (AEO scorer) and the Retrieval Layer.
 */

import { emitEvent } from "../../attribution/attribution-tracker.js";
import { evaluateMap } from "../../decision/decision-engine.js";
import type {
  DecisionInput,
  MapEvaluation,
} from "../../decision/decision-types.js";
import { scoreOpportunity } from "../../intelligence/opportunity-scorer.js";
import type { OpportunityScore } from "../../intelligence/opportunity-scorer.js";
import { searchRetrieval } from "../../retrieval/retrieval-search.js";
import type {
  RetrievalNamespace,
  RetrievalResult,
  RetrievalSearchRequest,
} from "../../retrieval/retrieval-types.js";

import type {
  DiagnosticInput,
  DiagnosticPriority,
  DiagnosticRecommendation,
  DiagnosticResult,
} from "./diagnostic-engine-types.js";

const TAG = "[DIAGNOSTIC-ENGINE]";
const DIAGNOSTIC_AGENT_ID = "diagnostic-engine";

function fireAttribution(
  runId: string,
  metadata: Record<string, unknown>,
  tenantId: string | undefined,
): void {
  try {
    void emitEvent({
      eventType: "diagnostic_run",
      runId,
      agentId: DIAGNOSTIC_AGENT_ID,
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

function pickNamespaces(
  tenantId: string | undefined,
): RetrievalNamespace[] {
  const ns: RetrievalNamespace[] = ["system_docs", "workflow_docs"];
  if (tenantId) ns.push("attribution_memory");
  return ns;
}

function priorityFromMapScore(mapScore: number): DiagnosticPriority {
  if (mapScore >= 8) return "high";
  if (mapScore >= 5) return "medium";
  return "low";
}

function deriveConstraints(input: DiagnosticInput): string[] {
  const constraints: string[] = [];
  const desc = input.description.toLowerCase();
  if (desc.includes("bottleneck")) constraints.push("explicit_bottleneck_mentioned");
  if (desc.includes("slow") || desc.includes("delay"))
    constraints.push("throughput_or_latency_issue");
  if (desc.includes("low conversion") || desc.includes("conversion rate"))
    constraints.push("conversion_rate_issue");
  if (desc.includes("budget") || desc.includes("cost"))
    constraints.push("cost_constraint");
  if (desc.includes("manual") || desc.includes("manually"))
    constraints.push("manual_process");
  return constraints;
}

export async function runDiagnosis(
  input: DiagnosticInput,
): Promise<DiagnosticResult> {
  if (!input.description || !input.category) {
    return {
      ok: false,
      constraints: [],
      recommendations: [],
      retrievalContext: [],
      error: "description and category are required",
    };
  }

  try {
    const environment = input.environment ?? "development";
    const namespaces = pickNamespaces(input.tenantId);
    const searchRequest: RetrievalSearchRequest = {
      query: `${input.category}: ${input.description}`,
      namespaces,
      maxResults: 5,
      environment,
    };
    if (input.tenantId !== undefined) searchRequest.tenantId = input.tenantId;
    if (input.createdBy !== undefined) searchRequest.actor = input.createdBy;

    const searchResponse = await searchRetrieval(searchRequest);
    const retrievalContext: RetrievalResult[] = searchResponse.ok
      ? searchResponse.results
      : [];

    const opportunities: OpportunityScore[] = [];
    if (Array.isArray(input.keywords)) {
      for (const kw of input.keywords) {
        const score = scoreOpportunity(kw, {
          searchVolume: 50,
          difficulty: 50,
          intent: 50,
          localRelevance: 50,
          aeoReadiness: 50,
        });
        opportunities.push(score);
      }
    }

    const aeoAvg =
      opportunities.length > 0
        ? Math.round(
            opportunities.reduce((sum, op) => sum + op.score, 0) /
              opportunities.length,
          )
        : undefined;

    const proposed = input.proposedActions ?? [];
    const mapEvaluations: MapEvaluation[] = [];
    const recommendations: DiagnosticRecommendation[] = [];

    for (const action of proposed) {
      const decisionInput: DecisionInput = {
        title: action,
        description: `${input.category} diagnostic — ${action}`,
        category: "operational_change",
        meaningfulScore: 2,
        actionableScore: 2,
        profitableScore: 2,
        createdBy: input.createdBy ?? "diagnostic-engine",
        environment: "local",
      };
      if (input.tenantId !== undefined) decisionInput.tenantId = input.tenantId;
      if (aeoAvg !== undefined) decisionInput.aeoScore = aeoAvg;

      const evalResult = evaluateMap(decisionInput);
      mapEvaluations.push(evalResult);
      recommendations.push({
        action,
        rationale: evalResult.reasoning,
        mapScore: evalResult.mapScore,
        priority: priorityFromMapScore(evalResult.mapScore),
      });
    }

    const constraints = deriveConstraints(input);

    fireAttribution(
      `diagnostic:${input.category}:${Date.now()}`,
      {
        category: input.category,
        constraintCount: constraints.length,
        recommendationCount: recommendations.length,
        retrievalResultCount: retrievalContext.length,
        ...(searchResponse.retrievalTraceId !== undefined
          ? { retrievalTraceId: searchResponse.retrievalTraceId }
          : {}),
      },
      input.tenantId,
    );

    const result: DiagnosticResult = {
      ok: true,
      constraints,
      recommendations,
      retrievalContext,
      ...(searchResponse.retrievalTraceId !== undefined
        ? { retrievalTraceId: searchResponse.retrievalTraceId }
        : {}),
      ...(mapEvaluations.length > 0 ? { mapEvaluations } : {}),
    };
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "diagnostic engine error";
    return {
      ok: false,
      constraints: [],
      recommendations: [],
      retrievalContext: [],
      error: message,
    };
  }
}
