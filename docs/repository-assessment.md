---
title: AJ Digital OS Repository Governance Assessment
document_type: repository-assessment
status: assessment-complete
assessment_phase: phase-1
repository: C:\dev\AJ-DIGITAL-OS
assessed_local_head: 2a22f32cbd4d8eb1d1eba9ab55831d5092da6708
assessed_remote_main: bd85c06f88694c59e707c11b75fe62ed189d1380
assessment_date: 2026-08-11
template: REPO-GOVERNANCE-ASSESSMENT-TEMPLATE.md
template_version: 1.0
template_ratified: 2026-08-11
authorization: assessment-only
---

# AJ Digital OS Repository Governance Assessment

## Assessment contract

This is the Phase 1 canonical repository assessment authorized for `C:\dev\AJ-DIGITAL-OS` only. It records evidence, classifies findings, and proposes a governed target state. It does **not** authorize or perform cleanup implementation, file moves, deletion, dependency changes, branch or worktree changes, commit, push, pull request activity, merge, deployment, secret handling, or production changes.

The ratified Obsidian template is the assessment authority. Repository-local `AGENTS.md` files and policy documents remain the operating authority. Where the live repository disagrees with documentation, this report identifies the conflict rather than silently choosing a winner.

### Evidence boundary

- Local evidence was collected from the existing working copy without fetching or changing Git refs.
- The local branch is `main` at `2a22f32`; its cached `origin/main` ref is also `2a22f32`.
- A read-only GitHub API check on 2026-08-11 found GitHub `main` at `bd85c06`, dated 2026-08-10. Therefore the local remote-tracking ref is stale and local evidence is not an exact snapshot of current GitHub `main`.
- File contents under protected runtime/data/output paths and the local `.env` were not inspected for values.
- External production infrastructure, environment protection reviewers, database state, deployed services, and credential rotation were not verified.
- Existing staged, modified, and untracked work was preserved exactly as found.

### Evidence language

- **Fact** — directly observed in files, Git, commands, or GitHub API output.
- **Inference** — the most likely interpretation of observed evidence.
- **Unknown** — requires owner confirmation, credentials, external state, or a separately authorized test.
- **Proposal** — recommended future state; not implemented by this assessment.

## 1. Executive Summary

AJ Digital OS is a substantial hybrid operating-system repository: a TypeScript CLI/runtime, agent and workflow platform, local internal tool, API surface, data layer, control-plane UI, security/governance framework, and infrastructure/deployment package. Its strongest characteristics are explicit safety policy, meaningful automated test breadth, local-first execution, documented approval concepts, and a mature awareness of agent operating risk.

The repository is not yet cleanly operable as a single canonical system. The highest-risk problem is **authority fragmentation**, not cosmetic disorder. Local and GitHub `main` disagree; public GitHub `main` is unprotected; current remote CI and security gates are red; startup/deployment paths select different Compose definitions; database migration authority is split; architecture and status documents contradict current code; two dashboard implementations coexist after a canonicalization decision; and more than half of tracked paths participate in exact duplicate groups, primarily multi-harness skill mirrors.

The current working tree also contains active staged and untracked work on local `main`. That work appears to include a repo-pruner specification and implementation, agent-control-plane documents, fixtures, domain operations, scripts, skills, and tests. It must be treated as owned work in progress—not cleanup debris.

### Overall assessment

| Dimension | Rating | Basis |
|---|---:|---|
| Purpose clarity | Strong | README, package manifest, policy docs, and architecture material describe a coherent local-first agent operating system. |
| Canonical authority | Weak–moderate | Policy authority is clear; architecture, deployment, database, UI, and status authority are fragmented. |
| Repository hygiene | Weak | Dirty local `main`, tracked generated/runtime artifacts, large exact-duplicate footprint, and historical root docs. |
| Git governance | Weak | GitHub `main` is unprotected; local remote-tracking state is stale; branch/worktree/PR volume is high. |
| Test posture | Moderate–strong | Local typecheck and 548 tests passed; DB suites were skipped; coverage scope is narrow; remote Linux test cleanup failed. |
| CI/CD posture | Moderate but currently red | Multiple workflows exist, but current GitHub `main` has failing CI and security runs. |
| Security posture | Blocked for release claims | Strong fail-closed patterns exist, but current production audit is red and secret-rotation evidence is unresolved. |
| Agent operability | Moderate | Hierarchical `AGENTS.md` and approval policies are strong; enforcement and lifecycle truth are incomplete. |
| Production readiness | Not established | Local checks, documentation, and a green release-readiness workflow do not override red CI/security or external unknowns. |

### Recommended decision

Do not begin broad cleanup. First establish a separately authorized **P0 authority-stabilization lane** in an isolated branch and worktree. That lane should reconcile the exact GitHub `main` baseline, protect `main`, restore green CI/security, ratify one deployment entry point, and resolve secret-rotation evidence. Only after those gates are satisfied should structural cleanup be planned from the file-operations matrix in this report.

## 2. Repository Classification

### Primary classification

**Hybrid platform / internal-tool / automation / API / agent-system / data-system / infrastructure repository.**

### Observed roles

