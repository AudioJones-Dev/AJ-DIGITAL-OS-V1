# Changelog

All notable changes to AJ Digital OS will be documented in this file.

The format is based on Keep a Changelog and uses Semantic Versioning principles.

## [Unreleased]

### Added
- 

### Changed
- 

### Fixed
- 

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
