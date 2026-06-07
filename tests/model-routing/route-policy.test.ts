import { describe, expect, it } from "vitest";

import {
  getEscalationTarget,
  isPaidApiRouteAllowed,
  resolveRoute,
} from "../../src/model-routing/route-policy.js";

describe("auth/model-cost route policy", () => {
  it("defaults interactive reasoning tasks away from paid API providers", () => {
    expect(resolveRoute("planner").provider).toBe("local");
    expect(resolveRoute("retrieval_augmented_answer").provider).toBe("local");
    expect(resolveRoute("structured_output").provider).toBe("local");
  });

  it("blocks explicit paid API provider preference without backend billing approval", () => {
    const route = resolveRoute("planner", { executionMode: "interactive" }, "openai");

    expect(route.blocked).toBe(true);
    expect(route.provider).toBe("openai");
    expect(route.blockedReason).toContain("apiBillingAllowed=true");
  });

  it("allows paid API provider preference for approved non-interactive automation", () => {
    const route = resolveRoute(
      "planner",
      {
        executionMode: "background_job",
        apiBillingAllowed: true,
        apiBillingReason: "nightly digest generation",
      },
      "openai",
    );

    expect(route.blocked).toBe(false);
    expect(route.provider).toBe("openai");
  });

  it("does not escalate local work to paid APIs unless the billing policy allows it", () => {
    expect(getEscalationTarget("local", { executionMode: "interactive" })).toBeNull();
    expect(getEscalationTarget("local", {
      executionMode: "production_workflow",
      apiBillingAllowed: true,
      apiBillingReason: "server-side report generation",
    })).toBe("openai");
  });

  it("requires both a non-interactive mode and explicit API billing allowance", () => {
    expect(isPaidApiRouteAllowed({ apiBillingAllowed: true })).toBe(false);
    expect(isPaidApiRouteAllowed({ executionMode: "interactive", apiBillingAllowed: true })).toBe(false);
    expect(isPaidApiRouteAllowed({
      executionMode: "client_facing_automation",
      apiBillingAllowed: true,
    })).toBe(true);
  });
});