| Role | Evidence | Confidence |
|---|---|---:|
| TypeScript CLI and runtime | `package.json` exposes `dist/cli.js`; `src/cli.ts` and runtime services are large central modules. | High |
| Agent and workflow operating system | `src/agents`, Hermes, BEL, approvals, orchestration, memory, attribution, and workflow modules. | High |
| Local internal tool | README describes a local-first assistant and web shell; runtime paths are local by default. | High |
| API/service surface | Hermes status API, service modules, webhooks, health routes, and deployment health checks. | High |
| Data system | `sql/`, `supabase/`, database migrator, CRM/RLS tests, runtime state and memory surfaces. | High |
| Control-plane UI | Both `dashboard/` and `ui/dashboard/` exist as separate frontend packages. | High |
| Infrastructure/deployment package | Dockerfiles, several Compose definitions, PowerShell boot/deploy/rollback scripts, and GitHub Actions. | High |
| Governance repository | Root and child `AGENTS.md`, implementation gates, safety policy, handoff protocol, DMAIC config, validation registry. | High |

### Maturity classification

**Experimental/internal staging with production-oriented controls; unrestricted production readiness is not established.** The master architecture schema itself describes material portions as experimental, several integrations are scaffolded, GitHub main is currently red, and external deployment/credential evidence was outside the assessment boundary.

## 3. Current Structure

### Quantitative inventory

| Measure | Observed value |
|---|---:|
| Tracked files | 2,178 |
| Tracked TypeScript/TSX source files | 542 |
| Tracked TypeScript test files | 50 |
| Tracked Markdown documents | 122 |
| Local worktrees | 9 |
| Local branches | 60 |
| Remote-tracking branches | 54 |
| Open GitHub pull requests | 16 |
| Open GitHub issues | 2 |
| Exact duplicate Git blob groups | 41 |
| Paths participating in duplicate groups | 1,195 |
| Excess duplicate paths beyond one copy per group | 1,154 |

### Main tracked areas

| Area | Approximate tracked paths | Current role | Assessment |
|---|---:|---|---|
| `src/` | 570 | Core TypeScript runtime, CLI, agents, services, security, data, APIs | Canonical implementation area; several oversized modules. |
| `docs/` | 130 | Policy, architecture, specs, runbooks, operations, releases | Canonical documentation area, but lacks one reliable current-state index. |
| `tests/` | 61 | Unit/integration/security/workflow tests and fixtures | Canonical validation area; integration coverage is credential-gated. |
| `skills/` | 43 | Shared skill definitions | Candidate canonical skill source, but duplicated into many tool-specific trees. |
| `dashboard/` | 41 | Next.js control plane | Documentation identifies this as the canonical dashboard. |
| `ui/` | 37 | Legacy/parallel Vite dashboard | Canonicalization doc says it should be archived; implementation remains. |
| `scripts/` | 25 | Boot, deploy, rollback, validation, migration, operations | Useful but selects inconsistent runtime/deployment contracts. |
| `runtime/` | 13 | Runtime state surfaces and examples | Protected; generated state should not become casual source. |
| `output/` | 11 | Generated exports/artifacts | Tracked output conflicts with the default generated-artifact policy. |

### Large-module concentration

The following observed source files are structural hot spots, not automatic refactor targets:

| File | Lines | Risk |
|---|---:|---|
| `src/hermes/hermes-status-api.ts` | 2,019 | API, policy, and status behavior are concentrated in one module. |
| `src/cli.ts` | 1,429 | Command routing and operational behavior have high change blast radius. |
| `src/services/runtime/assistant-runtime.ts` | 1,325 | Core runtime responsibilities are highly concentrated. |
| `src/dashboard/run-dashboard.ts` | 626 | Dashboard/runtime coupling risk. |
| `src/db/postgres-operational-store.ts` | 602 | Persistence behavior and schema assumptions are concentrated. |
| `src/web-shell/web-shell-client.ts` | 595 | Client behavior is large for a single module. |
| `src/distribution/validate-distribution.ts` | 584 | Distribution policy and validation are centralized. |

### Root-level document drift

Several historical or task-specific documents remain at repository root, including `BUILD-PROGRESS.md`, `COMMIT_REVIEW_2026-04-27.md`, `EDGE_NOTES.md`, `RECONCILIATION_NOTES.md`, `aj-digital-agent-architecture.md`, `aj-digital-os-scaffold-and-schema.md`, and `copilot-build-prompt-aj-digital-os.md`. These are candidates for explicit classification and archival, not immediate deletion.

## 4. Current Sources of Truth

### Authority map

| Domain | Current authority | State |
|---|---|---|
| Human authorization | Current operator instruction using `proceed` | Clear for this assessment only. |
| Agent operating policy | Root `AGENTS.md` plus nearest child `AGENTS.md` | Clear and canonical. |
| Safety and implementation gates | `docs/OPERATING_POLICY.md`, `docs/REPO_SAFETY_POLICY.md`, `docs/IMPLEMENTATION_GATES.md`, `docs/AGENT_HANDOFF_PROTOCOL.md` | Clear and canonical. |
| Validation registry | `.codex/validation.json` | Clear for registered validation classes. |
| Hook enforcement | `.codex/STOP_HOOK_PROPOSAL.md` | Proposal only; no active hooks file was found. |
| Product/runtime identity | `README.md`, `package.json`, implementation and tests | Mostly clear; README contains repeated/stale areas. |
| Technical reality | Current source code, tests, package manifests, workflows | Canonical where docs disagree, subject to exact-commit boundary. |
| Architecture | Multiple architecture/schema/layer documents | Fragmented; statuses and dates vary. |
| Dashboard authority | `docs/architecture/ROUTING_CANONICALIZATION.md` selects `dashboard/` | Decision clear; migration incomplete. |
| Deployment authority | `deploy.yml`, `scripts/deploy.ps1`, multiple Compose files and boot scripts | Conflicting. |
| Database migration authority | `sql/`, `supabase/migrations/`, `src/db/migrator.ts`, CRM/RLS tests | Conflicting/fragmented. |
| Roadmap/current phase | Roadmap docs, layer-coverage index, sprint inventory, branches and PRs | Fragmented. |
| Decision history | `docs/decisions/decision-log.md` | Canonical format but incomplete domain coverage. |

