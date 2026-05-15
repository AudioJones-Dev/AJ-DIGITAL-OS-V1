# AJ Digital OS

A local-first, approval-gated AI workflow operating system. The CLI is the primary operator surface; a local web shell and a Next.js command-center dashboard sit alongside it.

For agent operating contract see [`AGENTS.md`](AGENTS.md).
For product definition see [`docs/PRD.md`](docs/PRD.md).
For architecture navigation see [`docs/DESIGN.md`](docs/DESIGN.md).
For deployment see [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).
For security policy see [`docs/SECURITY.md`](docs/SECURITY.md).

---

## Repository Structure

```
src/                  application source (TypeScript)
dashboard/            Next.js command-center dashboard (separate workspace)
docs/                 canonical documentation (PRD, DESIGN, ROADMAP, DECISIONS, SECURITY, DEPLOYMENT, system, architecture, ops)
compose/              canonical docker-compose definition
monitoring/           prometheus, grafana, alertmanager, blackbox configs
ops/                  ops infrastructure scaffolds (otel, grafana, prometheus)
scripts/              project-level scripts
sql/                  schema + SQL artifacts
supabase/             supabase project metadata
tests/                test suites
.github/              workflows + PR template
skills/               markdown-defined skills
```

Runtime state (`data/`, `memory/`, `output/`, `sessions/`, `runtime/cache/`, `dist/`, `logs/`) is gitignored by design. See [`docs/SECURITY.md`](docs/SECURITY.md) for the runtime-state policy.

---

## Local-First Architecture

- Run state, conversation history, semantic memory, deliverables, and outputs persist to the local filesystem.
- Live model inference is Ollama-first; other providers (OpenAI, Anthropic, LM Studio) are scaffolded but not the supported live path for staging (see [`docs/DECISIONS.md`](docs/DECISIONS.md) ADR-0005).
- Approval gating is mandatory for state-mutating actions.
- The system is operable offline for advisory and local workflow execution.

---

## Build And Run

```bash
npm install
npm run build
npm run cli -- help
```

The compiled CLI lands at `dist/cli.js`. The repo also exposes a `bin` entry of the same name for linked installs.

### Available npm Scripts

The package exposes a deliberately small set of npm scripts. Every CLI subcommand is reachable via `npm run cli -- <command>`.

```bash
npm run build              # tsc → dist/
npm run typecheck          # tsc --noEmit
npm run cli                # node dist/cli.js
npm run cli:help           # npm run cli -- help
npm run cli:dashboard      # npm run cli -- dashboard
npm run cli:console        # npm run cli -- operator-console
npm run cli:pending        # npm run cli -- list-pending-approvals
npm run cli:approved       # npm run cli -- list-approved-runs
npm run cli:failed         # npm run cli -- list-failed-runs
npm run cli:executed       # npm run cli -- list-executed-runs
npm run cli:track          # npm run cli -- track-run
npm run cli:summary        # npm run cli -- run-summary
npm run cli:events         # npm run cli -- run-events
npm run cli:approve        # npm run cli -- approve-run
npm run cli:execute        # npm run cli -- execute-run
npm run cli:resume         # npm run cli -- resume-run
npm run control-plane:start  # node --import ./dist/env.js dist/control-plane/index.js
npm run link:local         # npm run build && npm link
npm run test               # vitest run
npm run test:watch         # vitest
npm run coverage           # vitest run --coverage
```

### CLI Surface

The CLI exposes many subcommands beyond the npm shortcuts above. They are invoked uniformly via `npm run cli -- <command>` or, after `npm link`, as `aj-digital-os <command>`.

#### Overview

- `assistant` — run the local assistant runtime (advisory by default; orchestrated when explicitly requested)
- `assistant-start` — verify readiness then launch the single-task assistant path
- `assistant-history` — inspect recent assistant task history
- `conversation-history` — inspect persisted conversation threads
- `deliverables` — inspect the deliverable registry and routed output paths
- `list-pending-deliverables` — inspect deliverables waiting for explicit approval
- `memory-search` — search the local semantic memory index
- `memory-stats` — semantic memory counts and storage paths
- `memory-index` — rebuild or ingest the semantic memory index
- `assistant-shell` — terminal-native conversational shell
- `ui-start` — start the local-first web/chat shell
- `help` — list operator commands
- `healthcheck` — validate runtime configuration, writable directories, provider readiness
- `dashboard` — system-wide run metrics
- `ollama-probe` — probe the live Ollama JSON generation path
- `operator-console` — unified operator console with queues and summary

#### Inspection

- `run-summary` — single-run lifecycle, approvals, outputs, warnings, errors
- `run-events` — raw event stream for a run
- `track-run` — combined summary + event history

