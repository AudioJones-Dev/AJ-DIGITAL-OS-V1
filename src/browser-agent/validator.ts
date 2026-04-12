import type { AgentAction } from "./openai.js";

const VALID_ACTIONS = new Set(["goto", "click", "type", "press", "wait", "extract", "done", "fail"]);

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  action: AgentAction | null;
}

export function validateAction(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { valid: false, errors: ["Action must be a JSON object."], action: null };
  }

  const obj = raw as Record<string, unknown>;

  if (typeof obj.thought !== "string" || obj.thought.length === 0) {
    errors.push("Missing or empty 'thought' field.");
  }

  if (typeof obj.action !== "string" || !VALID_ACTIONS.has(obj.action)) {
    errors.push(`Invalid action: "${String(obj.action)}". Must be one of: ${[...VALID_ACTIONS].join(", ")}`);
    return { valid: false, errors, action: null };
  }

  const action = obj.action as AgentAction["action"];

  switch (action) {
    case "goto":
      if (typeof obj.text !== "string" || obj.text.length === 0) {
        errors.push("'goto' requires 'text' with a URL.");
      } else if (!/^https?:\/\/.+/i.test(obj.text)) {
        errors.push(`'goto.text' must be an absolute http/https URL. Got: "${String(obj.text).slice(0, 80)}"`);
      }
      break;
    case "click":
      if (typeof obj.selector !== "string" || obj.selector.length === 0) {
        errors.push("'click' requires 'selector'.");
      }
      break;
    case "type":
      if (typeof obj.selector !== "string" || obj.selector.length === 0) {
        errors.push("'type' requires 'selector'.");
      }
      if (typeof obj.text !== "string") {
        errors.push("'type' requires 'text'.");
      }
      break;
    case "press":
      if (typeof obj.selector !== "string" || obj.selector.length === 0) {
        errors.push("'press' requires 'selector'.");
      }
      if (typeof obj.key !== "string" || obj.key.length === 0) {
        errors.push("'press' requires 'key'.");
      }
      break;
    case "extract":
      if (!Array.isArray(obj.fields) || obj.fields.length === 0) {
        errors.push("'extract' requires non-empty 'fields' array.");
      } else if (!obj.fields.every((f: unknown) => typeof f === "string" && f.length > 0)) {
        errors.push("'extract.fields' must contain only non-empty strings.");
      }
      break;
    case "done":
      if (typeof obj.reason !== "string" || obj.reason.length === 0) {
        errors.push("'done' requires 'reason'.");
      }
      break;
    case "fail":
      if (typeof obj.reason !== "string" || obj.reason.length === 0) {
        errors.push("'fail' requires 'reason'.");
      }
      break;
    case "wait":
      // selector is optional for wait
      break;
  }

  if (errors.length > 0) {
    return { valid: false, errors, action: null };
  }

  return {
    valid: true,
    errors: [],
    action: {
      thought: String(obj.thought),
      action,
      ...(typeof obj.selector === "string" ? { selector: obj.selector } : {}),
      ...(typeof obj.text === "string" ? { text: obj.text } : {}),
      ...(typeof obj.key === "string" ? { key: obj.key } : {}),
      ...(Array.isArray(obj.fields) ? { fields: obj.fields.map(String) } : {}),
      ...(typeof obj.reason === "string" ? { reason: obj.reason } : {}),
    },
  };
}
