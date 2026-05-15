# AGENTS.md

Canonical operating contract for every AI agent and human contributor working in this repository.

This file is the master rulebook. Every agent (Claude, Codex, Copilot, OpenHands, Dispatch, Cursor, etc.) MUST read this before taking action. When in doubt, defer to this document.

---

## 1. Repository Mission

AJ Digital OS is a local-first, approval-gated AI workflow operating system for AJ Digital LLC. It exists to:

- Run deterministic, file-backed workflows for content, distribution, intelligence, and operator tasks.
- Keep humans authoritative for any state-mutating action via the approval lifecycle.
- Stay operable from a terminal CLI, with optional local web/dashboard surfaces.
- Provide a substrate for future SaaS expansion without compromising local-first defaults.

The repository is maintained as the single source of truth for the AJ Digital OS runtime.

---

## 2. Authority Hierarchy

When agents disagree about behavior, resolve in this order:

1. `AGENTS.md` (this file) — operating contract for all agents.
2. `CLAUDE.md` — Claude-specific overlay; never overrides this file.
3. `docs/PRD.md` — product definition.
4. `docs/DESIGN.md` — architecture navigation index.
5. `docs/system/` and `docs/architecture/` — canonical architecture specifications.
6. `docs/SECURITY.md` — security and trust requirements.
7. `docs/DEPLOYMENT.md` — deployment paths and runbooks.
8. `docs/DECISIONS.md` — architectural decisions (ADRs).
9. `README.md` — operator entry point.

Anything not covered here defers to existing tested code.

---

## 3. Branch Strategy

- `main` is protected. Never push directly.
- Feature work happens on short-lived branches with the prefix matching the agent or topic, e.g.
  - `claude/<topic>-<slug>`
  - `codex/<topic>-<slug>`
  - `feat/<topic>`, `fix/<topic>`, `docs/<topic>`, `chore/<topic>`
- One branch = one cohesive change. Do not bundle unrelated work.
- Rebase on `main` before requesting review when behind.

---

## 4. Pull Request Expectations

Every PR must:

- Have a descriptive title (≤70 chars).
- Use the template in `.github/pull_request_template.md`.
- State the why before the what.
- List validation commands actually run locally.
- Note any docs updated.
- Stay open as a draft until CI is green.

PRs may be merged only when:

- CI is green.
- The change is reviewed (human or designated agent).
- No unresolved review threads exist.

---

## 5. Validation Gates

Before pushing or requesting review, run the local preflight that mirrors CI:

```bash
npm ci
npm run typecheck
npm run build
npm run test
npm run coverage
npm audit --audit-level=high
```

A change that breaks any of these is not ready. Do not bypass with `--no-verify`, `--skip-tests`, or equivalent flags.

---

## 6. Canonical Directories

```
src/                  application source (TypeScript)
dashboard/            Next.js dashboard (separate workspace)
docs/                 canonical documentation
docs/system/          system-level architecture specs
docs/architecture/    layer and module specs
docs/ops/             ops runbooks
docs/deployment/      deployment runbooks
docs/intelligence-layer/ intelligence module specs
docs/_archive/        superseded or historical docs (do not delete)
compose/              canonical docker-compose definition
monitoring/           prometheus, grafana, alertmanager, blackbox configs
ops/                  ops infrastructure scaffolds (otel, grafana, prometheus)
scripts/              project-level scripts
sql/                  schema and SQL artifacts
supabase/             local supabase project metadata
tests/                test suites
.github/              workflows and PR template
```

Do not introduce new top-level directories without an ADR in `docs/DECISIONS.md`.

---

## 7. Runtime State Rules

These directories hold runtime state and MUST NOT be committed:

- `data/`
- `memory/`
- `output/`
- `sessions/`
- `runtime/cache/`
- `dist/`
- `node_modules/`
- `logs/`
- `backups/`
- `dashboard/.next/`

These are enforced by `.gitignore`. If you create new runtime directories, extend `.gitignore` in the same change.

Local AI tool config directories (`.claude/`, `.codex/`, `.cursor/`, `.windsurf/`, etc.) are ignored. Do not check them in. If you need to share agent configuration, add it under `docs/` or `AGENTS.md`.

---

## 8. No-Secrets Policy

- Never commit `.env`, `env/.env`, secret keys, API tokens, Supabase service-role keys, or signed cookies.
- `.env.example` is the only allowed environment template.
- Production secrets live in the deployment platform's secret store; never in source.
- If a secret leaks into a commit, rotate immediately and follow `docs/SECURITY.md`.

---

## 9. Architecture Authority

The canonical architecture lives under `docs/system/` and `docs/architecture/`. Specifically:

- Master schema: `docs/system/AJ_DIGITAL_OS_MASTER_ARCHITECTURE_SCHEMA.md`
- Layer model: `docs/architecture/AJ_DIGITAL_OS_LAYER_MODEL_SPEC.md`
- Layer coverage: `docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`
- Security/trust: `docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md`
- Approval system: `docs/system/AJ_DIGITAL_OS_APPROVAL_SYSTEM_SPEC.md`
- MCP secure execution: `docs/system/AJ_DIGITAL_OS_MCP_SECURE_EXECUTION_LAYER_SPEC.md`
- Permission enforcement: `docs/system/AJ_DIGITAL_OS_AGENT_PERMISSION_ENFORCEMENT_SPEC.md`
- Multi-tenant isolation: `docs/system/AJ_DIGITAL_OS_CLIENT_ISOLATION_MULTI_TENANT_SPEC.md`

