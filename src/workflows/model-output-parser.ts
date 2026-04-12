export interface ParsedModelObject {
  ok: boolean;
  repaired: boolean;
  warnings: string[];
  reason?: string;
  value?: Record<string, unknown>;
}

/**
 * Conservative JSON parsing and normalization for model-backed workflow outputs.
 */
export const parseModelOutputObject = (content: string): ParsedModelObject => {
  const directAttempt = tryParseJsonObject(content);
  if (directAttempt.ok) {
    return {
      ok: true,
      repaired: false,
      warnings: [],
      value: directAttempt.value,
    };
  }

  const normalized = normalizeJsonLikeContent(content);
  if (normalized && normalized !== content) {
    const repairedAttempt = tryParseJsonObject(normalized);
    if (repairedAttempt.ok) {
      return {
        ok: true,
        repaired: true,
        warnings: ["Model output required conservative JSON normalization before use."],
        value: repairedAttempt.value,
      };
    }
  }

  const reason = "Model output was not valid JSON; deterministic content was used for any missing sections.";
  return {
    ok: false,
    repaired: false,
    warnings: [reason],
    reason,
  };
};

const tryParseJsonObject = (
  content: string,
): { ok: true; value: Record<string, unknown> } | { ok: false } => {
  try {
    const parsed = JSON.parse(content) as unknown;

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return { ok: false };
    }

    return {
      ok: true,
      value: parsed as Record<string, unknown>,
    };
  } catch {
    return { ok: false };
  }
};

const normalizeJsonLikeContent = (content: string): string | undefined => {
  const trimmed = content.trim();
  if (!trimmed) {
    return undefined;
  }

  const withoutFences = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const candidateObject = extractTopLevelJsonObject(withoutFences);

  if (!candidateObject) {
    return undefined;
  }

  return stripTrailingCommas(candidateObject);
};

const extractTopLevelJsonObject = (content: string): string | undefined => {
  const start = content.indexOf("{");
  if (start === -1) {
    return undefined;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < content.length; index += 1) {
    const char = content[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;

      if (depth === 0) {
        return content.slice(start, index + 1);
      }
    }
  }

  return undefined;
};

const stripTrailingCommas = (content: string): string => content.replace(/,\s*([}\]])/g, "$1");
