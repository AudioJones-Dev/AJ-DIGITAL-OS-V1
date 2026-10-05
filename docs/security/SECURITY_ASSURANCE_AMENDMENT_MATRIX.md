---
title: Security Assurance Amendment Matrix and Ratification Packet
version: 0.1-draft
status: draft
canonical: false
ratification_status: pending-human-review
authoring_agent: Codex
owner: AJ Digital / Audio Jones
created: 2026-09-13
review_by: 2026-10-13
---

# Security Assurance Amendment Matrix and Ratification Packet

## Task specification

Problem: existing security and approval rules lack a unified cross-repository control/evidence contract for secure delivery.

Desired outcome: two reviewable global drafts and explicit amendments, without activating enforcement or changing authority.

Success criteria: the [standard](GLOBAL_SECURITY_ASSURANCE_STANDARD.md) covers the requested security domains; the [workflow](SECURE_DELIVERY_WORKFLOW.md) specifies triggers/profile/evidence; this matrix identifies conflicts, migration, exact proposed targets and human decisions. All remain draft and non-canonical.

Scope: three new Markdown documents under `docs/security/` in an isolated worktree. Out of scope: application code, active CI, credentials, vault writes, hosted settings, dependencies, production, commits/pushes/PRs and merge execution. Constraints: existing approval matrix, human-only merge, independent review, DOX and docs validation.

Plan: preserve audited baseline -> create isolated documentation branch -> draft these three artifacts -> self-check coverage, links, authority and whitespace -> hand off for eligible independent review -> human ratification -> separately scoped adoption.

Risks: accidental interpretation as active authority, draft dependencies, stale source snapshots, false scanner confidence and migration burden. Rollback: leave drafts unadopted; any later removal is separately authorized. No active system depends on these drafts.

## Audit baseline and evidence quality

Audit date: 2026-09-13. Source checkout: `C:/dev/AJ-DIGITAL-OS`, branch `docs/reliability-hardening-rebaseline-draft`, clean at `05f92fb553837d6e69594e0d2470c0c515ede987`. Draft worktree: `C:/dev/worktrees/aj-digital-os-global-security-assurance`; branch `docs/global-security-assurance-proposal` starts at that exact SHA. It is not asserted to be current origin/main. Reconcile current integration base before a future PR.

Facts below came from the prior read-only audit and current checkout verification. Hosted protection, deployed state, runtime completeness and organization-wide conformance are unverified. Larger source documents were inspected through relevant sections; this is not a complete code/security audit. The two referenced research TXT attachments were not located in the searched vault inventory. No operational maturity percentage is adopted.

| Inspected source | Observed rule or state |
| --- | --- |
| Vault `00-CONTROL/GOVERNANCE/HUMAN_APPROVAL_MATRIX.md` | Human root authority, sensitive-action gates and controlled amendment procedure |
| Vault `00-CONTROL/GOVERNANCE/GLOBAL_MERGE_CRITERIA.md` | Independent review and human-only merge; version 1.2.0 review-by 2026-10-12 observed |
| Vault `02-OPERATING-SYSTEM/Protocols/REPOSITORY_BOOTSTRAP_PROTOCOL.md` | Active global bootstrap requirements |
| Same directory: `REPOSITORY_COMPLIANCE_STANDARD.md` | Active governance, validation and secret-hygiene compliance |
| Same directory: `AGENT_EXECUTION_PROTOCOL.md` | Intake/risk/context/planning/execution/validation lifecycle |
| Same directory: `WORKTREE_SCHEMA_PROTOCOL.md` | Draft non-canonical schema stub, not enforcement |
| Same directory: `PROJECT_DOCUMENTATION_STANDARD.md` | Draft/non-canonical parent despite review milestones |
| Repo root/`docs/` policies and `.codex/validation.json` | Scoped edits, approval gates and documentation validation |
| `docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md` | Secrets, MCP, tenant, permission and incident architecture; historical maturity estimates |
| `docs/system/WORKTREE_PARALLEL_DEVELOPMENT_PROTOCOL.md` | Repo copy of global worktree doctrine; older delegated-merge wording |
| `docs/system/AGENT_DELEGATION_AND_VERIFICATION_STANDARD.md` | Delegation, validation, tenant and authority boundaries |
| `docs/infrastructure/DEPLOYMENT_RUNTIME_STANDARD.md` | Provider-independent deployment, observability, cost and tenant requirements |
| `.github/workflows/security-audit.yml` | High+ production dependency gate; full audit non-blocking |
| `.github/workflows/release-readiness.yml` and `ci.yml` | Test/build checks and CRM RLS isolation job |
| `.github/workflows/deploy.yml` | Manual production-environment workflow; trigger actor labeled approver |
| Production readiness and remote-secret-operations docs | Operational source material, not proof of live conformance |