### Documentation conflicts observed

- `docs/system/AJ_DIGITAL_OS_REPO_VALIDATION_REPORT.md` records an older commit and only 31 tests in seven files; the current local run executed 49 files and 548 passing tests.
- `BUILD-PROGRESS.md` describes a stale branch/commit state.
- `docs/ui/local-web-shell.md` says semantic memory is not implemented, while the README describes semantic memory capability.
- `docs/architecture/ROUTING_CANONICALIZATION.md` identifies `dashboard/` as canonical and `ui/dashboard/` as archival, but both remain active package surfaces with the same package name.
- Architecture authority is distributed across `docs/system-architecture.md`, the master architecture schema, the layer model spec, layer-coverage index, module traceability material, and older root architecture/scaffold documents.

### Required truth rule

Until documentation is reconciled, agents should use this order: explicit operator instruction → applicable `AGENTS.md` → canonical policy docs → exact checked-out source/tests/manifests → operational docs → historical reports. A green historical report must never override current GitHub or local validation evidence.

## 5. Repository Hygiene Findings

### High-impact findings

1. **Local `main` is dirty with active work.** Modified, staged, and untracked paths span governance docs, a repo-pruner initiative, fixtures, domain operations, a sync script, skills, and tests. Their intent cannot be inferred safely from status alone.
2. **Exact duplication dominates path count.** Thirty-eight duplicate blob groups are each repeated 31 times, representing 1,178 tracked paths. The primary cause is two Supabase skill packs mirrored across approximately 30 hidden agent/tool directories plus `skills/`.
3. **Generated/operational material is tracked.** `output/` includes generated exports and `.env`-named artifacts; `memory/run-logs/` contains timestamped JSON; `supabase/.temp/cli-latest` is tracked; `sessions/` contains example JSONs, including exact duplicates.
4. **Historical root documents dilute navigation.** Progress, review, reconciliation, architecture, and prompt documents live beside the main product entry points without uniform status metadata.
5. **Local ignored volume is substantial.** `dist`, data, logs, graph output, and local environment state exist in the working copy. They were left untouched and should remain protected unless a separate retention policy authorizes action.

### Duplicate classification

| Duplicate class | Classification | Reason |
|---|---|---|
| Multi-harness skill mirrors | **CONSOLIDATE / INVESTIGATE** | May be required by tool discovery paths; deletion without a distribution contract could break agent runtimes. |
| `.gitkeep` files | **KEEP** | Same empty blob is expected and does not represent meaningful duplication. |
| Empty homepage custom CSS/JS files | **REVIEW** | May be intentional extension points. |
| Duplicate example session JSON | **CONSOLIDATE CANDIDATE** | Examples likely belong under canonical fixtures, subject to reference search and tests. |

### Hygiene conclusion

The repository needs governance-led consolidation, but a raw deduplication or “unused file” pass would be unsafe. The untracked `scripts/sync-agent-skill.mjs` and `skills/repo-pruner/` initiative may already address parts of this problem and must be evaluated as active work before a parallel cleanup design is introduced.

## 6. Git / Branch / Worktree Assessment

### Local state

- Branch: `main`
- Local HEAD: `2a22f32cbd4d8eb1d1eba9ab55831d5092da6708`
- Cached `origin/main`: `2a22f32cbd4d8eb1d1eba9ab55831d5092da6708`
- Reported local ahead/behind against cached ref: `0/0`
- Working tree: dirty
- Worktrees: 9, including two detached nested Claude worktrees and several initiative-specific worktrees
- Local branches: 60
- Remote-tracking branches: 54

### GitHub state observed read-only on 2026-08-11

- Repository: `AudioJones-Dev/AJ-DIGITAL-OS-V1`
- Visibility: public
- GitHub `main`: `bd85c06f88694c59e707c11b75fe62ed189d1380`
- GitHub `main` commit date: 2026-08-10
- Branch protection API result for `main`: HTTP 404, “Branch not protected”
- Open pull requests: 16
- Open issues: 2

### Key findings

1. **Cached-local and GitHub truth diverge.** The local remote-tracking ref is behind GitHub `main`; no fetch was performed because this assessment is non-mutating.
2. **Public `main` is unprotected.** This permits governance bypass unless another repository ruleset exists; no effective ruleset was independently verified in this assessment.
3. **Work is spread across many branches/worktrees/PRs.** Several open PRs are old, draft, unstable, or overlap dashboard, dependency, CRM, business-memory, and documentation lanes.
4. **The canonical worktree protocol is strong but not uniformly reflected in state.** `docs/system/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md` establishes “One Task = One Branch = One Worktree.” The current dirty local `main` command center violates the intended steady state.
5. **This assessment is a scoped exception, not precedent.** The operator explicitly named this working copy and authorized one report. No other current work was altered.

