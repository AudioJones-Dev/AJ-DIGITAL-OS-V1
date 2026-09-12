# Expected classifications

Machine-readable ground truth lives in `EXPECTED.json`.

| ID | Seed | Expected classification | Required detail |
|---|---|---|---|
| `D1` | `prompts/**` duplication | `excluded` | exact first tuple member |
| `D2` | `docs/**` duplication | `excluded` | exact second tuple member |
| `D3` | `src/auth/**` dead export | `needs-decision` | `public_api_touched: true` |
| `D4` | unused executable under `skills/**` | `excluded` | AJ Digital OS protected default |
| `D5` | dead hook under `.dmaic/**` | `excluded` | top-level dot-directory rule |
| `D6` | generated duplication under `graphify-out/**` | `excluded` | generated/protected default |
| `D7` | code-like `.augment/**` content | `excluded` | unenumerated dot-directory rule |
| `D8` | mixed code plus protected location | `excluded` | conservative whole-finding rule |
| `C1` | genuine code duplication | `needs-decision` | duplication never actionable |
| `C2` | reasoned divergent duplication | `intentional` | reason names invariant |
| `C3` | orphan file | `actionable` | recommendation `Delete Candidate` only |
| `C4` | unused dependency seed | `actionable` | recommendation `Delete Candidate` only |
| `C5` | dynamic-import target | `probable-false-positive` | dynamic-use downgrade |
| `C6` | circular import | `needs-decision` | both graph locations retained |
| `C7` | exactly 900-line component | `needs-decision` | recommendation `Needs Refactor` |
| `C8` | invalid ignore annotation | `needs-decision` | kind `invalid-annotation` |

The fixture checker must never turn a skipped mutation check into a pass or
state that a P0/P1 artifact is safe for a real repository.
