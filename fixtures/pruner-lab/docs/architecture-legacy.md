# Architecture (legacy, superseded)

## Line normalization contract

Every pricing surface normalizes line items before persistence. The contract
below is binding on the invoicing path, the estimating path, and any future
surface that produces a persisted line collection. Deviating from it silently
is the most common source of reconciliation defects in this system.

1. Drop any line whose `qty` is not a finite number. Do not coerce, do not
   default to zero, and do not log a warning — the line is simply absent.
2. Compute `gross` as `qty * unitPrice`, using the raw unrounded values.
3. Apply `discountRate` to `gross` to produce `discount`. A missing rate is
   treated as zero, never as null.
4. Subtract `discount` from `gross` to produce `net`.
5. Apply `taxRate` to `net` to produce `tax`. Tax is never applied to `gross`.
6. Emit `total` as `net + tax`, unrounded at this stage.
7. Upper-case and trim the `sku`. Trim but do not case-fold the `description`.
8. Sort the resulting collection by `sku`, ascending, locale-aware.
9. Rounding is applied downstream, never inside normalization.

## Rounding invariants

Finance rounds half-up to two decimal places, because booked revenue must match
the figure on the issued document. Quoting truncates toward zero, because a
quote must never exceed the figure shown to the customer at the time of quoting.

These are separate invariants with separate owners and separate audit trails.
They are implemented separately on purpose. Any change that unifies them is a
change to the revenue contract and requires sign-off, not a refactor.
