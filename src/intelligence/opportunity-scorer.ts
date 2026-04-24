import { randomUUID } from "node:crypto";

export interface OpportunitySignals {
  searchVolume: number;
  difficulty: number;
  intent: number;
  localRelevance: number;
  aeoReadiness: number;
}

export interface OpportunityScore {
  scoreId: string;
  keyword: string;
  signals: OpportunitySignals;
  score: number;
  tier: "high" | "medium" | "low";
  explanation: string;
  scoredAt: string;
}

/**
 * Bible v1 formula:
 * score = (volume×0.30) + ((100-difficulty)×0.30) + (intent×0.20) + (localRelevance×0.10) + (aeoReadiness×0.10)
 * difficulty is INVERTED — higher difficulty = lower score contribution.
 */
export function scoreOpportunity(keyword: string, signals: OpportunitySignals): OpportunityScore {
  const { searchVolume, difficulty, intent, localRelevance, aeoReadiness } = signals;

  const volumeContrib = searchVolume * 0.30;
  const difficultyContrib = (100 - difficulty) * 0.30;
  const intentContrib = intent * 0.20;
  const localContrib = localRelevance * 0.10;
  const aeoContrib = aeoReadiness * 0.10;

  const raw = volumeContrib + difficultyContrib + intentContrib + localContrib + aeoContrib;
  const score = Math.round(raw * 10) / 10;

  const tier: "high" | "medium" | "low" = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  const explanation =
    `volume(${searchVolume}×0.30=${volumeContrib.toFixed(1)}) + ` +
    `difficulty(${100 - difficulty}×0.30=${difficultyContrib.toFixed(1)}) + ` +
    `intent(${intent}×0.20=${intentContrib.toFixed(1)}) + ` +
    `local(${localRelevance}×0.10=${localContrib.toFixed(1)}) + ` +
    `aeo(${aeoReadiness}×0.10=${aeoContrib.toFixed(1)}) = ${score}`;

  return {
    scoreId: randomUUID(),
    keyword,
    signals,
    score,
    tier,
    explanation,
    scoredAt: new Date().toISOString(),
  };
}

export function scoreOpportunities(
  items: Array<{ keyword: string; signals: OpportunitySignals }>,
): OpportunityScore[] {
  return items
    .map(({ keyword, signals }) => scoreOpportunity(keyword, signals))
    .sort((a, b) => b.score - a.score);
}

export function getTopOpportunities(
  items: Array<{ keyword: string; signals: OpportunitySignals }>,
  limit = 10,
): OpportunityScore[] {
  return scoreOpportunities(items).slice(0, limit);
}
