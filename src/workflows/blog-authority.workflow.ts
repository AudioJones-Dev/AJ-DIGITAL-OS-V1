import type {
  WorkflowContext,
  WorkflowDefinition,
  WorkflowExecutionResult,
} from "../types/workflow.types.js";

const DEFAULT_CTA = "Book a strategy call";

/**
 * Deterministic starter workflow for AJ Digital authority blog production.
 */
export const blogAuthorityWorkflow: WorkflowDefinition = {
  id: "blog-authority",
  supportedTaskTypes: ["blog_generation", "authority_blog"],
  async execute(context: WorkflowContext): Promise<WorkflowExecutionResult> {
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
      workflowId: "blog-authority",
      taskType: context.taskType,
      status: "draft_complete",
      summary: `Generated an authority blog starter draft for ${brandName} focused on ${objective.toLowerCase()}.`,
      warnings: context.sourceMaterials.length === 0 ? ["Draft created without source materials."] : [],
      assets: [
        {
          type: "title",
          value: `${brandName}: ${objective}`,
        },
        {
          type: "outline",
          value: [
            `1. Why ${objective.toLowerCase()} matters for ${audience}`,
            `2. The current friction keeping teams stuck`,
            `3. ${brandName}'s operating perspective`,
            `4. Practical steps to apply this approach`,
            `5. What to measure next`,
          ].join("\n"),
        },
        {
          type: "blog_draft",
          value: [
            `${brandName} approaches ${objective.toLowerCase()} with a ${tone} lens.`,
            `${positioning}.`,
            sourceSummary,
            renderDifferentiatorParagraph(differentiators),
            renderWritingRulesParagraph(writingRules),
            `The practical question is not whether this matters, but how quickly a team can operationalize it without adding noise.`,
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
        {
          type: "cta",
          value: cta,
        },
        {
          type: "seo_notes",
          value: [
            `Primary keyword: ${objective.toLowerCase()}`,
            `Audience intent: ${audience}`,
            `Angle: ${brandName} point of view on execution`,
          ].join("\n"),
        },
        {
          type: "hook_set",
          value: [
            `Most teams overcomplicate ${objective.toLowerCase()} before they operationalize it.`,
            `${brandName} uses a system-first approach instead of vague content volume.`,
            `If the work is not reusable, it is not authority building.`,
          ].join("\n"),
        },
      ],
    };
  },
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
