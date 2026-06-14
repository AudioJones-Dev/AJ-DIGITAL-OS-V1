export type OperatorDecisionDimension =
  | "ideation"
  | "conviction"
  | "green_light"
  | "execution_layer"
  | "operator_voice"
  | "tempo"
  | "scarcity_priority"
  | "reasoning";

export type OperatorDecisionAuthority =
  | "do_and_log"
  | "make_the_call"
  | "keep_the_pen"
  | "requires_approval";

export interface OperatorDecisionProfileDimension {
  dimension: OperatorDecisionDimension;
  pattern: string;
  agentInstruction: string;
}

export interface OperatorDecisionProfile {
  profileId: "audio-jones-decision-dna";
  version: "1.0.0";
  owner: "Audio Jones";
  summary: string;
  dimensions: OperatorDecisionProfileDimension[];
  defaults: {
    reasoningMode: "full_reasoning";
    ideationMode: "problem_first";
    reversibleInternalWork: OperatorDecisionAuthority;
    executionLayer: OperatorDecisionAuthority;
    brandVoiceAndDoctrine: OperatorDecisionAuthority;
    scarcityPriority: "unblock_the_most_work";
  };
}

export interface OperatorDecisionHookInput {
  action: string;
  reversible?: boolean;
  internalOnly?: boolean;
  executionLayer?: boolean;
  publicFacing?: boolean;
  touchesBrandVoice?: boolean;
  touchesDoctrine?: boolean;
  destructive?: boolean;
  secretOrCredentialWork?: boolean;
  productionOrExternalAction?: boolean;
  globalHookOrAgentConfig?: boolean;
}

export interface OperatorDecisionHookResult {
  authority: OperatorDecisionAuthority;
  requiresFullReasoning: true;
  requiresDecisionLog: boolean;
  reason: string;
  protocol: string[];
}

export const AUDIO_JONES_DECISION_PROFILE: OperatorDecisionProfile = {
  profileId: "audio-jones-decision-dna",
  version: "1.0.0",
  owner: "Audio Jones",
  summary:
    "Problem-driven throughput maximizer: delegate execution, move fast on reversible internal work, keep brand voice and doctrine with the operator, and expose full reasoning every time.",
  dimensions: [
    {
      dimension: "ideation",
      pattern: "Seeds from a problem or pain, then formalizes doctrine as a guardrail for speed.",
      agentInstruction: "Start from the operating pain and desired outcome before proposing doctrine.",
    },
    {
      dimension: "conviction",
      pattern: "Needs a recommended safe option with the reasoning, not a menu of equal choices.",
      agentInstruction: "Recommend the path and show the tradeoffs that make it the recommended path.",
    },
    {
      dimension: "green_light",
      pattern: "Reversible internal work can be done and logged.",
      agentInstruction: "For scoped, reversible, internal work, proceed after scope is clear and record what changed.",
    },
    {
      dimension: "execution_layer",
      pattern: "Technical execution, tooling, stack, naming, and sequencing are delegated to the agent.",
      agentInstruction: "Make the execution call using repo evidence, existing patterns, and validation.",
    },
    {
      dimension: "operator_voice",
      pattern: "Brand voice, public copy, doctrine, and principles remain operator-owned.",
      agentInstruction: "Do not finalize or overwrite voice, copy, doctrine, or principles without operator approval.",
    },
    {
      dimension: "tempo",
      pattern: "Fast, then iterate inside the safe zone defined by the matrix.",
      agentInstruction: "Prefer small reversible moves with feedback over large speculative rewrites.",
    },
    {
      dimension: "scarcity_priority",
      pattern: "Under scarcity, unblock the most work.",
      agentInstruction: "Choose the action that increases downstream throughput without crossing an approval gate.",
    },
    {
      dimension: "reasoning",
      pattern: "Full reasoning every time.",
      agentInstruction: "Separate facts, inferences, assumptions, risks, and decision rationale.",
    },
  ],
  defaults: {
    reasoningMode: "full_reasoning",
    ideationMode: "problem_first",
    reversibleInternalWork: "do_and_log",
    executionLayer: "make_the_call",
    brandVoiceAndDoctrine: "keep_the_pen",
    scarcityPriority: "unblock_the_most_work",
  },
};

export function evaluateOperatorDecisionHook(
  input: OperatorDecisionHookInput,
): OperatorDecisionHookResult {
  if (
    input.destructive === true ||
    input.secretOrCredentialWork === true ||
    input.productionOrExternalAction === true ||
    input.globalHookOrAgentConfig === true
  ) {
    return {
      authority: "requires_approval",
      requiresFullReasoning: true,
      requiresDecisionLog: true,
      reason: `${input.action} crosses an approval gate.`,
      protocol: [
        "Stop before acting.",
        "Show what will change, what could break, reversibility, rollback, and the exact requested action.",
        "Wait for operator approval before execution.",
      ],
    };
  }

  if (
    input.touchesBrandVoice === true ||
    input.touchesDoctrine === true ||
    input.publicFacing === true
  ) {
    return {
      authority: "keep_the_pen",
      requiresFullReasoning: true,
      requiresDecisionLog: true,
      reason: `${input.action} touches operator-owned voice, doctrine, or public-facing material.`,
      protocol: [
        "Draft or recommend only.",
        "Expose the reasoning and tradeoffs.",
        "Wait for operator approval before finalizing or publishing.",
      ],
    };
  }

  if (input.executionLayer === true) {
    return {
      authority: "make_the_call",
      requiresFullReasoning: true,
      requiresDecisionLog: true,
      reason: `${input.action} is delegated execution-layer work.`,
      protocol: [
        "Inspect existing repo patterns.",
        "Choose the recommended implementation path.",
        "Validate and log the outcome.",
      ],
    };
  }

  if (input.reversible === true && input.internalOnly === true) {
    return {
      authority: "do_and_log",
      requiresFullReasoning: true,
      requiresDecisionLog: true,
      reason: `${input.action} is reversible internal work.`,
      protocol: [
        "Proceed within declared scope.",
        "Keep the change reversible.",
        "Log changed files, validation, risks, and next decision.",
      ],
    };
  }

  return {
    authority: "requires_approval",
    requiresFullReasoning: true,
    requiresDecisionLog: true,
    reason: `${input.action} is not clearly inside the safe delegated zone.`,
    protocol: [
      "Pause before implementation.",
      "Clarify scope, reversibility, and authority.",
      "Continue only after the decision owner is clear.",
    ],
  };
}
