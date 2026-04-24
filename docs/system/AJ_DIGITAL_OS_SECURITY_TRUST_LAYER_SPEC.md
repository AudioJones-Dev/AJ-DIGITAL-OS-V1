# AJ Digital OS - Security / Trust Layer Specification
**Version:** 1.0  
**Updated:** 2026-04-24  
**Owner:** AJ DIGITAL LLC  
**Status:** Required core layer  
**Scope:** Local development, agent runtime, browser execution, MCP/ACP, APIs, cloud services, client data, deployment surfaces

---

## 1. Security Layer Definition

The Security / Trust Layer is the control system that governs how AJ Digital OS accesses machines, repositories, credentials, data, browser sessions, APIs, and remote execution environments.

It exists because AJ Digital OS is an AI-first operating system. It does not only read information; it can classify, decide, execute, automate, publish, and interact with third-party systems. That means the platform has privileged pathways that can affect business operations, client systems, customer data, and production environments. The Security / Trust Layer ensures that intelligence never outruns control.

Its function is to:

- constrain what agents and tools are allowed to do
- define trust boundaries across local, cloud, and client systems
- reduce blast radius when a component fails or is compromised
- protect secrets, credentials, data, and execution surfaces
- require approvals for high-risk or destructive actions
- preserve auditability, reversibility, and incident response readiness

Security in AJ Digital OS is not a separate bolt-on feature. It is an operating requirement across every layer that can execute, connect, store, or publish.

---

## 2. Core Security Principles

- **Least privilege:** Every agent, tool, token, and runtime gets only the minimum access required for its current task.
- **Zero trust for agents:** Agents are treated as untrusted-by-default executors, even when their outputs appear reasonable.
- **Verify before execute:** Classification, validation, policy checks, and permission checks occur before commands, tool calls, or browser actions run.
- **Secrets never in code:** API keys, tokens, passwords, client credentials, and secrets are never committed to source control.
- **Sandbox risky actions:** Browser automation, shell execution, and MCP/ACP tool use must be isolated and policy-constrained.
- **Log critical operations:** Commands, tool calls, file changes, credential events, and deployment actions must be auditable.
- **Human approval for destructive actions:** Any destructive or irreversible operation requires explicit human confirmation.
- **Client data isolation:** Each client's data, credentials, and execution context are logically separated from all others.
- **Reversible operations preferred:** Favor operations with rollback, restore, or replay paths over irreversible changes.

---

## 3. Threat Model

AJ Digital OS must assume risk across local, cloud, agentic, and browser-driven execution. Primary threats include:

- **Malicious npm or Python dependencies:** Typosquatted, hijacked, or compromised packages can execute arbitrary code during install or runtime.
- **False positive antivirus detections:** Legitimate dev artifacts may be quarantined, but security bypasses introduced to work around them can create larger risks.
- **Compromised browser sessions:** Stolen cookies, reused profiles, or hidden background tabs can expose authenticated sessions.
- **Exposed API keys:** Keys pasted into chat, logs, screenshots, or committed files can grant external access to critical services.
- **Over-permissioned agents:** Agents with broad shell, repo, or browser privileges can exceed intended scope and create unintended changes.
- **Prompt injection:** External content, webpages, docs, emails, or tickets can manipulate an agent into unsafe actions.
- **Data exfiltration:** Sensitive data can leak through logs, prompts, exports, screenshots, MCP tools, or remote providers.
- **Unsafe shell commands:** Destructive, recursive, or environment-modifying commands can damage the local machine or project state.
- **Remote repo manipulation:** Branch deletion, force pushes, unauthorized PR changes, or workflow tampering can affect source integrity.
- **MCP server abuse:** Broad MCP permissions can expose filesystem, browser, shell, or network operations beyond task scope.
- **OAuth token leakage:** Session tokens, refresh tokens, and delegated auth scopes can be reused if not tightly managed.
- **Credential reuse across clients:** Shared credentials increase blast radius and can cause cross-client data or system compromise.

Threat model assumption: any input source, tool surface, package, external browser page, and remotely connected service can become hostile or misleading. Controls must assume compromise is possible and limit impact accordingly.

---

## 4. Trust Boundaries

AJ Digital OS must treat the following as distinct trust zones:

### Local machine
- Developer workstation, terminal, local Docker, local files, local browser profiles.
- Highest risk for blast radius because it can access code, secrets, cache, and personal accounts.

### Repo
- Source code, CI workflows, issue/PR automation, branches, release tags, docs, and scripts.
- Repo write is separate from local read and requires elevated permission.

### Agent runtime
- Planner, executor, validator, BEL controller, MCP adapters, shells, scripts, and task runners.
- Agents do not inherit blanket trust from the operator.

