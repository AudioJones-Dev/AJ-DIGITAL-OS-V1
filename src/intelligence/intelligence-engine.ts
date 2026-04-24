/**
 * Intelligence Engine v2
 *
 * Deterministic in-memory scoring on top of runtime telemetry.
 */

import {
  agentFailureRate,
  agentSuccessRate,
  predictionErrorGauge,
  signalScoreGauge,
} from "../observability/metrics.js";

interface AgentState {
  agent: string;
  totalRuns: number;
  failures: number;
  totalDurationMs: number;
  avgDurationMs: number;
  errorRate: number;
  successRate: number;
  lastDurationMs: number;
  lastOutputSize: number;
  lastPredictionError: number;
  lastSignalScore: number;
  confidenceProxy: number;
}

export interface AgentExecutionInput {
  agent: string;
  durationMs: number;
  success: boolean;
  outputSize: number;
  confidenceProxy?: number;
}

export interface IntelligenceSnapshot {
  generatedAt: string;
  rankings: AgentState[];
  worstPerformingAgent: AgentState | null;
  totalTrackedAgents: number;
}

const agentStats = new Map<string, AgentState>();

export function calculatePredictionError(expected: number, actual: number): number {
  return Math.abs(expected - actual);
}

export function calculateSignalScore(value: number, noise: number): number {
  if (noise === 0) return value;
  return value / noise;
}

export function recordAgentExecution(input: AgentExecutionInput): AgentState {
  const current = agentStats.get(input.agent) ?? {
    agent: input.agent,
    totalRuns: 0,
    failures: 0,
    totalDurationMs: 0,
    avgDurationMs: 0,
    errorRate: 0,
    successRate: 0,
    lastDurationMs: 0,
    lastOutputSize: 0,
    lastPredictionError: 0,
    lastSignalScore: 0,
    confidenceProxy: 0,
  };

  const expectedDuration = current.totalRuns > 0 ? current.avgDurationMs : input.durationMs;
  const predictionError = calculatePredictionError(expectedDuration, input.durationMs);

  const confidenceProxy =
    input.confidenceProxy ??
    (input.outputSize > 0 ? Math.min(1, input.outputSize / 700) : 0);

  const noise = Math.max(1, predictionError);
  const value = input.outputSize * Math.max(confidenceProxy, 0);
  const signalScore = calculateSignalScore(value, noise);

  const totalRuns = current.totalRuns + 1;
  const failures = current.failures + (input.success ? 0 : 1);
  const totalDurationMs = current.totalDurationMs + input.durationMs;
  const avgDurationMs = totalDurationMs / totalRuns;
  const errorRate = failures / totalRuns;
  const successRate = (totalRuns - failures) / totalRuns;

  const next: AgentState = {
    agent: input.agent,
    totalRuns,
    failures,
    totalDurationMs,
    avgDurationMs,
    errorRate,
    successRate,
    lastDurationMs: input.durationMs,
    lastOutputSize: input.outputSize,
    lastPredictionError: predictionError,
    lastSignalScore: signalScore,
    confidenceProxy,
  };

  agentStats.set(input.agent, next);

  predictionErrorGauge.labels(input.agent).set(predictionError);
  signalScoreGauge.labels(input.agent).set(signalScore);
  agentSuccessRate.labels(input.agent).set(successRate);
  agentFailureRate.labels(input.agent).set(errorRate);

  return next;
}

function rankAgents(stats: AgentState[]): AgentState[] {
  return [...stats].sort((a, b) => {
    if (b.lastSignalScore !== a.lastSignalScore) {
      return b.lastSignalScore - a.lastSignalScore;
    }
    if (a.errorRate !== b.errorRate) {
      return a.errorRate - b.errorRate;
    }
    return a.avgDurationMs - b.avgDurationMs;
  });
}

function findWorstAgent(stats: AgentState[]): AgentState | null {
  if (stats.length === 0) return null;

  return [...stats].sort((a, b) => {
    if (b.errorRate !== a.errorRate) {
      return b.errorRate - a.errorRate;
    }
    if (b.avgDurationMs !== a.avgDurationMs) {
      return b.avgDurationMs - a.avgDurationMs;
    }
    return a.lastSignalScore - b.lastSignalScore;
  })[0] ?? null;
}

export function getIntelligenceSnapshot(): IntelligenceSnapshot {
  const states = Array.from(agentStats.values());
  const rankings = rankAgents(states);

  return {
    generatedAt: new Date().toISOString(),
    rankings,
    worstPerformingAgent: findWorstAgent(states),
    totalTrackedAgents: states.length,
  };
}
