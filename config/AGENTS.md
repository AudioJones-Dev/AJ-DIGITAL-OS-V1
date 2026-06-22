# config Agent Instructions

## Purpose

This folder owns static, non-secret configuration used by AJ Digital OS modules.

## Ownership

- Keep configuration deterministic, reviewable, and safe to commit.
- Store only non-secret defaults, seed lists, allowlists, and classification data.
- Do not place API keys, credentials, tokens, customer data, or local environment values here.

## Local Contracts

- Root safety policy applies to all config changes.
- Config files must be valid for their declared format.
- Runtime state, generated exports, and secret-bearing local files do not belong in this tree.

## Work Guidance

- Prefer explicit JSON objects with stable keys over ambiguous arrays when future extension is likely.
- Keep vendor/domain lists scoped to the module that consumes them.
- Document new durable config domains in this file's Child DOX Index.

## Verification

- For JSON config, run a parse check or the module tests that load the config.
- For source-backed config behavior, run the related targeted tests plus repo typecheck/build when practical.

## Child DOX Index

- `founder-opportunity-engine/` - seed categories and vendor-domain lists for Founder Opportunity Engine scoring and website analysis.
