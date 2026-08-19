---
title: AJ Digital OS P0 Authority Stabilization Spec
document_type: task-spec
status: proposed
version: 1.0
owner: Audio / Tyrone Alexander Nelms
repository: AudioJones-Dev/AJ-DIGITAL-OS-V1
local_worktree: C:\dev\worktrees\aj-digital-os-p0-authority-stabilization
branch: codex/p0-authority-stabilization-spec
base_sha: fb4380dff540ed1fef62eeaf2cc1f061087b19c6
created: 2026-08-19
implementation_authority: none
---

# AJ Digital OS P0 Authority Stabilization Spec

## 1. Purpose

Establish a verified, enforceable path from repository policy to GitHub `main`, deployment operations, credential readiness, and local work ownership before any broad repository cleanup begins.

This document is a planning and approval artifact. It does not authorize implementation, GitHub administration, credential work, deployment changes, cleanup, commit, push, pull request creation, merge, or release.

## 2. Problem

The Phase 1 repository assessment dated 2026-08-11 found five P0 authority risks. Current evidence on 2026-08-19 shows that some findings have changed:

- GitHub `main` is now at `fb4380dff540ed1fef62eeaf2cc1f061087b19c6`.
- CI, Release Readiness, and the production Security Audit are green at that exact SHA.
- PR #114 remediated the production Axios audit finding and was merged.
- PR #115 already owns the intermittent Linux test teardown failure and is green, but remains unmerged.
- GitHub `main` still has no branch protection and no repository ruleset.
- The Deploy workflow references a `production` GitHub environment, but the environment API returns 404.
- Startup and deployment surfaces still select different Compose files.
- Credential rotation is still documented as an incomplete operator action; completion was not verified.
- The root working copy remains dirty and behind current `origin/main`, with active work that must not be treated as cleanup debris.

The immediate problem is therefore no longer “make current main green.” It is to close the remaining authority gaps without duplicating active fixes or mixing cleanup with governance work.

## 3. Desired Outcome

AJ Digital OS has a traceable, technically enforced, and operator-approved authority chain:

```text
human approval
  -> protected GitHub main
  -> required exact-SHA checks
  -> one ratified deployment entry point
  -> protected production environment
  -> verified credential-rotation evidence
  -> explicit local branch/worktree ownership
```

Broad cleanup remains blocked until this authority chain is established or the owner explicitly accepts each unresolved risk.

## 4. Evidence Snapshot

### 4.1 Facts

| Domain | Verified state on 2026-08-19 | Evidence method |
|---|---|---|
| Spec base | `origin/main` at `fb4380dff540ed1fef62eeaf2cc1f061087b19c6` | Local Git ref plus read-only GitHub API |
| Current-main checks | CI, Release Readiness, and Security Audit succeeded | Read-only GitHub Actions query |
| Axios production audit | Remediated by merged PR #114 | PR metadata and current-main Security Audit |
| Test teardown flake | Owned by open PR #115; all checks green | PR metadata and check rollup |
| Main protection | Branch protection endpoint returns 404 | Read-only GitHub API |
| Repository rulesets | Empty list | Read-only GitHub API |
| Production environment | Environment endpoint returns 404 | Read-only GitHub API |
| Deploy workflow | Manual dispatch, self-hosted Windows runner, references `production` environment | `.github/workflows/deploy.yml` |
| Deployment script | Defaults to `docker-compose.unified.yml` | `scripts/deploy.ps1` |
| Local boot scripts | Use default `docker compose` resolution and therefore `docker-compose.yml` | `scripts/boot-core.ps1`, `scripts/boot-full.ps1`, `scripts/check-stack.ps1` |
| Credential readiness | Handoff says Supabase, Stripe, and webhook secrets require rotation before go-live | `docs/DEPLOYMENT-HANDOFF.md` |
| Root command center | Local `main` at `2a22f32`, behind and dirty with staged/untracked initiatives | `git status`, `git rev-list`, worktree inventory |

### 4.2 Inferences

- The production dependency blocker is closed at the assessed SHA, but future checks must remain exact-SHA based.
- PR #115 should be reviewed as the existing teardown solution; creating a competing fix would create avoidable overlap.
- The Deploy workflow's environment gate is not currently effective because the referenced environment does not exist through the API response available to this assessment.
- Written approval policy is not technically enforced at `main` without a ruleset or branch protection.
- Deployment authority is ambiguous because human runbooks and scripts select different Compose definitions.

### 4.3 Assumptions requiring confirmation

- The GitHub account used for implementation will have repository administration permission.
- `docker-compose.unified.yml` is the intended production candidate, but it is not ratified by this spec.
- The owner can verify credential rotation without sharing secret values with an agent.
- Existing dirty root work belongs to active initiatives and should be preserved unless its owner explicitly disposes of it.

