# Runtime-State Classification - P1b

Date: 2026-06-07
Repo: AudioJones-Dev/AJ-DIGITAL-OS-V1
Local path: `C:\dev\AJ-DIGITAL-OS`
Branch: `codex/stabilization-phase-1`
Owner: Codex

## Scope

Classify tracked dirty runtime state and `data/memory/shared/failures.jsonl` into keep/remove/ignore/fixture decisions. This report is classification only. No runtime files were deleted, restored, untracked, or moved.

## Measured State

- Dirty tracked runtime files: 5
- Dirty tracked `data/memory/shared/failures.jsonl`: 0
- Runtime dirty diff size: 3,394 insertions, 14 deletions
- `git ls-files -ci --exclude-standard runtime data/memory/shared/failures.jsonl`: no matches in current ignore state

Dirty tracked files:

- `runtime/dag/dag-audit.jsonl`
- `runtime/dag/dag-node-outputs.json`
- `runtime/dag/dag-runs.json`
- `runtime/events/system-events.jsonl`
- `runtime/observability/metrics.json`

## Decision Table

| Path | Current signal | Classification | Decision | Fixture decision | Required operator-approved action |
| --- | --- | --- | --- | --- | --- |
| `runtime/dag/dag-audit.jsonl` | Appended DAG audit events from tests/local workflow runs. Records include deterministic test timestamps and generated UUIDs/run IDs. | Runtime state / generated audit ledger | Keep locally, remove from committed source tracking, ignore future changes. | Do not fixture the full ledger. If a test needs audit examples, create a minimal fixture under `tests/fixtures/dag/`. | After approval: restore current dirty changes or archive outside Git, then `git rm --cached runtime/dag/dag-audit.jsonl` and add an ignore rule. |
| `runtime/dag/dag-runs.json` | Large appended run records for `lead-to-offer-v1` and content brief DAGs. | Runtime state / generated run store | Keep locally, remove from committed source tracking, ignore future changes. | Do not fixture the full run store. Prefer small deterministic fixtures or test temp directories. | After approval: restore/archive, then `git rm --cached runtime/dag/dag-runs.json` and add an ignore rule. |
| `runtime/dag/dag-node-outputs.json` | Large appended node output payloads, including generated entity IDs, emails using `.example`, MAP evaluations, and content brief outputs. | Runtime state / generated output store | Keep locally, remove from committed source tracking, ignore future changes. | Do not fixture the full output store. If needed, extract sanitized minimal cases into `tests/fixtures/dag/`. | After approval: restore/archive, then `git rm --cached runtime/dag/dag-node-outputs.json` and add an ignore rule. |
| `runtime/events/system-events.jsonl` | Appended control-plane event ledger from local/test runs. Repeated approval, reject, cancel, rerun, and policy events. | Runtime state / generated event ledger | Keep locally, remove from committed source tracking, ignore future changes. | Do not fixture the full ledger. If contract examples are needed, add minimal event fixtures under `tests/fixtures/events/`. | After approval: restore/archive, then `git rm --cached runtime/events/system-events.jsonl` and add an ignore rule. |
| `runtime/observability/metrics.json` | Counter snapshot changed from prior local/test event volume. | Runtime state / generated metrics snapshot | Keep locally, remove from committed source tracking, ignore future changes. | No fixture needed unless metrics serialization tests require one. Tests should prefer temp paths or in-memory fixtures. | After approval: restore/archive, then `git rm --cached runtime/observability/metrics.json` and add an ignore rule. |
| `data/memory/shared/failures.jsonl` | Present and tracked, but not dirty in current status. Source code documents it as an append-only failure log. | Runtime memory log / operational ledger | Keep locally, remove from committed source tracking, ignore future changes. | No fixture from the live log. If memory-runtime tests need failures, add sanitized test fixtures under `tests/fixtures/memory/`. | After approval: `git rm --cached data/memory/shared/failures.jsonl` and add an ignore rule. Do not delete the local file. |

## Rationale

- Architecture docs identify the dirty `runtime/**` paths as local file-backed persistence targets and future migration candidates, not durable source code.
- Source modules write directly into these runtime paths by default.
- Tests reference the same runtime paths, which explains repeated dirty state after validation.
- The dirty data is operational/test run output, not a stable source-of-truth artifact.
- Committing these files would preserve local state churn and make future validation runs dirty again.

## Control Recommendations

1. Do not commit the dirty runtime data.
2. Do not delete local runtime files without operator approval.
3. Add explicit ignore rules for generated runtime stores after untracking them.
4. Keep committed policy/config files separate from generated state:
   - Keep source-like runtime config such as `runtime/policies/*.policy.json` tracked unless separately reclassified.
   - Ignore generated stores and ledgers such as `runtime/dag/*.json`, `runtime/dag/*.jsonl`, `runtime/events/*.jsonl`, and `runtime/observability/*.json`.
5. Update tests that currently write to repository `runtime/` so they use temp directories or fixture-controlled paths.

## Proposed Next Approval Gate

No cleanup action is taken in this P1b commit. The next operator-approved step should be a narrow index cleanup plan:

- Add ignore rules for the classified generated paths.
- `git rm --cached` only the classified generated files.
- Preserve local disk copies.
- Re-run `npm run typecheck` and `npm run test`.
- Commit the cleanup separately.

Rollback for this classification artifact:

```powershell
Remove-Item -LiteralPath "C:\dev\AJ-DIGITAL-OS\.codex\stabilization\runtime-state-classification-2026-06-07.md"
```
