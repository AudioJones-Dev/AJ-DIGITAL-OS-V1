---
title: Global Security Assurance Standard
standard_id: AJ-SEC-STD-001
version: 0.1-draft
status: draft
canonical: false
ratification_status: pending-human-review
authoring_agent: Codex
owner: AJ Digital / Audio Jones
created: 2026-09-13
review_by: 2026-10-13
---

# Global Security Assurance Standard

## Status and authority

This is a review proposal, not active policy or enforcement. MUST and SHALL below describe the proposed ratified contract. Approval to draft does not ratify this text. No repository, worktree, agent or deployment gains authority from this document.

Proposed canonical destination: `G:/AJ-INTERNAL/AJ-DIGITAL-VAULT/00-CONTROL/GOVERNANCE/GLOBAL_SECURITY_ASSURANCE_STANDARD.md`.

The standard inherits the vault's `00-CONTROL/GOVERNANCE/HUMAN_APPROVAL_MATRIX.md` and `GLOBAL_MERGE_CRITERIA.md`. Those authorities and stricter local controls prevail. Human-only merges, independent review, deployment approval, credential approval and security-configuration approval remain intact. Repositories reference a ratified version and digest; copies are provenance-bearing snapshots, never independent authority.

Execution is described in [Secure Delivery Workflow](SECURE_DELIVERY_WORKFLOW.md). Audit findings, ratification decisions and rollout are in the [Amendment Matrix](SECURITY_ASSURANCE_AMENDMENT_MATRIX.md).

## Objective and applicability

Prevent credential exposure, abuse, vulnerable software, tenant-boundary violations and unauthorized agent actions from reaching protected branches or production. Applies to every current and future AJ Digital repository, application, API, worktree, pull request, agent, MCP/connector, deployment and client implementation. Archived repositories remain inventoried with an owner and documented exposure; archive status does not prove safety.

Rate limiting, secret detection, prompt-injection testing and vulnerability scanning are minimum capabilities. No scanner or AI reviewer alone proves security. Tools remain replaceable through evidence contracts. Applicable controls cannot disappear because the chosen vendor cannot run them.

## SEC-01: Bootstrap classification and proportional assurance

Every repository SHALL declare the profile contract in the workflow, an accountable owner, threat model, test plan, exception register, incident owner and policy references. Reuse equivalent existing paths. A separate security directory is not compulsory.

| Assurance tier | Minimum scope |
| --- | --- |
| Baseline | All repositories: profile, secret scanning, applicable static/dependency checks, change review and evidence |
| Enhanced | Internet exposure, sensitive data, tenant boundaries, LLM/RAG/agents/MCP: baseline plus applicable abuse, identity, isolation and adversarial tests |
| Critical | Privileged production actions, cross-tenant administration, security control planes or material destructive/financial capability: enhanced plus focused independent review and controlled staging validation |

The effective tier follows the highest applicable repository or change risk. A small diff cannot downgrade an affected high-impact surface. Assurance tiers do not replace the existing governance repository tiers or approval matrix. Unknown classification blocks readiness; not-applicable requires evidence and reviewer acceptance. Downgrades require human review. Documentation-only changes need not run irrelevant runtime tests, but retain secret, authority and independent-review checks.

## SEC-02: Rate limiting and abuse protection

Triggers include public APIs, authentication, forms, webhooks, uploads, search/RAG, inference/chat, voice, agent endpoints and external email/SMS actions.

Required controls: server-side enforcement; risk-specific burst, sustained and concurrency limits; user/tenant and aggregate budgets; bounded retries with backoff; token/spend ceilings; brute-force defenses; authenticated webhook validation and replay defenses where applicable; operational alerts and an accountable cost owner.

Tests SHALL cover distributed instances, parallel requests, identity rotation/spoofed forwarding headers, tenant fairness, retry storms and limiter-store failure. Define fail-safe behavior for expensive or privileged operations. IP-only throttling is insufficient evidence. Missing protection with material abuse or cost exposure blocks delivery until remediated or disposed through an eligible exception.

## SEC-03: Secrets and credential exposure

Authorized scanning SHALL cover staged changes, current source, relevant history, docs, fixtures/tests, CI, deployment manifests, prompts, agent/MCP configuration, approved logs and release outputs including browser bundles, archives and container layers. Record actual scope, inaccessible history, exclusions and scanner completion; do not claim coverage of unreadable material.