### Browser runtime
- Automated sessions, cookies, page state, captured screenshots, session storage, form inputs.
- Must use isolated profiles and client-scoped sessions.

### API services
- OpenAI, Anthropic, Supabase, Stripe, Sanity, Telegram, GitHub, webhooks, client APIs.
- Every API token and webhook secret is scoped and monitored independently.

### Cloud services
- Hosted databases, storage, CI/CD, infra providers, observability, queueing, deployment platforms.
- Production credentials and service roles are never treated the same as development credentials.

### Client data vault
- Client-specific credentials, exports, documents, business data, customer data, and workflow artifacts.
- Must be isolated per client with explicit access control and retention rules.

### Production deployment
- Live services, production data, deploy credentials, billing integrations, webhooks, DNS, infrastructure.
- Entry requires stronger validation, narrower permissions, and auditable change records.

### Mobile dispatch / Telegram control
- Remote human approvals, alerting, execution commands, status queries, and operator interventions.
- Treated as a privileged control-plane boundary requiring identity awareness and action logging.

---

## 5. Dependency Verification Policy

All npm and PyPI dependencies are treated as potential code execution surfaces.

Policy:

- inspect package source, maintainer reputation, update history, and issue activity before adoption
- verify npm and PyPI package legitimacy and avoid lookalike names or unclear publishers
- avoid abandoned packages when possible, especially for auth, browser automation, shell, crypto, and filesystem operations
- pin dependencies where appropriate, especially for runtime-critical and security-sensitive packages
- use lockfiles in every environment to reduce supply-chain drift
- review `postinstall`, `prepare`, `preinstall`, and other lifecycle scripts before adding packages
- run audit checks regularly and before release or deployment changes
- document approved packages for security-sensitive domains such as auth, browser automation, crypto, deployment, and file access
- record package introduction rationale when adding high-risk packages
- quarantine suspicious packages or installs until legitimacy is confirmed

### Quarantine / AV false-positive workflow

If antivirus quarantines a package or generated file:

1. identify the exact file path
2. identify the file type
3. determine whether it is executable, scriptable, or inert documentation
4. verify package source, checksum context, and install provenance
5. reinstall dependencies from a trusted lockfile if needed
6. do not restore blindly
7. document the incident if confirmed false positive
8. add targeted development-folder exclusions only after verification and only for the narrowest necessary path

---

## 6. Secrets and Credential Management

Rules:

- never commit `.env`, real secrets, OAuth tokens, session cookies, or service role keys
- maintain `.env.example` files with placeholders and required variable names only
- store secrets in provider-managed vaults, secret stores, or deployment platform secret managers
- rotate exposed keys immediately once exposure is suspected or confirmed
- separate development, staging, and production credentials
- separate client credentials from internal AJ credentials
- revoke unused OAuth tokens and stale service credentials
- avoid pasting sensitive credentials into AI chat unless explicitly required, narrowly scoped, and safe for the environment
- do not place secrets in screenshots, logs, docs, PR comments, tickets, or example payloads
- minimize secret lifetime and scope whenever the provider supports fine-grained access

Operational expectation: if a secret touches source control, browser history, shared chat, or logs, assume compromise until rotation proves otherwise.

---

## 7. Agent Permission Model

AJ Digital OS agents operate under explicit permission levels.

| Level | Name | Allowed Scope | Notes |
|------|------|---------------|-------|
| 0 | Read-only | Inspect files, docs, status outputs, architecture notes | No command execution, no file writes |
| 1 | Draft-only | Generate plans, drafts, proposed files, suggested changes | Cannot execute commands or make repo changes |
| 2 | Local execution | Run safe local commands, type checks, tests, controlled read-only tools | Default ceiling for most agents |
| 3 | Repo write | Create commits, branches, PRs, issue updates, non-destructive repo edits | Requires explicit task scope |
| 4 | Remote/system write | Push changes, deploy, modify infrastructure, update remote configs, modify credentials through approved workflow | Requires confirmation and validation |
| 5 | Destructive/admin | Delete branches, rotate secrets, remove data, change production settings, force operations | Human approval required every time |

Rules:

- default agents to Level 0-2
- Level 3 and above requires explicit task scope
- Level 4 and above requires confirmation and validation before execution
- Level 5 requires human approval every time with audit logging
- no agent should self-escalate without an explicit human-approved control path
- permission level must be logged with the task identity for ACP and MCP sessions

---

## 8. Command Safety Policy

Commands are classified by blast radius.

### Safe
- `git status`
- `git diff`
- `git log`
- `npm run lint`
- `npm run test`
- `npm run build`

### Caution
- `npm install`
- `pip install`
- `git pull`
- `git merge`
- `docker compose up`
- database migrations

