---
name: prune-inventory
description: Identify possible dead code, unused exports, unused dependencies, unreachable branches, and obsolete feature-flag paths without changing files. Use for codebase cleanup or dead-code audit requests.
argument-hint: "[path-or-module]"
---

# Trigger

Use when asked to find dead code, unused code, stale dependencies, obsolete feature paths, or pruning candidates.

# Inputs

- Target path or module from `$ARGUMENTS`.
- Root `AGENTS.md`, `CLAUDE.md`, and path-scoped `AGENTS.md` instructions.
- Existing package scripts, CI configuration, compiler, linter, test, build, and static-analysis configuration.
- Source, tests, docs, config, manifests, and Git metadata available in the repository.

# Procedure

1. Read applicable agent instructions before inspection.
2. Identify languages, package managers, build systems, test runners, linters, type checkers, routers, job frameworks, and config layout.
3. Run only existing read-only or non-mutating analysis commands where available. Do not install tools.
4. Search for unused imports, private symbols, modules, exports, unreachable branches, stale feature flags, obsolete fallbacks, and dependencies absent from source/config references.
5. Identify likely dynamic-entry-point risks for every candidate.
6. Do not promote public exports, endpoints, jobs, callbacks, registries, CLI commands, migrations, or dynamically loaded modules to HIGH confidence at inventory stage.

# Safety gates

- Read/report only. Do not edit, delete, format, install, upgrade, or rewrite files.
- Static-analysis output is candidate evidence, not deletion authorization.
- Lack of references, tests, coverage, or recent Git activity is not proof of dead code.
- Follow root protected-path and approval rules.

# Output contract

Return a table with:

- Candidate
- Location
- Category
- Initial confidence: HIGH / MEDIUM / LOW
- Static evidence
- Likely indirect-entry-point risks
- Recommended next check

End with candidate totals, proposed `prune-reachability` scope, commands run/results, and an explicit statement that no code modifications were made.