#### Queues

- `list-pending-approvals` — runs awaiting human approval
- `list-approved-runs` — runs ready for execution
- `list-failed-runs` — failed runs needing attention
- `list-executed-runs` — recently executed runs

#### Actions

- `approve-run` — resolve a pending approval decision
- `submit-for-approval` — move a draft deliverable into pending approval
- `approve-deliverable` — move a pending deliverable into approved
- `publish-deliverable` — publish an approved deliverable
- `execute-run` — trigger execution for an approved run
- `resume-run` — resume a run through the execution resumer

#### Setup

- `assistant-setup` — initialize writable runtime directories
- `assistant-doctor` — report assistant readiness
- `seed-demo` — generate a demo dataset

#### Architecture

- `tool-registry` — inspect MCP-ready tool/provider scaffolds
- `integration-profiles` — inspect API integration/provider profiles (secret references only)
- `model-profiles` — inspect model and fine-tune profile scaffolds

For the full subcommand list see `npm run cli -- help`.

### Example Operator Flow

```bash
npm run cli -- assistant-setup
npm run cli -- assistant-doctor
npm run cli -- assistant-start --brand aj-digital --task "Draft a short operator brief"
npm run cli -- assistant-history
npm run cli -- deliverables --brand aj-digital
npm run cli -- memory-search --query "approval lifecycle"
npm run cli:console
```

### Recommended Operator Flow

1. `npm run cli:console` — inspect overall system state.
2. `npm run cli -- assistant` in advisory mode for planning.
3. `npm run cli -- assistant --mode orchestrated` only when the request maps to a governed workflow.
4. `npm run cli:pending` — identify runs awaiting approval.
5. `npm run cli:approve --runId <id> --decision approve --actor <name>` — resolve a decision.
6. `npm run cli:approved` — inspect runs ready for execution.
7. `npm run cli:execute --runId <id> --target local` — execute.
8. `npm run cli:summary --runId <id>` — verify.

---

## Assistant Runtime

The assistant runtime is the operator-facing AI assistant layer over the workflow runtime.

- `assistant` defaults to **advisory** mode; orchestrated mode runs only when explicitly requested.
- `assistant-start` is the readiness-checked wrapper for installed/local use.
- Assistant invocations are recorded under `data/assistant/`.
- Conversation threads and turns are stored under `data/conversations/`.
- Semantic memory chunks, embeddings, and the index live under `data/memory/`.
- Deliverables route through `data/deliverables/registry/` with brand-aware output roots under `data/outputs/<brand>/{drafts,pending,approved,published}/`.
- The assistant respects approval flow, tool permission boundaries, and run lifecycle.
- The supported live provider scope is Ollama. Other provider scaffolds exist but are not part of the supported staging launch path (see [`docs/DECISIONS.md`](docs/DECISIONS.md) ADR-0005).
- Skills are loaded from markdown files under `skills/`.

### Assistant Install And Start

"Installed and configured" currently means:

- The project has been built and `dist/cli.js` exists.
- Ollama is installed locally, or `OLLAMA_EXECUTABLE` is set.
- The Ollama server is reachable at `OLLAMA_BASE_URL`.
- The expected local model is installed.
- Runtime directories under `data/` and `memory/` are writable (see [`docs/SECURITY.md`](docs/SECURITY.md) and `docs/deployment/production-readiness.md`).

Recommended local assistant flow:

```bash
npm install
npm run build
npm run cli -- assistant-setup
npm run cli -- assistant-doctor
npm run cli -- assistant-start --brand aj-digital --task "Summarize this transcript into a short operator advisory"
npm run cli -- assistant-history
npm run cli -- conversation-history
npm run cli -- assistant-shell --brand audio-jones
npm run cli -- ui-start
npm run cli -- deliverables
npm run cli -- list-pending-deliverables
npm run cli -- memory-index --rebuild
npm run cli -- memory-stats
```

If readiness fails, `assistant-setup` and `assistant-doctor` print exact next-step guidance.

### JSON Mode

Many commands support `--json` for machine-readable output:

```bash
npm run cli -- assistant-doctor --json
npm run cli -- assistant-start --task "Draft a short operator brief" --json
npm run cli -- dashboard --json
npm run cli -- run-summary --runId run_123 --json
npm run cli -- list-pending-approvals --json
npm run cli -- tool-registry --json
npm run cli -- integration-profiles --json
npm run cli -- model-profiles --json
```

---

## Local Web Shell

The local browser shell is started with:

```bash
npm run cli -- ui-start
```

What it includes:

- Left sidebar for sessions and navigation.
- Top controls for brand, agent/model profile, and mode.
- Main assistant chat panel with composer.
- Right-side brand, run, deliverable, and warning/error panels.
- Deliverable lifecycle badges with submit/approve/publish actions.
- Memory panel showing retrieved semantic context.
- Read-only views for tool registry, integration profiles, and model profiles.

What it does not yet do:

- It does not replace the CLI.
- It does not implement live OAuth or external messaging runtimes.
- It does not provide transcript editing or full thread management.

---

## Deployment Readiness

Run the runtime healthcheck before first deployment and during production startup:

```bash
npm run cli -- healthcheck
npm run cli -- healthcheck --json
```

Runtime behavior is local-first by default. For production validation set:

```env
AJ_OS_ENV=production
ACTIVE_MODEL_PROVIDER=ollama
ENABLED_MODEL_PROVIDERS=ollama
MEMORY_ENABLED=true
```

The healthcheck verifies:

- Provider-specific required env vars for enabled providers
- Writable runtime directories under `data/`
- Writable `memory/` when memory is enabled

Assistant readiness can be checked with:

```bash
npm run cli -- assistant-doctor
npm run cli -- assistant-doctor --json
```

See `docs/deployment/production-readiness.md` for the full startup checklist and deployment notes, and [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) for the deployment index.

### Staging Launch Path

The current production-like staging start path is documented in `docs/deployment/staging-runbook.md`. The repository does not yet ship a separate long-running web service entrypoint; the operator console in watch mode is the supported staging/production-like operational launch path.

```bash
npm run cli -- operator-console --watch
```

### Ollama Model Notes

The default routed model is `llama3.1:8b`. Override with:

```env
OLLAMA_MODEL=your-local-model-tag
```

For slower local models, raise the timeouts:

```env
OLLAMA_REQUEST_TIMEOUT_MS=300000
OLLAMA_TAGS_TIMEOUT_MS=15000
```

To validate the live provider path:

```bash
npm run cli -- assistant-doctor
npm run cli -- ollama-probe
npm run cli -- ollama-probe --json
```

---

## Installable CLI

### Local linking

```bash
npm install
npm run build
npm link
aj-digital-os help
aj-digital-os dashboard
```

One-step local flow:

```bash
npm run link:local
```

### Direct usage

```bash
aj-digital-os help
```

During local development the supported fallback is:

```bash
npm run cli -- help
```

---

## Local Preflight (mirrors CI)

Before opening a PR or pushing to `main`, run the same gates CI runs:

```bash
npm ci
npm run typecheck
npm run build
npm run test
npm run coverage
npm audit --audit-level=high
```

CI configuration: `.github/workflows/ci.yml` and `.github/workflows/security-audit.yml`.

---

## Testing

```bash
npm run test
npm run test:watch
npm run coverage
```

Coverage thresholds are enforced in `vitest.config.ts` for core lifecycle and webhook modules.

---

## Webhook Security Contract

Approval and execution webhook handlers require signed requests and reject unsigned traffic.

Required headers:

- `x-aj-signature`
- `x-aj-timestamp`
- `x-aj-nonce`
- `x-aj-webhook-id`

Canonical signing input:

```text
${timestamp}.${nonce}.${rawBody}
```

Behavior:

- HMAC SHA-256 verification using `AJ_WEBHOOK_SECRET`.
- Freshness enforcement via `AJ_WEBHOOK_MAX_SKEW_SECONDS` (default `300`).
- Replay rejection using nonce + webhook id with `AJ_WEBHOOK_REPLAY_TTL_SECONDS` (default `600`).
- Fail-closed if verification cannot be completed or the secret is missing.

Full security policy: [`docs/SECURITY.md`](docs/SECURITY.md).

---

## Where to Go Next

| Looking for…                          | Read…                                       |
|---------------------------------------|---------------------------------------------|
| Agent operating contract              | [`AGENTS.md`](AGENTS.md)                    |
| Claude-specific overlay               | [`CLAUDE.md`](CLAUDE.md)                    |
| Product definition                    | [`docs/PRD.md`](docs/PRD.md)                |
| Architecture navigation               | [`docs/DESIGN.md`](docs/DESIGN.md)          |
| Roadmap                               | [`docs/ROADMAP.md`](docs/ROADMAP.md)        |
| Architectural decisions               | [`docs/DECISIONS.md`](docs/DECISIONS.md)    |
| Security policy                       | [`docs/SECURITY.md`](docs/SECURITY.md)      |
| Deployment index                      | [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)  |
| Daily operator workflow               | `docs/operator-playbook.md`                 |
| Failure recovery                      | `docs/recovery-playbook.md`                 |
| Production readiness                  | `docs/deployment/production-readiness.md`   |
| Staging runbook                       | `docs/deployment/staging-runbook.md`        |