Inference: existing contracts should be extended rather than duplicated. Assumption pending ratification: policy belongs in governance and the executable workflow contract in global protocols. No equivalent pair was found in searched paths, not proof of absence everywhere.

## Conflicts and gaps to resolve

| Issue | Proposed resolution, not applied |
| --- | --- |
| Four controls lack shared evidence/applicability | Adopt control IDs, profile and aggregate decision contract |
| Dependency job excludes dev/build vulnerabilities from blocking | Assess build-chain impact and triage all applicable scopes |
| Older worktree merge delegation conflicts with current human-only policy | Amend older text to reference current authority; human-only rule prevails now |
| Multiple numeric risk/permission scales | Namespace governance risk, assurance tier and runtime permission; do not equate numbers |
| Immediate rotation wording vs required credential approval | Define incident escalation and authorized execution; no implied emergency powers |
| Critical risk both blocked and potentially accepted in source outline | Propose no ordinary critical exception; human must ratify |
| Draft project/worktree protocols | Preserve draft status and explicitly reconcile promotion dependencies |
| Repo bootstrap draft differs from active global bootstrap | Use canonical pointer and local supplements, no new competing doctrine |
| Historical security completion scores | Replace future assurance claims with dated evidence, not estimated percentages |
| GitHub trigger actor shown as approver | Require actual environment-approval evidence in later deployment implementation |
| Greptile suggested as independent reviewer | Supplemental only until reviewer eligibility explicitly changes |

## Proposed amendment matrix

Vault protocol targets below are under `G:/AJ-INTERNAL/AJ-DIGITAL-VAULT/02-OPERATING-SYSTEM/Protocols/`. Governance targets are under `00-CONTROL/GOVERNANCE/`. No target in this table has been edited.

| Target | Proposed amendment | Acceptance condition |
| --- | --- | --- |
| Governance: `GLOBAL_SECURITY_ASSURANCE_STANDARD.md` (new) | Promote reviewed standard with version, review date, authority and changelog | Exact text ratified; canonical fingerprint recorded |
| Protocols: `SECURE_DELIVERY_WORKFLOW.md` (new) | Promote reviewed workflow under standard | No implicit executable authority |
| `REPOSITORY_BOOTSTRAP_PROTOCOL.md` | Require profile, threat model, test plan, exception/incident owners and canonical references | New repo has complete classification |
| `REPOSITORY_COMPLIANCE_STANDARD.md` | Add coverage/freshness/exceptions/enforcement-state checks | Documentation alone cannot produce compliant status |
| `WORKTREE_SCHEMA_PROTOCOL.md` | Add source/profile digests, control IDs, evidence and security status | Remains draft until separately promoted |
| `AGENT_EXECUTION_PROTOCOL.md` | Add untrusted-content boundary, tool scope and security evidence | Preserves approval hierarchy and current lifecycle |
| `PROJECT_DOCUMENTATION_STANDARD.md` | Add security artifact ownership, references and snapshot rules | Preserve current draft status and promotion procedure |
| Governance: `GLOBAL_MERGE_CRITERIA.md` | Reference security readiness and exception contract | Human-only merge and reviewer rules unchanged |
| Repo `docs/protocols/REPOSITORY_BOOTSTRAP_PROTOCOL.md` | Reconcile global pointer and local additions | No duplicated global authority |
| Repo trust-layer spec | Link global controls and retain runtime architecture ownership | No unsupported maturity/enforcement claim |
| Repo worktree parallel protocol and canonical source | Remove stale delegated merge wording | Source and mirror align with current merge authority |
| Repo deployment-runtime standard and deployment docs | Bind release, config, environment and security evidence | Separate human deployment approval retained |
| Existing CI workflows and PR template, path verified before edits | Later add adapters and aggregate security check | Approved implementation plus failing-case tests |
| `.codex/validation.json` and owning DOX files | Later register approved security validation and ownership | Commands actually exist; no silent activation |

