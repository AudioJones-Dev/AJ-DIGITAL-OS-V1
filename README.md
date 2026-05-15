# AJ Digital OS

> **New here?** Start with [`AGENTS.md`](AGENTS.md) (agent operating
> contract), [`docs/PRD.md`](docs/PRD.md) (what the product is),
> [`docs/DESIGN.md`](docs/DESIGN.md) (how it's built), and
> [`docs/onboarding.md`](docs/onboarding.md) (first-run walkthrough).

## CLI Usage

AJ Digital OS includes a terminal operator layer for system monitoring, run inspection, approval workflows, execution workflows, and recovery/debugging. The CLI is designed to stay thin on top of the command layer so operators can inspect and drive the system from terminal without bypassing lifecycle controls.

### Build And Run

Build the project first so the compiled CLI is available under `dist/cli.js`.

```bash
npm install
npm run build
npm run cli:help
npm run cli:dashboard
npm run cli:console
npm run cli:pending
npm run cli:approved
npm run cli:failed
npm run cli:executed
```

Generic CLI pattern:

```bash
npm run cli -- <command> [flags]
```

### Planned / not yet implemented

The following commands and scripts are referenced in older sections of
this README and other docs but are **not yet wired into `package.json`**.
Treat them as planned interface and use the generic `npm run cli -- ...`
pattern in the meantime:

- `npm run assistant:setup`, `assistant:doctor`, `assistant:start`,
  `assistant:history`, `assistant:shell`
- `npm run conversation:history`, `conversation:thread`
- `npm run ui:start` (local web shell)
- `npm run deliverables`, `deliverables:pending`
- `npm run memory:stats`, `memory:search`, `memory:index`
- `npm run tool-registry`, `integration-profiles`, `model-profiles`
- `npm run cli:assistant`, `cli:healthcheck`, `cli:ollama-probe`
- `npm run release:check`, `start:staging`, `smoke:ollama-provider`,
  `link:local`

Implemented commands are in `package.json` under `scripts`; see the
`cli:*` shortcuts. The roadmap for promoting the planned commands lives
in [`docs/ROADMAP.md`](docs/ROADMAP.md).

### Command Groups

#### Overview

- `assistant`: Run the local assistant runtime in advisory mode by default, or orchestrated mode when explicitly requested.
- `assistant-start`: Verify assistant readiness, then launch the current single-task assistant path.
- `assistant-history`: Inspect recent assistant task history from the local file-backed assistant session store.
- `conversation-history`: Inspect persisted conversation threads separate from session metadata.
- `deliverables`: Inspect the local file-backed deliverable registry and routed output paths.
- `list-pending-deliverables`: Inspect deliverables currently waiting for explicit approval.
- `memory-search`: Search the local semantic memory index over conversations, deliverables, and ingested knowledge.
- `assistant-shell`: Run a terminal-native conversational shell over the existing assistant runtime.
- `ui-start`: Start the local-first web/chat shell layered on top of the current runtime and file-backed stores.
- `help`: Show available operator commands, categories, and example usage.
- `healthcheck`: Validate runtime configuration, writable directories, and provider readiness.
- `dashboard`: Show system-wide run metrics and recent activity.
- `ollama-probe`: Probe the supported live Ollama JSON generation path for staging validation.
- `operator-console`: Show the unified operator console with queues and summary sections.

#### Inspection

- `run-summary`: Inspect one run's lifecycle, approval state, outputs, warnings, and errors.
- `run-events`: Inspect the raw event stream for a run.
- `track-run`: Inspect both run summary and event history together.

#### Queues

- `list-pending-approvals`: Show runs awaiting human approval.
- `list-approved-runs`: Show runs ready for execution.
- `list-failed-runs`: Show failed runs needing attention.
- `list-executed-runs`: Show recently executed runs and published outputs.

#### Actions

- `approve-run`: Resolve a pending approval decision for a run.
- `submit-for-approval`: Move a draft deliverable into the pending approval queue.
- `approve-deliverable`: Move a pending deliverable into the approved state.
- `publish-deliverable`: Publish an approved deliverable through the local-first publish path.
- `execute-run`: Trigger execution for an approved run through the execution coordinator.
- `resume-run`: Resume a run through the execution resumer.

#### Setup

- `assistant-setup`: Initialize writable runtime directories and validate the local-first assistant install path.
- `assistant-doctor`: Report whether the assistant is actually ready to use.
- `seed-demo`: Generate a demo dataset covering all key run lifecycle states.

#### Architecture

- `tool-registry`: Inspect the MCP-ready tool/provider/catalog scaffold and any local tool metadata manifests.
- `integration-profiles`: Inspect file-backed API integration and provider profiles with secret references only.
- `model-profiles`: Inspect file-backed model and fine-tune profile scaffolds with brand/task routing preferences.
- `memory-index`: Rebuild or ingest the local semantic memory index.
- `memory-stats`: Inspect semantic memory counts and local storage paths.

### Example Usage

```bash
npm run assistant:setup
npm run assistant:doctor
npm run assistant:start -- --brand aj-digital --task "Draft a concise SEO brief for AJ Digital"
npm run assistant:start -- --task "Repurpose this transcript into clips" --skill transcript-to-content --mode orchestrated --source "Transcript text here"
npm run assistant:history
npm run conversation:history
npm run assistant:shell -- --brand audio-jones --label morning-ops
npm run conversation:thread -- --threadId <thread-id>
npm run ui:start
npm run deliverables -- --brand aj-digital --status draft
npm run memory:index -- --rebuild
npm run memory:search -- --query "brand approval policy"
npm run memory:index -- --text "Client positioning notes" --label "AJ positioning"
npm run cli -- submit-for-approval --deliverableId <deliverable-id>
npm run cli -- approve-deliverable --deliverableId <deliverable-id>
npm run cli -- publish-deliverable --deliverableId <deliverable-id>
npm run tool-registry
npm run integration-profiles -- --brand aj-digital
npm run model-profiles -- --brand aj-digital
npm run cli:help
npm run cli -- assistant --task "Draft a concise SEO brief for AJ Digital"
npm run cli -- assistant --task "Repurpose this transcript into clips" --skill transcript-to-content --mode orchestrated --source "Transcript text here"
npm run cli:healthcheck
npm run cli:ollama-probe
npm run cli:dashboard
npm run cli:console
npm run cli -- run-summary --runId run_123
npm run cli -- run-events --runId run_123 --reverse --limit 20
npm run cli -- track-run --runId run_123 --view full
npm run cli -- list-pending-approvals --limit 10
npm run cli -- approve-run --runId run_123 --decision approve --actor Audio
npm run cli -- execute-run --runId run_123 --target local
npm run cli -- resume-run --runId run_123 --mode manual
```

### Recommended Operator Flow

1. Run `operator-console` to inspect overall system state.
2. Use `assistant` in advisory mode for local-first planning, briefs, and draft support.
3. Use `assistant --mode orchestrated` only when the request clearly maps to a governed workflow.
4. Use `list-pending-approvals` to identify runs awaiting approval.
5. Resolve a decision with `approve-run`.
6. Use `list-approved-runs` to inspect runs ready for execution.
7. Trigger execution with `execute-run`.
8. Inspect results with `run-summary` or `track-run`.

### Assistant Runtime

The assistant runtime is the first dedicated business AI assistant layer on top of AJ Digital OS.

- `assistant` defaults to `advisory` mode and returns guidance without creating a run.
- `assistant-start` is the preferred installed/local wrapper for current use. It checks readiness first, then delegates into the existing assistant runtime.
- Assistant invocations are now recorded under `data/assistant/` so the local assistant has lightweight continuity across tasks.
- Conversation threads and actual user/assistant turns are now stored separately under `data/conversations/`.
- Semantic memory chunks, local embeddings, and index entries are now stored under `data/memory/`.
- Assistant and workflow output intent is now recorded under `data/deliverables/registry/` and advisory drafts are written into brand-aware roots under `data/outputs/<brand-or-fallback>/drafts/`.
- Deliverables now follow a local lifecycle through `draft`, `pending_approval`, `approved`, and `published`, with files routed into matching brand-aware output roots.
- `assistant-shell` provides a terminal-native conversational loop using the same assistant runtime and persistence layer.
- `ui-start` opens the first local web/chat shell with the same runtime, history, deliverables, brands, and scaffold registries.
- `--threadId <id>` continues an existing conversation thread for `assistant`, `assistant-start`, `assistant-shell`, and the local web shell request path.
- `--brand <brandId>` selects an explicit brand manifest when one exists locally. Without it, the runtime uses the default brand manifest if defined and otherwise proceeds without brand context.
- `assistant --mode orchestrated` routes into the existing governed workflow/orchestration path when a workflow can be resolved.
- Skills are loaded from local markdown files under `skills/`.
- The assistant uses the existing prompt builder, memory retrieval, provider routing, and orchestration guardrails.
- The assistant does not bypass approval flow, tool permission boundaries, or the run lifecycle.
- The live provider scope for this stage is Ollama/local-first. Assistant advisory mode depends on a reachable local Ollama runtime.
- Other provider integrations may exist as scaffolds in code, but they are not part of the supported internal staging launch path yet.
- MCP-ready tool catalogs, API integration profiles, and model profile routing are now scaffolded for future UI and connector work, but they do not enable live MCP servers, OAuth flows, or fine-tuning jobs in this patch.
- The local web shell is now available, but it remains a thin local-first control surface rather than a full production GUI.
- Semantic memory retrieval is now local-first and deterministic. It is not a cloud vector database or provider-backed embedding system in this patch.

### Tooling And Profiles

The repo now includes architecture-first scaffolds for future external tool and provider management.

- Tool/provider metadata can be inspected with `tool-registry`
- API integration and provider profiles are loaded from local JSON under `data/integrations/profiles/`
- Model and fine-tune profile metadata is loaded from local JSON under `data/model-profiles/`
- Secret references for API keys and tokens remain metadata-only through the local secrets layer under `data/secrets/`
- Raw secrets are still not persisted or read in plaintext by this scaffold

### Local Web Shell

The first local browser-based shell is started with:

```bash
npm run ui:start
```

What it includes:

- left sidebar for sessions and navigation
- top controls for brand, agent/model profile selection, and mode
- main assistant chat panel with composer
- right-side brand, run, deliverable, and warning/error panels
- deliverable lifecycle badges plus thin submit/approve/publish actions
- a Memory panel that shows retrieved semantic context sources for the current run
- read-only settings views for tool registry, integration profiles, and model profiles

What it does not yet do:

- it does not replace the CLI
- it does not implement live OAuth or external messaging runtimes
- it does not provide transcript editing or thread management beyond simple continuation by thread id

### Assistant Install And Start

"Installed and configured" currently means:

- the project has been built and `dist/cli.js` exists
- Ollama is installed locally, or `OLLAMA_EXECUTABLE` is set to the local binary path
- the Ollama server is reachable at `OLLAMA_BASE_URL` or the default local address
- the expected local model is installed
- runtime directories under `data/` and `memory/` are writable
- the supported live provider scope remains Ollama/local-first
- assistant task history is stored locally under `data/assistant/`
- conversation threads, turns, and stitched context bundles are stored locally under `data/conversations/`
- semantic memory chunks, embeddings, and index entries are stored locally under `data/memory/`
- deliverable records are stored locally under `data/deliverables/registry/`
- generated outputs are routed into `data/outputs/<brand>/drafts`, `data/outputs/<brand>/pending`, `data/outputs/<brand>/approved`, and `data/outputs/<brand>/published` when brand context is available, with a safe fallback root when it is not
- tool metadata manifests can live under `data/tools/`
- integration/provider profile manifests can live under `data/integrations/profiles/`
- model/fine-tune profile manifests can live under `data/model-profiles/`

Recommended local assistant flow:

```bash
npm install
npm run assistant:setup
npm run assistant:doctor
npm run assistant:start -- --brand aj-digital --task "Summarize this transcript into a short operator advisory."
npm run assistant:history
npm run conversation:history
npm run assistant:shell -- --brand audio-jones
npm run ui:start
npm run deliverables
npm run deliverables:pending
npm run memory:index -- --rebuild
npm run memory:stats
```

If readiness fails, `assistant-setup` and `assistant-doctor` print the exact next-step guidance needed to finish the local install path.

Current assistant commands:

```bash
npm run assistant:setup
npm run assistant:doctor
npm run assistant:start -- --brand aj-digital --task "Draft a short operator brief"
npm run assistant:start -- --task "Repurpose this transcript" --skill transcript-to-content --mode orchestrated --source "Transcript text here"
npm run assistant:history
npm run conversation:history
npm run assistant:shell -- --brand audio-jones --label morning-ops
npm run conversation:thread -- --threadId <thread-id>
npm run ui:start
npm run deliverables -- --brand aj-digital --json
npm run cli -- list-pending-deliverables --json
npm run memory:search -- --query "client brief" --json
npm run memory:stats -- --json
npm run cli -- submit-for-approval --deliverableId <deliverable-id>
npm run cli -- approve-deliverable --deliverableId <deliverable-id> --actor operator
npm run cli -- publish-deliverable --deliverableId <deliverable-id>
npm run tool-registry -- --json
npm run integration-profiles -- --json
npm run model-profiles -- --json
```

History output includes the task timestamp, mode, selected brand, selected skill/workflow, provider/model route, success status, warnings/errors, and governed `runId` when orchestrated mode creates one.

Conversation output includes the persisted thread id, actual user/assistant turns, and bounded stitched context metadata used by the runtime.

Semantic memory output includes local chunk references, retrieval scores, and bounded semantic context stitched into assistant execution when relevant.

Deliverable output includes the persisted brand-aware draft or published output path, run linkage when available, and registry status such as `draft`, `pending_approval`, `approved`, or `published`.

Approval lifecycle commands:

```bash
npm run cli -- submit-for-approval --deliverableId <deliverable-id>
npm run cli -- approve-deliverable --deliverableId <deliverable-id> --actor operator
npm run cli -- publish-deliverable --deliverableId <deliverable-id>
npm run cli -- list-pending-deliverables --json
```

Shell mode notes:

- `assistant-shell` keeps one terminal session open for repeated prompts
- each shell turn is still executed through the existing assistant runtime
- shell turns are grouped in history with a shared shell session id
- `--label <name>` adds a human-readable label to that shell session
- `--brand <brandId>` pins the shell to an explicit brand manifest for all turns in that session
- type `exit`, `quit`, or `/exit` to close the shell

### JSON Mode

Many commands support `--json` for machine-readable output.

```bash
npm run assistant:doctor -- --json
npm run assistant:start -- --task "Draft a short operator brief" --json
npm run cli -- dashboard --json
npm run cli -- run-summary --runId run_123 --json
npm run cli -- list-pending-approvals --json
npm run tool-registry -- --json
npm run integration-profiles -- --json
npm run model-profiles -- --json
npm run ui:start
```

Use JSON mode for scripting, debugging, and future automation integrations.

## Deployment Readiness

Use the runtime healthcheck before first deployment and during production startup validation.

```bash
npm run cli -- healthcheck
npm run cli -- healthcheck --json
npm run release:check
```

Runtime behavior remains local-first by default. For production-style validation, set:

```bash
AJ_OS_ENV=production
ACTIVE_MODEL_PROVIDER=ollama
ENABLED_MODEL_PROVIDERS=ollama
MEMORY_ENABLED=true
```

This stage is Ollama-first for live model-backed generation. Other provider scaffolds may exist in code, but internal staging validation should treat Ollama as the supported live path.

The healthcheck verifies:

- provider-specific required environment variables for enabled providers
- writable runtime directories under `data/`
- writable `memory/` when memory is enabled

Assistant-specific readiness can be checked separately with:

```bash
npm run assistant:doctor
npm run assistant:doctor -- --json
```

See `docs/deployment/production-readiness.md` for the full startup checklist and deployment notes.

### Production Release Gate

Before a production deployment or production process start, run the release gate with production environment variables loaded:

```bash
npm run build
npm run release:check
```

`release:check` exits with code `0` when readiness passes and a non-zero exit code when production readiness fails.

### Staging Launch Path

The current production-like staging start path is:

```bash
npm run start:staging
```

This command composes:

1. `npm run build`
2. `npm run release:check`
3. `node dist/cli.js operator-console --watch`

There is not yet a separate long-running service entrypoint in this repository. The operator console watch mode is the current supported staging/production-like operational launch path.

Use `docs/deployment/staging-runbook.md` for the exact preflight, startup, and post-start verification sequence.

### Ollama Model Notes

The default routed model is `llama3.1:8b`. If your local install uses a different primary model tag, you can set:

```bash
OLLAMA_MODEL=your-local-model-tag
```

If your local model is slower to respond, you can also raise the provider timeouts:

```bash
OLLAMA_REQUEST_TIMEOUT_MS=300000
OLLAMA_TAGS_TIMEOUT_MS=15000
```

To validate that at least one real local model-backed JSON path is working before staging use:

```bash
npm run assistant:doctor
npm run cli:ollama-probe
npm run cli -- ollama-probe --json
```

For a deterministic provider-level smoke that does not require a live Ollama process, use:

```bash
npm run smoke:ollama-provider
```

## Installable CLI

### Local linking

```bash
npm install
npm run build
npm link
aj-digital-os help
aj-digital-os dashboard
```

If you want a one-step local flow, use:

```bash
npm run link:local
```

### Direct compiled usage

```bash
npm run assistant:doctor
npm run assistant:start -- --task "Draft a short operator brief"
npm run cli:help
npm run cli -- dashboard
npm run cli:console
```

### Direct executable note

The package includes a `bin` entry pointing to `dist/cli.js`, so after building and linking or installing the package in a way that exposes the binary, direct usage can look like this:

```bash
aj-digital-os help
```

During local development, the supported fallback remains:

```bash
npm run cli -- help
```

## Local preflight (mirrors CI)

Before opening a PR (or before pushing to `main`), run the same quality gates executed in GitHub Actions:

```bash
npm ci
npm run typecheck
npm run build
npm run test
npm run coverage
npm audit --audit-level=high
```

## Testing

Run automated tests and coverage checks:

```bash
npm run test
npm run test:watch
npm run coverage
```

Coverage thresholds are enforced in `vitest.config.ts` for core lifecycle and webhook modules.

## Webhook Security Contract

Approval and execution webhook handlers require signed requests and reject unsigned traffic by default.

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

- HMAC SHA-256 verification using `AJ_WEBHOOK_SECRET`
- freshness enforcement via `AJ_WEBHOOK_MAX_SKEW_SECONDS` (default `300`)
- replay rejection using nonce + webhook id with `AJ_WEBHOOK_REPLAY_TTL_SECONDS` (default `600`)
- fail-closed behavior if verification cannot be completed or secret is missing
