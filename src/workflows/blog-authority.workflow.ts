import type {
  WorkflowContext,
  WorkflowDefinition,
  WorkflowExecutionResult,
  WorkflowModelRuntime,
} from "../types/workflow.types.js";
import { parseModelOutputObject } from "./model-output-parser.js";

const DEFAULT_CTA = "Book a strategy call";

interface BlogAuthorityDraft {
  objective: string;
  brandName: string;
  audience: string;
  positioning: string;
  tone: string;
  cta: string;
  writingRules: string[];
  differentiators: string[];
  sourceSummary: string;
}

interface BlogAuthorityParsedContent {
  ok: boolean;
  repaired: boolean;
  warnings: string[];
  reason?: string;
  summary?: string;
  title?: string;
  outline: string[];
  blogDraft?: string;
  cta?: string;
  seoNotes: string[];
  hookSet: string[];
}

/**
 * Deterministic starter workflow for AJ Digital authority blog production.
 */
export const blogAuthorityWorkflow: WorkflowDefinition = {
  id: "blog-authority",
  supportedTaskTypes: ["blog_generation", "authority_blog"],
  async execute(context: WorkflowContext, modelRuntime?: WorkflowModelRuntime): Promise<WorkflowExecutionResult> {
    const draft = buildDraftContext(context);
    const fallbackResult = buildDeterministicResult(context, draft);

    if (!modelRuntime) {
      return fallbackResult;
    }

    try {
      await emitModelEvent(modelRuntime, {
        type: "model_execution_attempted",
        metadata: buildModelEventMetadata(modelRuntime),
      });

      const generated = await modelRuntime.provider.generate({
        model: modelRuntime.model,
        system: modelRuntime.system,
        user: modelRuntime.user,
        responseFormat: "json",
        temperature: 0,
        maxTokens: 1800,
        metadata: {
          workflowId: "blog-authority",
          taskType: context.taskType,
          runId: context.runId,
          ...modelRuntime.metadata,
        },
      });

      const parsed = parseGeneratedContent(generated.content);

      if (!parsed.ok) {
        const reason = parsed.reason ?? "Model output was not valid JSON.";
        await emitModelEvent(modelRuntime, {
          type: "model_execution_parse_failed",
          metadata: {
            ...buildModelEventMetadata(modelRuntime, generated.model),
            reason,
          },
          message: reason,
        });
        await emitModelEvent(modelRuntime, {
          type: "model_execution_fallback_used",
          metadata: {
            ...buildModelEventMetadata(modelRuntime, generated.model),
            reason,
          },
          message: "Deterministic fallback content was used after model output parse failure.",
        });
      } else {
        await emitModelEvent(modelRuntime, {
          type: "model_execution_succeeded",
          metadata: {
            ...buildModelEventMetadata(modelRuntime, generated.model),
            repaired: parsed.repaired,
          },
          ...(parsed.repaired
            ? { message: "Model execution succeeded after conservative JSON normalization." }
            : {}),
        });
      }

      const fallbackAssets = getAssetMap(fallbackResult);
      const outline = parsed.outline.length > 0
        ? parsed.outline.join("\n")
        : fallbackAssets.outline;
      const blogDraft = parsed.blogDraft?.trim() || fallbackAssets.blog_draft;
      const seoNotes = parsed.seoNotes.length > 0
        ? parsed.seoNotes.join("\n")
        : fallbackAssets.seo_notes;
      const hookSet = parsed.hookSet.length > 0
        ? parsed.hookSet.join("\n")
        : fallbackAssets.hook_set;
      const title = parsed.title?.trim() || fallbackAssets.title;
      const cta = parsed.cta?.trim() || fallbackAssets.cta;

      return {
        workflowId: "blog-authority",
        taskType: context.taskType,
        status: "draft_complete",
        summary: parsed.summary ?? fallbackResult.summary,
        warnings: [...fallbackResult.warnings, ...parsed.warnings],
        assets: [
          { type: "title", value: title },
          { type: "outline", value: outline },
          { type: "blog_draft", value: blogDraft },
          { type: "cta", value: cta },
          { type: "seo_notes", value: seoNotes },
          { type: "hook_set", value: hookSet },
        ],
      };
    } catch (error) {
      const reason = getErrorReason(error);
      await emitModelEvent(modelRuntime, {
        type: "model_execution_failed",
        metadata: {
          ...buildModelEventMetadata(modelRuntime),
          reason,
        },
        message: reason,
      });
      await emitModelEvent(modelRuntime, {
        type: "model_execution_fallback_used",
        metadata: {
          ...buildModelEventMetadata(modelRuntime),
          reason,
        },
        message: "Deterministic fallback content was used after model execution failure.",
      });

      return {
        ...fallbackResult,
        warnings: [
          ...fallbackResult.warnings,
          `Model-assisted blog generation failed; using deterministic fallback instead: ${reason}`,
        ],
      };
    }
  },
};

