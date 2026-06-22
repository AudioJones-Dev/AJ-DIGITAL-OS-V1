import type { FounderDisqualifier, FounderSignal } from "../types.js";

interface PlacesDetailsLike {
  business_status?: unknown;
  user_ratings_total?: unknown;
  types?: unknown;
  opening_hours?: unknown;
  reviews?: unknown;
}

interface PlacesOpeningHoursLike {
  periods?: unknown;
}

interface PlacesReviewLike {
  text?: unknown;
}

export interface DerivedSignals {
  derivedAt: string;
  minimumReviewFloorMet: boolean;
  signals: FounderSignal[];
  disqualifiers: FounderDisqualifier[];
}

export interface PlacesRuntimeOptions {
  reviewFloor?: number;
  callFirstCategories?: readonly string[];
  afterHoursDemandCategories?: readonly string[];
  derivedAt?: Date;
}

const DEFAULT_CALL_FIRST_CATEGORIES = [
  "plumber",
  "hvac_contractor",
  "roofing_contractor",
  "electrician",
  "dentist",
  "doctor",
  "lawyer",
  "auto_repair",
  "beauty_salon",
  "spa",
  "veterinary_care",
] as const;

const DEFAULT_AFTER_HOURS_DEMAND_CATEGORIES = [
  "plumber",
  "hvac_contractor",
  "roofing_contractor",
  "electrician",
  "auto_repair",
  "veterinary_care",
] as const;

const RESPONSIVENESS_PATTERN =
  /\b(no answer|never called back|never call back|did not call back|didn't call back|could not reach|couldn't reach|unresponsive|no one answered|won't answer|would not answer|hard to reach)\b/i;

export function derivePlaceRuntimeSignals(
  rawPlacesDetails: unknown,
  options: PlacesRuntimeOptions = {},
): DerivedSignals {
  const details = normalizePlacesDetails(rawPlacesDetails);
  const derivedAt = (options.derivedAt ?? new Date()).toISOString();
  const reviewFloor = options.reviewFloor ?? 10;
  const reviewCount = readNumber(details.user_ratings_total);
  const categories = readStringArray(details.types);
  const signals: FounderSignal[] = [];
  const disqualifiers: FounderDisqualifier[] = [];

  if (details.business_status === "CLOSED_PERMANENTLY" || details.business_status === "CLOSED_TEMPORARILY") {
    disqualifiers.push({
      code: "NOT_OPERATIONAL",
      reason: "Google runtime status indicates the business is not currently operational.",
    });
  }

  const minimumReviewFloorMet = reviewCount !== null && reviewCount >= reviewFloor;
  if (!minimumReviewFloorMet) {
    disqualifiers.push({
      code: "BELOW_REVIEW_FLOOR",
      reason: "Runtime review-volume tier is below the V1 demand floor.",
    });
  }

  const demandScore = demandScoreFromReviewCount(reviewCount);
  if (demandScore > 0) {
    signals.push({
      type: "HIGH_CALL_DEMAND",
      score: demandScore,
      source: "places-runtime",
      derivedAt,
      rationale: "Runtime review-volume tier indicates meaningful inbound demand.",
    });
  }

  const callFirstCategories = options.callFirstCategories ?? DEFAULT_CALL_FIRST_CATEGORIES;
  const afterHoursDemandCategories =
    options.afterHoursDemandCategories ?? DEFAULT_AFTER_HOURS_DEMAND_CATEGORIES;
  const callFirst = categories.some((category) => callFirstCategories.includes(category));
  if (callFirst) {
    signals.push({
      type: "CALL_FIRST_CATEGORY",
      score: 10,
      source: "places-runtime",
      derivedAt,
      rationale: "Runtime category classification maps to a call-first service business.",
    });
  }

  if (callFirst && hasAfterHoursGap(details.opening_hours, categories, afterHoursDemandCategories)) {
    signals.push({
      type: "AFTER_HOURS_GAP",
      score: 10,
      source: "places-runtime",
      derivedAt,
      rationale: "Runtime hours classification suggests after-hours demand may land when staff are unavailable.",
    });
  }

  if (hasResponsivenessComplaint(details.reviews)) {
    signals.push({
      type: "RESPONSIVENESS_COMPLAINTS",
      score: 15,
      source: "places-runtime",
      derivedAt,
      rationale: "Recent public reviews include paraphrased responsiveness complaints.",
    });
  }

  return {
    derivedAt,
    minimumReviewFloorMet,
    signals,
    disqualifiers,
  };
}

function normalizePlacesDetails(input: unknown): PlacesDetailsLike {
  return isRecord(input) ? input : {};
}

function demandScoreFromReviewCount(reviewCount: number | null): number {
  if (reviewCount === null || reviewCount < 10) return 0;
  if (reviewCount <= 50) return 10;
  if (reviewCount <= 150) return 20;
  if (reviewCount <= 500) return 30;
  return 25;
}

function hasAfterHoursGap(
  openingHours: unknown,
  categories: readonly string[],
  afterHoursDemandCategories: readonly string[],
): boolean {
  if (!categories.some((category) => afterHoursDemandCategories.includes(category))) {
    return false;
  }

  if (!isRecord(openingHours)) {
    return false;
  }

  const hours = openingHours as PlacesOpeningHoursLike;
  if (!Array.isArray(hours.periods)) {
    return false;
  }

  return hours.periods.length < 7;
}

function hasResponsivenessComplaint(reviews: unknown): boolean {
  if (!Array.isArray(reviews)) {
    return false;
  }

  return reviews.some((review: unknown) => {
    if (!isRecord(review)) {
      return false;
    }
    const maybeReview = review as PlacesReviewLike;
    return typeof maybeReview.text === "string" && RESPONSIVENESS_PATTERN.test(maybeReview.text);
  });
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
