# Founder Opportunity Engine V1

Status: V1 build spec
Home: AJ-DIGITAL-OS internal intelligence subsystem
Scope: Established, call-heavy service businesses. Sunbiz and new-formation discovery are out of scope for V1.
Primary offer fit: AI Receptionist / ResponseOS. Secondary fits are CRM, automation, and website work.

## Problem

AJ Digital needs a small stream of high-quality opportunities, not a volume lead list. The target businesses are established service companies that already show symptoms of missed calls, slow follow-up, and weak website maturity. ResponseOS is the offer being sold; Founder Opportunity Engine is the upstream prospect-intelligence layer that finds and qualifies buyers.

## Desired Outcome

The engine discovers candidates from Google, stores only durable identifiers, analyzes the business website first for free leak signals, gates out solved or disqualified candidates, enriches survivors through runtime-only Google Places Details, scores Demand x Leak x Fit, and emits CRM-ready opportunities with research-ready rationale.

## Success Criteria

- Produce roughly 10 high-quality opportunities per week instead of a large generic lead list.
- Keep "Signal" as atomic input vocabulary and "Opportunity" as the scored output vocabulary.
- Run free website leak detection before any paid rich Places enrichment.
- Persist no raw Google Places content except `placeId`.
- Enforce the Google persistence boundary in code and tests.
- Keep founder scoring separate from the existing AEO keyword opportunity scorer.
- Reuse the existing `opportunity-store` path and pattern instead of creating a parallel store.

## Scope

```txt
docs/specs/founder-opportunity-engine-v1.md
src/intelligence/founder-opportunity-engine/
  website-analyzer/
  places-runtime/
  scoring/
  opportunity-output/
  compliance/
config/founder-opportunity-engine/
  vendor-domains.json
  seed-categories.json
tests/intelligence-layer/founder-opportunity-engine/
  compliance-guard.test.ts
```

## Out Of Scope

- Sunbiz or new business formation signals.
- Permits, GIS, property, Census, or broader market intelligence.
- Selling lead feeds externally.
- Productizing Google-derived lead data.
- Production deploys, external CRM writes, secret handling, or paid API execution without a separate approval gate.

## Constraints

- Use a dedicated git worktree for implementation when the main repo is dirty or ahead.
- Do not overload `src/intelligence/opportunity-scorer.ts`; create a distinct `founderOpportunityScorer`.
- Persist through `src/intelligence/opportunity-store.ts`.
- Do not modify protected Hermes, model-router, BEL/runtime, approval, MCP policy, or existing API route behavior without explicit approval.
- Do not change dependency manifests unless separately approved.

## Google Places Compliance Boundary

Persist indefinitely:

- `placeId`

Persist as AJ-derived data:

- Signals
- Scores and axis subtotals
- Timestamps such as `derivedAt`
- Rationale and fired-signal reasons
- Website-crawl-derived facts from the business's own site
- Final opportunity records

Never persist:

- Google review count
- Google rating
- Google phone
- Google category or types
- Google hours
- Google review text

`places-runtime` consumes raw Places Details inside the module and returns only the closed `DerivedSignals` type. Review mining returns boolean/paraphrased signal rationale only.

## Build Order

1. Seed categories and cities.
2. Cheap Places discovery stores `placeId` only.
3. Website analyzer derives free leak signals.
4. Gate candidates and drop solved/disqualified businesses.
5. Rich Places Details runs only for gated survivors and remains runtime-only.
6. Score with Demand x Leak x Fit through `founderOpportunityScorer`.
7. Create a research brief for scores above threshold.
8. Serialize CRM-ready opportunities through `opportunity-output`.

## Website Analyzer Requirements

- Use a headless browser for JavaScript-injected booking widgets, chat widgets, and CTAs.
- Wait for network idle plus a short fixed delay so third-party widgets can mount.
- Capture outbound script/XHR request domains and prefer vendor domain matching over DOM string matching.
- Render desktop and mobile viewports.
- Store vendor domain lists in `config/founder-opportunity-engine/vendor-domains.json`.
- Failed or blocked renders produce `UNKNOWN`, not `ABSENT`.

## Website Checks

Each check yields `PRESENT`, `ABSENT`, or `UNKNOWN`.

| Check | Signal behavior |
|---|---|
| Site reachable | gates the rest |
| SSL valid | component of `WEAK_WEBSITE` |
| Mobile responsive | component of `WEAK_WEBSITE` |
| Page performance | component of `WEAK_WEBSITE` |
| Online booking | `NO_ONLINE_BOOKING` when absent after successful render |
| Chat / instant response | `NO_CHAT` when absent after successful render |
| Contact form | feeds `FOLLOWUP_GAP` |
| Click-to-call | `NO_CLICK_TO_CALL` when absent after successful render |
| Staleness | component of `WEAK_WEBSITE` |
| Already solved | `ALREADY_SOLVED` disqualifier |
| Owner/founder identity | `OWNER_OPERATED` fit signal |

## Runtime-Only Places Signals

- `HIGH_CALL_DEMAND`
- `CALL_FIRST_CATEGORY`
- `AFTER_HOURS_GAP`
- `RESPONSIVENESS_COMPLAINTS`

The raw review count, category, hours, and review text inputs are discarded after deriving these signals.

## Scoring

Run disqualifiers first:

- Business not operational.
- Not a customer-facing service category.
- `ALREADY_SOLVED`.
- National chain or franchise.
- Review floor below roughly 10.

Demand is capped at 40:

- Review-volume tier: 10-50 = 10, 51-150 = 20, 151-500 = 30, 500+ = 25.
- `CALL_FIRST_CATEGORY` = 10.

Leak is capped at 40:

- `NO_ONLINE_BOOKING` = 10.
- `NO_CHAT` = 10.
- `AFTER_HOURS_GAP` = 10.
- `FOLLOWUP_GAP` = 5.
- `RESPONSIVENESS_COMPLAINTS` = 15.
- `NO_CLICK_TO_CALL` = 5.

Fit is capped at 20:

- `OWNER_OPERATED` = 10.
- `LOCAL_REGIONAL` = 5.
- `REACHABLE_CONTACT_INFO` = 5.

Formula:

```txt
fitFactor = 0.6 + 0.4 * (fit / 20)
opportunity = round((demand / 40) * (leak / 40) * 100 * fitFactor)
```

Thresholds:

- `< 40` = PARK.
- `40-60` = WATCH.
- `> 60` = QUALIFIED for research brief and CRM output.

## Open Decisions

- Headless infra: local Playwright versus a managed render service.
- Performance source: PageSpeed Insights API versus local Lighthouse.
- Review mining: deterministic keyword pass versus LLM classification at research time.
- Threshold calibration: first 50 manually judged businesses should tune weights before trusting automation.
