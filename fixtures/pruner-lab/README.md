# pruner-lab — P0 fixture

This is the P0 seed contract for `repo-pruner`, bound to AJ Digital OS Git Spec
SHA-256 `F8F54810E561B09C3251FEFB77A62D679D93B633090969D18D7100A88D4BF09B`.

It contains no detector packages and does not authorize a real-repository run.
P0 proves only that the seeded evidence and acceptance oracle express the
ratified classifications. Detector wiring and classification execution occur
in later, separately approved phases.

## Safe validation

No installation is required:

```powershell
node scripts/smoke-test.mjs
node scripts/check-expected.mjs --golden-only --findings reference/golden-findings.jsonl
```

`--golden-only` validates the expected manifest and T3 contract. It never
claims the classifier is safe for a live repository. A future acceptance run
must first capture `.pruner/before-snapshot.json` and then invoke the checker
without `--golden-only`; missing snapshot evidence fails closed.

## Critical T3 admission gate

The first three outcomes must be exactly:

```text
prompts duplication, docs duplication, src/auth dead export
= excluded, excluded, needs-decision
```

The five additional protected-path decoys must all be `excluded`:

1. `skills/obsolete-exporter.mjs`
2. `.dmaic/dead-hook.mjs`
3. `graphify-out/cache-a.ts` plus `cache-b.ts`
4. `.augment/code-like.ts`
5. Mixed duplication spanning `src/lib/mixed-copy.ts` and
   `config/mixed-copy.ts`

No runner may be used on AJ Digital OS, ResponseOS, or another non-fixture
repository until the implemented classifier produces these results and the
complete acceptance suite passes.

## Other seeded cases

- Genuine duplication → `needs-decision`.
- Reasoned divergent duplication → `intentional`.
- Orphaned file and unused dependency → `actionable` recommendations only.
- Dynamic-import target → `probable-false-positive`.
- Circular import → `needs-decision`.
- Exactly 900-line component → `needs-decision`.
- Ignore annotation without `reason:` → `invalid-annotation` finding.
- Full-graph cycle context retains both changed and unchanged locations.
- Registry protection uses optional `protected` and `protection_reason` fields.

`EXPECTED.json` is the machine-readable seed contract. `EXPECTED.md` is its
human-readable index. `reference/golden-findings.jsonl` is fixture data, not a
claim that detector/classifier implementation exists.
