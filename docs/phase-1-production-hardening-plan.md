# Phase 1 Production-Hardening Plan (Execution-Ready)

## 1. Phase 1 implementation summary

Phase 1 hardening will turn the current local-first CLI/orchestration codebase into a production-baseline service by enforcing authenticated webhook ingestion, testable quality gates, strict runtime configuration, cross-platform path handling, and containerized deployment defaults. This removes the highest immediate risks: unauthorized webhook triggering, silent config drift, untested lifecycle regressions, Windows-only runtime failures, and ad hoc deployment behavior.

## 2. PR plan

### PR-01 — Test Harness + Critical Flow Coverage Baseline

Goal:
Create a deterministic automated test foundation first, so every later hardening PR ships with regression protection.

Files to create:
- `vitest.config.ts` — new
- `tests/setup/test-env.ts` — new
- `tests/fixtures/runs/sample-run.json` — new
- `tests/core/run-manager.test.ts` — new
- `tests/core/state-machine.test.ts` — new
- `tests/api/approval-webhook.test.ts` — new
- `tests/api/execution-webhook.test.ts` — new

Files to modify:
- `package.json` — confirmed
- `tsconfig.json` — confirmed
- `README.md` — confirmed (test commands section)

Implementation tasks:
- Add Vitest + coverage provider + Node test environment.
- Add `npm run test`, `npm run test:watch`, `npm run coverage` scripts.
- Add deterministic test setup (fixed timezone/clock helpers where needed).
- Add unit tests for:
  - run lifecycle transitions (`RunManager`, `state-machine`)
  - webhook payload validation and error responses
  - execution flow success/failure paths
- Stub external side effects (file writes, execution agent side effects) while keeping core orchestration logic real.
- Add minimal coverage thresholds (global lines/branches/functions/statements).

Acceptance criteria:
- `npm run test` passes locally and in CI.
- Coverage thresholds enforced and failing when under threshold.
- At least one test each for: happy-path execution, invalid webhook payload, invalid state transition.

Risks / notes:
- Existing modules instantiate concrete dependencies at module scope (may require `vi.mock` before import or small constructor refactors).
- Keep tests deterministic by avoiding real timestamps unless explicitly asserted.

---

### PR-02 — Webhook Security and Replay Protection

Goal:
Harden webhook endpoints with signed requests, freshness checks, and replay prevention, failing closed by default.

Files to create:
- `src/security/webhook-signature.ts` — new
- `src/security/replay-store.ts` — new
- `src/security/security-audit-log.ts` — new
- `src/schemas/webhook-auth.schema.ts` — new
- `tests/security/webhook-signature.test.ts` — new
- `tests/security/replay-store.test.ts` — new

Files to modify:
- `src/api/approval-webhook.ts` — confirmed
- `src/api/execution-webhook.ts` — confirmed
- `src/core/logger.ts` — confirmed (structured security event helper)
- `env/.env.example` — confirmed (webhook secret + replay/freshness vars)
- `README.md` — confirmed (webhook auth contract)

Implementation tasks:
- Define standardized webhook auth headers:
  - `x-aj-signature` (hex HMAC SHA-256)
  - `x-aj-timestamp` (Unix epoch seconds)
  - `x-aj-nonce` (UUID v4)
  - `x-aj-webhook-id` (idempotency key)
- Implement canonical signing payload format: `${timestamp}.${nonce}.${rawBody}`.
- Verify signature using `crypto.timingSafeEqual` (constant-time compare).
- Enforce freshness window (e.g., 300 seconds default).
- Enforce replay protection using nonce/idempotency store with TTL.
- Fail closed when any required header missing/invalid or secret unavailable.
- Emit structured audit logs for success and rejection reasons (no secret/body leakage).
- Update webhook handlers to require verification before payload parsing.

Acceptance criteria:
- Unsigned/invalid/replayed/expired requests are rejected.
- Valid signed request with unique nonce/idempotency key succeeds.
- No fallback insecure mode in production paths.

