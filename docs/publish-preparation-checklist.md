# AJ Digital OS - Publish Preparation Checklist

## 1. Release Goal

Before publishing anything, decide the actual release target:

- internal only
- private team distribution
- public GitHub repository
- npm package later

This checklist should be applied relative to that target. Internal CLI use has a lower bar than a public npm package. Public release requires stronger polish, clearer support boundaries, and more confidence in package hygiene and documentation.

## 2. Technical Readiness Checklist

- [ ] `npm run typecheck` passes cleanly.
- [ ] `npm run build` produces the expected compiled output in `dist/`.
- [ ] `dist/cli.js` exists and is the actual compiled CLI entrypoint.
- [ ] The compiled CLI entry is executable-ready and starts with a valid Node shebang.
- [ ] Core command paths execute without crashing on expected inputs.
- [ ] Unknown-command behavior is clean and operator-friendly.
- [ ] Required local file paths are deterministic and do not depend on machine-specific hardcoding.
- [ ] JSON mode works for core overview, inspection, queue, and action commands.
- [ ] Approval and execution lifecycle works end-to-end on test runs.
- [ ] Observability files are written and read correctly for runs, summaries, and dashboards.
- [ ] Recovery paths are documented and aligned to actual lifecycle behavior.
- [ ] No architectural assumptions in docs or scripts depend on unimplemented features.

## 3. CLI Readiness Checklist

- [ ] `aj-digital-os help` works after local linking.
- [ ] `dashboard` works from both direct CLI and npm script usage.
- [ ] `operator-console` works and renders a readable operator view.
- [ ] Inspection commands (`run-summary`, `run-events`, `track-run`) work as documented.
- [ ] Queue commands (`list-pending-approvals`, `list-approved-runs`, `list-failed-runs`, `list-executed-runs`) work as documented.
- [ ] Action commands (`approve-run`, `execute-run`, `resume-run`) work as documented.
- [ ] Human-readable output is readable in normal terminal usage.
- [ ] JSON mode is stable and machine-readable.
- [ ] Command naming is consistent across scripts, docs, and CLI routing.
- [ ] Error messages are operator-friendly and do not expose noisy stack traces during normal failure modes.

## 4. Documentation Readiness Checklist

- [ ] `README.md` includes build, install, and CLI usage instructions.
- [ ] `docs/operator-playbook.md` exists and reflects current operator workflows.
- [ ] `docs/recovery-playbook.md` exists and reflects actual recovery paths.
- [ ] `docs/system-architecture.md` exists and matches the implemented system.
- [ ] Docs reflect actual implemented behavior, not planned behavior.
- [ ] Docs do not claim unsupported features.
- [ ] Examples are current and match the real command surface.
- [ ] Release target assumptions are clear in the docs.

## 5. Package Hygiene Checklist

- [ ] `package.json` name and version are intentional.
- [ ] `bin` path points to the correct compiled CLI file.
- [ ] `files` list is clean and only includes what should ship.
- [ ] No secrets are committed to the repository.
- [ ] `.env` is ignored and not included in publish output.
- [ ] Build artifacts in `dist/` are correct and minimal.
- [ ] Package contents are validated before release.
- [ ] License decision is made and documented.
- [ ] Repository metadata is accurate for the intended release target.
- [ ] npm publish target decision is explicit: do not publish accidentally.

## 6. Operational Readiness Checklist

- [ ] Local operator flow has been tested from overview to execution.
- [ ] Approval flow has been tested with real or representative runs.
- [ ] Execution flow has been tested with approved runs.
- [ ] Failed-run recovery flow has been tested with realistic failure conditions.
- [ ] Run summaries, event streams, and dashboard views have been exercised on real data.
- [ ] Terminal UX is acceptable for the intended users.
- [ ] Logs and written artifacts are understandable without source-code reading.
- [ ] Manual recovery steps are documented well enough for another operator to follow.
- [ ] Team sharing includes basic expectations for setup, linking, and test data.

## 7. Pre-Publish Validation Commands

Run this sequence before any release or team handoff:

```bash
npm install
npm run typecheck
npm run build
npm run cli:help
npm run cli:dashboard
npm run cli:console
npm run cli -- run-summary --runId <test-run-id>
npm run cli -- run-events --runId <test-run-id>
npm run cli -- approve-run --runId <test-run-id> --decision approve --actor Audio
npm run cli -- execute-run --runId <test-run-id>
```

Also inspect the package payload before release:

```bash
npm pack --dry-run
```

Use `npm pack --dry-run` to verify what would actually ship, including whether `dist/`, `README.md`, and any unexpected files are included.

If local CLI packaging matters, also verify the link flow:

```bash
npm run link:local
aj-digital-os help
aj-digital-os dashboard
```

## 8. Release Decision Matrix

| Release Target | Ready? | Gaps to Close |
| --- | --- | --- |
| Internal CLI use | Yes | Minimal; continue validating real operator flow. |
| Private team sharing | Mostly | Setup docs, sample test data, and onboarding expectations should be tightened. |
| Public GitHub repo | Partial | More polish, clearer public-facing assumptions, stronger package hygiene, and CLI smoke tests are needed. |
| Public npm package | Not yet / conditional | Versioning discipline, changelog process, support posture, package review, and publish safeguards should be added first. |

This matrix is intentionally conservative. The project is usable now, but broader distribution increases the bar for documentation, support, and packaging discipline.

## 9. Post-Publish Follow-Ups

- [ ] Add changelog and versioning discipline.
- [ ] Add a small sample or demo dataset for onboarding.
- [ ] Add smoke tests for core CLI commands.
- [ ] Add a short onboarding guide for new operators or contributors.
- [ ] Add publish automation later only after the manual release flow is stable.
- [ ] Decide the support model for private vs public users.
- [ ] Add issue templates if the project is opened publicly.
- [ ] Add a lightweight release notes template.
