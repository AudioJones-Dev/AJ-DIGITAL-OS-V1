---
name: prune-reachability
description: Verify whether pruning candidates are reachable through imports, routes, jobs, webhooks, configuration, registries, dynamic dispatch, or public interfaces. Use after prune-inventory.
argument-hint: "[candidate-path-or-symbol]"
---

# Trigger

Use after `prune-inventory` or when given a specific symbol/file suspected to be dead.

# Inputs

- Candidate path, symbol, or candidate report from `$ARGUMENTS`.
- Root `AGENTS.md`, `CLAUDE.md`, and applicable path policy.
- Source, tests, routes, manifests, configuration, docs, deployment files, and public exports.

# Procedure

1. Find direct imports, calls, re-exports, references, and tests.
2. Search route definitions, endpoint annotations, API schemas, RPC mappings, GraphQL resolvers, CLI registrations, webhooks, and event consumers.
3. Search queues, scheduled jobs, cron configuration, worker manifests, serverless functions, and deployment configuration.
4. Search dependency-injection containers, decorators, reflection, plugin registries, file discovery, dynamic imports, and string-based dispatch.
5. Search environment variables, feature flags, remote config, docs, examples, templates, migrations, customer/tenant config, and integration manifests.
6. Inspect package/public exports and versioned API surfaces.
7. Record concrete evidence for and against reachability. Do not infer safety from silence.

# Safety gates

- Read/report only. Do not edit or delete code.
- Public interfaces, callbacks, migrations, webhooks, jobs, plugins, and dynamic code are never SAFE TO PLAN without affirmative evidence that the contract is retired.
- If dynamic reachability cannot be established, return `INSUFFICIENT EVIDENCE` or `NEEDS OWNER CONFIRMATION`.

# Output contract

Assign exactly one decision per candidate:

- SAFE TO PLAN
- NEEDS OWNER CONFIRMATION
- RETAIN
- INSUFFICIENT EVIDENCE

For each candidate report decision, confidence, direct evidence, indirect checks, files/configs inspected, contradictions, missing evidence, and recommended next action.

Do not make edits.