### 4.4 Unknowns

- Whether any external deployment platform currently launches a different Compose file or command.
- Whether a self-hosted production runner is registered, online, and appropriately isolated.
- Whether credential rotation has occurred outside the repository.
- Whether PR #115's non-fatal cleanup warning tradeoff is acceptable to the owner.
- Which status checks should be required by name after workflow deduplication or renaming.

## 5. Success Criteria

The P0 authority-stabilization initiative is complete only when all applicable criteria are evidenced:

1. GitHub `main` is protected by an active ruleset or branch protection configuration.
2. Direct pushes are blocked except for a documented emergency/break-glass role.
3. Pull-request review and exact required status checks are enforced.
4. PR #115 is explicitly accepted, revised, or rejected; no parallel teardown fix exists.
5. One Compose file and one deployment command are ratified for production.
6. Boot, deploy, rollback, health-check, and runbook surfaces either use that contract or are explicitly labeled non-production.
7. A GitHub `production` environment exists with an approved reviewer/protection model before deploy execution is enabled.
8. The operator records credential rotation status without storing values, tokens, or secret-derived output in Git.
9. Every dirty root path and active worktree has an owner and disposition; no deletion or reset is used to reach that state.
10. Current-main CI, Release Readiness, and production Security Audit are green at the final exact SHA.
11. The closeout states what remains unverified in live infrastructure; local checks are not represented as production readiness.

## 6. Scope

### 6.1 In scope for the initiative

- GitHub main-branch governance design and later admin configuration.
- Review/disposition of existing PR #115.
- Deployment/Compose authority decision and bounded alignment plan.
- GitHub `production` environment design and later admin configuration.
- Credential-rotation evidence checklist containing status only, never values.
- Non-destructive ownership/disposition register for the dirty root and active worktrees.
- Exact-SHA CI/security/release verification.
- Documentation and decision records needed to make the above canonical.

### 6.2 Out of scope

- Broad repository cleanup or code pruning.
- Deleting, moving, archiving, or untracking files.
- Branch or worktree pruning.
- Dashboard consolidation.
- Database migration consolidation or live migration execution.
- Skill deduplication or distribution changes.
- Runtime/core changes to Hermes, BEL, model routing, approvals, MCP, or attribution.
- Package or lockfile changes beyond a separately approved security task.
- Reading, writing, rotating, or testing secret values through Codex.
- Deploying, releasing, sending external communications, or changing DNS.
- Reintroducing Firebase in any form.

## 7. Constraints

- Each workstream requires its own scope declaration and approval when it reaches an admin, secret-adjacent, destructive, runtime, dependency, push, PR, merge, or deploy action.
- `proceed` authorizes only the named next action, not all workstreams at once.
- Existing branches, worktrees, staged changes, and untracked files are presumed owned until proven otherwise.
- Main-health claims must identify the exact SHA and distinguish green checks from production readiness.
- Credential evidence records may include variable/service names, rotation date, owner, environment, and verification status, but never values or screenshots containing values.
- Deployment changes must include rollback and local-versus-production evidence boundaries.
- PR #115 is the canonical active lane for the teardown issue unless the owner explicitly rejects it.

## 8. Existing Assets and Prior Work

- `docs/repository-assessment.md` — Phase 1 evidence and original P0 findings; snapshot dated 2026-08-11.
- `docs/OPERATING_POLICY.md` — source-of-truth hierarchy and branch/worktree discipline.
- `docs/REPO_SAFETY_POLICY.md` — protected paths and approval gates.
- `docs/IMPLEMENTATION_GATES.md` — required diagnosis, scope, plan, validation, and handoff gates.
- `docs/AGENT_HANDOFF_PROTOCOL.md` — required continuation format.
- `docs/system/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md` — one task/branch/worktree model.
- `.codex/validation.json` — validation command registry.
- `.github/workflows/ci.yml`, release-readiness workflow, security workflow, and `deploy.yml`.
- `scripts/deploy.ps1`, `scripts/rollback.ps1`, `scripts/boot-core.ps1`, `scripts/boot-full.ps1`, and `scripts/check-stack.ps1`.
- `docker-compose.yml`, `docker-compose.unified.yml`, `docker-compose.traefik.yml`, and `compose/docker-compose.yml`.
- `docs/DEPLOYMENT-HANDOFF.md` — current credential and production checklist, including unresolved rotation language.
- PR #114 — merged Axios remediation.
- PR #115 — active test teardown fix.

## 9. Workstreams and Gates

### Workstream A — Current-main and active-fix reconciliation

**Objective:** close stale P0 findings without duplicating active work.

Tasks:

1. Record current GitHub `main` SHA and check rollup.
2. Review PR #115's exact diff, tests, tradeoff, and updated base.
3. Decide `accept`, `revise`, or `reject` for PR #115.
4. If accepted, require a separate explicit merge approval after exact-head checks are green.
5. Update the assessment status through a dated addendum rather than rewriting historical evidence.