Risks / notes:
- Critical: verify against exact raw body bytes, not re-serialized JSON.
- Replay TTL must exceed freshness window to prevent race replays.

---

### PR-03 — Env/Config Hardening and Startup Validation

Goal:
Eliminate insecure defaults and runtime ambiguity by validating required environment configuration at startup.

Files to create:
- `src/config/env.schema.ts` — new
- `src/config/load-env.ts` — new
- `src/config/runtime-config.ts` — new
- `src/config/config-errors.ts` — new
- `tests/config/env-validation.test.ts` — new
- `.env.example` — new (root app runtime env; keep compose env under `env/` if needed)

Files to modify:
- `src/cli.ts` — confirmed (startup config load/validation)
- `src/index.ts` — confirmed (export config helpers)
- `env/.env.example` — confirmed (align naming, remove weak defaults)
- `README.md` — confirmed (runtime env docs)

Implementation tasks:
- Implement strict schema validation via Zod for all runtime env vars.
- Add secret strength checks:
  - minimum length 32
  - reject known placeholders (`change_this_now`, `changeme`, etc.)
- Remove insecure defaults for secrets (must be explicitly set).
- Add strongly typed runtime config object consumed by APIs/services.
- Add startup failure with actionable error list if config invalid.
- Ensure webhook secrets are env-only (never from payload/file fallback).

Acceptance criteria:
- App exits non-zero on invalid/missing required secrets.
- Valid env produces typed config consumed by runtime modules.
- Docs provide copy-paste-safe `.env.example` with non-functional placeholders clearly marked.

Risks / notes:
- Avoid accidental logging of env values in error output.

---

### PR-04 — Portability and Runtime Path Cleanup

Goal:
Remove Windows-specific path assumptions and centralize path resolution for Linux/container compatibility.

Files to create:
- `src/config/runtime-paths.ts` — new
- `src/config/path-policy.ts` — new
- `tests/config/runtime-paths.test.ts` — new
- `docs/portability-path-migration.md` — new

Files to modify:
- `src/core/run-store.ts` — confirmed
- `compose/docker-compose.yml` — confirmed
- `env/.env.example` — confirmed
- `README.md` — confirmed
- `docs/onboarding.md` — confirmed

Implementation tasks:
- Introduce path helper that resolves data/cache/log roots from env:
  - `AJ_DATA_DIR`
  - `AJ_CACHE_DIR`
  - `AJ_LOG_DIR`
- Default to Linux/container-safe directories when unset (e.g., `/var/lib/aj-digital-os` in container, `.aj-digital-os/*` in local user home).
- Replace hardcoded drive-letter volumes (`F:/CACHE/...`) in compose with env-driven bind paths or named volumes.
- Update `RunStore` default directory to use centralized runtime path helper.
- Add migration note for existing local data locations.

Acceptance criteria:
- No required runtime path includes Windows drive letters.
- App and compose stack run on Linux/macOS/Windows with env overrides.
- Existing behavior preserved when equivalent dirs configured.

Risks / notes:
- Data migration must avoid silent data loss when path root changes.

---

### PR-05 — CI/CD Quality Gates (GitHub Actions)

Goal:
Enforce repeatable quality/security gates on every change.

Files to create:
- `.github/workflows/ci.yml` — new
- `.github/workflows/security-audit.yml` — new (or folded into ci.yml)
- `.github/pull_request_template.md` — new (hardening checklist)

Files to modify:
- `README.md` — confirmed (CI badge + local preflight commands)
- `package.json` — confirmed (lint/test scripts if missing)

Implementation tasks:
- Add GitHub Actions workflow jobs for:
  - install (`npm ci`)
  - typecheck (`npm run typecheck`)
  - lint (`npm run lint`)
  - build (`npm run build`)
  - tests (`npm run coverage`)
  - dependency audit (`npm audit --audit-level=high` or `pnpm audit` equivalent)
- Add Node version matrix (LTS current + next LTS if desired, minimally one locked version).
- Enable dependency cache for package manager.
- Configure branch triggers:
  - `pull_request` on `main`
  - `push` to `main`