## 7. Documentation Assessment

### Strengths

- Hierarchical DOX-style `AGENTS.md` files put operating constraints near governed paths.
- Safety, approval, implementation, and handoff policies are unusually explicit.
- Architecture, deployment, operations, UI, database, security, and release topics have substantial written coverage.
- Many documents carry statuses such as canonical, reference, candidate, living, or proposal.

### Weaknesses

- There is no single current documentation index resolving authority, status, owners, supersession, and last validation.
- Multiple architecture documents describe overlapping models without a clear supersession chain.
- Historical validation and progress reports look authoritative despite being stale.
- README command and capability sections are repetitive and can outlive implementation details.
- Roadmap/current-work truth is distributed across docs, worktrees, branches, PRs, and uncommitted files.
- The decision log covers only a limited portion of the repository’s major architecture decisions.
- Candidate system-control documents are staged but not yet ratified; they must not be treated as canonical merely because they are present.

### Documentation recommendation

Create one governed documentation index in a later phase. It should list each authority domain, canonical file, status, owner, last verified commit/date, and superseded documents. Archive historical reports under an explicit historical path with frontmatter stating that they are snapshots, not current truth.

## 8. Agent Workflow Assessment

### Current strengths

- Root-to-child `AGENTS.md` inheritance is explicit.
- Protected paths and approval gates are well defined.
- “Proceed” is established as the operator approval word.
- File-scope declarations, validation reporting, and DOX review are required.
- Repo policy distinguishes local checks from production authority.
- The worktree protocol supports isolation and parallel development.

### Current gaps

- Policy is stronger than automated enforcement. `.codex/STOP_HOOK_PROPOSAL.md` is only a proposal; `.codex/hooks.json` was not found.
- DMAIC is configured in `warn` mode and registers only the DMAIC gate component; it is advisory, not a repository-wide blocker.
- Active work ownership is not discoverable from one registry. Agents must inspect status, worktrees, branches, PRs, specs, and handoff notes.
- Tool-specific skill copies create distribution ambiguity: it is unclear which directory is authored versus generated.
- Candidate agent-control-plane documents are not yet canonical and may overlap existing policy.
- Main branch protection does not technically enforce the written merge path.

### Proposed startup contract

```yaml
agent_startup_contract:
  repository: C:\dev\AJ-DIGITAL-OS
  required_reads:
    - AGENTS.md
    - nearest child AGENTS.md for every target path
    - docs/OPERATING_POLICY.md
    - docs/REPO_SAFETY_POLICY.md
    - docs/IMPLEMENTATION_GATES.md
    - docs/AGENT_HANDOFF_PROTOCOL.md
    - .codex/validation.json
  verify_before_edit:
    - exact local branch and HEAD
    - current GitHub main SHA when remote truth matters
    - working-tree ownership and dirty paths
    - overlapping worktrees, branches, PRs, and specs
    - canonical source for the target domain
  required_declaration:
    - objective and success criteria
    - exact file scope
    - facts, inferences, assumptions, risks, blockers
    - validation plan
  approval_required_for:
    - destructive or irreversible changes
    - secrets, production, deployment, external communications
    - branch cleanup, push, PR, merge, release
    - runtime/core or global tool configuration changes
  closeout:
    - files changed
    - validation commands and results
    - skipped checks and reasons
    - remaining risks
    - operator decision required
```

## 9. Testing & QA Assessment

### Local validation performed

| Command | Result | Interpretation |
|---|---|---|
| `npm run typecheck` | Pass, exit 0 | Local checked-out TypeScript state typechecks. |
| `npm test` | Pass, exit 0 | 47 files passed, 2 skipped; 548 tests passed, 11 skipped. |

Expected rejection/error-path logs were emitted by some tests, but the test process completed successfully. The test environment redirects runtime writes to temporary directories and cleans them afterward.

### Coverage and QA gaps

- Database-backed integration suites are skipped unless a database URL is supplied; the 11 skipped tests therefore represent unmeasured external integration behavior.
- Coverage thresholds target only four files: core run/state behavior and approval/execution webhooks. They do not represent repository-wide coverage.
- There is no root `lint` script or observed root lint configuration, although some documentation references `npm run lint`.
- Playwright is a runtime dependency for browser/website capabilities, but no canonical Playwright end-to-end test suite/configuration was found.
- Build was not run locally in this assessment because it writes generated output and was not needed to create a documentation-only report.

### Local versus remote discrepancy

The current GitHub `main` CI run at `bd85c06` passed install, typecheck, and build, then failed in `tests/control-plane/control-plane.test.ts` because test cleanup received `ENOTEMPTY` while removing a Linux temp directory. The same aggregate test count showed 548 passed and 11 skipped. This is evidence of a cross-platform cleanup race or resource-lifecycle defect, not evidence that the control-plane assertions themselves failed.

## 10. CI/CD Assessment

### Observed workflows

- CI
- Release Readiness
- Security Audit
- DMAIC Gate
- Deploy

