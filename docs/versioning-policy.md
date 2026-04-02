# AJ Digital OS Versioning Policy

## 1. Versioning Model

AJ Digital OS uses Semantic Versioning in a practical form:

- MAJOR: breaking changes to public behavior, packaging, or operator-facing contracts.
- MINOR: new backward-compatible capabilities such as new commands, workflows, or services.
- PATCH: fixes, small improvements, packaging corrections, and documentation updates tied to a release.

## 2. Current Maturity Guidance

AJ Digital OS is still early-stage and currently in the `0.x` phase.

That means:

- interfaces may evolve quickly
- command outputs may still tighten or normalize
- internal architecture may continue to move as the system matures
- breaking changes are still possible before `1.0.0`

Versioning still matters in `0.x`. The goal is not to imply full stability. The goal is to create change discipline and make releases understandable.

## 3. When To Bump Versions

Use these guidelines:

- New command added: MINOR.
- New workflow added: MINOR.
- New publish target added without breaking current behavior: MINOR.
- Docs-only clarification: PATCH, or no version bump if not part of a release.
- Bug fix in approval or execution flow: PATCH.
- Packaging or CLI usability fix: PATCH.
- Changing command flags, output contracts, or expected invocation patterns: MAJOR once the project treats those as stable; during early `0.x`, use the smallest version bump that still clearly signals impact.

For AJ Digital OS right now, use judgment. In early maturity, a backward-incompatible CLI change may still be published as a significant `0.x` MINOR bump if that reflects the team’s release expectations. The important part is to call it out clearly in the changelog.

## 4. Changelog Rules

Use `CHANGELOG.md` as the human-readable release history.

Rules:

- Every meaningful released change should be recorded.
- Write entries for operators and maintainers, not just for source-level contributors.
- Prefer concrete notes over vague summaries.
- Avoid entries like `misc fixes` or `updates`.
- Group changes under `Added`, `Changed`, `Fixed`, and `Removed` when useful.
- Keep `Unreleased` current between releases.

## 5. Release Hygiene

Use a simple release process:

1. Update `CHANGELOG.md`.
2. Bump `package.json` version.
3. Run validation commands such as `npm run typecheck`, `npm run build`, and core CLI checks.
4. Review `docs/publish-preparation-checklist.md`.
5. Tag or publish only after the release target is explicit.

This process is intentionally lightweight. AJ Digital OS does not need a heavy release framework yet, but it does need consistent version and history discipline.
