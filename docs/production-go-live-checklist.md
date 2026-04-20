# AJ Digital OS Production Go-Live Checklist

This checklist is an execution-ready go-live gate intended to move AJ Digital OS from "usable" to "production deployable" with clear ownership, evidence, and pass/fail criteria.

## 1) Release Target + Change Freeze

| Item | Owner | Evidence Required | Pass/Fail Rule | Status |
| --- | --- | --- | --- | --- |
| Release target is explicit (`internal`, `private team`, `public repo`, `public npm`) | Product/Tech Lead | Dated decision note in release ticket | **PASS** when exactly one target is selected and documented | [ ] |
| Version for release is selected and changelog draft is prepared | Maintainer | PR including `package.json` + `CHANGELOG.md` updates | **PASS** when version + changelog are both present and aligned | [ ] |
| Freeze window is set for release-critical changes only | Tech Lead | Release window and freeze policy in ticket | **PASS** when freeze start/end timestamps are documented | [ ] |

## 2) Build + CLI Smoke Gate (CI Required)

Run these in CI and attach raw logs.

| Command / Check | Owner | Evidence Required | Pass/Fail Rule | Status |
| --- | --- | --- | --- | --- |
| `npm ci` | DevOps / CI | CI job log | **PASS** on exit code 0 | [ ] |
| `npm run typecheck` | DevOps / CI | CI job log | **PASS** on exit code 0 | [ ] |
| `npm run build` | DevOps / CI | CI job log + generated `dist/` artifact | **PASS** on exit code 0 and artifact exists | [ ] |
| `npm run cli:help` | DevOps / CI | CLI output artifact | **PASS** if command succeeds and prints command categories | [ ] |
| `npm run cli:dashboard` | DevOps / CI | CLI output artifact | **PASS** on exit code 0 with readable summary output | [ ] |
| `npm run cli:console` | DevOps / CI | CLI output artifact | **PASS** on exit code 0 | [ ] |
| Inspection smoke (`run-summary`, `run-events`, `track-run`) against sample run | QA / Maintainer | Captured output from deterministic test run id | **PASS** when all commands succeed and output parses as expected | [ ] |
| Queue smoke (`list-pending-approvals`, `list-approved-runs`, `list-failed-runs`, `list-executed-runs`) | QA / Maintainer | Captured outputs | **PASS** when each command succeeds without crash | [ ] |
| Action smoke (`approve-run`, `execute-run`, `resume-run`) in safe test environment | QA / Maintainer | Run-event evidence before/after actions | **PASS** when state transitions match policy | [ ] |
| JSON mode smoke (`--json`) for core overview/inspection/queue commands | QA / Maintainer | JSON outputs + parse check in CI | **PASS** when outputs are valid JSON and schema-stable for automation | [ ] |

## 3) Artifact + Packaging Gate

| Item | Owner | Evidence Required | Pass/Fail Rule | Status |
| --- | --- | --- | --- | --- |
| `dist/cli.js` exists and is executable-ready with Node shebang | Maintainer | Artifact inspection in CI | **PASS** when entrypoint exists and shebang is valid | [ ] |
| `npm pack --dry-run` reviewed | Maintainer | Saved dry-run output in release ticket | **PASS** when shipped file list is intentional (`dist`, `README`, etc.) | [ ] |
| No secrets in repo or package payload | Security / Maintainer | Secret scan report + manual confirmation | **PASS** with zero active findings | [ ] |
| Publish posture is correct (`private` vs publishable) | Product/Tech Lead | `package.json` review note | **PASS** when setting matches selected release target | [ ] |

## 4) Operations + Observability Gate

