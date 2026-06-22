# Founder Opportunity Engine Source Instructions

## Purpose

This folder owns Founder Opportunity Engine source modules for website analysis, runtime-only Places-derived signals, scoring, compliance guards, and CRM-ready opportunity output.

## Ownership

- `website-analyzer/` inspects website snapshots and vendor-domain indicators.
- `places-runtime/` derives runtime signals from Places-style business facts without persisting forbidden Google payloads.
- `scoring/` converts signals into opportunity scoring outcomes.
- `opportunity-output/` shapes scored candidates into CRM-ready opportunity records.
- `compliance/` guards persistence boundaries.

## Local Contracts

- Do not persist raw Google Places payloads, reviews, ratings, phone numbers, addresses, or other provider-restricted fields.
- Keep provider-derived facts runtime-only unless a compliance guard explicitly allows persistence.
- Preserve tenant/client separation when opportunity records are later connected to CRM or outreach systems.
- Do not introduce live browser, Google, CRM, or external API calls in unit-test paths.

## Work Guidance

- Keep scoring deterministic and testable.
- Treat website/vendor signals as indicators, not certainty.
- Prefer typed inputs and outputs over loose provider payloads.
- Add compliance tests when persistence boundaries change.

## Verification

- Run `npm test -- tests/intelligence-layer/founder-opportunity-engine`.
- Run `npm run typecheck`.
- Run `npm run build` for exported source changes.

## Child DOX Index

- `compliance/` - persistence guard code for forbidden provider-derived fields.
- `opportunity-output/` - CRM-ready opportunity output shaping.
- `places-runtime/` - runtime-only Places-derived signal mapping.
- `scoring/` - deterministic Founder Opportunity scoring.
- `website-analyzer/` - website snapshot and vendor-domain analysis.
