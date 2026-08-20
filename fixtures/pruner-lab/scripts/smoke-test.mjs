// Minimal behavior-health signal for the fixture.
// A future runner records this outcome as evidence; only a dirty source
// baseline is a pre-detector hard stop.
// 1.125 is exactly representable in binary floating point, so 1.125 * 100 is
// exactly 112.5 — the half-way case is real, not a float artifact.
import assert from "node:assert/strict";

const finance = (v) => { const s = v * 100, f = Math.floor(s); return ((s - f) >= 0.5 ? f + 1 : f) / 100; };
const quote   = (v) => { const s = v * 100, f = Math.floor(s); return ((s - f) >= 1   ? f + 1 : f) / 100; };

assert.equal(finance(1.125), 1.13, "finance rounds half-up");
assert.equal(quote(1.125),   1.12, "quote truncates toward zero");
assert.notEqual(finance(1.125), quote(1.125), "rounding invariants must diverge");

console.log("smoke-test: 3 passed, 0 failed");