### Current GitHub `main` status at assessed SHA

| Workflow | Result | Evidence |
|---|---|---|
| CI | Failure | Linux temp-directory cleanup failed with `ENOTEMPTY`; coverage did not run. |
| Security Audit | Failure | Production audit found a high-severity Axios vulnerability; full audit also reported high-severity NanoID and PostCSS findings. |
| Release Readiness | Success | Useful evidence, but cannot supersede red CI/security checks. |

### Pipeline design findings

- CI and Release Readiness duplicate install/typecheck/test/build work, increasing runtime and allowing semantics to drift.
- The Deploy workflow is manually dispatched on a self-hosted Windows runner and uses a GitHub `production` environment.
- `scripts/deploy.ps1` requires clean `main`, validates configuration, backs up, fast-forwards, builds, migrates, starts Compose, and health-checks. This is a strong structure.
- Environment reviewer/protection configuration and the live self-hosted runner were not verified.
- Node versions drift: GitHub Actions use Node 20, Docker uses Node 22, the assessed machine uses Node 26.5.0, `@types/node` is 25, and `package.json` has no `engines` contract.
- A green build is not a release authorization and a green Release Readiness workflow does not cancel failing required evidence.

## 11. Security & Secrets Findings

### Positive controls

- The local `.env` is ignored and was not read.
- No tracked `.env` history was found through the scoped path history check.
- A filename-only scan found no common tracked private-key/token filename patterns.
- Protected runtime, data, memory, output, session, and secret paths are explicitly named in policy.
- Hermes API auth tests include fail-closed behavior, placeholder rejection, token enforcement, and CORS lockdown.
- The Security Audit workflow fails on high-or-greater production vulnerabilities.

### Blocking findings

1. **Current production dependency audit is red.** GitHub reported a high-severity Axios vulnerability at current remote `main`. Full audit output also named NanoID and PostCSS high-severity findings.
2. **Secret-rotation evidence is unresolved.** `docs/DEPLOYMENT-HANDOFF.md` states that Stripe, Supabase, and webhook secrets were exposed during development and must be rotated before go-live. This assessment found no proof that rotation and downstream invalidation were completed.
3. **Tracked generated artifacts include `.env`-named output files.** Contents were deliberately not inspected. Names alone require classification and safe handling.
4. **Legacy/default Compose contains a `change-me` fallback.** Unified Compose fails closed more strongly, but startup scripts do not consistently select it.
5. **Public `main` is unprotected.** Written approval policy is not backed by observed branch protection.

### Security conclusion

No claim is made that active secrets are present in Git. However, release and production-readiness claims remain blocked until dependency findings are remediated at an exact SHA, credential rotation is externally evidenced, deployment authority is ratified, and protected-main controls are verified.

## 12. Structural Debt

### P0 — authority, release, or security blockers

| ID | Finding | Impact | Required outcome |
|---|---|---|---|
| P0-01 | Local/cached Git state is behind GitHub `main` while local `main` is dirty. | Agents can assess or change the wrong baseline and mix unrelated work. | Reconcile in an isolated worktree; preserve and assign every dirty path before any cleanup. |
| P0-02 | Public GitHub `main` is unprotected. | Written review/approval rules can be bypassed. | Establish and verify a branch ruleset/protection policy with required checks and review. |
| P0-03 | Current GitHub `main` has red CI and Security Audit. | Main cannot be treated as a green integration baseline. | Fix Linux cleanup lifecycle and production dependency audit at an exact SHA. |
| P0-04 | Secret-rotation completion is not evidenced. | Potential credentials may remain valid despite documented exposure. | Operator/security owner verifies rotation, invalidation, and deployment replacement outside Git. |
| P0-05 | Deployment/startup authority is inconsistent across Compose files and scripts. | Operators can launch materially different or weaker configurations. | Ratify one Compose/deploy/start contract and make all entry points fail closed. |

### P1 — governance and maintainability debt

| ID | Finding | Impact | Required outcome |
|---|---|---|---|
| P1-01 | 1,178 paths are in 38 skill-mirror duplicate groups. | Review noise, update drift, repository bloat, unclear authoring authority. | Define authored source, generated adapters, compatibility matrix, and validation before consolidation. |
| P1-02 | `dashboard/` and `ui/dashboard/` coexist after canonicalization. | Duplicate dependency/security maintenance and route ownership ambiguity. | Verify parity/dependencies, archive legacy UI through an approved migration. |
| P1-03 | Architecture and current-state docs conflict. | Agents cannot reliably identify canonical design or implementation status. | Create an authority index and supersession chain; archive stale snapshots. |
| P1-04 | Database schema/migration authority is split. | Migration order, RLS, rollback, and environment parity can diverge. | Ratify one ordered migration contract with manifest and tests. |
| P1-05 | Node/toolchain versions drift. | Local, CI, Docker, and type definitions can behave differently. | Ratify supported Node/npm versions and enforce them consistently. |
| P1-06 | DMAIC and Codex stop controls are advisory/proposed. | Governance language may be mistaken for technical enforcement. | Decide which gates must block and implement only after approval. |
| P1-07 | Generated/runtime artifacts are tracked. | Source history can contain stale, sensitive, or noisy operational output. | Inventory references and retention needs; relocate examples to fixtures; untrack only after approval. |
| P1-08 | Branch/worktree/PR backlog is large. | Ownership and current work are difficult to infer; stale automation continues. | Create a non-destructive ownership/disposition register before pruning. |
| P1-09 | Large core modules concentrate responsibilities. | High blast radius and difficult testing/review. | Characterization tests and bounded extraction plans; no mass refactor. |
| P1-10 | Test/CI coverage is uneven. | Green unit tests can obscure DB, E2E, lint, cross-platform, and full coverage gaps. | Add explicit test classes and evidence levels after P0 stabilization. |