const buildDraftContext = (context: WorkflowContext): BlogAuthorityDraft => {
  const objective = normalizeSentence(context.objective);
  const brandName = getString(context.brandDNA, "brandName") ?? context.clientId;
  const audience = getString(context.brandDNA, "audience") ?? "operators";
  const positioning =
    getString(context.brandDNA, "positioning") ?? `${brandName} delivers practical strategic insight`;
  const tone = getString(context.brandDNA, "tone") ?? "clear and practical";
  const preferredCtas = getStringArray(context.brandDNA, "preferredCTAs");
  const cta = preferredCtas[0] ?? DEFAULT_CTA;
  const writingRules = getStringArray(context.brandDNA, "writingRules");
  const differentiators = getStringArray(context.brandDNA, "differentiators");
  const sourceSummary = summarizeSourceMaterials(context);

  return {
    objective,
    brandName,
    audience,
    positioning,
    tone,
    cta,
    writingRules,
    differentiators,
    sourceSummary,
  };
};

const buildDeterministicResult = (
  context: WorkflowContext,
  draft: BlogAuthorityDraft,
): WorkflowExecutionResult => {
  return {
    workflowId: "blog-authority",
    taskType: context.taskType,
    status: "draft_complete",
    summary: `Generated an authority blog starter draft for ${draft.brandName} focused on ${draft.objective.toLowerCase()}.`,
    warnings: context.sourceMaterials.length === 0 ? ["Draft created without source materials."] : [],
    assets: [
      {
        type: "title",
        value: `${draft.brandName}: ${draft.objective}`,
      },
      {
        type: "outline",
        value: [
          `1. Why ${draft.objective.toLowerCase()} matters for ${draft.audience}`,
          "2. The current friction keeping teams stuck",
          `3. ${draft.brandName}'s operating perspective`,
          "4. Practical steps to apply this approach",
          "5. What to measure next",
        ].join("\n"),
      },
      {
        type: "blog_draft",
        value: [
          `${draft.brandName} approaches ${draft.objective.toLowerCase()} with a ${draft.tone} lens.`,
          `${draft.positioning}.`,
          draft.sourceSummary,
          renderDifferentiatorParagraph(draft.differentiators),
          renderWritingRulesParagraph(draft.writingRules),
          "The practical question is not whether this matters, but how quickly a team can operationalize it without adding noise.",
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
      {
        type: "cta",
        value: draft.cta,
      },
      {
        type: "seo_notes",
        value: [
          `Primary keyword: ${draft.objective.toLowerCase()}`,
          `Audience intent: ${draft.audience}`,
          `Angle: ${draft.brandName} point of view on execution`,
        ].join("\n"),
      },
      {
        type: "hook_set",
        value: [
          `Most teams overcomplicate ${draft.objective.toLowerCase()} before they operationalize it.`,
          `${draft.brandName} uses a system-first approach instead of vague content volume.`,
          "If the work is not reusable, it is not authority building.",
        ].join("\n"),
      },
    ],
  };
};

const parseGeneratedContent = (content: string): BlogAuthorityParsedContent => {
  const parsedObject = parseModelOutputObject(content);
  if (parsedObject.ok && parsedObject.value) {
    return {
      ok: true,
      repaired: parsedObject.repaired,
      warnings: parsedObject.warnings,
      ...extractParsedSections(parsedObject.value),
    };
  }

  return {
    ok: false,
    repaired: parsedObject.repaired,
    warnings: parsedObject.warnings,
    ...(parsedObject.reason ? { reason: parsedObject.reason } : {}),
    outline: [],
    seoNotes: [],
    hookSet: [],
  };
};

const extractParsedSections = (parsed: Record<string, unknown>): Omit<BlogAuthorityParsedContent, "ok" | "repaired" | "warnings" | "reason"> => {
  const summary = readFirstString(parsed, ["summary", "overview"]);
  const title = readFirstString(parsed, ["title", "headline"]);
  const blogDraft = readFirstString(parsed, ["blogDraft", "blog_draft", "draft"]);
  const cta = readFirstString(parsed, ["cta", "callToAction", "call_to_action"]);

  return {
    ...(summary
      ? { summary }
      : {}),
    ...(title
      ? { title }
      : {}),
    ...(blogDraft
      ? { blogDraft }
      : {}),
    ...(cta
      ? { cta }
      : {}),
    outline: readFirstStringList(parsed, ["outline", "sections"]),
    seoNotes: readFirstStringList(parsed, ["seoNotes", "seo_notes", "seo"]),
    hookSet: readFirstStringList(parsed, ["hookSet", "hook_set", "hooks"]),
  };
};


const emitModelEvent = async (
  modelRuntime: WorkflowModelRuntime | undefined,
  event: {
    type: "model_execution_attempted" | "model_execution_succeeded" | "model_execution_parse_failed" | "model_execution_fallback_used" | "model_execution_failed";
    message?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> => {
  if (!modelRuntime?.onEvent) {
    return;
  }

  await modelRuntime.onEvent(event);
};

const buildModelEventMetadata = (
  modelRuntime: WorkflowModelRuntime,
  resolvedModel?: string,
): Record<string, unknown> => {
  return {
    provider: modelRuntime.providerName,
    model: resolvedModel ?? modelRuntime.model,
    workflowId: "blog-authority",
  };
};

const getAssetMap = (result: WorkflowExecutionResult): Record<WorkflowExecutionResult["assets"][number]["type"], string> => {
  const assetMap = {
    title: "",
    outline: "",
    blog_draft: "",
    cta: "",
    seo_notes: "",
    hook_set: "",
    caption_set: "",
  };

  for (const asset of result.assets) {
    assetMap[asset.type] = asset.value;
  }

  return assetMap;
};

const getErrorReason = (error: unknown): string => {
  const candidates = [
    error instanceof Error ? error.message : undefined,
    error instanceof Error ? String(error) : undefined,
    typeof error === "string" ? error : undefined,
  ];

  for (const candidate of candidates) {
    const normalized = candidate?.replace(/\s+/g, " ").trim();
    if (normalized && normalized !== "Error") {
      return normalized;
    }
  }

  return "Unknown provider error.";
};

const normalizeSentence = (value: string): string => value.trim().replace(/\.+$/, "");

const getString = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const getStringArray = (record: Record<string, unknown>, key: string): string[] => {
  const value = record[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
};

const readStringList = (value: unknown): string[] => {
  if (typeof value === "string") {
    return value
      .split(/\r?\n|;/)
      .map((item) => item.replace(/^\d+[.)]\s*/, "").replace(/^[-*]\s*/, "").trim())
      .filter((item) => item.length > 0);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const readFirstString = (record: Record<string, unknown>, keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
};

const readFirstStringList = (record: Record<string, unknown>, keys: string[]): string[] => {
  for (const key of keys) {
    const values = readStringList(record[key]);
    if (values.length > 0) {
      return values;
    }
  }

  return [];
};

const summarizeSourceMaterials = (context: WorkflowContext): string => {
  if (context.sourceMaterials.length === 0) {
    return "This starter draft is based on the current task brief and brand context only.";
  }

  const labels = context.sourceMaterials
    .slice(0, 3)
    .map((item, index) => {
      const title = typeof item.title === "string" ? item.title : undefined;
      return title ?? `source ${index + 1}`;
    })
    .join(", ");

  return `Source materials considered in this draft: ${labels}.`;
};

const renderDifferentiatorParagraph = (differentiators: string[]): string => {
  if (differentiators.length === 0) {
    return "";
  }

  return `Key differentiators shaping the argument: ${differentiators.join(", ")}.`;
};

const renderWritingRulesParagraph = (writingRules: string[]): string => {
  if (writingRules.length === 0) {
    return "";
  }

  return `Writing rules applied in the draft: ${writingRules.join(", ")}.`;
};