Root-level historical drafts (`aj-digital-agent-architecture.md`, `aj-digital-os-scaffold-and-schema.md`, `copilot-build-prompt-aj-digital-os.md`) are HISTORICAL. Do not treat them as current.

---

## 10. Destructive-Action Policy

Never take a destructive action without explicit, in-scope user authorization. This includes:

- Deleting or moving source files.
- Renaming directories.
- Force-pushing.
- `git reset --hard` against shared branches.
- Dropping schemas, tables, or records.
- Removing dependencies.
- Killing background processes you did not start.
- Modifying CI/CD workflows in ways that change deployment behavior.

If in doubt: stop and ask. Authorization is scoped to the action requested, not "all future actions of this kind."

---

## 11. Testing Requirements

- New runtime behavior requires a test.
- Bug fixes require a regression test when feasible.
- Coverage thresholds in `vitest.config.ts` are floors, not ceilings.
- Do not weaken coverage thresholds to get a PR through.
- Do not skip tests with `.skip` to avoid fixing them. Mark broken tests with a tracked issue if they must be paused.

---

## 12. Documentation Update Policy

If a change affects:

- Operator workflow → update `README.md` and `docs/operator-playbook.md`.
- Architecture → update the relevant spec under `docs/system/` or `docs/architecture/`.
- Deployment → update `docs/DEPLOYMENT.md` and the relevant runbook under `docs/deployment/`.
- Security/trust → update `docs/SECURITY.md`.
- Roadmap → update `docs/ROADMAP.md`.
- Architectural decision → add an entry to `docs/DECISIONS.md`.
- Public surface (CLI flags, env vars, scripts) → update `README.md` AND `CHANGELOG.md` `[Unreleased]`.

Documentation drift is a defect. Treat it accordingly.

---

## 13. Generated and Vendored Files

- `dist/` is generated. Do not edit directly.
- `package-lock.json` is the lockfile of record. Do not delete or replace casually.
- `skills-lock.json` is the manifest for installed skill packs.
- Do not commit IDE caches, OS metadata (`.DS_Store`, `Thumbs.db`), or compiled artifacts.

---

## 14. Commit Conventions

Use Conventional Commits for clarity:

- `feat:` new user-facing capability
- `fix:` bug fix
- `docs:` documentation only
- `chore:` tooling, config, or maintenance
- `refactor:` no behavior change
- `test:` test-only changes
- `ci:` CI/CD changes
- `perf:` performance improvement

Subject ≤72 chars. Body explains the why.

Do not include AI provider/model identifiers in commit messages, PR titles, code comments, or any pushed artifact.

---

## 15. CI Expectations

CI runs on `pull_request` and `push` to `main` via:

- `.github/workflows/ci.yml` — install, typecheck, build, test, coverage.
- `.github/workflows/security-audit.yml` — npm audit + secret/dependency scanning.

A red CI is a stop sign. Investigate root cause; do not retry until green by chance.

---

## 16. Infra Ownership Boundaries

| Concern        | Canonical location                            |
|----------------|-----------------------------------------------|
| Compose stack  | `compose/docker-compose.yml` (canonical)      |
| Root compose   | `docker-compose.yml` (legacy/top-level usage) |
| Monitoring     | `monitoring/`                                 |
| Ops scaffolds  | `ops/`                                        |
| Dashboard app  | `dashboard/` (Next.js, separate workspace)    |
| CLI runtime    | `src/`                                        |
| Schemas/SQL    | `sql/` and `supabase/`                        |

If `compose/docker-compose.yml` and the root `docker-compose.yml` diverge, treat the version under `compose/` as canonical and reconcile.

---

## 17. Rules for Autonomous Agents

Agents that run without per-action human approval MUST:

- Stay inside the scope explicitly granted in the task prompt.
- Never execute destructive operations (Section 10) without confirmation.
- Stop and report when assumptions break, instead of "creatively" recovering.
- Not invent new top-level directories, scripts, or commands.
- Not modify `.github/workflows/` without explicit instruction.
- Not modify `package.json` `scripts` to satisfy outdated docs — fix the docs.
- Not silently delete or rename existing files to "clean up."
- Not rewrite history (`rebase -i`, `commit --amend` on pushed commits, force-push).

When the task is unclear, ask. The cost of one clarifying question is always lower than the cost of an unwanted change.

---

## 18. Operator Trust Model

AJ Digital OS treats the human operator as authoritative. Concretely:

- Approval-gated mutations: every state-changing action passes through the approval lifecycle (`pending_approval` → `approved` → `executed` / `rejected`).
- Local-first: by default, runs and outputs persist to the local filesystem.
- Telegram is the current control-plane channel for approvals.
- Webhook handlers require signed requests (HMAC SHA-256, freshness window, replay protection).

Agents extending the system MUST preserve these properties.

---

## 19. Quick Reference

| Need to…                     | Read…                                          |
|------------------------------|------------------------------------------------|
| Understand the product       | `docs/PRD.md`                                  |
| Understand the architecture  | `docs/DESIGN.md` then `docs/system/`           |
| Run the system locally       | `README.md` "Build And Run"                    |
| Deploy                       | `docs/DEPLOYMENT.md`                           |
| See current roadmap          | `docs/ROADMAP.md`                              |
| Understand a decision        | `docs/DECISIONS.md`                            |
| Report a security issue      | `SECURITY.md` → `docs/SECURITY.md`             |
| Operate the running system   | `docs/operator-playbook.md`                    |
| Recover from failure         | `docs/recovery-playbook.md`                    |

---

This contract is intentionally short, opinionated, and binding. Update via PR with a corresponding entry in `docs/DECISIONS.md` when material changes are made.