- Document required status checks for merge protection:
  - `typecheck`
  - `lint`
  - `build`
  - `test`
  - `security-audit`

Acceptance criteria:
- Opening PR triggers all checks.
- Failing test/lint/type/build blocks merge.
- Security audit failures at configured severity block merge.

Risks / notes:
- `npm audit` can be noisy; pin fail threshold to high/critical to reduce churn.

---

### PR-06 — Deployment Baseline Contract (Container + Ops Docs)

Goal:
Define one reproducible deployment contract for prod-like execution and rollback.

Files to create:
- `Dockerfile` — new
- `.dockerignore` — new
- `compose/docker-compose.app.yml` — new (app-focused baseline, separate from heavy infra)
- `docs/deployment-contract.md` — new
- `docs/rollback-procedure.md` — new
- `scripts/healthcheck.ts` — new (or shell script)

Files to modify:
- `README.md` — confirmed
- `docs/operational-baseline-runbook.md` — confirmed
- `compose/docker-compose.yml` — confirmed (if shared env conventions need alignment)

Implementation tasks:
- Add production-oriented multi-stage Dockerfile:
  - build stage (`npm ci`, `npm run build`)
  - runtime stage (non-root user, copied dist + production deps)
- Add container healthcheck endpoint/command for readiness/liveness.
- Add minimal compose file for app runtime + required dependencies only.
- Define deployment contract doc:
  - required env vars
  - ports
  - persistent volumes
  - startup command
  - health criteria
- Add rollback notes:
  - image tag pinning
  - previous release re-deploy procedure

Acceptance criteria:
- `docker build` succeeds.
- `docker compose -f compose/docker-compose.app.yml up` starts healthy app.
- Deployment doc provides exact runbook-level commands.

Risks / notes:
- Keep infra-observability mega-compose separate; avoid coupling app baseline to all monitoring services.

## 3. File-level implementation tasks

### PR-01 — Test Harness + Critical Flow Coverage

- `package.json` — confirmed — add `test`, `test:watch`, `coverage`, `lint` scripts and dev dependencies for Vitest.
- `tsconfig.json` — confirmed — include test type support (`types: ["node", "vitest/globals"]`) in a dedicated test tsconfig if needed.
- `vitest.config.ts` — new — configure Node environment, include `src/**/*.ts`, `tests/**/*.test.ts`, coverage thresholds.
- `tests/setup/test-env.ts` — new — common setup/teardown (temp dirs, mocked clocks as needed).
- `tests/core/run-manager.test.ts` — new — verify create/update/approval/revision lifecycle invariants.
- `tests/core/state-machine.test.ts` — new — ensure invalid transitions throw.
- `tests/api/approval-webhook.test.ts` — new — payload schema validation + response mapping.
- `tests/api/execution-webhook.test.ts` — new — success/failure path handling and fallback runId/target behavior.
- `README.md` — confirmed — document local test commands and expected outputs.

### PR-02 — Webhook Security

- `src/security/webhook-signature.ts` — new — canonical signing input, HMAC generation/verification, timing-safe comparison.
- `src/security/replay-store.ts` — new — TTL-based nonce/idempotency tracker (file-backed or memory+file per current architecture).
- `src/security/security-audit-log.ts` — new — structured event helper for webhook auth outcomes.
- `src/schemas/webhook-auth.schema.ts` — new — Zod schema for required auth headers and timestamp parse constraints.
- `src/api/approval-webhook.ts` — confirmed — require auth verification pre-parse, return standardized status codes on auth failure.
- `src/api/execution-webhook.ts` — confirmed — same auth gate and structured logs.
- `src/core/logger.ts` — confirmed — add `security` context wrapper to reduce ad hoc log shapes.
- `env/.env.example` — confirmed — add `AJ_WEBHOOK_SECRET`, `AJ_WEBHOOK_MAX_SKEW_SECONDS`, `AJ_WEBHOOK_REPLAY_TTL_SECONDS`.
- `README.md` — confirmed — document signer spec and headers.

