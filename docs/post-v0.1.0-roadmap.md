# Post-v0.1.0 Roadmap

## Recommended Next Priorities

- Smoke tests for core CLI commands
  Why it matters: the CLI is now the main operator surface, so basic end-to-end command checks will catch packaging and routing regressions early.

- Sample or demo run dataset
  Why it matters: realistic seed data makes onboarding, validation, and release checks much easier.

- Onboarding and setup polish
  Why it matters: internal sharing is easier when a new contributor can get from clone to working CLI without guesswork.

- Future publish targets
  Why it matters: `publish-router` is already structured for expansion, and targets like Sanity, GitHub, Notion, and n8n webhooks are natural next steps.

- CLI UX polish
  Why it matters: the command layer is usable now, but output consistency, edge-case messaging, and ergonomics will matter more as usage grows.

- Release automation later
  Why it matters: the project now has versioning, changelog, packaging, and checklist discipline, which is the base needed before automating releases.

## Suggested GitHub Issues

### Issue: Add smoke tests for core CLI commands

- Description: add a lightweight smoke-test layer that validates `help`, `dashboard`, `operator-console`, and representative inspection and queue commands against predictable local data.
- Why it matters: protects the installable CLI and command router from regressions during packaging and release work.

### Issue: Create a sample demo run dataset

- Description: add a small deterministic set of run records, event logs, and approved outputs that can be used for demos, onboarding, and release validation.
- Why it matters: makes docs, testing, and team handoff much easier.

### Issue: Expand onboarding documentation for contributors

- Description: extend onboarding with local development expectations, Git workflow notes, and how to create or inspect test runs safely.
- Why it matters: reduces setup friction for technical operators and contributors.

### Issue: Define publish-router target contracts for future destinations

- Description: formalize the next publish target contracts and identify the minimum shared result shape needed for non-local targets.
- Why it matters: keeps future Sanity, GitHub, Notion, and n8n integrations consistent with the current local-first execution model.

### Issue: Improve CLI output consistency and edge-case messaging

- Description: review command output formatting, empty-state messaging, and error handling across overview, queue, and action commands.
- Why it matters: terminal UX becomes more important as more operators rely on the CLI directly.

### Issue: Define release automation prerequisites

- Description: document the exact requirements for automating releases, including changelog discipline, package validation, and publish safeguards.
- Why it matters: prevents premature automation before the manual release flow is stable.