### P2/P3 — clarity and polish

- Consolidate repeated README material and link to canonical runbooks.
- Expand decision-log coverage to deployment, database, dashboard, skill distribution, and toolchain decisions.
- Move historical root notes/reports into a status-labeled archive.
- Standardize document frontmatter, owners, review dates, and supersession markers.
- Remove empty or placeholder extension files only if consumers and intended override behavior are disproven.

## 13. Recommended Target Architecture

This target minimizes invention and preserves current durable boundaries.

```text
AJ-DIGITAL-OS/
├── AGENTS.md                      # Root agent constitution
├── README.md                      # Concise product/operator entry point
├── package.json                   # Root runtime/toolchain contract
├── docs/
│   ├── documentation-index.md     # Domain → canonical source → owner → status
│   ├── architecture/              # Current architecture and ADRs
│   ├── decisions/                 # Decision log / ADR registry
│   ├── policies/ or current policy paths
│   ├── specs/                     # Approved/candidate implementation specs
│   ├── operations/                # Runbooks, deployment and closeout evidence
│   ├── assessments/               # Future dated assessments
│   └── archive/                   # Explicitly non-current snapshots
├── src/                           # Canonical runtime implementation
├── tests/                         # Tests plus canonical fixtures
├── fixtures/                      # Stable non-sensitive examples if kept separate
├── dashboard/                     # Single canonical control plane
├── skills/                        # Authored skill sources only
├── generated-adapters/            # Optional generated tool adapters, preferably ignored
├── migrations/ or sql/            # One ordered migration authority
├── scripts/                       # Thin entry points to canonical contracts
├── config/                        # Static non-secret configuration
└── runtime/, data/, output/        # Local operational state, ignored by default
```

### Target principles

- One authority per domain; mirrors must declare generation source and checksum.
- Source, fixtures, generated output, and live runtime state must be structurally distinct.
- One dashboard, one deployment entry point, one migration sequence, one supported toolchain.
- Historical evidence remains accessible but cannot masquerade as current truth.
- Large-module decomposition follows tests and ownership boundaries, not arbitrary line limits.
- No new “control plane” document should duplicate an existing authority without a supersession decision.

## 14. Proposed Branch Taxonomy

Apply prospectively; do not rename or delete existing branches during assessment.

| Pattern | Use |
|---|---|
| `assessment/<scope>` | Read-only assessments and their reports. |
| `docs/<scope>` | Documentation-only changes. |
| `feat/<scope>` | New product/runtime behavior. |
| `fix/<scope>` | Defect repair with regression evidence. |
| `security/<scope>` | Security remediation and hardening. |
| `infra/<scope>` | CI, Compose, deployment, and infrastructure. |
| `chore/<scope>` | Bounded non-behavioral maintenance. |
| `codex/<type>-<scope>` | Codex-created branches when the client requires the `codex/` prefix. |
| `dependabot/<ecosystem>/<scope>` | Dependency automation only. |

Every branch should have one owner, one spec or issue, one declared base SHA, one worktree, one validation class, and an explicit closeout/disposition record.

## 15. Proposed Worktree Policy

Retain `docs/system/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md` as the canonical foundation.

1. The root working copy is a command center and should normally remain clean.
2. One task equals one branch equals one worktree.
3. Create new work from a freshly verified GitHub base; record the base SHA.
4. Register owner, purpose, created date, related issue/spec/PR, and expected closeout.
5. Detached worktrees require an explicit reason and expiry/disposition.
6. Never prune a worktree based only on age or a clean status; verify branch reachability, unique commits, untracked files, PR state, and owner intent.
7. Worktree cleanup is a separate destructive gate using exact paths and a rollback/preservation plan.
8. This assessment’s direct edit to the named root working copy is an operator-scoped exception and should not redefine the normal protocol.

## 16. Proposed Documentation Model

### Document classes

| Class | Required metadata | Authority behavior |
|---|---|---|
| Policy / Constitution | status, owner, ratified date, scope, supersedes | Binding within scope. |
| Architecture / ADR | status, decision date, implementation state, supersedes | Describes ratified target and actual adoption separately. |
| Spec / PRD | status, owner, scope, success criteria, approval | Authorizes only the named implementation after approval. |
| Runbook | owner, prerequisites, verified commit/date, rollback | Operational procedure; must be tested against current entry point. |
| Assessment / Report | evidence SHA/date, boundaries, findings, no implicit authority | Snapshot only; cannot authorize remediation. |
| Handoff / Closeout | branch, SHA, files, checks, risks, next decision | Continuity evidence, not architecture authority. |
| Historical / Archive | archived date, original status, superseded by | Searchable but explicitly non-current. |

### Canonical index fields

