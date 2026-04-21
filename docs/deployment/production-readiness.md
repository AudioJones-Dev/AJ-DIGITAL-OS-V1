# AJ Digital OS Production Readiness

## Summary

AJ Digital OS remains local-first by default. Production readiness in this scaffold means using explicit runtime configuration, validating writable runtime paths, and confirming whether model-backed workflows are actually generating content or falling back to deterministic outputs.

For the current internal staging/production-like path, Ollama is the only supported live model provider. Other provider scaffolds should not be treated as active runtime options yet or included in launch sign-off.

The `assistant` runtime layer should also be treated as operator-oriented and approval-aware in this stage. It is not an unconstrained autonomous agent loop.
The installed assistant path is currently a thin runtime surface exposed through both CLI and a local web shell. The web shell is not yet a full production GUI or always-on app runtime.

## Required Environment Variables

Minimum runtime variables:

```env
AJ_OS_ENV=production
ACTIVE_MODEL_PROVIDER=ollama
ENABLED_MODEL_PROVIDERS=ollama
MEMORY_ENABLED=true
```

Provider-specific requirements for the currently supported live scope:

- `OLLAMA_BASE_URL`: required explicitly in production when `ollama` is enabled
- `LMSTUDIO_BASE_URL`: required explicitly in production when `lmstudio` is enabled
- `OPENAI_API_KEY`: required when `openai` is enabled
- `ANTHROPIC_API_KEY`: required when `anthropic` is enabled

Optional Ollama runtime tuning:

- `OLLAMA_MODEL`: override the routed default model tag when your local install uses a different primary tag
- `OLLAMA_REQUEST_TIMEOUT_MS`: override the default request timeout for slower local models
- `OLLAMA_TAGS_TIMEOUT_MS`: override the model discovery timeout for slower local instances

Local development can still rely on local-first defaults:

- `OLLAMA_BASE_URL` defaults to `http://localhost:11434`
- `LMSTUDIO_BASE_URL` defaults to `http://localhost:1234/v1`

## Runtime Directory Expectations

The runtime expects these writable directories at repo root:

- `data/runs/`
- `data/reports/runs/`
- `data/logs/`
- `data/cache/`
- `data/approvals/`
- `data/approved/`
- `data/assistant/`
- `data/conversations/threads/`
- `data/conversations/turns/`
- `data/conversations/context-cache/`
- `data/memory/chunks/`
- `data/memory/embeddings/`
- `data/memory/index/`
- `data/brands/manifests/`
- `data/deliverables/registry/`
- `data/outputs/`
- `data/outputs/*/drafts/`
- `data/outputs/*/pending/`
- `data/outputs/*/approved/`
- `data/outputs/*/published/`
- `data/tools/`
- `data/integrations/`
- `data/integrations/profiles/`
- `data/model-profiles/`
- `data/secrets/`

If memory is enabled, `memory/` must also be writable.

`data/secrets/` is currently scaffold-only for secret metadata and local storage structure. This patch does not implement raw credential persistence.

## Startup Checklist

1. Install dependencies and build the project.
2. Set the environment variables for the enabled provider set.
3. Run `npm run assistant:setup`.
4. Run `npm run release:check`.
5. Confirm the healthcheck returns `ok: true` or a passing human-readable status.
6. Confirm `npm run assistant:doctor` reports the assistant is ready.
7. Start the operator workflow using the existing CLI or orchestration path.
8. Run a model-backed workflow and verify observability shows model execution behavior.

## Production Start Checklist

Use this exact sequence before deploy or production startup:

```bash
npm install
npm run build
npm run assistant:setup
npm run assistant:doctor
npm run release:check
```

Exit code behavior:

- `0`: runtime is ready for the configured production provider set
- non-zero: production readiness failed and startup/deploy should stop

For the current production-like operational launch path after a passing gate, see `docs/deployment/staging-runbook.md`.

## Healthcheck Usage

Human-readable:

```bash
npm run cli -- healthcheck
```

Machine-readable:

```bash
npm run smoke:ollama-provider
npm run cli -- healthcheck --json
npm run cli -- ollama-probe --json
npm run assistant:doctor -- --json
npm run release:check
```

This check validates:

- enabled-provider configuration readiness
- writable runtime directories
- writable memory directory when enabled

Assistant-specific readiness also validates:

- build output availability
- Ollama executable discovery or configured override path
- Ollama server reachability
- local model availability for the current assistant default
- Ollama/local-first provider scope

## Assistant Usage Path

The current installed assistant path is:

```bash
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

What this does:

- `assistant:setup` ensures the compiled CLI exists and initializes writable runtime directories
- `assistant:doctor` reports whether the assistant is actually ready to use on the current machine
- `assistant:start` checks readiness and then launches one assistant task through the existing runtime
- `assistant:history` inspects the local file-backed assistant task log under `data/assistant/`
- `conversation-history` inspects the local file-backed conversation thread registry under `data/conversations/threads/`
- `memory-index` rebuilds or ingests the local semantic memory layer under `data/memory/`
- `memory-search` queries the local semantic memory layer
- `memory-stats` reports local semantic memory counts and storage paths
- `assistant:shell` opens a terminal-native conversational loop backed by the same runtime and history store
- `ui:start` opens the local-first browser shell over the same runtime and local registries
- `--threadId <id>` continues an existing persisted conversation thread
- `deliverables` inspects the local file-backed deliverable registry under `data/deliverables/registry/`
- `list-pending-deliverables` inspects the local pending approval queue for deliverables
- `tool-registry` inspects the MCP-ready tool/provider/catalog scaffold
- `integration-profiles` inspects file-backed API integration and provider profile manifests
- `model-profiles` inspects file-backed model/fine-tune profile manifests
- `--brand <brandId>` selects an explicit local brand manifest for assistant execution when one is available
- without `--brand`, the assistant uses the default brand manifest if one is defined and otherwise proceeds without brand context
- advisory outputs are written into brand-aware draft roots when content is generated, and deliverables now move through draft, pending, approved, and published roots under the local approval lifecycle

Current limitation:

- The web shell is local-first and operator-facing, not a full production GUI or always-on service entrypoint
- The CLI remains the source of truth for the current production-like operational launch path

## Confirming Live Model Execution

Use the existing operator views to distinguish live model output from deterministic fallback:

- `ollama-probe --json`
- `dashboard --fallbackUsed`
- `dashboard --provider ollama`
- `track-run --runId <id> --view full`
- `run-summary --runId <id> --json`

Signals to watch:

- `model_execution_attempted`
- `model_execution_succeeded`
- `model_execution_failed`
- `model_execution_fallback_used`

If a run shows `fallback_used`, the workflow stayed safe but did not complete a live model-backed generation.

## Local-First Production Assumptions

- The scaffold assumes local runtime state stays under root `data/`
- Memory remains file-backed under root `memory/`
- Ollama remains the first active provider in this scaffold
- Production readiness does not introduce cloud-specific deployment code in this phase
