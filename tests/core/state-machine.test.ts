import { describe, expect, it } from "vitest";

import { StateTransitionError } from "../../src/core/errors.js";
import { assertValidTransition, canTransition, getAllowedTransitions } from "../../src/core/state-machine.js";

describe("state-machine", () => {
  it("returns allowed transitions for a known status", () => {
    expect(getAllowedTransitions("queued")).toEqual(["context_loaded"]);
  });

  it("allows a valid transition", () => {
    expect(canTransition("validation_passed", "executed")).toBe(true);
    expect(() => assertValidTransition("validation_passed", "executed")).not.toThrow();
  });

  it("throws for an invalid transition", () => {
    expect(canTransition("queued", "approved")).toBe(false);
    expect(() => assertValidTransition("queued", "approved")).toThrow(StateTransitionError);
  });
});
