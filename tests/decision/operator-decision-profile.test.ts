import { describe, expect, it } from "vitest";

import {
  AUDIO_JONES_DECISION_PROFILE,
  evaluateOperatorDecisionHook,
} from "../../src/decision/operator-decision-profile.js";

describe("operator decision profile", () => {
  it("requires full reasoning and starts from problem-first ideation", () => {
    expect(AUDIO_JONES_DECISION_PROFILE.defaults.reasoningMode).toBe("full_reasoning");
    expect(AUDIO_JONES_DECISION_PROFILE.defaults.ideationMode).toBe("problem_first");
    expect(AUDIO_JONES_DECISION_PROFILE.summary).toContain("Problem-driven");
  });

  it("allows reversible internal work as do-and-log", () => {
    const result = evaluateOperatorDecisionHook({
      action: "scaffold a focused docs spec",
      reversible: true,
      internalOnly: true,
    });

    expect(result.authority).toBe("do_and_log");
    expect(result.requiresDecisionLog).toBe(true);
    expect(result.requiresFullReasoning).toBe(true);
  });

  it("delegates execution-layer calls to the agent", () => {
    const result = evaluateOperatorDecisionHook({
      action: "choose the TypeScript module boundary",
      executionLayer: true,
      reversible: true,
      internalOnly: true,
    });

    expect(result.authority).toBe("make_the_call");
    expect(result.protocol).toContain("Choose the recommended implementation path.");
  });

  it("keeps brand voice and doctrine with the operator", () => {
    const result = evaluateOperatorDecisionHook({
      action: "rewrite homepage brand doctrine",
      touchesBrandVoice: true,
      touchesDoctrine: true,
      publicFacing: true,
    });

    expect(result.authority).toBe("keep_the_pen");
    expect(result.reason).toContain("operator-owned voice");
  });

  it("requires approval for global hook or agent config work", () => {
    const result = evaluateOperatorDecisionHook({
      action: "enable global SessionStart hook enforcement",
      globalHookOrAgentConfig: true,
    });

    expect(result.authority).toBe("requires_approval");
    expect(result.protocol[0]).toBe("Stop before acting.");
  });
});
