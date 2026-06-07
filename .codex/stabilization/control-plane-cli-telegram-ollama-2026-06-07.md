# Control Plane CLI / Telegram / Ollama Stabilization Note

Date: 2026-06-07
Owner: Codex
Task: Control plane (CLI / Telegram / Ollama)

## Scope

- Confirmed `src/control-plane` exists with CLI, Telegram, Ollama, auth, registry, and parser surfaces.
- Confirmed dashboard control surface exists at `dashboard/app/control/page.tsx`.
- Validated current root and dashboard builds.
- Checked PR #17 status for Telegram phase 1.

## Change Made

- Fixed malformed dashboard API route literals in `dashboard/lib/api.ts`.
- Restored Hermes API base URL usage for affected dashboard helper calls.
- Restored encoded dynamic route segments for cache namespace, DAG run ID, DAG audit run ID, and governance SOP workflow type.

## Validation

- `npm run typecheck` passed.
- `npm run test -- tests/control-plane/control-plane.test.ts tests/control-plane/telegram-auth.test.ts tests/telegram/telegram.test.ts tests/dashboard/control-client.test.ts` passed.
- `npm run build` passed.
- `npm --prefix dashboard ci` completed to install dashboard dependencies.
- `npm --prefix dashboard run build` passed after the API route fix.

## PR #17 State

- URL: https://github.com/AudioJones-Dev/AJ-DIGITAL-OS-V1/pull/17
- State: `OPEN`
- Draft: `false`
- Head: `codex/implement-phase-1-of-telegram-control-plane`
- Base: `main`
- Merge state: `DIRTY`
- Review decision: empty
- Status checks: none returned by `gh pr view`

Interpretation: PR #17 is open and non-draft, so it is available for review. It is not merge-clean in the current GitHub state.

## Unresolved Gaps

- PR #17 needs branch reconciliation before it can merge cleanly.
- `npm --prefix dashboard ci` reported npm audit findings: 1 moderate and 1 high. No dependency audit fix was run as part of this task.
