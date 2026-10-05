---
title: Secure Delivery Workflow
workflow_id: AJ-SEC-WF-001
version: 0.1-draft
status: draft
canonical: false
ratification_status: pending-human-review
authoring_agent: Codex
owner: AJ Digital / Audio Jones
created: 2026-09-13
review_by: 2026-10-13
---

# Secure Delivery Workflow

## Authority and purpose

Proposal only: no jobs, hooks, schedules or protections are installed by this document. Proposed canonical destination: `G:/AJ-INTERNAL/AJ-DIGITAL-VAULT/02-OPERATING-SYSTEM/Protocols/SECURE_DELIVERY_WORKFLOW.md`.

Implements the proposed [Global Security Assurance Standard](GLOBAL_SECURITY_ASSURANCE_STANDARD.md) under the existing human approval and global merge authorities. See the [Amendment Matrix](SECURITY_ASSURANCE_AMENDMENT_MATRIX.md) for adoption decisions. Security readiness is necessary but never sufficient permission to merge or deploy.

## Lifecycle and owners

| Trigger | Responsible role | Required output | Stop behavior |
| --- | --- | --- | --- |
| Repository creation | Repository owner and bootstrap agent | Profile, threat model, test plan, policy references, incident/exception ownership | Unknown mandatory surfaces block implementation readiness |
| Worktree creation | Change owner | Scope, source SHA, profile digest, controls, authoring system and evidence plan | Unresolved scope or authority blocks activation |
| Pre-commit | Builder and approved local tooling | Staged-content secret scan and applicable fast static checks | Findings stop commit pending disposition; local hooks are not authoritative CI |
| Pull request | CI plus eligible independent reviewer | Secret/SAST/SCA results, changed-surface tests, threat delta and review | Missing or failed required evidence blocks readiness |
| Pre-merge | Evidence evaluator; human merge operator | Current head/base or integration candidate, exceptions, review provenance | Any blocking finding or stale evidence prevents merge-ready |
| Pre-deploy | Release owner and human approver | Artifact/configuration-bound release security record | Wrong environment, unresolved controls or missing approval blocks deploy |
| Weekly | Security owner and approved scheduler | Dependency/advisory delta, authorized secret-exposure scan and alert triage | Material findings reopen incident/remediation; no automatic deployment |
| Monthly | AI security owner and independent validator | Applicable prompt-injection/cross-agent tests, permissions, connector and tenant review | Failed boundaries escalate and invalidate affected assurance |
| Quarterly | Human risk owner and security reviewer | Threat-model/access/architecture review and incident/recovery exercise | Overdue or unresolved mandatory review is recorded as nonconformance |

Monthly AI work may be not-applicable only with reviewed evidence. Scheduling and secret-bearing execution require separate approved implementation scope. No scheduler may send messages, rotate credentials or mutate production merely because a review is due.

Proposed worktree states: planned -> ready -> active -> validation -> merge-ready -> merged -> retired. Ready requires classified scope; active requires execution authority; merge-ready requires current security and independent-review evidence. Only a verified human merge produces merged. Retirement preserves evidence and requires separate cleanup authorization. Failed validation returns the task to remediation without deleting its evidence.

## Repository-profile contract

Future path: `.aj/security-profile.yaml`, or an explicitly mapped equivalent. This is a proposed data contract, not an installed validator. Example values are placeholders, not this repository's classification.

```yaml
schema_version: "1"
repository_id: "example-repository"
owner: "accountable-owner"
standard:
  id: AJ-SEC-STD-001
  version: "ratified-version"
  digest: "canonical-content-digest"
classification:
  governance_tier_ref: "existing-registry-entry"
  assurance_tier: enhanced
  internet_exposed: unknown
  handles_secrets: unknown
  accepts_user_input: unknown
  uses_llm: unknown
  uses_agents: unknown
  uses_rag: unknown
  uses_mcp: unknown
  writes_external_systems: unknown
  stores_pii: unknown
  multi_tenant: unknown
  uses_containers: unknown
  manages_infrastructure: unknown
surfaces: []
data_classes: []
trust_boundaries: []
control_mappings: []
evidence_store_ref: "restricted-evidence-location"
incident_owner: "incident-owner"
exception_register: "existing-or-new-register-path"
reviewed_at: null
review_due: null
```

All shown fields are required. Classification flags accept YAML booleans or the literal `unknown`; assurance_tier accepts baseline, enhanced or critical. Timestamps use ISO 8601; null is permitted only before initial review and cannot pass readiness. Unknowns block classification completion. Reject invalid types, missing fields and unsupported schema versions. Empty surfaces/controls need reviewed not-applicable evidence rather than an automatic pass.

