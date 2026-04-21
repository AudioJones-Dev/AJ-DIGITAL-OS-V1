import type { RetrievedContext } from "../memory-runtime/retrieval.js";
import type { MemoryRecord } from "../memory-runtime/types.js";
import { SYSTEM_POLICY } from "./system-policy.js";
import type {
  ModelPromptInput,
  ModelPromptResult,
  PromptBudget,
  PromptBuildDiagnostics,
} from "./prompt-types.js";
import { DEFAULT_PROMPT_BUDGET } from "./prompt-types.js";

// ── Model Prompt Builder ───────────────────────────────────────────

/**
 * Build a bounded, structured model prompt from task + retrieved context.
 *
 * Converts RetrievedContext into human-readable summaries that stay
 * within per-section character budgets. Logs diagnostics to stderr.
 */
export function buildModelPrompt(
  input: ModelPromptInput,
  budget: PromptBudget = DEFAULT_PROMPT_BUDGET,
): ModelPromptResult {
  const truncations: string[] = [];
  const sectionsUsed: string[] = [];

  // ── System section ─────────────────────────────────────────────
  const systemParts: string[] = [SYSTEM_POLICY];

  if (input.task) {
    systemParts.push(`Task: ${input.task}`);
  }

  if (input.outputSchema) {
    systemParts.push(`Output format: ${input.outputSchema}`);
  }

  if (input.constraints && input.constraints.length > 0) {
    systemParts.push(`Constraints:\n- ${input.constraints.join("\n- ")}`);
  }

  systemParts.push("Respond with ONLY the requested output. No preamble, no explanation.");

  let system = systemParts.join("\n\n");
  if (system.length > budget.system) {
    truncations.push(`system: ${system.length} → ${budget.system}`);
    system = truncate(system, budget.system);
  }
  sectionsUsed.push("system");

  // ── Context section ────────────────────────────────────────────
  let context = "";
  if (input.retrievedContext) {
    context = summarizeRetrievedContext(input.retrievedContext, budget.context, truncations);
  }

  if (context.length > 0) {
    sectionsUsed.push("context");
  }

  if (context.length > budget.context) {
    truncations.push(`context: ${context.length} → ${budget.context}`);
    context = truncate(context, budget.context);
  }

  // ── User section ───────────────────────────────────────────────
  let user = input.input;
  if (user.length > budget.user) {
    truncations.push(`user: ${user.length} → ${budget.user}`);
    user = truncate(user, budget.user);
  }
  sectionsUsed.push("user");

  // ── Diagnostics ────────────────────────────────────────────────
  const diagnostics: PromptBuildDiagnostics = {
    sectionChars: {
      system: system.length,
      context: context.length,
      user: user.length,
    },
    totalChars: system.length + context.length + user.length,
    sectionsUsed,
    truncated: truncations.length > 0,
    truncations,
  };

  logDiagnostics(diagnostics);

  return {
    prompt: { system, context, user },
    diagnostics,
  };
}

// ── Context Summarization ────────────────────────────────────────

function summarizeRetrievedContext(
  ctx: RetrievedContext,
  maxChars: number,
  truncations: string[],
): string {
  const parts: string[] = [];
  let usedChars = 0;

  // Slot 1: Working context
  if (ctx.workingContext && ctx.workingContext.trim().length > 0) {
    const header = "## Current State";
    const slotBudget = Math.floor(maxChars * 0.35);
    let content = ctx.workingContext.trim();
    if (content.length > slotBudget) {
      truncations.push(`working_context: ${content.length} → ${slotBudget}`);
      content = truncate(content, slotBudget);
    }
    const section = `${header}\n${content}`;
    parts.push(section);
    usedChars += section.length;
  }

  // Slot 2: Last run summary
  if (ctx.lastRun) {
    const header = "## Last Run";
    const slotBudget = Math.floor(maxChars * 0.25);
    let content = summarizeRecord(ctx.lastRun);
    if (content.length > slotBudget) {
      truncations.push(`last_run: ${content.length} → ${slotBudget}`);
      content = truncate(content, slotBudget);
    }
    if (usedChars + content.length + header.length + 2 <= maxChars) {
      const section = `${header}\n${content}`;
      parts.push(section);
      usedChars += section.length;
    }
  }

  // Slot 3: Last failure (only if exists)
  if (ctx.lastFailure) {
    const header = "## Last Failure";
    const slotBudget = Math.floor(maxChars * 0.20);
    let content = summarizeRecord(ctx.lastFailure);
    if (content.length > slotBudget) {
      truncations.push(`last_failure: ${content.length} → ${slotBudget}`);
      content = truncate(content, slotBudget);
    }
    if (usedChars + content.length + header.length + 2 <= maxChars) {
      const section = `${header}\n${content}`;
      parts.push(section);
      usedChars += section.length;
    }
  }

  // Slot 4: Recent logs (max 3, bounded)
  if (ctx.recentLogs && ctx.recentLogs.length > 0) {
    const header = "## Recent Activity";
    const slotBudget = Math.floor(maxChars * 0.20);
    const logs = ctx.recentLogs.slice(0, 3);
    const logLines: string[] = [];
    const perLogBudget = Math.floor(slotBudget / logs.length);

    for (const log of logs) {
      let content = log.content.trim();
      if (content.length > perLogBudget) {
        content = truncate(content, perLogBudget);
      }
      logLines.push(`- ${log.file}: ${content}`);
    }

    let content = logLines.join("\n");
    if (content.length > slotBudget) {
      truncations.push(`recent_logs: ${content.length} → ${slotBudget}`);
      content = truncate(content, slotBudget);
    }

    if (usedChars + content.length + header.length + 2 <= maxChars) {
      const section = `${header}\n${content}`;
      parts.push(section);
    }
  }

  return parts.length > 0 ? parts.join("\n\n") : "";
}

function summarizeRecord(record: MemoryRecord): string {
  const parts: string[] = [];

  if (record.workflow) {
    parts.push(`Workflow: ${record.workflow}`);
  }
  if (record.timestamp) {
    parts.push(`Time: ${record.timestamp}`);
  }
  if (record.tags && record.tags.length > 0) {
    parts.push(`Tags: ${record.tags.join(", ")}`);
  }

  // Summarize content — avoid raw JSON dumps
  const content = record.content;
  if (typeof content === "string") {
    parts.push(content);
  } else if (content && typeof content === "object") {
    // Extract key fields rather than dumping JSON
    const obj = content as Record<string, unknown>;
    const keys = Object.keys(obj).slice(0, 8);
    for (const key of keys) {
      const val = obj[key];
      if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
        parts.push(`${key}: ${String(val)}`);
      } else if (val !== null && val !== undefined) {
        parts.push(`${key}: [${typeof val}]`);
      }
    }
  }

  return parts.join("\n");
}

// ── Utilities ────────────────────────────────────────────────────

function truncate(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const suffix = "\n…[truncated]";
  const cutoff = maxChars - suffix.length;
  return cutoff > 0 ? text.slice(0, cutoff) + suffix : text.slice(0, maxChars);
}

function logDiagnostics(d: PromptBuildDiagnostics): void {
  const parts = [
    `[PROMPT-BUILDER]`,
    `total=${d.totalChars}`,
    `sys=${d.sectionChars.system}`,
    `ctx=${d.sectionChars.context}`,
    `usr=${d.sectionChars.user}`,
    `sections=${d.sectionsUsed.join(",")}`,
  ];
  if (d.truncated) {
    parts.push(`truncations=${d.truncations.join("; ")}`);
  }
  console.error(parts.join(" "));
}
