const FORBIDDEN_KEY_SET = new Set<string>([
  "googleRating",
  "googleReviewCount",
  "googlePhone",
  "googleHours",
  "googleCategory",
  "googleCategories",
  "googleTypes",
  "googleReviewText",
  "rawReviewText",
  "reviewText",
  "reviews",
  "googleReviews",
  "user_ratings_total",
  "formatted_phone_number",
  "opening_hours",
  "types",
]);

export const FORBIDDEN_GOOGLE_PERSISTENCE_KEYS = Array.from(FORBIDDEN_KEY_SET).sort();

export function findForbiddenGooglePersistenceKeys(value: unknown): string[] {
  const matches: string[] = [];
  walkValue(value, "$", matches);
  return matches;
}

export function assertNoForbiddenGooglePersistence(value: unknown): void {
  const matches = findForbiddenGooglePersistenceKeys(value);
  if (matches.length > 0) {
    throw new Error(
      `Forbidden Google Places persistence keys detected: ${matches.join(", ")}`,
    );
  }
}

function walkValue(value: unknown, path: string, matches: string[]): void {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => walkValue(item, `${path}[${index}]`, matches));
    return;
  }

  if (typeof value !== "object") {
    return;
  }

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    const nestedPath = `${path}.${key}`;
    if (FORBIDDEN_KEY_SET.has(key)) {
      matches.push(nestedPath);
    }
    walkValue(nested, nestedPath, matches);
  }
}
