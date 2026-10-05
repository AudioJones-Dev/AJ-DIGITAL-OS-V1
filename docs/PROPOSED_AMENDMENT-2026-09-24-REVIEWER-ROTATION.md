# Proposed amendment: Greptile and CodeRabbit reviewer rotation

Status: DRAFT; not ratified or applied.

## Task specification

Problem: current policy excludes Greptile and leaves mixed Codex/Claude work dependent on CodeRabbit.
Outcome: permit either independent provider and rotate when the selected provider cannot complete review.
Success: canonical policy and both global entry points agree; current-head evidence, blocking findings, stricter local checks, and human-only merge remain mandatory.
Scope: only the exact three diffs below; canonical version 1.3.0, review_by 2026-10-24.
Out of scope: runtime enforcement, other repositories or mirrors, GitHub settings, credentials, provider activation, commits, push, merge, deployment, and the approval matrix itself.
Assumption: preserve CodeRabbit as default and existing eligible cross-review; the request changes availability routing, not all review roles.
Risk: governance/agent-behavior change (L6); documented instruction contract, not technical enforcement.
Open decision: owner ratification and bound mechanical-application authorization.

## Application and validation

Recheck all SHA-256 bindings before editing; stop on any mismatch. Preserve exact pre-change bytes outside repositories in a timestamped backup folder under C:/Users/tyron.AUDIOJONES/.codex/policy-backups/reviewer-rotation-2026-09-24/. Append approval, backup paths, pre/post hashes and results to G:/AJ-INTERNAL/AJ-DIGITAL-VAULT/00-CONTROL/GOVERNANCE/AUDIT-LOG/AUDIT-2026-09-24.md. Never overwrite previous audit entries. Apply only the exact diffs below. Check matching reviewer lists and removal of mixed-work CodeRabbit-only wording; confirm human-only merge and stricter checks survive. Restore only these files from their byte-preserving backups if rollback is authorized; preserve the append-only audit. No runtime tests are needed for this Markdown-only amendment.

## Exact target bindings and diffs

### G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE\GLOBAL_MERGE_CRITERIA.md

Pre-change SHA-256: `3a57a9afe5eeef30772f07f97d7de5d7c0afd85fb8319985b512c871fb0229cd`