Each domain row should contain: domain, canonical document, implementation path, owner, status, current exact SHA/date, superseded documents, validation command, and next review date.

## 17. Proposed Agent Operating Model

### Lifecycle

1. **Intake** — identify the problem, user outcome, and authorization boundary.
2. **Truth check** — verify local branch/HEAD, GitHub main when relevant, dirty work, overlapping initiatives, and applicable authority.
3. **Spec/gate** — create or confirm the PRD/task spec and explicit success criteria.
4. **Isolation** — create one authorized branch/worktree from the recorded base SHA.
5. **Scope declaration** — name exact files, risks, protected paths, and validation class.
6. **Implementation** — change only approved scope; preserve unrelated work.
7. **Evidence** — run registered validation and label skipped/unmeasured checks honestly.
8. **DOX reconciliation** — update durable instructions only when behavior/ownership changed.
9. **Review gate** — human approval for push/PR/merge/deploy and all protected actions.
10. **Closeout** — record branch/SHA, changed files, evidence, remaining risk, and worktree disposition.

### Enforcement layers

- **Human authority:** operator approvals and risk acceptance.
- **Repository policy:** `AGENTS.md` and canonical policy documents.
- **Machine checks:** validation registry, tests, CI, security audit, branch protection, optional approved hooks.
- **Evidence record:** PR, handoff, decision log, deployment/rollback output.

Machine enforcement should be described as active only after it is configured and verified. Proposal files and warning-mode gates must remain labeled advisory.

## 18. File Operations Plan

This matrix is a proposal only. No listed operation was executed.

| Class | Candidate paths | Proposed treatment | Preconditions |
|---|---|---|---|
| KEEP | Root/child `AGENTS.md`; canonical policy docs; `src/`; `tests/`; `package.json`; `dashboard/` | Preserve as primary operating/implementation surfaces. | Normal review and future exact-SHA validation. |
| LEAVE UNTOUCHED | Current modified/staged/untracked paths; protected runtime/data/log/env paths | Preserve owner work and protected state. | Ownership/handoff determination before any mutation. |
| CREATE | Documentation authority index; branch/worktree ownership register; migration authority ADR | Add small canonical control artifacts. | Separate approved docs/spec lane; avoid duplicating staged candidate docs. |
| MOVE | Historical root reports/notes; dated validation snapshots | Move to explicit archive or correct docs class. | Reference/link search, owner review, redirect/update plan. |
| CONSOLIDATE | Skill mirrors; architecture indexes; CI/release repeated jobs; Compose/start scripts; database migrations | Establish one authoring/authority path and generated adapters where necessary. | Compatibility matrix, characterization tests, approved migration plan. |
| ARCHIVE | `ui/dashboard/`; superseded architecture/scaffold/progress docs; closed initiative artifacts | Retain history outside active authority paths. | Dashboard parity and route/dependency verification; owner approval. |
| DEPRECATE | Ambiguous boot scripts and noncanonical Compose entry points | Mark, warn, migrate consumers, then retire. | One ratified deployment contract and rollback test. |
| DELETE CANDIDATE | Tracked generated output, `supabase/.temp/cli-latest`, duplicate example sessions, obsolete mirrors | Remove from tracked source only if proven generated/unused. | Hash/reference/consumer inventory, backup, exact target list, explicit `proceed`. |

### Active-work exclusions

The following observed work is explicitly excluded from cleanup classification until its owner and initiative state are confirmed:

- Staged `docs/system/AGENT_DELEGATION_AND_VERIFICATION_STANDARD.md`
- Staged `docs/system/AGENT_OPERATIONS_CONTROL_PLANE_SPEC.md`
- Staged `docs/system/WORKFLOW_CONSTITUTION_TEMPLATE.md`
- Untracked `docs/specs/repo-pruner.md`
- Untracked `fixtures/`, `ops/domain-operations/`, `scripts/sync-agent-skill.mjs`, `skills/repo-pruner/`, and `tests/repo-pruner/`

## 19. Prioritized Migration Plan

### Stage 0 — Freeze structural mutation and establish truth

- Preserve all current dirty work.
- In a separately approved isolated worktree, fetch and record exact GitHub main.
- Assign owners/disposition to active worktrees, branches, PRs, and uncommitted initiatives.
- Do not run automated cleanup against the current root working copy.

### Stage 1 — P0 authority stabilization

- Restore green CI on Linux and verify local/CI parity.
- Remediate production dependency audit findings at an exact SHA.
- Protect `main` with required reviews/checks and verify effective rules.
- Obtain external evidence for secret rotation/invalidation.
- Ratify one Compose/deploy/start contract and remove insecure fallback behavior from active paths.

### Stage 2 — Canonical maps

- Ratify documentation/architecture authority index.
- Decide database migration authority and dashboard migration plan.
- Ratify Node/npm/toolchain versions.
- Establish authored-versus-generated skill distribution contract.

### Stage 3 — Reversible consolidation

- Move and relabel historical docs with redirects/link updates.
- Generate tool adapters from one skill source and validate every supported harness.
- Consolidate CI jobs using reusable workflows while preserving evidence classes.
- Move stable examples into fixtures and stop creating new tracked runtime output.

### Stage 4 — Tested structural changes

