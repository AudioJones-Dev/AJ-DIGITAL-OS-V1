import { routeModelTask } from "../model-routing/model-router.js";

export interface OpenAiReasoningInput {
  task: string;
  pageSummary: string;
  previousActions: string[];
  workflowHints: string;
}

export interface AgentAction {
  thought: string;
  action: "goto" | "click" | "type" | "press" | "wait" | "extract" | "done" | "fail";
  selector?: string | undefined;
  text?: string | undefined;
  key?: string | undefined;
  fields?: string[] | undefined;
  reason?: string | undefined;
}

const SYSTEM_PROMPT = `You are a browser automation agent. You receive a task description and a summary of the current page state. You must return ONLY a single JSON object with your next action.

You must respond with EXACTLY this JSON schema — no markdown, no explanation, no wrapping:

{
  "thought": "brief reasoning about what to do next",
  "action": "goto|click|type|press|wait|extract|done|fail",
  "selector": "CSS selector (required for click, type, press)",
  "text": "value for this action (see rules below)",
  "key": "keyboard key (required for press)",
  "fields": ["field names to extract (required for extract)"],
  "reason": "reason for done or fail"
}

Action rules:
- "goto" requires "text" containing an ABSOLUTE URL starting with http:// or https://. NEVER put reasoning, descriptions, or page titles in "text" — ONLY a valid URL.
- "click" requires "selector" — a valid CSS selector.
- "type" requires "selector" and "text" — the literal value to type into the field.
- "press" requires "selector" and "key" — a keyboard key name (e.g. "Enter", "Tab").
- "wait" optionally takes "selector" to wait for.
- "extract" requires "fields" — a non-empty array of field names to scrape from the current page.
- "done" requires "reason" — a brief explanation of why the task is complete.
- "fail" requires "reason" — a brief explanation of why the task cannot be completed.

Critical behavior rules:
1. The "thought" field is for your reasoning. ALL other fields are machine-consumed values — never put natural language in "text", "selector", "key", or "fields".
2. If you are already on the page that contains the target fields, use "extract" immediately. Do NOT navigate away.
3. If you cannot find the data or cannot proceed, use "fail" with a clear reason. Do NOT repeat the same action.
4. NEVER repeat an action you already performed. Check "Previous Actions" before deciding.
5. Only use actions that are safe and non-destructive.
6. Never submit forms that create, delete, or modify data.
7. Stay within the described task boundaries.
8. If the previous action failed validation, fix the issue in your next response based on the feedback provided.`;

export async function requestNextAction(input: OpenAiReasoningInput): Promise<AgentAction> {
  const userMessage = buildUserMessage(input);

  const result = await routeModelTask<OpenAiReasoningInput, AgentAction>(
    {
      taskType: "planner",
      task: "Decide next browser automation action",
      context: input,
      constraints: { executionMode: "interactive" },
      allowEscalation: true,
    },
    {
      openai: {
        systemPrompt: SYSTEM_PROMPT,
        userMessage,
        model: "gpt-4o-mini",
        temperature: 0,
        maxTokens: 500,
        responseFormat: "json",
      },
    },
  );

  if (!result.ok || !result.output) {
    throw new Error(result.error ?? "Model router returned no output for planner task.");
  }

  return result.output;
}

function buildUserMessage(input: OpenAiReasoningInput): string {
  const parts: string[] = [
    `## Task\n${input.task}`,
    `## Workflow Hints\n${input.workflowHints}`,
    `## Current Page State\n${input.pageSummary}`,
  ];

  if (input.previousActions.length > 0) {
    parts.push(`## Previous Actions\n${input.previousActions.map((a, i) => `${i + 1}. ${a}`).join("\n")}`);
  }

  return parts.join("\n\n");
}