### PR-03 — Env/Config Hardening

- `.env.example` — new — app runtime env template with required markers and no insecure defaults.
- `src/config/env.schema.ts` — new — Zod schema with strict required vars and value bounds.
- `src/config/load-env.ts` — new — runtime loader + parse errors list.
- `src/config/runtime-config.ts` — new — typed accessor used by webhook/store/services.
- `src/config/config-errors.ts` — new — structured startup validation error class.
- `src/cli.ts` — confirmed — invoke startup validation before command execution.
- `src/index.ts` — confirmed — expose config entry points for integration use.
- `env/.env.example` — confirmed — align infra template names and placeholder warnings.
- `tests/config/env-validation.test.ts` — new — verifies missing/weak secrets fail.

### PR-04 — Portability/Path Cleanup

- `src/config/runtime-paths.ts` — new — resolve base directories via `path.resolve`, `os.homedir`, env overrides.
- `src/config/path-policy.ts` — new — documented path precedence and defaults.
- `src/core/run-store.ts` — confirmed — replace `path.resolve("src", "data", "runs")` with helper-derived path.
- `compose/docker-compose.yml` — confirmed — remove `F:/CACHE/*` assumptions, use env + named volumes.
- `env/.env.example` — confirmed — add optional host path vars for compose bind mounts.
- `tests/config/runtime-paths.test.ts` — new — platform-safe path resolution assertions.
- `docs/portability-path-migration.md` — new — migration steps for existing Windows cache/data directories.
- `README.md` / `docs/onboarding.md` — confirmed — update path configuration examples.

### PR-05 — CI/CD Gates

- `.github/workflows/ci.yml` — new — typed pipeline with install, typecheck, lint, build, tests.
- `.github/workflows/security-audit.yml` — new — dependency audit/security scan with fail threshold.
- `.github/pull_request_template.md` — new — checklist for tests, env changes, webhook security implications.
- `package.json` — confirmed — ensure commands used by CI exist and are stable.
- `README.md` — confirmed — include badge + local preflight steps mirroring CI.

### PR-06 — Deployment Baseline

- `Dockerfile` — new — multi-stage, non-root runtime, explicit `CMD` for CLI/service entry.
- `.dockerignore` — new — exclude `node_modules`, `dist` (if built in-image), docs artifacts, run data.
- `compose/docker-compose.app.yml` — new — slim prod-like app compose (service + required dependencies only).
- `scripts/healthcheck.ts` — new — returns non-zero when service unhealthy (or add HTTP `/healthz` endpoint if HTTP server introduced).
- `docs/deployment-contract.md` — new — env contract, healthcheck, startup/shutdown, persistent data contract.
- `docs/rollback-procedure.md` — new — previous image rollback + data compatibility notes.
- `README.md` / `docs/operational-baseline-runbook.md` — confirmed — deployment quickstart and ops handoff.

## 4. Technical requirements by PR

### A. Webhook security PR

Mandatory controls:
- HMAC SHA-256 verification over `timestamp.nonce.rawBody`.
- Timestamp freshness window (default 300s, env-configurable).
- Replay protection via nonce + webhook-id TTL store.
- Constant-time signature comparison with `timingSafeEqual`.
- Structured audit logging for every accept/reject.
- Fail-closed behavior on any verification error.
- Secret loaded from env only (`AJ_WEBHOOK_SECRET`), required at startup.

Header standardization:
- `x-aj-signature`
- `x-aj-timestamp`
- `x-aj-nonce`
- `x-aj-webhook-id`

Exact request verification flow:
1. Read raw request body bytes.
2. Extract required headers; reject if missing.
3. Parse/validate timestamp and nonce/id format.
4. Reject if timestamp outside skew window.
5. Build canonical string: `${timestamp}.${nonce}.${rawBody}`.
6. Compute expected HMAC with env secret.
7. Compare expected vs header signature constant-time.
8. Check replay store for nonce + webhook-id; reject if seen.
9. Persist nonce + webhook-id with TTL.
10. Only then parse JSON body and execute business handler.

