# AJ Digital OS Go-Live Plan (Internal + External)

## Purpose

This plan converts the existing publish/readiness docs into an executable sequence to reach:

1. **Live Internal Production** (team-operated, private environment)
2. **Live External Production** (public repo and/or public npm package)

---

## Phase 0 - Freeze Scope And Target (Day 0)

Before doing release work, explicitly choose the immediate target for this cycle:

- `internal-production`
- `external-github`
- `external-npm`

### Exit Criteria

- Release target selected and written in release notes draft.
- Owner assigned for release sign-off.
- Rollback owner assigned.

---

## Phase 1 - Internal Production Hardening (Day 1-2)

## 1.1 Baseline Validation

Run and capture outputs:

```bash
npm install
npm run typecheck
npm run build
npm run cli:help
npm run cli:dashboard
npm run cli:console
npm pack --dry-run
```

### Exit Criteria

- All commands pass.
- `npm pack --dry-run` payload contains only intended artifacts (`dist/`, `README.md`).

## 1.2 CLI Smoke Coverage (Minimum)

Add and run smoke checks for:

- `help`
- `dashboard`
- `operator-console`
- one representative inspection command
- one representative queue command
- one representative action command

### Exit Criteria

- Smoke command suite exists and runs in CI/local.
- Failures produce actionable error messages.

## 1.3 Representative Run Data

Create deterministic sample run data set for:

- pending approval
- approved awaiting execution
- executed successful
- failed run requiring recovery

### Exit Criteria

- New operator can run dashboard/queue/inspection commands and see non-empty realistic outputs.
- Documentation references how to seed/reset sample data.

## 1.4 Observability And Incident Path

Validate:

- dashboards load
- alerts route end-to-end (Prometheus -> Alertmanager -> n8n)
- incident fast-path commands work with current environment

### Exit Criteria

- Alert destination configured and tested (email/Slack/webhook).
- Incident runbook steps verified by someone other than author.

## 1.5 Internal Go-Live Gate

Internal production is approved when:

- technical checklist complete
- CLI checklist complete
- operations checklist complete
- known limitations either closed or accepted with explicit owner/date

---

## Phase 2 - External Production Hardening (Day 3-5)

## 2.1 Public-Facing Hygiene

- finalize license decision
- verify repository metadata and support policy
- add issue templates and PR template
- ensure no private/internal assumptions in docs

### Exit Criteria

- Public docs are clear about support boundaries and environment expectations.

## 2.2 Versioning + Changelog Discipline

- fill `Unreleased` in `CHANGELOG.md`
- bump version intentionally
- prepare release notes from changelog entries

### Exit Criteria

- Changelog is operator-meaningful and complete.
- Version bump matches release impact.

## 2.3 Packaging + Install Verification

Verify:

```bash
npm run build
npm run link:local
aj-digital-os help
aj-digital-os dashboard
npm pack --dry-run
```

For npm-targeted release candidate:

- test install from tarball in clean temp directory
- validate binary invocation and minimal workflow

### Exit Criteria

- Install, invocation, and CLI behavior are reproducible from a clean environment.

## 2.4 External Go-Live Gate

External production is approved when:

- all internal gates pass
- smoke checks automated
- sample data/onboarding available
- package hygiene reviewed by second reviewer
- rollback and support workflow documented

---

## Phase 3 - Launch And Stabilize (Day 6+)

## 3.1 Launch Checklist

- tag release
- publish target (GitHub and/or npm)
- post release notes
- notify stakeholders

## 3.2 72-Hour Stabilization Window

Track:

- install failures
- CLI regression reports
- incident frequency
- recovery playbook usability

### Exit Criteria

- No Sev-1 unresolved issues.
- Any Sev-2 issues have owner and ETA.

---

## Priority Backlog (Most Impactful Next Steps)

1. **Add CLI smoke suite** (highest risk reducer)
2. **Create deterministic sample dataset**
3. **Close observability alert-routing limitation**
4. **Run pack/install verification from clean environment**
5. **Finalize external support posture (license/issues/templates)**

---

## RACI (Recommended)

- **Release Lead**: final go/no-go decision
- **Operator Lead**: runbook and incident validation
- **CLI Owner**: smoke coverage and command contract stability
- **Packaging Owner**: `npm pack` payload and install path validation
- **QA/Reviewer**: independent verification + rollback rehearsal

---

## Suggested Cadence

- Daily 15-minute go-live standup until external launch.
- End-of-day gate update against this plan.
- No scope expansion after Phase 1 begins (only critical fixes).