Future repository files: `.aj/security-profile.yaml`, mapped existing SECURITY policy, threat model, test plan and exception register; use existing `docs/security/` or equivalent structure. Proposed schemas/validators and CI configuration require a separate implementation spec and approval. Repository owners declare conformance rather than copying global policy as new authority.

## Requirement traceability

| Requested requirements | Draft coverage |
| --- | --- |
| 1-2: global applicability/bootstrap profile | Standard SEC-01; workflow profile |
| 3: abuse protection | SEC-02 |
| 4-5: scanning and compromise response | SEC-03 |
| 6-11: injection, RAG/MCP, multi-agent, least privilege, approvals | SEC-04 |
| 12-17: SAST, supply chain, container/infra, auth, tenancy, full scan | SEC-05 |
| 18: independence | SEC-06 |
| 19-22: findings, severity, merge/deploy thresholds | SEC-07; workflow evidence |
| 23-24: exceptions and self-waiver prohibition | SEC-08 |
| 25-27: deployment, continuous review, incidents | SEC-09; workflow trigger table |
| 28: evidence retention | SEC-10 |
| 29-30: tiered enforcement/bootstrap compliance | SEC-01; amendment/migration tables |

## Migration sequence

1. Review these drafts independently, resolve blocking findings and ratify precise language and decisions.
2. Inventory current repositories, exposure, existing gates and owners; no broad mutations.
3. Prepare a separately approved AJ Digital OS pilot implementation spec using the ratified contracts.
4. Run authorized reporting-mode checks to establish coverage and baseline findings. Reporting mode is not compliance and cannot relax existing gates.
5. Remediate blockers or approve eligible expiring exceptions; no blanket grandfathering of existing findings.
6. Enable checks per repository only after approved hosted protection/environment verification and deliberate fail-case validation.
7. Add approved bootstrap references for new repositories; use source-version/digest drift checks and reviewed upgrades.
8. Enable approved recurring reviews with named owners; collect adoption metrics: inventory coverage, required-control completion, evidence age, open blockers, expired exceptions and time to remediation.

Migration dates remain unassigned until repository inventory and staffing are known. Default recommendation: prioritize privileged agent/control-plane and internet/client-data surfaces before low-exposure repositories. Tradeoff: deeper coverage increases scan/review cost; profile-based applicability limits redundant work without hiding unknowns.

## Decisions requiring human ratification

- Canonical placement, inheritance and exact text/version/review dates.
- Critical no-exception rule, authorized high-risk acceptor and mandatory-control waiver boundaries.
- Severity definitions, triage/remediation deadlines and evidence freshness targets.
- Assurance tiers, downgrade authority and rollout deadlines.
- Retention/storage ownership and any contract-specific overrides.
- Authorized scan scope and incident response execution; no credential operations in this packet.
- Any reviewer eligibility expansion beyond existing global policy.
- Later CI, hooks, hosted protections, schedules and deployment changes as separately scoped actions.

For canonical mechanical application, follow the current approval matrix: exact ratified proposal/language, every target and current fingerprint, intended version/review_by, complete scope/exclusions, audit destination and rollback method. Generic approval to prepare drafts does not satisfy canonical ratification. Refresh authority documents and fingerprints before that action.

## Handoff and validation

Review/Diagnosis owner: Codex (author self-check only).
Actionable AI Assistant Task owner: eligible independent Claude or CodeRabbit reviewer.
Execution location/tool: the isolated documentation worktree named above.
Human/operator role: ratify exact doctrine after independent review; perform any eventual merge.
Copy/paste destination: independent review session.

Review the three new Markdown files only. Check authority preservation, complete requirements, fail-closed evidence semantics, profile applicability, exception boundaries and migration realism. Report findings against current file hashes. Do not implement enforcement, edit credentials, promote canonical docs or merge. Independent review has not yet been performed.

Validation plan: git status, tracked diff paths/whitespace, explicit untracked-file whitespace checks, relative Markdown link checks, draft metadata and requirement coverage. Application tests/builds, security scans and deployment checks are intentionally excluded because no executable behavior changes. DOX pass: the existing docs/security ownership already covers these non-canonical drafts; no durable active contract or folder boundary changes, so no AGENTS.md amendment is needed.