```diff
--- G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE\GLOBAL_MERGE_CRITERIA.md
+++ G:\AJ-INTERNAL\AJ-DIGITAL-VAULT\00-CONTROL\GOVERNANCE\GLOBAL_MERGE_CRITERIA.md
@@ -1,12 +1,13 @@
 ---
-version: 1.2.0
+version: 1.3.0
 status: active
 owner: Tyrone Nelms (human root authority)
 parent: HUMAN_APPROVAL_MATRIX.md
 created: '2026-06-10'
-review_by: '2026-10-12'
+review_by: '2026-10-24'
 change_policy: HUMAN_REQUIRED — human ratification required; agent may mechanically apply only under HUMAN_APPROVAL_MATRIX Sections 4A and 18
 changelog:
+  - 1.3.0 — owner-approved Greptile eligibility and reciprocal CodeRabbit fallback; human-only merge preserved (2026-09-24)
   - 1.2.0 — owner-approved independent review and human-only merges; retired agent/auto-merge execution (2026-09-12)
   - 1.1.0 — adopted repository-specific Solo-Maintainer Evidence Substitution with exact-SHA, AI-review, cooling-period, audit, and owner-approval safeguards (2026-07-22)
   - 1.0.0 — initial adoption (2026-06-10)
@@ -18,14 +19,18 @@
 ## Independent review and human-only merge

 This is the canonical owner-approved review and merge policy, effective for
-this rollout on 2026-09-12. It supersedes older agent-merge and auto-merge
+the original rollout on 2026-09-12, amended for reviewer rotation on 2026-09-24. It supersedes older agent-merge and auto-merge
 permissions. Stricter local validation and independent-review requirements
 remain in force. The review date above applies to this amendment; it does not
 renew the expired Solo-Maintainer exception or unrelated standing grants.

-- Codex-authored changes require independent review by Claude or CodeRabbit.
-- Claude-authored changes require independent review by Codex or CodeRabbit.
-- If both Codex and Claude authored a PR, CodeRabbit must independently review it.
+- Codex-authored changes require independent review by Claude, CodeRabbit, or Greptile.
+- Claude-authored changes require independent review by Codex, CodeRabbit, or Greptile.
+- If both Codex and Claude authored a PR, CodeRabbit or Greptile must independently review it.
+- CodeRabbit and Greptile are interchangeable independent reviewer roles when they did not author the changes. If the selected provider is unavailable, rate-limited, failed, skipped, cancelled, timed out, or cannot produce substantive review of the current head, route to the other provider without a separate routing approval. Pending or running alone is not evidence of unavailability.
+- Record the original provider, fallback reason and evidence, replacement provider, reviewed head SHA, review scope, outcome, and evidence link. Provider switching does not clear findings: preserve and resolve all blocking findings and conversations from either provider.
+- If neither provider completes an eligible review, use an already-eligible non-author cross-reviewer only where this policy permits; otherwise remain blocked. Never waive review or substitute an author's self-check. One completed eligible review satisfies this reviewer requirement only where stricter local rules do not require more.
+- Rotation changes reviewer assignment only. It does not authorize credentials, billing, repository access, provider activation, branch-protection changes, deployment, or merge. A provider-specific required check remains required until separately changed by the owner.
 - Authors may test and self-check, but cannot satisfy their own independent-review requirement.
 - Review must cover the current changes. Changes after review require independent review of those changes.
 - Pending, skipped, failed, or rate-limited reviews do not count as completed review.
@@ -59,10 +64,13 @@
 This is a procedural declaration, not a cryptographically controlled identity.
 Conflicts block completion until resolved from evidence.

-CodeRabbit is the default router for Codex-only, Claude-only and mixed work.
-Claude is an eligible fallback for Codex-only work; Codex is an eligible fallback
-for Claude-only work. Mixed work requires CodeRabbit. Human-only work retains
-normal local review rules; other harness eligibility requires owner clarification.
+CodeRabbit remains the default reviewer for Codex-only, Claude-only and mixed
+work. Greptile is an equally eligible substitute. If either selected provider
+cannot complete an eligible review, rotate to the other under the rules above.
+Claude remains an eligible fallback for Codex-only work; Codex remains an
+eligible fallback for Claude-only work. Mixed work requires CodeRabbit or
+Greptile. Human-only work retains normal local review rules; other authoring
+harness eligibility requires owner clarification.
 Unknown provenance blocks completion, not merely the choice of reviewer.

 New commits, force pushes, changed files and material amendments invalidate
```

### C:\Users\tyron.AUDIOJONES\.codex\AGENTS.md

Pre-change SHA-256: `b41c8a0030ca4bb055259ad64077bd8be7e2418fb4a12651ff08db7adc58c379`

