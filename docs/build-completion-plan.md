# Build Completion Plan

## Objective
Move the project from "schema updated" to a production-ready, repeatable build pipeline with validation gates for Brand DNA quality.

## Current Status
- Brand DNA schema and template now include operational messaging fields.
- Context bundle validation uses `BrandDNASchema` directly.
- Validator warns when `messagePillars` and `proofPoints` are missing.

## Next Best Steps

### Phase 1 — Stabilize Validation (Day 0-1)
1. Add fixture-based validation checks for valid and invalid Brand DNA payloads.
2. Add one smoke script to parse template JSON through `BrandDNASchema`.
3. Enforce strict failure in CI when schema parsing fails.

**Definition of done**
- Invalid payloads fail predictably.
- Template payload validates cleanly.

### Phase 2 — Build Guardrails (Day 1-2)
1. Add a `npm run verify` script that runs typecheck and schema smoke checks.
2. Update README with local verification steps.
3. Require `npm run verify` before merge.

**Definition of done**
- A single command verifies build + schema safety.
- Operators can run checks consistently before release.

### Phase 3 — Runtime Adoption (Day 2-4)
1. Update workflow components to consume `audienceSegments`, `messagePillars`, and `proofPoints` in prompt generation.
2. Add fallback behavior when optional arrays are empty.
3. Validate that generated assets include at least one pillar and one proof anchor.

**Definition of done**
- Generated outputs reflect brand strategy fields.
- Missing strategic fields produce warnings, not runtime failures.

### Phase 4 — Release Readiness (Day 4-5)
1. Run full build and manual CLI sanity checks.
2. Verify template fallback behavior with a missing client profile.
3. Cut release notes with migration guidance for existing client files.

**Definition of done**
- Build is reproducible.
- CLI workflows run with both template and client-specific Brand DNA.

## Execution Commands
```bash
npm run typecheck
npm run build
npm run cli:help
npm run cli:dashboard
```

## Immediate Action Checklist (Today)
- [ ] Add `verify` script in `package.json`.
- [ ] Add schema smoke test script.
- [ ] Document pre-merge verification flow in `README.md`.