- Archive `ui/dashboard/` only after parity, route, build, dependency, and rollback checks.
- Consolidate migration directories with dry-run and rollback evidence.
- Decompose large modules one bounded behavior at a time under characterization tests.
- Add lint, cross-platform cleanup, E2E, database integration, and broader coverage gates.

### Stage 5 — Destructive closeout

- Present exact delete/untrack targets, proof of redundancy, backup/restore method, and blast radius.
- Obtain a new explicit `proceed` for each destructive batch.
- Validate, commit, review, merge, and deploy as separate gates.

### Gate classification

| Action class | Examples |
|---|---|
| Safe after a separate docs approval | Authority index, ownership registry, supersession labels. |
| Requires technical review | Skill-generation contract, dashboard plan, migration ADR, workflow consolidation. |
| Requires test evidence | Compose unification, DB migration change, module extraction, UI archival. |
| Requires human/admin approval | Branch protection/rulesets, PR disposition, worktree cleanup, secret rotation, deploy settings. |
| Destructive/high risk | Delete/untrack, branch removal, migration application, production deployment, credential changes. |

## 20. Risks & Tradeoffs

| Decision | Benefit | Tradeoff / risk |
|---|---|---|
| Stabilize authority before cleanup | Prevents optimizing the wrong baseline. | Cosmetic disorder remains longer. |
| Preserve active dirty work | Avoids data loss and cross-initiative collision. | Root command center remains noncanonical until ownership is resolved. |
| Single authored skill source | Reduces 31-way drift and repository bloat. | Some tools may require physical copies; generation/packaging must be verified. |
| Archive legacy dashboard | Removes duplicate maintenance and dependency exposure. | Hidden route, data, or operator dependencies may be lost without parity testing. |
| One deployment contract | Reduces insecure or inconsistent launches. | Existing local operator habits and external infra may rely on legacy Compose. |
| One migration authority | Improves ordering and rollback truth. | Consolidation can break environment history if applied without database inventory. |
| Strong branch protection | Aligns GitHub behavior with policy. | Can block urgent work if required checks are flaky or admin recovery is undefined. |
| Broader mandatory gates | Improves evidence quality. | CI time and maintenance increase; flaky checks can reduce delivery reliability. |
| Archive stale docs | Improves discoverability. | External links and prior prompts may break unless redirects/index updates are included. |
| Split large modules | Lowers blast radius and improves ownership. | Premature decomposition can create abstractions without operational value. |

The primary opportunity cost is clear: broad cleanup would make the tree look simpler sooner, but it would consume attention while main protection, red security evidence, CI parity, deployment authority, and credential verification remain unresolved.

## 21. Recommended Next Action

Open a **new, separately authorized P0 authority-stabilization task** in an isolated worktree. Its first outcome should be a short approved spec—not cleanup—that names the exact GitHub `main` SHA and sequences:

1. preserve/hand off the dirty local root state;
2. reproduce and fix the Linux temp cleanup failure;
3. remediate the high-severity production audit finding;
4. propose and verify `main` protection/rules;
5. ratify the canonical Compose/deploy/start path; and
6. obtain operator evidence for credential rotation.

Do not start skill deduplication, dashboard archival, migration consolidation, generated-artifact removal, branch pruning, or worktree cleanup until that P0 lane is green and separately approved.

### Operability test

Scoring: Pass = 1, Partial = 0.5, Fail = 0.

| Question | Result | Evidence |
|---|---:|---|
| 1. Can a new agent identify the repository’s purpose? | Pass | README, package identity, root policy, and architecture docs. |
| 2. Can it identify one current source of truth for each major domain? | Partial | Policy is clear; architecture, deployment, DB, UI, and roadmap are fragmented. |
| 3. Can it identify all active work without human context? | Fail | Work is spread across dirty status, 9 worktrees, 60 local branches, 16 PRs, and candidate/untracked specs. |
| 4. Can it determine where new work belongs? | Partial | DOX and worktree protocol help; dashboard, migrations, skills, and deployment paths remain ambiguous. |
| 5. Can it determine the required branch/worktree workflow? | Pass | Canonical one-task/one-branch/one-worktree protocol exists. |
| 6. Can it determine permissions and protected actions? | Pass | Safety policy and implementation gates are explicit. |
| 7. Can it determine relevant validation? | Pass | Validation registry, package scripts, tests, and workflows are discoverable. |
| 8. Can it distinguish proposal, assessment, implementation, and approval? | Pass | Policies and document statuses make the distinction explicit. |
| 9. Is the governed path to `main` technically enforced? | Fail | GitHub branch protection API reports `main` is not protected. |
| 10. Can it close out work with a reliable current-state record? | Partial | Handoff protocol exists, but current branch/worktree/PR and historical report drift reduces reliability. |

**Operability score: 6.5/10.**

Interpretation: a capable agent can work safely after a careful diagnosis pass, but the repository is not yet self-explanatory or technically governed enough for low-context autonomous cleanup.

## Assessment closeout

- Assessment artifact created: `docs/repository-assessment.md`
- Cleanup implementation performed: none
- Existing files moved, deleted, renamed, staged, or normalized: none
- Git refs fetched or changed: none
- Commit/push/PR/merge/deployment performed: none
- Production or external configuration changed: none
- Secret values read or modified: none

This report ends Phase 1. Every remediation remains a proposal subject to its own scoped plan, exact file list, validation plan, and operator approval.