| Item | Owner | Evidence Required | Pass/Fail Rule | Status |
| --- | --- | --- | --- | --- |
| Prometheus, Alertmanager, Grafana health checks pass | Platform/Ops | Endpoint health output and screenshots/log snippets | **PASS** when all endpoints return healthy state | [ ] |
| Alert delivery path validated (Prometheus -> Alertmanager -> n8n webhook) | Platform/Ops | Test alert run + received webhook evidence | **PASS** when synthetic alert reaches workflow end-to-end | [ ] |
| Grafana contact points + notification policies configured | Platform/Ops | Grafana config export/screenshots | **PASS** when at least one production notification destination is active | [ ] |
| Dashboards validated for operator use (`AJ Core Health`, `AJ Infra Resources`) | Platform/Ops | Dashboard review checklist | **PASS** when critical panels are green and meaningful | [ ] |
| Nightly backup task verified + restore drill completed | Platform/Ops | Backup logs + restore test notes | **PASS** when restore succeeds for representative data | [ ] |

## 5) Run Lifecycle + Recovery Gate

| Item | Owner | Evidence Required | Pass/Fail Rule | Status |
| --- | --- | --- | --- | --- |
| Approval lifecycle tested (`approve`, `reject`, `request_revision`) | QA / Ops | Run logs and event history | **PASS** when each decision path behaves as documented | [ ] |
| Execution lifecycle tested for approved runs | QA / Ops | Execution logs + run summary evidence | **PASS** when approved runs execute/publish as expected | [ ] |
| Failed-run recovery workflow validated | QA / Ops | Failure simulation + resume decision evidence | **PASS** when recovery paths are safe and reproducible | [ ] |
| Operator can complete daily workflow from playbook without source-code reading | Ops Lead | Dry-run signoff by non-author operator | **PASS** when operator completes flow unassisted | [ ] |

## 6) Security + Access Gate

| Item | Owner | Evidence Required | Pass/Fail Rule | Status |
| --- | --- | --- | --- | --- |
| `.env` handling and secrets rotation process verified | Platform/Ops | Rotation runbook check + test rotation record | **PASS** when credentials can be rotated without breaking stack | [ ] |
| Least-privilege access reviewed for production operators | Security / Ops | Access matrix | **PASS** when only required roles have execution privileges | [ ] |
| Audit trail retained for approvals/executions | Maintainer / Ops | Sample run records and event logs | **PASS** when run history can reconstruct who approved/executed and when | [ ] |

## 7) Documentation + On-Call Readiness Gate

| Item | Owner | Evidence Required | Pass/Fail Rule | Status |
| --- | --- | --- | --- | --- |
| `README`, operator playbook, recovery playbook, architecture docs aligned with shipped behavior | Maintainer | Doc review checklist with approver signoff | **PASS** when no docs claim unsupported behavior | [ ] |
| On-call escalation path defined | Ops Lead | Escalation policy in runbook/release ticket | **PASS** when owner and response windows are documented | [ ] |
| Release notes prepared with operator-facing impact summary | Maintainer | Release notes draft | **PASS** when user-facing changes and risks are explicit | [ ] |

## 8) Final Go/No-Go Meeting Template

- **Meeting owner:** Tech Lead
- **Required attendees:** Product, Maintainer, Ops, QA
- **Inputs:** Completed checklist, CI logs, ops evidence, rollback plan

### Decision Record

- Release ID / Version:
- Date/Time (UTC):
- Release target:
- Decision: `GO` / `NO-GO`
- Blocking issues (if NO-GO):
- Approved by:

## 9) Rollback Criteria (Must Be Agreed Before GO)

Rollback immediately if any of these occur after deployment:

1. Core CLI command crash on operator-critical paths (`dashboard`, `operator-console`, approval/execution actions).
2. Approval/execution lifecycle mismatch (unsafe or blocked transitions).
3. Observability outage (cannot verify health/alerts/events).
4. Data loss risk detected in run records or published artifacts.
5. Unrecoverable failure without documented runbook path.

## 10) Suggested First Automation Increment

Implement a single required CI workflow named `release-readiness` that blocks merge/deploy unless:

- typecheck and build pass,
- CLI smoke suite passes,
- JSON mode parse checks pass,
- `npm pack --dry-run` output is attached as an artifact.

This provides a practical production gate now, while preserving flexibility for future release automation.
