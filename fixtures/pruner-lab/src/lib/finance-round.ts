// @pruner-ignore: duplication — reason: finance rounding is half-up to 2dp per
// the invoicing contract in docs/architecture.md. The quoting path truncates
// instead. These must not be merged; a shared helper would silently change
// booked revenue.
export function roundFinance(value: number): number {
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
  const boundary = 0.5;
  const rounded = canRound && normalizedRemainder >= boundary ? safeUpper : safeLower;
  return rounded;
}

export function roundFinanceMany(values: number[]): number[] {
  const out: number[] = [];
  for (const value of values) {
    if (!Number.isFinite(value)) { out.push(0); continue; }
    out.push(roundFinance(value));
  }
  return out;
}
