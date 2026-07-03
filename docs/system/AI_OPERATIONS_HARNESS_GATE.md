# AJ Digital OS Operations Harness Gate

**Status:** Draft standard  
**Scope:** AJ Digital OS on `C:\dev\AJ-DIGITAL-OS`  
**Purpose:** Define which agent harnesses are currently in operations, what is deferred, and what must be true before adding additional harnesses such as Hermes and Ollama.

## 1. Current Operating Boundary

At this stage, only these harnesses belong in operations:

- Codex desktop
- Codex CLI
- Claude desktop
- Claude CLI

These are the only harnesses that should be used for active repo operations until the gate below is satisfied.

Deferred until gate approval:

- Hermes
- Ollama
- Any other agent harness, plugin lane, or auxiliary automation surface

## 2. Gate Definition

The gate is reached when **both Codex and Claude are stable in both desktop and CLI modes** while operating from the canonical repo root:

`C:\dev\AJ-DIGITAL-OS`

“Stable” means the harness can be used repeatedly for normal repo work without trust drift, workspace confusion, or recurring recovery steps.

This is not a model-quality gate. It is an operator-harness stability gate.

## 3. Gate Criteria

### 3.1 Repository boundary is stable

- Each harness launches from `C:\dev\AJ-DIGITAL-OS`
- The harness reports the correct repo root
- No parent-folder bleed, accidental sibling repo bleed, or OneDrive/home indexing bleed appears during normal use
- `git status --short` only shows intentional work after a session

### 3.2 Trust state is durable

- Trust cleanup survives a relaunch
- No stale root trust remains that conflicts with the intended repo boundary
- No recurring trust prompts appear for the same approved workspace on clean relaunch
- Hook/plugin noise is either resolved or explicitly documented as non-blocking

### 3.3 Core local checks are repeatable

Each harness should be able to complete the repo’s basic health path from the repo root without manual repair.

Minimum evidence:

- `node dist/cli.js doctor`
- the assistant readiness path used by this repo
- a semantic search or memory retrieval smoke test
- a clean git status after the session, except for intentionally changed files

### 3.4 Desktop and CLI parity is acceptable

- Desktop and CLI variants behave consistently enough that the operator does not need a different recovery playbook for each one
- The same repository root, trust posture, and validation path apply across both entry modes
- Any differences are documented and predictable, not emergent

### 3.5 No hidden dependency on deferred harnesses

- Codex and Claude do not depend on Hermes or Ollama being integrated into operations to remain usable
- Hermes and Ollama can be introduced later as explicit integrations, not as prerequisites for the current harness stack

## 4. Recommended Exit Signal

The gate should be considered reached only after this minimum evidence exists:

- 3 consecutive successful Codex sessions
- 3 consecutive successful Claude sessions
- each session started from `C:\dev\AJ-DIGITAL-OS`
- each session completed the local verification path without trust recovery
- each session ended with only expected working-tree changes

If one mode fails repeatedly, the gate is not open.

## 5. What Gets Added After the Gate

Only after the gate is satisfied should the repo begin mapping and integrating:

- Hermes as an operations harness
- Ollama as a managed model/runtime dependency in the operations lane
- any other harnesses or plugin surfaces that need to participate in day-to-day work

Those integrations should be treated as separate workstreams with their own validation criteria.

## 6. Current Work To Reach The Gate

The next practical work is to make the current four harness entry modes boring and repeatable.

Priority order:

1. Confirm each harness starts from the canonical repo root
2. Clear remaining trust drift and hook noise
3. Verify the same health checks succeed in repeated sessions
4. Document any recurring discrepancy between desktop and CLI
5. Only then evaluate Hermes and Ollama for operations admission

## 7. Acceptance Checklist

- [ ] Only Codex desktop, Codex CLI, Claude desktop, and Claude CLI are in operations
- [ ] Hermes is explicitly deferred
- [ ] Ollama is explicitly deferred
- [ ] Gate criteria are written and measurable
- [ ] Canonical repo root is defined as `C:\dev\AJ-DIGITAL-OS`
- [ ] Stability requires repeated successful sessions, not one-off success
- [ ] The document is ready to guide the next cleanup and validation pass