Failure response codes:
- `400` — malformed/missing auth headers, invalid timestamp/format.
- `401` — bad signature.
- `409` — replay detected (nonce/idempotency collision).
- `422` — payload schema invalid after auth passed.
- `500` — internal verification/store failure (fail closed).

### B. CI/CD PR

Must include:
- GitHub Actions workflow with install, typecheck, build, lint, tests, dependency audit.
- Branch triggers:
  - `pull_request` on `main`
  - `push` on `main`
- Required status checks in branch protection:
  - `ci/typecheck`
  - `ci/lint`
  - `ci/build`
  - `ci/test`
  - `ci/security-audit`
- Use package-manager cache (`actions/setup-node` cache for npm).

### C. Testing PR

Framework choice:
- **Vitest** (best fit for TypeScript-first Node and fast unit tests).

Test directory structure:
- `tests/core/*`
- `tests/api/*`
- `tests/security/*`
- `tests/config/*`
- `tests/fixtures/*`
- `tests/setup/*`

Priority test cases:
- Lifecycle: legal/illegal state transitions.
- Execution: coordinator/agent success and failure propagation.
- Webhook: validation, auth rejection, replay rejection.
- Orchestrator: run creation to approval/execution handoff invariants.

Coverage threshold (minimum):
- lines: 80%
- functions: 80%
- branches: 70%
- statements: 80%

Mocking policy:
- Mock: external IO boundaries (network, heavy file writes, clock randomness where needed).
- Do not mock: core state machine, validation schemas, pure business decision logic.

### D. Env/config hardening PR

Must include:
- `.env.example` with required keys documented.
- Startup env validation before executing commands/webhooks.
- Secret strength rules (len >= 32, no placeholder values).
- No insecure defaults for any secret.
- Config schema recommendation: Zod strict object + typed export.

### E. Portability PR

Must include:
- Replace Windows-only `F:/...` paths in compose/runtime.
- Env-configurable path roots.
- Linux/container-safe defaults.
- Path helper utility with test coverage.
- Docs describing migration and override strategy.

### F. Deployment baseline PR

Must include:
- `Dockerfile`.
- `.dockerignore`.
- compose baseline (`compose/docker-compose.app.yml`).
- Healthcheck mechanism.
- Deployment contract doc.
- Rollback note with image pinning and redeploy steps.

## 5. Acceptance criteria matrix

| PR | Area | Acceptance criteria | How to verify |
|---|---|---|---|
| PR-01 | Test harness | Test suite exists, runs in CI, thresholds enforced | `npm run coverage` fails when threshold lowered intentionally; passes on default run |
| PR-02 | Webhook security | Unsigned/invalid/replayed/expired requests rejected; valid signed request accepted | Integration tests for each failure mode + one valid signed fixture |
| PR-03 | Env/config | Missing/weak secrets fail startup; valid env loads typed config | Run CLI with bad env and confirm non-zero exit + actionable errors |
| PR-04 | Portability | No hardcoded Windows drive-letter runtime assumptions | `rg "F:/|C:/" compose src` returns no required runtime references |
| PR-05 | CI/CD | PR triggers install/typecheck/lint/build/test/audit and blocks on failure | Open test PR with forced lint/test failure and confirm red checks |
| PR-06 | Deployment | Container image builds, starts, and reports healthy; docs support repeatable deploy + rollback | `docker build` + `docker compose -f compose/docker-compose.app.yml up` + healthcheck command |

## 6. Definition of done for Phase 1

- [ ] Webhook handlers require valid HMAC signature, freshness, and replay-safe nonce/idempotency checks.
- [ ] Webhook authentication fails closed and emits structured audit logs without leaking secrets.
- [ ] Automated test harness exists with enforced minimum coverage thresholds.
- [ ] Critical lifecycle/execution/webhook tests are green in local and CI runs.
- [ ] Runtime env is schema-validated at startup; required secrets have no insecure defaults.
- [ ] Path handling uses centralized OS-safe helper and no production-required Windows-only paths remain.
- [ ] GitHub Actions CI gates run on push/PR and are configured as required checks.
- [ ] Deployment baseline artifacts (`Dockerfile`, `.dockerignore`, app compose) exist and run with documented contract.
- [ ] Deployment docs include operational healthcheck and rollback procedure.

