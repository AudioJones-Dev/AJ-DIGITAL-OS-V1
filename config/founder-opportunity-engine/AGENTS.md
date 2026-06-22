# Founder Opportunity Engine Config Instructions

## Purpose

This folder owns non-secret seed configuration for Founder Opportunity Engine.

## Ownership

- `seed-categories.json` defines local markets and service categories used for opportunity discovery assumptions.
- `vendor-domains.json` defines vendor-domain indicators used by website analysis.

## Local Contracts

- Do not store Google Places payloads, scraped website data, phone numbers, emails, credentials, or client data here.
- Domain lists are detection hints, not proof of vendor usage.
- Category changes must preserve deterministic tests.

## Work Guidance

- Keep categories normalized as stable lowercase identifiers where possible.
- Add domains only when they represent a vendor signal consumed by code or tests.
- Avoid broad generic domains that would over-classify ordinary websites.

## Verification

- Run `npm test -- tests/intelligence-layer/founder-opportunity-engine`.
- Run `npm run typecheck` when TypeScript code reads new fields.

## Child DOX Index

This folder has no child instruction files.
