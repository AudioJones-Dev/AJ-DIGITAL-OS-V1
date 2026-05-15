# Changelog

All notable changes to AJ Digital OS will be documented in this file.

The format is based on Keep a Changelog and uses Semantic Versioning principles.

## [Unreleased]

### Added
- Control Plane v1 with run registry, audit log, and MAP attribution framework integrated to main.
- Operating Core v1: command envelope, policy engine, idempotency, schema registry, system event ledger, file-backed metrics.
- BEL v3 linear execution runtime; BEL v4 DAG execution layer with cycle detection, retry, and per-node audit.
- Cache Augmentation Layer with five file-backed namespaces and policy engine.
- Operational Retrieval Layer with document and chunk store, keyword search, and context-pack generator.
- MAP / CERA decision engine for opportunity scoring and decision path.
- Dashboard enforcement binding layer; Next.js command center dashboard v1.
- Qualification engine v1 for deterministic business-readiness gating before deployment (PR #16).
- Documentation review checklist consolidation (PR #14) and post-cycle commit review / mergeability assessment artifacts (PR #18, 2026-04-27).
- Layer Coverage Index and Module Traceability Map for the 16-layer architecture model.
- AJ Digital OS Layer Model Spec v1.0.
- Foundational readiness docs: `AGENTS.md`, `CLAUDE.md`, `docs/PRD.md`, `docs/ROADMAP.md`, `docs/DESIGN.md`, `docs/SECURITY.md`, `docs/DEPLOYMENT.md`, `docs/DECISIONS.md`, root `SECURITY.md`.

### Changed
- Approval service file persistence stabilized with race/ordering fixes for tests and file store interactions.
- Control plane bound to the enforcement engine and approval system through `executeWithEnforcement`.
- Security audit workflow now includes a gitleaks secret-scanning job alongside `npm audit`.
- Removed temporary merge helper scripts after integration window closed.

### Fixed
- Approval service persistence test reliability under concurrent state updates.

## [0.1.0] - 2026-04-02

### Added
- Local-first TypeScript workflow runtime with file-based run persistence, state transitions, validation, and workflow registry support.
- Core workflow layer including blog authority and transcript-to-content workflows.
- Approval-gated orchestration with approval packets, Telegram request delivery, approval resolver, and pending approval lifecycle support.
- Execution system with execution policy, coordinator, resumer, execution agent, publish router, and local publisher.
- Observability layer with run tracker, run summary, run dashboard, and terminal-facing inspection commands.
- Operator command layer covering overview, inspection, queue management, approval, execution, resume, and unified operator console flows.
- Installable CLI packaging with compiled entrypoint, `bin` configuration, linkable local usage, and CLI-oriented npm scripts.
- Operator, recovery, architecture, and publish-readiness documentation under `README.md` and `docs/`.

### Changed
- Root exports were consolidated through a dedicated command barrel for cleaner command-layer imports.
- Packaging was tightened around compiled CLI distribution with explicit publish files and local link workflow support.

### Fixed
- CLI entrypoint packaging was normalized so the compiled `dist/cli.js` is executable-ready for linked CLI usage.
- Command and entrypoint typing issues were resolved to keep strict TypeScript and exact optional property settings compiling cleanly.