Scan safely before dependency execution where practical and again after building artifacts. Never emit secret values to model context, reports, PRs or external reviewers. Use redacted identifiers and restricted evidence. Broad log/history or credential-bearing scans require the existing approved execution scope; this draft grants none. Synthetic fixtures use unmistakable nonfunctional values.

Confirmed active credentials or active compromise immediately block merge and deployment. Suspected exposure initiates urgent triage without live credential testing by default.

Compromise response: `detect -> contain -> revoke -> rotate -> replace -> remove -> investigate -> validate`.

The incident owner obtains required authorization for provider operations. Revoke old access, replace authorized consumers, remove exposed material safely, determine exposure window and affected systems, inspect usage/history and verify replacement plus old-credential invalidation through an authorized path. Preserve sanitized evidence. Deletion from Git is not remediation. History rewriting, destructive cleanup and production rotation remain separately gated. If approval is unavailable, escalate and block; an agent cannot invent emergency authority.

## SEC-04: Prompt injection and agent security

Required when any of uses_llm, uses_agents, uses_rag or uses_mcp applies. Include development agents even when the delivered application has no LLM.

Treat user content, retrieved documents, webpages, email, images, uploads, database records, API/tool/MCP outputs, memory and agent messages as untrusted data. Provenance records origin; it does not grant authority. Retrieval cannot change governing instructions or tenant identity. Separate data from instructions and validate generated output before execution.

Enforce identity, authorization, tenant scope, tool allowlists, argument schemas, destination restrictions and budgets outside model reasoning. Tools receive least privilege; read and write capabilities are separated where practical. Minimize sensitive context. Reject secret exfiltration and unauthorized network destinations. MCP tool descriptions and capability changes require review rather than automatic trust.

High-impact actions require policy evaluation and existing human approval. Bind approval to authenticated actor, action, arguments, tenant, environment, expiry and relevant resource/version. Recheck at execution to prevent stale approvals and time-of-check/time-of-use substitution. A tool being available does not authorize its use. Delegation cannot amplify permissions or turn agent messages into human approval.

Adversarial tests SHALL include instruction override, system-prompt/secret disclosure attempts, environment-variable exfiltration, unauthorized tool invocation, tenant switching, production changes, deletion, unauthorized email/SMS, malicious retrieved HTML/documents, poisoned tool output, encoded/obfuscated payloads, persistent memory poisoning and cross-agent propagation. Test both attacker success and correct completion of benign tasks. System-prompt disclosure alone is not proof of a privileged compromise; assess actual data and action impact.

Record attack corpus/version, model/runtime/tool versions, test repetitions, expected boundaries and observed actions. Assert prohibited effects did not occur, not merely that the model said it refused. Use synthetic data, sandboxed tools and isolated test tenants; live destructive red teams require separate authorization. Passing a corpus does not establish immunity.

## SEC-05: Vulnerability and supply-chain assessment

Independent signals SHALL include applicable SAST, software composition/dependency analysis, secret scanning, security review and repository-specific tests. Assess runtime AND build/dev dependencies, lockfiles, package provenance, lifecycle scripts, CI actions, build permissions and release artifacts. Containers and infrastructure/configuration scans apply when present; document exclusions.

Authentication/authorization and negative security tests SHALL cover role/resource access, tenant isolation across storage/cache/queues/logs, input validation, SSRF, XSS, CSRF where applicable, SQL/ORM injection, deserialization, path traversal, upload abuse, webhook validation/replay, privilege escalation, sensitive-data exposure and business logic. Use isolated staging for applicable dynamic tests. Identify untested surfaces explicitly. Produce a release dependency inventory/SBOM when packaging software or containers.

Full vulnerability scanning means the complete applicable assessment set, not an assertion that every vulnerability was found. New advisories can invalidate prior release evidence.

## SEC-06: Independent validation

Preserve current global reviewer eligibility: Codex-authored changes require Claude or CodeRabbit; Claude-authored changes require Codex or CodeRabbit; mixed authorship requires CodeRabbit. Record authoring systems separately from GitHub accounts. Unknown authorship or eligibility blocks a merge recommendation.