Each surface records id, entrypoint, environment, identity, tenant boundary, data classes, cost exposure, owner and control/test references. Each control mapping records control_id, applicability, rationale, evidence requirements, test/tool adapter and reviewer. Required tests are derived from trusted policy and the profile, not solely from author-supplied exclusions. An observed surface absent from the profile creates a classification finding.

Repositories map existing SECURITY policy, threat model, test plan and exception register paths instead of duplicating them. Store policy references and metadata only; never secrets. Record development-agent surfaces independently from shipped application features.

## CI/security gate design

Proposed capabilities: profile-validation -> secret-scan -> SAST/SCA plus applicable abuse/AI/auth/tenant tests -> independent-review -> security-gate. Container, infrastructure, dynamic staging and artifact scans join when applicable. Independent jobs may run concurrently; the aggregate evaluator must wait for all required evidence.

The aggregate check always evaluates, including after upstream failure/cancellation. Its result is not pass if a mandatory job is absent, unexpectedly skipped, stale, cancelled, unavailable or failed. Dependency outages yield error/pending, not success. Not-applicable requires an approved rationale. High/critical findings follow the standard's exception rules; tools never approve exceptions.

Use read-only CI tokens, isolated PR execution, no production credentials in untrusted builds, pinned tools/actions where supported and controlled dependency execution. Do not run untrusted PR code in a privileged workflow context. Evaluate workflow/profile changes against protected policy and independently review any reduction of coverage. Changes to the evaluator cannot self-certify.

Vendor adapters translate results into one evidence contract. Replacement requires demonstrated coverage and result-parity testing, reviewed exclusions and approval where configuration changes are gated. Greptile remains supplemental unless reviewer eligibility is amended. Preserve stronger existing review lanes.

Hosted branch protections and environment reviewers must be verified separately before claiming enforcement. Workflow text or a trigger actor does not prove approval. Do not install competing security workflows where existing workflows can be extended coherently.

## Evidence contract and freshness

Every run records: evidence_id, repository_id, worktree/change/PR id, authoring systems, commit/tree SHA, base SHA or integration candidate where relevant, artifact digest when applicable, policy/profile digests, control ids, tool/version/ruleset, advisory-feed timestamp, start/end time, environment, scope/exclusions, completion state, finding ids, reviewer provenance, exception refs, restricted evidence URI and expiry.

Completion states: pending, pass, blocked, error, expired, not_applicable. A pass is meaningful only for its recorded scope and subject. Record immutable evidence identifiers and integrity checks; authenticate evaluator/reviewer provenance independently of PR text or account display names.

Proposed freshness: code/static/secret results bind the exact candidate; changed code or base invalidates affected integration evidence. Independent review must cover all current changes. Release SCA/advisory results must be no older than 24 hours with a successfully refreshed feed. Configuration and approval evidence bind the actual deployment revision/environment and are rechecked immediately before action. Material model/tool/prompt/policy changes invalidate relevant AI tests. An active new advisory or incident can invalidate evidence before nominal expiry. These freshness targets require ratification.

Security gate evaluation: resolve trusted policy -> validate profile -> derive required controls -> verify subject/provenance/freshness -> verify all results -> evaluate findings/exceptions -> record decision and reasons. Unknown evidence cannot become pass by assertion. Record security readiness separately from merge approval and deployment approval.

## Pre-deployment and post-deployment verification

Verify target release digest and configuration, environment/tenant identity, approved secret delivery, least privilege, debug/test/staging settings, rate/spend limits, applicable headers, logging, alerts, AI permissions and rollback. Bind human approval to the release and environment. Rebuilds or configuration drift require renewed relevant evidence and approval.

After authorized deployment, verify the served release identity and operational safeguards using approved non-destructive checks. If validation fails, stop promotion and escalate through the approved rollback/incident path; this workflow grants no autonomous rollback authority.

## Migration and acceptance tests for future enforcement

Follow the amendment matrix sequence. Before enabling required checks, test: missing scanner; scanner outage; stale SHA; base change; expired exception; forged reviewer evidence; malicious profile downgrade; active secret; critical finding; wrong artifact/environment; and a legitimate not-applicable control. Expected outcomes must be explicit, with no false pass. Also prove benign eligible changes complete and existing human gates remain intact.

Reporting mode reports nonconformance; it does not confer compliance or override existing blockers. Keep baseline findings visible with owners and deadlines. No blanket grandfathering. Repositories become enforced only after hosted configuration and a deliberately failing gate are verified through an approved test.
