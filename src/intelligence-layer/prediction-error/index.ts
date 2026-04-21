import type { PredictionErrorResult } from "../shared-types/index.js";

export function computePredictionError(
  predicted: Record<string, number>,
  actual: Record<string, number>,
  previousAggregateError?: number,
): PredictionErrorResult {
  const metricNames = Array.from(new Set([...Object.keys(predicted), ...Object.keys(actual)])).sort();

  const by_metric = Object.fromEntries(
    metricNames.map((metric) => {
      const predictedValue = predicted[metric] ?? 0;
      const actualValue = actual[metric] ?? 0;
      const signed = actualValue - predictedValue;

      return [
        metric,
        {
          predicted: predictedValue,
          actual: actualValue,
          absolute_error: Math.abs(signed),
          signed_error: signed,
        },
      ];
    }),
  );

  const aggregate_error =
    metricNames.length === 0
      ? 0
      : Number(
          (
            metricNames.reduce((sum, metric) => sum + Math.abs((actual[metric] ?? 0) - (predicted[metric] ?? 0)), 0) /
            metricNames.length
          ).toFixed(4),
        );

  const error_delta =
    previousAggregateError === undefined ? undefined : Number((previousAggregateError - aggregate_error).toFixed(4));

  const result: PredictionErrorResult = {
    by_metric,
    aggregate_error,
    convergence_notes: buildConvergenceNotes(aggregate_error, error_delta),
  };

  if (error_delta !== undefined) {
    result.error_delta = error_delta;
  }

  return result;
}

function buildConvergenceNotes(aggregateError: number, errorDelta?: number): string[] {
  const notes: string[] = [];

  if (aggregateError <= 0.05) {
    notes.push("Model appears tightly calibrated for tracked metrics.");
  } else if (aggregateError <= 0.2) {
    notes.push("Model fit is acceptable but should be iteratively improved.");
  } else {
    notes.push("Model drift is material; prioritize recalibration.");
  }

  if (errorDelta !== undefined) {
    if (errorDelta > 0) {
      notes.push("Prediction error improved versus prior observation.");
    } else if (errorDelta < 0) {
      notes.push("Prediction error worsened versus prior observation.");
    } else {
      notes.push("Prediction error remained unchanged.");
    }
  }

  return notes;
}