Gate: PR review is read-only; merge remains human-required.

### Workstream B — Main protection and repository rules

**Objective:** make repository policy enforceable at GitHub `main`.

Proposed minimum rule design for operator review:

- Require pull requests before merge.
- Require at least one approving review.
- Dismiss stale approvals after new commits.
- Require conversation resolution.
- Require exact status checks for CI, Release Readiness, Security Audit, and any ratified governance gate.
- Require branches to be up to date or use a merge queue if adopted.
- Block force pushes and deletions.
- Apply to administrators unless a documented break-glass procedure is approved.
- Do not enable automatic merge or deployment as part of this workstream.

Required pre-mutation artifact: exact rule payload, expected operator behavior, lockout risk, break-glass path, and rollback command/API action.

Gate: GitHub admin mutation requires a new explicit `proceed` after payload review.

### Workstream C — Deployment authority ratification

**Objective:** establish one production launch and rollback contract.

Tasks:

1. Compare service graphs, profiles, bindings, secrets behavior, volumes, and health checks across all Compose definitions.
2. Identify every caller of default Compose versus `docker-compose.unified.yml`.
3. Determine actual external deployment consumers and self-hosted runner state.
4. Produce an ADR selecting one of: ratify unified, ratify default, or replace both with another reviewed contract.
5. Define migration, compatibility, rollback, and deprecation steps for noncanonical entry points.
6. Validate locally without production credentials before any deploy-oriented claim.

Gate: this spec does not choose the winner. Script/config changes require a separately approved implementation spec.

### Workstream D — Production environment governance

**Objective:** make the Deploy workflow's declared environment gate real.

Tasks:

1. Confirm the intended GitHub environment name and deployment branches.
2. Define required reviewers, wait timers if useful, and environment-specific secrets ownership.
3. Verify self-hosted runner labels, isolation, and availability without exposing credentials.
4. Create the environment only after reviewing the exact admin mutation and rollback.
5. Perform API readback after configuration; do not deploy as part of setup.

Gate: environment creation/configuration is an external admin mutation and requires a new explicit `proceed`.

### Workstream E — Credential-rotation evidence

**Objective:** resolve deployment readiness status without exposing credentials.

Allowed evidence fields:

| Field | Example form |
|---|---|
| Service | Supabase / Stripe / webhook provider |
| Credential class | Service role / secret key / signing secret |
| Environment | Local / staging / production |
| Rotation status | Not started / rotated / verified / revoked |
| Rotation date | Date only |
| Owner | Human role or named operator |
| Old credential invalidated | Yes / no / unknown |
| Deployment reference updated | Yes / no / not applicable |
| Verification method | Provider UI confirmation or non-secret identifier |

No secret value, prefix beyond what is already public documentation, token fingerprint, credential-bearing screenshot, or command output containing secrets may enter Git.

Gate: the human operator performs rotation in provider UIs or approved secret tooling. Codex may prepare a value-free checklist only after scope approval.

### Workstream F — Root command-center reconciliation

**Objective:** make active local work discoverable without deleting or moving it.

Tasks:

1. Inventory every modified, staged, and untracked root path.
2. Map each path to owner, initiative, branch/worktree, canonical status, and disposition.
3. Identify which items already exist on current GitHub `main` and which remain unique locally.
4. Create preservation/handoff recommendations for unique work.
5. Propose later integration or cleanup batches with exact targets.

Gate: inventory and recommendations are read-only. Reset, clean, move, delete, stage, commit, branch change, and worktree removal require separate explicit approval.

## 10. Proposed Execution Sequence

1. Review and ratify this spec.
2. Complete Workstream A read-only review; decide PR #115 disposition.
3. Draft Workstream B branch-protection payload and rollback plan.
4. Perform Workstream C deployment-authority analysis and ADR proposal.
5. Draft Workstream D production-environment payload after the ADR selects the deployment contract.
6. Human completes Workstream E credential verification through approved external channels.
7. Complete Workstream F ownership register before any cleanup plan is activated.
8. Re-run exact-SHA GitHub checks and publish a P0 closeout report.

Workstreams B, C implementation, D, E, F mutation, merge, and deploy remain separate approval gates.

## 11. Validation Plan

### Documentation/spec changes

- `git status --short`
- `git diff --name-only`
- `git diff --check`
- Confirm diff is limited to declared documentation scope.

### GitHub governance changes

- API readback of branch protection/ruleset configuration.
- Negative-path verification that an unreviewed or failing branch cannot merge.
- Confirm break-glass behavior without performing an emergency bypass.

### PR #115 disposition