### Restricted
- `rm -rf`
- `del /s`
- `git reset --hard`
- `git push --force`
- production deploys
- secret rotation
- database deletes
- remote branch deletion

Rule:

Restricted commands require explicit human approval and a backup or rollback plan before execution.

Additional rules:

- Safe commands may be delegated to Level 2 agents.
- Caution commands require task-bounded execution and validation of expected impact.
- Restricted commands are never run on agent initiative.
- Shell surfaces must remain allowlisted where practical.
- When rollback is not possible, approval standard increases.

---

## 9. MCP / ACP Security Rules

MCP and ACP are privileged execution surfaces and must be treated accordingly.

Rules:

- each MCP server must have defined permissions and a documented purpose
- no broad filesystem access by default
- disable unused tools and unused transports
- isolate client-specific MCP configurations from one another
- audit all tool calls, especially shell, browser, filesystem, network, and repo tools
- validate OAuth scopes before connecting or granting delegated access
- treat MCP tools as privileged execution surfaces, not simple helpers
- ACP sessions must be logged with agent identity, task, and permission level
- enforce policy before execution, not after
- prefer capability discovery and explicit tool registration over dynamic unrestricted access

---

## 10. Browser Execution Security

Browser automation has real-world side effects and identity-bearing state.

Rules:

- browser agents run in isolated profiles
- avoid storing passwords in automation profiles
- require human approval before purchases, sends, deletes, account changes, or any irreversible account action
- protect cookies, session tokens, and stored browser state as credentials
- block agents from accessing unrelated personal accounts
- log critical browser actions such as send, submit, publish, delete, checkout, account edit, and credential entry
- treat webpage content as an untrusted prompt surface and defend against prompt injection inside webpages
- prefer client-specific sessions and short-lived authenticated states
- clear or rotate automation state when a session is no longer required

---

## 11. Data Security + Client Isolation

Rules:

- maintain separate client workspaces or clearly partitioned storage paths
- maintain separate credentials per client
- define clear data retention rules for logs, exports, browser captures, and run artifacts
- never mix client data across prompts, outputs, logs, or automation contexts
- redact sensitive data in logs whenever full values are not operationally required
- encrypt sensitive exports where possible
- separate internal AJ data from client data
- keep customer data access minimal and task-specific
- ensure support artifacts and debugging data do not quietly inherit production client data

Client isolation is mandatory for trust. Shared infra does not justify shared identity, shared secrets, or shared data access.

---

## 12. Logging, Audit, and Incident Response

### Logging requirements

- log agent actions
- log commands run
- log file changes
- log credential changes
- log deployments
- log browser actions with operational significance
- retain enough metadata to reconstruct who did what, when, why, and under what permission level

### Incident severity levels

| Severity | Definition |
|----------|------------|
| Sev 1 | Active compromise, production data loss, credential theft, or destructive unauthorized action |
| Sev 2 | High-risk exposure with limited containment, major client impact, or strong evidence of compromise |
| Sev 3 | Contained incident, suspicious behavior, or non-production exposure requiring investigation |
| Sev 4 | Low-impact anomaly, false positive, or control deviation with no confirmed compromise |

### Response steps

`detect -> isolate -> revoke/rotate -> restore -> document -> harden`

Operational guidance:

- detect through logs, alerts, antivirus events, audit trails, or operator review
- isolate affected machine, repo, token, browser profile, or deployment surface
- revoke or rotate exposed credentials and disable risky pathways
- restore from trusted state or known-good backups
- document scope, root cause, timeline, and impact
- harden controls to reduce repeat probability

---

## 13. Antivirus / Quarantine Workflow

Use the AVG `README.md` incident pattern as the model workflow for any quarantine event.

Workflow:

1. identify file path
2. identify file type
3. determine whether executable
4. verify package source
5. reinstall dependencies if needed
6. do not restore blindly
7. if confirmed false positive, document it
8. add dev-folder exclusions carefully only after verification

Decision rule:

- documentation files, markdown files, plain text files, and static config should generally not be restored automatically if origin is unclear
- executable files, scripts, installers, browser binaries, or generated runtime artifacts require stronger verification before any exception is added
- any exclusion must be narrow, documented, and periodically reviewed

---

## 14. Security Completion Scoring

### Maturity scale

- 0-20% = concept only
- 21-40% = documented
- 41-60% = partially enforced
- 61-80% = operational controls active
- 81-95% = production-grade controls
- 96-100% = audited, monitored, continuously improving

