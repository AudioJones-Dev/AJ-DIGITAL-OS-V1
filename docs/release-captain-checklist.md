# AJ Digital OS — Release Captain Checklist (Pre-Deploy, ~30 min)

Use this checklist before each staging or production deployment.

## Release Metadata

- Release date:
- Release captain:
- Environment: staging / production
- Commit SHA:

## 0) Gatekeeper Sanity (2 min)

- [ ] Confirm deployment commands referenced in docs exist in `package.json` (`release:check`, `start:staging` if used by your process).
- [ ] Confirm deployment branch working tree is clean before release tagging.

## 1) Build + Quality Gates (8–10 min)

Run from repo root:

```bash
npm run typecheck
npm run build
npm run test
npm run coverage
npm run release:check
```

- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] `npm run test` passes.
- [ ] `npm run coverage` passes configured thresholds.
- [ ] `npm run release:check` returns exit code `0`.

## 2) Environment Correctness (5 min)

Verify required runtime variables:

```env
AJ_OS_ENV=production
ACTIVE_MODEL_PROVIDER=ollama
ENABLED_MODEL_PROVIDERS=ollama
MEMORY_ENABLED=true
OLLAMA_BASE_URL=http://your-host:11434
```

If enabling other providers, verify required keys/URLs are present.

- [ ] OpenAI key present if `openai` enabled.
- [ ] Anthropic key present if `anthropic` enabled.
- [ ] LM Studio URL present if `lmstudio` enabled.

## 3) Runtime Filesystem Readiness (3–5 min)

- [ ] Confirm writable runtime paths under `data/`.
- [ ] Confirm writable `memory/` path when memory is enabled.
- [ ] Confirm runtime user has correct permissions.

## 4) Assistant/Runtime Preflight (5 min)

Run:

```bash
npm run assistant:setup
npm run assistant:doctor
npm run cli -- healthcheck --json
npm run cli -- ollama-probe --json
```

- [ ] `assistant:setup` completes successfully.
- [ ] `assistant:doctor` reports ready.
- [ ] Healthcheck reports success / `ok: true`.
- [ ] Ollama probe reports success / `ok: true`.

## 5) Start Path Verification (3–5 min)

Preferred documented staging start:

```bash
npm run start:staging
```

(Or run the equivalent explicit sequence from the staging runbook.)

- [ ] Startup sequence executes cleanly.
- [ ] Operator console / dashboard available for live observation.

## 6) Live Model Execution Proof (5 min)

After startup, validate one representative run.

Suggested commands:

```bash
node dist/cli.js dashboard --provider ollama --json
node dist/cli.js run-summary --runId <run-id> --json
node dist/cli.js run-events --runId <run-id>
```

- [ ] Run shows model-backed success indicators.
- [ ] Run is not fallback-only behavior.
- [ ] Run ID captured in release notes.

## 7) Final Go / No-Go (1 min)

Go only if all checks above are complete.

- [ ] All quality gates green.
- [ ] Release gate green.
- [ ] Runtime health + probe green.
- [ ] At least one model-backed run succeeded.
- [ ] No unresolved P0/P1 incidents.

Decision: GO / NO-GO

- Release captain sign-off:
- Timestamp (UTC):

## Team Update Template

```text
AJ Digital OS Release Check — <env> — <date/time UTC>

✅ typecheck/build/test/coverage/release:check
✅ env + runtime directories verified
✅ assistant:doctor + healthcheck + ollama-probe passed
✅ staging start path verified
✅ model-backed run confirmed (runId: <id>)

Decision: GO
Captain: <name>
```
