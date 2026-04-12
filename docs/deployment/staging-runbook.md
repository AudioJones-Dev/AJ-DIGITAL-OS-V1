# AJ Digital OS Staging Deployment Runbook

## Summary

This runbook documents the current staging launch path for AJ Digital OS using the existing CLI and operator console. At this stage, the repository does not expose a separate long-running web service or daemon entrypoint. The production-like operational start path is the operator console in watch mode after a successful release gate.

The new `assistant` command is the first local business AI assistant layer for operator use. It stays advisory by default and only enters governed workflow mode when explicitly requested.
The installed assistant path now includes a local web/chat shell, but it remains a thin local-first control surface rather than a separate assistant daemon or full production GUI.

## Required Environment Variables

Set these before staging startup:

```env
AJ_OS_ENV=production
ACTIVE_MODEL_PROVIDER=ollama
ENABLED_MODEL_PROVIDERS=ollama
MEMORY_ENABLED=true
OLLAMA_BASE_URL=http://your-staging-ollama-host:11434
```

If you later enable other providers, also set:

- `OPENAI_API_KEY` when `openai` is enabled
- `ANTHROPIC_API_KEY` when `anthropic` is enabled
- `LMSTUDIO_BASE_URL` when `lmstudio` is enabled

For the current internal staging path, live model-backed validation should be treated as Ollama-only. You may also set `OLLAMA_MODEL` if your local install uses a non-default tag, and optionally raise `OLLAMA_REQUEST_TIMEOUT_MS` for slower local models.

## Required Runtime Directories

These repo-root paths must be writable:

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
- `memory/` when memory is enabled

`data/secrets/` is currently scaffold-only for metadata and local structure only. Raw secret persistence is not implemented in this patch.

## Preflight Commands

Run these exactly before staging startup:

```bash
npm install
npm run build
npm run assistant:setup
npm run assistant:doctor
npm run release:check
```

`release:check` is the deploy/start gate. It exits with code `0` when readiness passes and non-zero when production prerequisites are not met.

Optional machine-readable preflight output:

```bash
npm run smoke:ollama-provider
npm run cli -- healthcheck --json
npm run cli -- ollama-probe --json
npm run assistant:doctor -- --json
```

Assistant verification commands:

```bash
npm run assistant:start -- --brand aj-digital --task "Draft a short operator brief"
npm run assistant:start -- --task "Repurpose this transcript" --skill transcript-to-content --mode orchestrated --source "Transcript text here"
npm run assistant:history
npm run conversation:history
npm run assistant:shell -- --brand audio-jones --label staging-ops
npm run conversation:thread -- --threadId <thread-id>
npm run ui:start
npm run deliverables -- --brand aj-digital
npm run deliverables:pending
npm run memory:index -- --rebuild
npm run memory:search -- --query "approval workflow"
npm run memory:stats
npm run cli -- submit-for-approval --deliverableId <deliverable-id>
npm run cli -- approve-deliverable --deliverableId <deliverable-id>
npm run cli -- publish-deliverable --deliverableId <deliverable-id>
npm run tool-registry
npm run integration-profiles -- --brand aj-digital
npm run model-profiles -- --brand aj-digital
```

## Build And Start Commands

Single-command staging launch path:

```bash
npm run start:staging
```

This composes:

1. `npm run build`
2. `npm run release:check`
3. `node dist/cli.js operator-console --watch`

Equivalent explicit sequence:

```bash
npm run build
npm run assistant:setup
npm run assistant:doctor
npm run release:check
node dist/cli.js operator-console --watch
```

## Current Launch Limitation

AJ Digital OS does not yet provide a dedicated always-on service entrypoint for deployment. The current production-like operational launch path is the CLI operator console in watch mode. This is intentional for the current scaffold and should be treated as the correct staging start path until a dedicated runtime process is introduced.

The assistant path follows the same constraint: `assistant:start`, `assistant:shell`, and `ui:start` are thin surfaces around the current assistant runtime. They should not be presented as a standalone production desktop or SaaS application yet.

## Post-Start Verification Commands

Use the existing CLI only.

Immediate checks:

```bash
node dist/cli.js healthcheck --json
node dist/cli.js assistant-doctor --json
node dist/cli.js dashboard --json
```

If you need a live operator view:

```bash
node dist/cli.js operator-console --watch
```

## Post-Start Smoke Test

1. Run the healthcheck JSON output and confirm `"ok": true`.
2. Run `ollama-probe --json` and confirm `"ok": true`.
3. Run the dashboard JSON output and confirm the command succeeds.
4. Trigger or identify a model-backed run for one of the current model-enabled workflows:
   - `transcript-to-content`
   - `blog-authority`
5. Capture the run id from dashboard, operator console, or your orchestration output.
6. Inspect the run directly:

```bash
node dist/cli.js run-summary --runId <run-id> --json
node dist/cli.js run-events --runId <run-id>
```

## Confirming Model-Backed Execution Versus Fallback

Model-backed success indicators:

- `model_execution_attempted`
- `model_execution_succeeded`

Fallback indicators:

- `model_execution_failed`
- `model_execution_fallback_used`

Useful commands:

```bash
node dist/cli.js dashboard --fallbackUsed --json
node dist/cli.js dashboard --provider ollama --json
node dist/cli.js run-summary --runId <run-id> --json
node dist/cli.js run-events --runId <run-id>
```

Interpretation:

- if `run-summary` shows `modelExecution.lastOutcome = "succeeded"` or `"repaired_success"`, the workflow completed with live model-backed output
- if it shows `fallback_used`, the workflow remained safe but fell back to deterministic output

## Inspecting Dashboard, Run Summary, And Run Events

System-wide:

```bash
node dist/cli.js dashboard
node dist/cli.js dashboard --json
node dist/cli.js dashboard --fallbackUsed
```

Single-run inspection:

```bash
node dist/cli.js run-summary --runId <run-id>
node dist/cli.js run-summary --runId <run-id> --json
node dist/cli.js run-events --runId <run-id>
node dist/cli.js track-run --runId <run-id> --view full
```

These commands are the current operator-facing staging verification surface and should be treated as the source of truth after startup.