- Exact head SHA recorded.
- CI, Release Readiness, Security Audit, and governance checks green on that head.
- Diff limited to declared test infrastructure.
- Tradeoff of non-fatal temp cleanup explicitly accepted or revised.

### Deployment authority changes

- Compose config rendering with missing-secret failure behavior checked.
- Service graph, bindings, volumes, health checks, migration, backup, and rollback reviewed.
- Docs and scripts agree on one canonical command.
- No live deployment without a separate deploy approval.

### Credential readiness

- Human confirmation recorded using value-free fields only.
- Old credentials confirmed invalidated where applicable.
- No credential content enters command output, documentation, commits, or agent messages.

## 12. Risks and Tradeoffs

| Risk / decision | Tradeoff | Mitigation |
|---|---|---|
| Protecting `main` before checks are stable | Stronger governance can create delivery lockout. | Require exact check names, break-glass procedure, and rollback before mutation. |
| Merging PR #115 | Prevents teardown cleanup from failing tests but can reduce signal for systematic temp leaks. | Keep warning visible; separately monitor repeated warnings; human accepts tradeoff. |
| Selecting unified Compose | Stronger fail-closed behavior may break existing operator habits or external callers. | Consumer inventory, dry-run rendering, migration path, explicit rollback. |
| Creating production environment | Adds a real approval gate but may block deployment if reviewers/runners are unavailable. | Name primary/backup reviewers and verify runner readiness before activation. |
| Credential status in Git | Improves auditability but can become sensitive metadata. | Store status only; keep provider identifiers and values out of Git. |
| Reconciling dirty root | Improves clarity but can accidentally absorb or erase unrelated work. | Read-only ownership register first; exact preservation plan before mutation. |
| Treating current green checks as closure | A green snapshot can hide intermittent or external failures. | Exact-SHA evidence plus active-flake and production-readiness distinctions. |

## 13. Open Questions Requiring Owner Decision

1. Is PR #115's warn-but-do-not-fail teardown behavior acceptable, or should persistent cleanup failure remain blocking through another mechanism?
2. Should GitHub administrators be subject to the same `main` rules, with a documented break-glass process?
3. Which checks must be required if workflow names or job names change?
4. Is `docker-compose.unified.yml` intended to become the production authority, or should the deployment analysis remain neutral until external consumers are inventoried?
5. Who are the required reviewers for the GitHub `production` environment?
6. Has any credential named in `docs/DEPLOYMENT-HANDOFF.md` already been rotated and invalidated outside Git?
7. Who owns each current dirty-root initiative, especially staged system-control documents and untracked repo-pruner/domain-operations work?

## 14. Rollback and Reversibility Model

- This spec-only change is reversible by removing the uncommitted spec file and worktree after owner approval; no removal is authorized now.
- Branch protection/ruleset rollback must be captured from pre-change API state and tested through API readback.
- Production-environment rollback must remove or disable only the reviewed protection rule; it must not expose or delete secrets.
- Deployment-authority changes must preserve the previous command/config until the new contract passes its validation and rollback test.
- Credential rotation is intentionally irreversible with respect to old credentials; provider rollback means issuing a new credential, not restoring a compromised one.
- Root reconciliation must favor preservation branches/bundles or explicit handoff over deletion.

## 15. Approval Matrix

| Action | Current authorization |
|---|---|
| Create this isolated worktree and proposed spec | Authorized by operator `proceed` on 2026-08-19 |
| Read-only PR #115 review | Not yet executed; safe after spec ratification or explicit request |
| Branch protection/ruleset mutation | Not authorized |
| PR #115 merge | Not authorized |
| Compose/script/runbook implementation | Not authorized |
| Production environment creation/configuration | Not authorized |
| Credential reading, rotation, writing, or testing | Not authorized |
| Dirty-root staging, commit, reset, cleanup, or integration | Not authorized |
| Commit, push, PR creation, merge, deploy, release | Not authorized |

## 16. Human / Agent Operating Split

```text
Review/Diagnosis owner: Codex for repo/GitHub read-only evidence; Audio for business and credential truth
Actionable AI Assistant Task owner: Codex, one approved workstream at a time
Execution location/tool: isolated AJ Digital OS worktree; GitHub admin/provider UI only for separately approved external actions
Human/operator role: ratify decisions, approve exact mutations, perform secret-provider actions, accept residual risk
Copy/paste destination: Codex task in C:\dev\worktrees\aj-digital-os-p0-authority-stabilization
```

## 17. Definition of Ready for Implementation

Implementation may begin only after:

- this proposed spec is reviewed and explicitly ratified;
- one workstream is selected;
- exact files or external settings are declared;
- current base/head SHA and overlapping work are rechecked;
- rollback and validation are stated;
- the operator supplies a new `proceed` for any gated mutation.

Until then, decision label: **Pause after spec creation; requires human review.**
