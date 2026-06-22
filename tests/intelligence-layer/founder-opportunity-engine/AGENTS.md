# Founder Opportunity Engine Test Instructions

## Purpose

This folder owns tests for Founder Opportunity Engine compliance, scoring, website analysis, and persistence boundaries.

## Ownership

- Tests must verify deterministic scoring behavior and compliance guardrails.
- Fixtures must avoid real client data, real Google Places payloads, real customer contact details, and live external calls.

## Local Contracts

- Do not weaken persistence-boundary tests to make implementation easier.
- Use synthetic business names, domains, and identifiers.
- Keep live API, browser, and network behavior out of this test folder.

## Work Guidance

- Add regression tests for every new signal or disqualifier.
- Include negative tests for forbidden persisted fields.
- Prefer focused unit tests over broad workflow fixtures.

## Verification

- Run `npm test -- tests/intelligence-layer/founder-opportunity-engine`.
- Run full `npm test` before handoff when the scoring or persistence model changes.

## Child DOX Index

This folder has no child instruction files.