## 7. Highest-risk implementation details

- Signature verification pitfalls:
  - Verifying parsed JSON instead of exact raw body bytes breaks signature determinism.
  - Trimming/normalizing header values before signature reconstruction can invalidate requests.
  - Comparing signatures with standard string comparison leaks timing side channels.
- Replay prevention issues:
  - Using timestamp alone (without nonce/idempotency key) allows rapid replay within skew window.
  - Nonce store without TTL cleanup can bloat and eventually degrade performance.
  - Nonce scope mistakes (global vs per-endpoint) can cause false positives/false negatives.
- Flaky tests:
  - Tests that depend on real clock time around freshness windows can intermittently fail.
  - Shared filesystem fixtures without isolation can cause cross-test pollution.
- Env validation gaps:
  - Validating presence but not strength/format of secrets leaves exploitable weak configs.
  - Optional fallbacks for secrets can accidentally reintroduce insecure defaults.
- Docker/runtime mismatches:
  - Building with dev deps but running without required runtime assets can cause container boot failures.
  - Healthcheck command not matching actual service mode causes false unhealthy states.
- Path migration regressions:
  - Changing data root without migration note can orphan prior run history.
  - Path joins done with string concatenation instead of `path.join/resolve` break cross-platform behavior.

## 8. Suggested commands

Use whichever package manager is canonical for this repo (currently npm lockfile is present):

- Install deps:
  - `npm ci`
- Build:
  - `npm run build`
- Typecheck:
  - `npm run typecheck`
- Lint:
  - `npm run lint`
- Tests:
  - `npm run test`
  - `npm run coverage`
- Focused webhook/security tests:
  - `npm run test -- tests/security/webhook-signature.test.ts`
- Validate env startup behavior:
  - `AJ_WEBHOOK_SECRET=short npm run cli -- help` (should fail once validation added)
- CI parity local run:
  - `npm run typecheck && npm run lint && npm run build && npm run coverage`
- Container build/run baseline:
  - `docker build -t aj-digital-os:phase1 .`
  - `docker compose -f compose/docker-compose.app.yml up --build`
- Healthcheck:
  - `docker inspect --format='{{json .State.Health}}' <container_name>`

### Immediate must-do vs nice-to-have

Immediate must-do (Phase 1 required):
- PR-01 through PR-06 scope exactly as defined above.
- Security controls fail closed and no insecure env defaults.

Nice-to-have (post Phase 1):
- OIDC/GitHub deployment auth hardening.
- SBOM generation + image signing (cosign).
- Integration/e2e tests against real external services.
- Advanced alerting/SLI dashboards for webhook rejection rates.

## Codex execution mode

- PR-01 (test harness): **safe to execute automatically** — low-risk additive changes with clear pass/fail via tests.
- PR-02 (webhook security): **should be executed with review checkpoints** — high risk of subtle auth bugs; require review after signature/freshness/replay implementation and again after integration tests.
- PR-03 (env/config hardening): **should be executed with review checkpoints** — startup validation can break existing operator workflows; review required secrets and migration messaging.
- PR-04 (portability/path cleanup): **should be executed with review checkpoints** — data-path migration can impact existing persisted runs and compose environments.
- PR-05 (CI/CD gates): **safe to execute automatically** — mostly additive workflow configs, easy to verify via CI runs.
- PR-06 (deployment baseline): **should be executed with review checkpoints** — container/runtime assumptions and healthcheck behavior require careful validation in target environment.

Why:
- Security, config, portability, and deployment tasks can introduce production-impacting failure modes if assumptions are wrong.
- Test and CI scaffolding are comparatively low blast-radius and mechanically verifiable.