Greptile or another vendor may provide supplemental evidence but does not replace a currently required reviewer without ratification. Pending, failed, skipped, rate-limited or summary-only output does not constitute completed required review. Reviews cover current changes; subsequent changes require independent review. Authors may self-check but cannot satisfy independence or waive their own findings.

## SEC-07: Findings, severity and disposition

Required finding fields: id, control_id, severity, confidence, exploitability, affected_scope, introduced_by_or_preexisting, owner, first_seen, evidence_refs, tested_sha_or_digest, remediation, due_at, disposition, reviewer, exception_ref, retest_evidence and closed_at. Unknown introduction attribution is explicit.

Confidence values: confirmed, probable, possible. Exploitability: known, plausible, theoretical. Severity describes impact independently; uncertain high-impact findings require triage, not silent downgrade. Dispositions: open, remediation_in_progress, fixed_pending_validation, resolved, false_positive, accepted_exception. False positives require rationale and independent evidence review.

| Severity | Definition | Merge and deployment treatment |
| --- | --- | --- |
| Critical | Systemic compromise, major exfiltration, privileged takeover or catastrophic integrity impact | Block; no ordinary exception |
| High | Material unauthorized access, serious abuse/cost exposure or substantial integrity failure | Block absent eligible human-approved exception |
| Medium | Meaningful bounded harm or exploit requiring substantial preconditions | Fix or reviewed disposition with owner and deadline |
| Low | Limited impact or defense improvement | Owned backlog permitted |
| Informational | Observation without demonstrated vulnerability | Advisory |

Active credential exposure and active compromise are unconditional stops independent of score. Pre-existing findings are not automatically grandfathered. A possible critical/high finding stays pending and blocks readiness until independently triaged. Stricter local thresholds prevail.

Proposed triage targets: critical immediately, high within one business day, medium within five business days. Blockers require resolution before delivery. Proposed medium remediation target is 30 days and low is 90 days; missed deadlines require escalation and renewed disposition. These targets require ratification.

## SEC-08: Exceptions and approval boundaries

Only the authorized human risk owner may accept an eligible high risk or waive an eligible mandatory control. Record exception id, finding/control, rationale, scope, release/environment binding, compensating controls, accountable owner, human approval evidence, start/expiry, remediation deadline and monitoring. Exceptions expire automatically and invalidate on material scope change; no indefinite waivers or agent self-waivers. They never substitute for independent review, human merge or deployment approval.

Critical findings, active compromise and active secrets have no ordinary waiver. Any emergency critical-risk process requires a separate ratified governance amendment. Agents cannot change severity, approve exceptions or suppress evidence to obtain a pass.

## SEC-09: Deployment and operations

Merge approval is not deployment approval. Verify exact release artifact digest and configuration revision, intended environment/tenant, approved secret sources and controlled runtime injection, least privilege, disabled production debug, absence of test credentials/staging callbacks, rate limits, applicable security headers, logging, monitoring, active AI policy gates and rollback readiness. Secret values never belong in source, prompts or release evidence. Approval must bind the actual release and environment.

Re-run relevant validation after code, model, prompt, tool permission, policy, configuration or advisory changes. Link suspected compromise to incident response; vulnerability severity and incident Sev 1-4 remain separate scales. Incident closure needs containment, remediation, verification, timeline and lessons with accountable ownership.

## SEC-10: Evidence and retention

Use the workflow evidence contract. Store sanitized results with access controls and tamper-evident provenance. Record tool/ruleset/feed versions, coverage and failures. Evidence supplied by a PR is untrusted until verified by the authorized evaluator. A green badge alone is not proof.

Proposed retention: sanitized gate, approval and exception records for at least 12 months and the supported release lifetime, whichever is longer; raw sanitized scanner output for 90 days. Incident preservation and stricter contractual requirements override normal expiry. Restrict sensitive evidence, minimize personal data and never retain discovered credential values as routine evidence. Retention values require ratification.

## References and limits

- [NIST SSDF 1.1](https://csrc.nist.gov/pubs/sp/800/218/final): lifecycle framework reference, not certification.
- [OWASP prompt-injection guidance](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html): defense-in-depth reference.
- [Existing AJ Digital OS trust layer](../system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md): repository architecture; its maturity estimates are not refreshed assurance.

This draft makes no claim that hosted protections, scans or runtime enforcement are deployed.
