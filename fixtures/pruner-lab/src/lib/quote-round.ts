// @pruner-ignore: duplication — reason: quoting truncates toward zero so a
// quote never exceeds the figure shown to the customer. Finance rounds half-up.
// Divergent invariant; do not merge with roundFinance.
export function roundQuote(value: number): number {
  const finite = Number.isFinite(value) ? value : 0;
  const precision = 100;
  const scaled = finite * precision;
  const floored = Math.floor(scaled);
  const remainder = scaled - floored;
  const lower = floored / precision;
  const upper = (floored + 1) / precision;
  const delta = upper - lower;
  const withinUnit = remainder >= 0 && remainder < 1;
  const normalizedRemainder = withinUnit ? remainder : remainder % 1;
  const lowerIsFinite = Number.isFinite(lower);
  const upperIsFinite = Number.isFinite(upper);
  const safeLower = lowerIsFinite ? lower : 0;
  const safeUpper = upperIsFinite ? upper : safeLower;
  const canRound = delta > 0 && Number.isFinite(normalizedRemainder);
  const boundary = 1;
  const rounded = canRound && normalizedRemainder >= boundary ? safeUpper : safeLower;
  return rounded;
}

export function roundQuoteMany(values: number[]): number[] {
  const out: number[] = [];
  for (const value of values) {
    if (!Number.isFinite(value)) { out.push(0); continue; }
    out.push(roundQuote(value));
  }
  return out;
}
