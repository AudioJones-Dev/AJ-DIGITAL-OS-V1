# AJ Digital OS — Legacy Tree Migration Spec (`C:\AJ-DIGITAL-OS` → canonical)

**Type:** Migration specification (spec only — no files moved by this document)
**Status:** Draft — awaiting per-phase `proceed`
**Canonical repo:** `C:\dev\AJ-DIGITAL-OS` (git, branch `main`)
**Legacy tree:** `C:\AJ-DIGITAL-OS` (NOT a git repo; ~177 files, ~940K; last modified Apr 9 – May 23 2026)
**Governed by:** `docs/system/AJ_DIGITAL_OS_AGENTIC_CONTEXT_ENGINEERING_STANDARD_SPEC.md`

> This spec performs no migration. It classifies the legacy tree and defines a safe, phased, reversible plan. No file is copied, moved, or deleted until the operator approves a specific phase with `proceed`.

---

## 1. Executive Diagnosis

`C:\AJ-DIGITAL-OS` is the **earlier pilot / operational implementation and machine-remediation working directory** that predates the canonical TypeScript repo at `C:\dev\AJ-DIGITAL-OS`. It is **not** a duplicate and **not** under version control, so none of its contents are backed by git history.

- **Source material / superseded:** the `aj-digital-os-starter/` specs and `docs/` design notes are ancestors of the canonical `docs/architecture/` set — likely superseded, must be diffed before any migration.
- **Genuinely unique value (real gaps):** the 8 `n8n/` pipeline workflows, the ~30 PowerShell content-pipeline scripts, and the `config/*.json` files. These have no equivalent in canonical (canonical `n8n/` is an empty `workflows/` dir; canonical `scripts/` are infra/boot/git/backup only; canonical has no root `config/`).
- **Unsafe to migrate as-is:** `diagnostics/` contains machine-forensic and security artifacts (NetSupport/RAT remediation, registry exports, environment dumps, `credential-validation.md`) and operational `logs/`. These must be treated as sensitive and must not enter the git repo without secret scanning and a deliberate archive decision.

Bottom line: migrate reusable automation + config (after scrubbing), fold unique doctrine/policy content into canonical docs, archive security history outside the repo, and leave transient exhaust behind.

## 2. File Inventory and Classification

Classification keys: **MIGRATE** (unique, reusable, low-risk), **DIFF FIRST** (may be superseded — compare before deciding), **ARCHIVE** (keep out of live git repo), **LEAVE** (transient exhaust), **DO NOT MIGRATE** (sensitive/forensic).