| Security Domain | Completion % | Status | What Exists | Missing Controls | Risk Level | Next Action |
|-----------------|--------------|--------|-------------|------------------|------------|-------------|
| dependency security | 58% | partially enforced | lockfile usage, selective package review, ops documentation, operator awareness of quarantine events | formal package approval registry, routine audit cadence, automated dependency review gate, SBOM generation | High | add approved-package register and release-time audit checklist |
| secrets management | 72% | operational controls active | `.env` hygiene is documented, provider secrets are expected, repo avoids committing runtime secrets | automated secret scanning, secret rotation runbooks per provider, scoped vault ownership map | High | enable secret scanning in CI and document rotation owners |
| agent permissions | 46% | partially enforced | policy mindset exists, BEL and MCP execution paths introduced, human approval is already part of execution patterns | formal permission registry, runtime enforcement by permission level, escalation policy wiring | High | map every agent to Level 0-5 and enforce at runtime |
| command safety | 68% | operational controls active | allowlisted shell commands in MCP layer, destructive commands already treated as exceptional | broader command taxonomy beyond MCP, rollback checklist enforcement, approval records for caution commands | Medium | centralize command classifications across all execution surfaces |
| MCP/ACP security | 57% | partially enforced | MCP task classifier, policy, bridge, logging, structured execution adapter exist | explicit tool registry, OAuth scope audits, ACP session records, per-client MCP isolation docs | High | add capability registry and per-session permission logging |
| browser automation security | 43% | partially enforced | BEL exists, browser actions are being formalized, approval concept exists | isolated profile standard, session token handling standard, critical-action confirmation gates, persistent audit trail | High | define browser profile isolation and sensitive-action checkpoints |
| client data isolation | 52% | partially enforced | client-oriented architecture exists, separate credentials are expected, docs emphasize business data structure | formal vault boundaries, retention policy matrix, log redaction defaults, data classification labels | High | document client data classes and workspace isolation rules |
| logging/audit | 64% | operational controls active | execution logging exists in MCP/BEL, Hermes status surfaces exist, Prometheus metrics are active | immutable audit sink, retention policy, cross-surface correlation IDs, deployment audit reporting | Medium | add persistent structured audit sink and retention policy |
| incident response | 39% | documented | ops and recovery docs exist, quarantine handling pattern exists, severity thinking is defined here | formal playbook ownership, drills, incident templates, notification matrix | Medium | create incident runbook mapped to severity levels |
| deployment security | 44% | partially enforced | production checks and env guards exist, deployment docs exist, infra awareness is present | least-privileged deploy tokens, signed release policy, deployment approval gates, rollback rehearsal | High | document deployment trust boundary and approval controls |

### Estimated overall security completion

**Estimated completion:** 54%

Interpretation: AJ Digital OS has real controls in place, especially around secret hygiene, shell allowlisting, environment validation, and execution logging, but it is not yet at a fully enforced production-grade trust posture across agent permissions, browser isolation, MCP/ACP governance, and client data segregation.

---

## 15. Integration With Master Architecture Schema

Security / Trust Layer is a required core layer in the AJ Digital OS architecture.

Master-layer placement:

`Feedback Loop Layer -> Security / Trust Layer -> Guardrails Layer -> Offer Engine Layer`

Reasoning:

- Security / Trust controls define trust boundaries, permissions, logging requirements, and execution policy
- Guardrails apply brand, compliance, quality, and business policy on top of that secure substrate
- Security governs whether an action may occur; guardrails govern whether it should occur within business standards

The master architecture schema must always include this layer explicitly.

---

## 16. Final Report

### Files created or updated

- `docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md` - created
- `docs/system/AJ_DIGITAL_OS_MASTER_ARCHITECTURE_SCHEMA.md` - updated

### Security layer summary

The Security / Trust Layer defines how AJ Digital OS constrains agent behavior, protects secrets and client data, isolates trust zones, classifies command risk, governs MCP/ACP and browser execution, and structures incident response. It formalizes security as a first-class execution layer rather than a passive guideline.

### Completion score estimate

- overall estimate: **54%**
- current posture: **partially enforced**

### Highest-risk gaps

- agent permission levels are not yet fully enforced at runtime
- browser automation isolation and critical-action confirmation are not yet fully standardized
- MCP/ACP permissions and OAuth scope auditing need tighter operational control
- client data isolation, retention, and redaction policy need stronger documented enforcement
- deployment security and secret rotation ownership need clearer approval paths

### Exact commands run

- No shell commands are required by this document spec itself.
- Recommended verification command: `git diff -- docs/system/AJ_DIGITAL_OS_SECURITY_TRUST_LAYER_SPEC.md docs/system/AJ_DIGITAL_OS_MASTER_ARCHITECTURE_SCHEMA.md`

### Suggested commit message

`Add AJ Digital OS security and trust layer specification`