```diff
--- C:\Users\tyron.AUDIOJONES\.codex\AGENTS.md
+++ C:\Users\tyron.AUDIOJONES\.codex\AGENTS.md
@@ -224,14 +224,18 @@

 ## Independent review and human-only merge

-Authority: the owner-approved AJ Digital policy (2026-09-12), maintained in
+Authority: the owner-approved AJ Digital policy (2026-09-12; reviewer amendment 2026-09-24), maintained in
 `G:/AJ-INTERNAL/AJ-DIGITAL-VAULT/00-CONTROL/GOVERNANCE/GLOBAL_MERGE_CRITERIA.md`
 under `HUMAN_APPROVAL_MATRIX.md`. This entry point implements that policy; it
 does not establish a competing authority. Preserve stricter local controls.

-- Codex-authored changes require independent review by Claude or CodeRabbit.
-- Claude-authored changes require independent review by Codex or CodeRabbit.
-- If both Codex and Claude authored a PR, CodeRabbit must independently review it.
+- Codex-authored changes require independent review by Claude, CodeRabbit, or Greptile.
+- Claude-authored changes require independent review by Codex, CodeRabbit, or Greptile.
+- If both Codex and Claude authored a PR, CodeRabbit or Greptile must independently review it.
+- CodeRabbit and Greptile are interchangeable independent reviewer roles when they did not author the changes. If the selected provider is unavailable, rate-limited, failed, skipped, cancelled, timed out, or cannot produce substantive review of the current head, route to the other provider without a separate routing approval. Pending or running alone is not evidence of unavailability.
+- Record the original provider, fallback reason and evidence, replacement provider, reviewed head SHA, review scope, outcome, and evidence link. Provider switching does not clear findings: preserve and resolve all blocking findings and conversations from either provider.
+- If neither provider completes an eligible review, use an already-eligible non-author cross-reviewer only where this policy permits; otherwise remain blocked. Never waive review or substitute an author's self-check. One completed eligible review satisfies this reviewer requirement only where stricter local rules do not require more.
+- Rotation changes reviewer assignment only. It does not authorize credentials, billing, repository access, provider activation, branch-protection changes, deployment, or merge. A provider-specific required check remains required until separately changed by the owner.
 - Authors may test and self-check, but cannot satisfy their own independent-review requirement.
 - Review must cover the current changes. Changes after review require independent review of those changes.
 - Pending, skipped, failed, or rate-limited reviews do not count as completed review.
```

### C:\Users\tyron.AUDIOJONES\.claude\CLAUDE.md

Pre-change SHA-256: `f293ccab6aa2d3e4e9b42af86c6ccdef8f0146950fc24ef7227812c79a0d8756`

```diff
--- C:\Users\tyron.AUDIOJONES\.claude\CLAUDE.md
+++ C:\Users\tyron.AUDIOJONES\.claude\CLAUDE.md
@@ -23,14 +23,18 @@

 ## Independent review and human-only merge

-Authority: the owner-approved AJ Digital policy (2026-09-12), maintained in
+Authority: the owner-approved AJ Digital policy (2026-09-12; reviewer amendment 2026-09-24), maintained in
 `G:/AJ-INTERNAL/AJ-DIGITAL-VAULT/00-CONTROL/GOVERNANCE/GLOBAL_MERGE_CRITERIA.md`
 under `HUMAN_APPROVAL_MATRIX.md`. This entry point implements that policy; it
 does not establish a competing authority. Preserve stricter local controls.

-- Codex-authored changes require independent review by Claude or CodeRabbit.
-- Claude-authored changes require independent review by Codex or CodeRabbit.
-- If both Codex and Claude authored a PR, CodeRabbit must independently review it.
+- Codex-authored changes require independent review by Claude, CodeRabbit, or Greptile.
+- Claude-authored changes require independent review by Codex, CodeRabbit, or Greptile.
+- If both Codex and Claude authored a PR, CodeRabbit or Greptile must independently review it.
+- CodeRabbit and Greptile are interchangeable independent reviewer roles when they did not author the changes. If the selected provider is unavailable, rate-limited, failed, skipped, cancelled, timed out, or cannot produce substantive review of the current head, route to the other provider without a separate routing approval. Pending or running alone is not evidence of unavailability.
+- Record the original provider, fallback reason and evidence, replacement provider, reviewed head SHA, review scope, outcome, and evidence link. Provider switching does not clear findings: preserve and resolve all blocking findings and conversations from either provider.
+- If neither provider completes an eligible review, use an already-eligible non-author cross-reviewer only where this policy permits; otherwise remain blocked. Never waive review or substitute an author's self-check. One completed eligible review satisfies this reviewer requirement only where stricter local rules do not require more.
+- Rotation changes reviewer assignment only. It does not authorize credentials, billing, repository access, provider activation, branch-protection changes, deployment, or merge. A provider-specific required check remains required until separately changed by the owner.
 - Authors may test and self-check, but cannot satisfy their own independent-review requirement.
 - Review must cover the current changes. Changes after review require independent review of those changes.
 - Pending, skipped, failed, or rate-limited reviews do not count as completed review.
```