| Path (legacy) | Contents | Classification |
|---|---|---|
| `n8n/*.json` (8) | analytics-ingestion, approval-pipeline, client-routing, delivery-pipeline, feedback-loop, inbox-ingestion, processing-pipeline, youtube-publishing | **MIGRATE** → canonical `n8n/workflows/` |
| `scripts/*.ps1` (~30) | content pipeline: process-transcript, process-clips, publish-youtube, publish-social, route-to-client, distribution-scheduler/-status, telegram approval, ingest-analytics, watch-inbox, etc. | **MIGRATE** → canonical `scripts/content-pipeline/` |
| `config/ai.config.json`, `distribution.config.json`, `drive-registry.json`, `pilot-activation.config.json`, `pipeline.config.json`, `config/workflows/` | pipeline/runtime config | **DIFF FIRST + secret-scan** → migrate as `.example` if values are live |
| `aj-digital-os-starter/*.md` (5 specs) | full product architecture, local agent system, memory agent runtime, model routing, unified memory integration | **DIFF FIRST** vs `docs/architecture/` — likely superseded; migrate only unique content |
| `aj-digital-os-starter/aj-digital-os-starter/` (nested app: src, memory, vector-memory, package.json) | early starter app | **DIFF FIRST** — almost certainly superseded by canonical `src/`; do not migrate code blind |
| `docs/aj-digital-*.md` (4: data-schema, pipelines, trigger-map, automation-hooks) | early schema/pipeline design | **DIFF FIRST** → fold unique parts into `docs/architecture/` |
| `diagnostics/approval-gate-rules.md`, `local-first-path-policy.md`, `local-first-policy.md`, `pilot-rollback-procedure.md`, architecture/finalization reports | doctrine/policy with reuse value | **ARCHIVE / fold content** into `docs/system/` or `memory/decisions/` (don't copy files blind) |
| `diagnostics/netsupport-*.{json,txt,reg,lnk}` | RAT remediation forensic record | **DO NOT MIGRATE** to git → controlled archive only |
| `diagnostics/prechange-*.{reg,txt}`, `credential-validation.md`, `machine-baseline.txt`, `*environment-variables.txt` | registry/env/credential dumps | **DO NOT MIGRATE** (assume secrets) → controlled archive only |
| `logs/*`, `scripts/audit-run.log`, `scripts/inventory.json` | operational log exhaust | **LEAVE** |
| `reports/distribution-approval-feedback-report.md`, `claude-projects/local-systems-hygiene` | one-off report / hygiene notes | **DIFF FIRST / LEAVE** |

## 3. Secret / Security Risk Classification

Treat all of the following as **sensitive until proven otherwise**; do not display values; do not commit to git:

| Artifact | Risk | Required handling |
|---|---|---|
| `config/*.json` | May embed API keys, drive IDs, tokens | Secret-scan; migrate only sanitized `.example` shapes |
| `credential-validation.md` | Likely credentials | Do not migrate; archive in access-controlled location |
| `prechange-*-Run.reg`, `prechange-environment-variables.txt` | Registry/env dumps; possible secrets + machine identifiers | Do not migrate; archive |
| NetSupport/RAT artifacts (`netsupport-*`) | Security-forensic; machine identifiers, hashes | Do not migrate to git; retain as security record outside repo |
| `machine-baseline.txt`, scheduled-tasks/services dumps | Machine fingerprint | Do not migrate; archive |

Tooling: run a secret scan (e.g. gitleaks/trufflehog or repo's existing secret-scan step) over any candidate before it touches the git index.

## 4. Proposed Canonical Destinations

- **n8n workflows** → `C:\dev\AJ-DIGITAL-OS\n8n\workflows\` (additive; namespaced filenames to avoid collisions).
- **Content-pipeline scripts** → `C:\dev\AJ-DIGITAL-OS\scripts\content-pipeline\` (new subfolder; keeps them separate from infra/boot scripts).
- **Scrubbed config** → `C:\dev\AJ-DIGITAL-OS\config\` as `*.config.example.json` only; real values stay in Doppler / `.env` (never committed).
- **Doctrine / policy content** → folded into `docs/system/` (governance) or `docs/architecture/`; original legacy files not copied verbatim.
- **Migration decision record** → `memory/decisions/` entry capturing what moved, what was archived, and why.
- **Security / forensic history** → access-controlled archive **outside** the git repo (operator-chosen location).

## 5. Phase Plan

| Phase | Scope | Risk | Gate |
|---|---|---|---|
| **Phase 0** | Commit doctrine work; repair git health (commit-graph + `legacy/HEAD`); clear stale `.git/index.lock` | Low | operator clears lock, then `proceed` |
| **Phase 1** | Migrate 8 n8n workflows → `n8n/workflows/` | Medium | `proceed` |
| **Phase 2** | Migrate content-pipeline scripts → `scripts/content-pipeline/` | Medium | `proceed` |
| **Phase 3** | Create sanitized `config/*.config.example.json` only (after secret scan) | Medium | `proceed` |
| **Phase 4** | Fold unique `docs/` + `diagnostics/` policy doctrine into `docs/system`/`docs/architecture`; write `memory/decisions/` record | Low | `proceed` |
| **Phase 5** | Move sensitive/security history to controlled archive outside repo | High | operator-led |
| **Phase 6** | Deprecate legacy tree: add `README` pointer to canonical; do not delete until operator confirms | Low | `proceed` |

## 6. Acceptance Criteria (per phase)

- **Phase 0:** `git status --short` clean except intended commit; `git fsck --full` reports no errors; index.lock gone.
- **Phase 1:** 8 workflows present in `n8n/workflows/`, valid JSON, no overwrite of existing files, diff reviewed.
- **Phase 2:** scripts in `scripts/content-pipeline/`, no name collisions with infra scripts, no secrets embedded.
- **Phase 3:** only `*.example` config committed; secret scan passes; real values confirmed absent.
- **Phase 4:** unique doctrine folded in; no duplicate source-of-truth created; decision record written.
- **Phase 5:** sensitive artifacts archived outside git; nothing forensic in repo history.
- **Phase 6:** legacy tree carries a deprecation README; canonical is sole source of truth.

## 7. Exact Next Recommended Action

Execute **Phase 0** first: operator clears `C:\dev\AJ-DIGITAL-OS\.git\index.lock`, then the doctrine commit and git-health repair run. Only after Phase 0 is green should Phase 1 (n8n workflows) begin. Phases 3 and 5 (config + security artifacts) are the highest-risk and must not be rushed.

> No migration is performed by this document. Each phase requires explicit `proceed`.
