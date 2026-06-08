# Founder Intelligence Product Factory Playbook

**Type:** Execution playbook
**Status:** Draft for approval
**Owner:** Audio (Tyrone Alexander Nelms) - AJ Digital LLC
**Location:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY_PLAYBOOK.md`
**Companion doctrine:** `docs/system/FOUNDER_INTELLIGENCE_PRODUCT_FACTORY.md`
**Applies to:** Founder Intelligence Systems, AgentOS installations, ResponseOS, internal AJ Digital products, client software products, SaaS products, AI agents, automation systems, and operational intelligence platforms.

---

## 1. Purpose

This playbook defines how AJ Digital executes the Founder Intelligence Product Factory step by step.

The companion doctrine defines the framework:

```txt
What is the Founder Intelligence Product Factory?
```

This playbook defines execution:

```txt
How do we run it without skipping diagnosis, validation, specification, architecture, operations, or growth governance?
```

The execution order is:

```txt
Opportunity Intelligence
-> Founder Intelligence
-> Product Intelligence
-> Architecture Intelligence
-> Build Intelligence
-> Operational Intelligence
-> Growth Intelligence
```

No phase may be skipped. A phase may be compressed only when the operator explicitly documents why the work is low-risk, reversible, already validated, and not a serious architecture, client, production, or source-of-truth change.

## 2. When To Use This Playbook

Use this playbook when AJ Digital is evaluating, designing, building, improving, or operationalizing any of the following:

- Founder Intelligence System;
- AgentOS installation;
- ResponseOS workflow;
- internal AJ Digital product;
- client software product;
- SaaS product;
- AI agent;
- automation system;
- operational intelligence platform;
- dashboard or reporting layer that affects business decisions;
- integration that changes data flow, attribution, CRM, communications, or delivery operations.

Do not use this playbook for trivial edits that do not affect product direction, architecture, operating process, client-facing deliverables, or production behavior. Even then, preserve the repo's normal review and closeout expectations.

## 3. Required Inputs

Before execution begins, gather the minimum viable operating context.

### Business Inputs

- Business name, owner, and decision maker.
- Current offer, product, or workflow being evaluated.
- Target customer, user, operator, or internal team.
- Known business problem.
- Known revenue, time, quality, risk, or delivery impact.
- Current process description.
- Current tools and sources of truth.
- Constraints, deadlines, budget limits, and approval rules.

### Evidence Inputs

- Market or competitor research.
- Customer interviews, call notes, survey notes, or support patterns.
- Review mining from G2, Reddit, Trustpilot, app stores, forums, or relevant communities.
- Acquire.com, TrustMRR, or comparable acquisition-market evidence where relevant.
- CRM, lead, sales, support, attribution, or workflow data where approved.
- Existing docs, architecture, SOPs, dashboards, automations, and templates.

### Repo And System Inputs

- Confirmed repo or workspace path.
- Current branch, recent commits, and working tree state.
- Existing doctrine, PRDs, architecture docs, playbooks, and memory context.
- Approved secrets handling method.
- Test, build, deploy, and rollback commands where known.
- Human approval checkpoint and `proceed` requirement for serious changes.

## 4. Phase-By-Phase Execution Workflow

### Phase 1 - Opportunity Intelligence

Objective: determine whether the opportunity has enough demand evidence to justify deeper diagnostic and product work.

Execution steps:

1. Define the candidate problem in plain operational language.
2. Identify the user, buyer, operator, and economic owner.
3. Collect demand evidence from market research, competitors, review mining, acquisition-market signals, interviews, and internal business signals.
4. Identify substitutes and current workarounds.
5. Document disconfirming evidence.
6. Estimate revenue, efficiency, risk, or strategic upside.
7. Produce the Opportunity Brief, Market Gap Analysis, and Demand Validation Report.
8. Run the Opportunity Validation Gate.

Do not proceed if the opportunity is based only on trend interest, founder enthusiasm, or tool availability.

### Phase 2 - Founder Intelligence

Objective: diagnose the business operating reality before prescribing a system.

Execution steps:

1. Map the current lead, revenue, delivery, communication, reporting, or decision workflow.
2. Identify where work enters, stalls, leaks, duplicates, or disappears.
3. Identify undocumented founder knowledge.
4. Identify handoffs, exceptions, manual workarounds, and tool fragmentation.
5. Estimate impact by revenue, time, quality, trust, risk, or opportunity cost.
6. Assign an owner or proposed owner to each bottleneck.
7. Produce the Founder Intelligence Diagnostic, Revenue Leak Assessment, and Operational Intelligence Report.
8. Run the Founder Diagnostic Gate.

Do not proceed if the recommended system cannot be tied to a measurable bottleneck, leak, or operating constraint.

### Phase 3 - Product Intelligence

Objective: convert the validated problem and diagnostic evidence into a buildable specification.

Execution steps:

1. Write the problem statement.
2. Define desired outcome and success criteria.
3. Define users, roles, permissions, and operator responsibilities.
4. Write user stories and functional requirements.
5. Write non-functional requirements, including reliability, security, privacy, performance, accessibility, observability, and maintainability where relevant.
6. Define scope, out of scope, constraints, dependencies, and assumptions.
7. Define acceptance criteria and validation methods.
8. Produce the PRD and supporting requirement artifacts.
9. Run the PRD Approval Gate.

Do not proceed if requirements are vague, untestable, or missing scope boundaries.

### Phase 4 - Architecture Intelligence

Objective: design the system before implementation begins.

Execution steps:

1. Review the approved PRD and constraints.
2. Inspect existing repo architecture, naming, source-of-truth docs, and local patterns.
3. Define frontend, backend, API, database, integration, and infrastructure boundaries where relevant.
4. Define authentication, authorization, tenant isolation, data ownership, security, and privacy requirements.
5. Define observability, logging, monitoring, failure modes, rollback, and recovery.
6. Identify caching, scaling, queueing, load balancing, or production infrastructure needs where relevant.
7. Identify implementation sequence and safe incremental delivery path.
8. Produce the Architecture Specification, System Design Document, Data Model, Integration Map, Security and Access Model, Observability Plan, and Deployment and Rollback Plan as needed.
9. Run the Architecture Approval Gate.

Do not proceed if data ownership, security, integration boundaries, or rollback are unclear for serious work.

### Phase 5 - Build Intelligence

Objective: turn approved specifications and architecture into a working system through governed human-agent execution.

Execution steps:

1. Confirm branch, working tree, and recent commits.
2. Confirm the approved PRD and architecture are current.
3. Create a small implementation plan.
4. Dispatch bounded tasks to the right assistant or tool.
5. Make scoped, reversible edits.
6. Run the agreed validation commands.
7. Review diffs against requirements and architecture.
8. Fix defects or document accepted gaps.
9. Produce implementation notes, test evidence, review notes, and deployment readiness notes.
10. Run the Build Approval Gate before production-impacting actions.

Do not proceed if the agent is working from a broad prompt, if secrets are exposed, or if local checks are being treated as production readiness.

### Phase 6 - Operational Intelligence

Objective: make the system usable, supportable, monitored, and governed after launch.

Execution steps:

1. Assign process owner, technical owner, and escalation owner.
2. Document operating procedures and support paths.
3. Define reporting cadence and dashboard decision owners.
4. Define Business Memory requirements for decisions, exceptions, recurring patterns, and handoffs.
5. Confirm monitoring, alerts, logs, and triage paths.
6. Confirm documentation is discoverable and current enough for handoff.
7. Produce the Operating Playbook, Support and Escalation Map, Reporting Dashboard, Business Memory Schema, Monitoring Plan, Workflow Governance Register, and Documentation Index as needed.
8. Run the Operational Readiness Gate.

Do not proceed to growth if the system has no owner, no operating cadence, no support path, or no monitoring strategy.

### Phase 7 - Growth Intelligence

Objective: improve and expand only after operational fit is proven.

Execution steps:

1. Review adoption and actual usage.
2. Review customer success, support, retention, and expansion signals.
3. Review attribution and ROI evidence.
4. Identify the highest-impact improvement opportunities.
5. Identify operational capacity constraints.
6. Prioritize the Growth Backlog.
7. Approve the next iteration or stop expansion.
8. Run the Growth Review Gate.

Do not scale if adoption is weak, ROI is unmeasured, attribution is unclear, or operations cannot absorb the added complexity.

## 5. Required Artifacts Per Phase

| Phase | Required Artifacts | Optional Supporting Artifacts |
| --- | --- | --- |
| Opportunity Intelligence | Opportunity Brief, Demand Validation Report | Market Gap Analysis, competitor matrix, review-mining notes, interview notes |
| Founder Intelligence | Founder Intelligence Diagnostic, Revenue Leak Assessment | Operational Intelligence Report, workflow map, source-of-truth inventory |
| Product Intelligence | PRD, scope register, success metrics | User story map, requirements matrix, assumption register |
| Architecture Intelligence | Architecture Specification, System Design Document | Data Model, Integration Map, Security and Access Model, Observability Plan, Deployment and Rollback Plan |
| Build Intelligence | Implementation Plan, Pull Request or Patch Set, Test Evidence | Review Notes, QA notes, deployment readiness notes, session closeout |
| Operational Intelligence | Operating Playbook, Support and Escalation Map | Reporting Dashboard, Business Memory Schema, Monitoring Plan, Workflow Governance Register, Documentation Index |
| Growth Intelligence | Adoption Report, ROI Review, Growth Backlog | Customer Success Feedback Summary, Attribution Report, Retention and Expansion Analysis |

Artifact rule:

```txt
If an artifact is skipped, the reason must be documented.
```

## 6. Decision Gates

### Opportunity Validation Gate

Required inputs:

- Opportunity Brief.
- Demand Validation Report.
- Market Gap Analysis where relevant.

Review criteria:

- Demand evidence is credible.
- User, buyer, and operator are specific.
- Alternatives and substitutes are understood.
- Distribution or adoption path is plausible.
- Disconfirming evidence is documented.

Failure conditions:

- No clear buyer or user.
- No meaningful demand evidence.
- Competitors are ignored.
- Opportunity depends on market-size claims without operating evidence.

Approval required:

- Founder/operator approval.

### Founder Diagnostic Gate

Required inputs:

- Founder Intelligence Diagnostic.
- Revenue Leak Assessment.
- Operational Intelligence Report where relevant.

Review criteria:

- Bottlenecks are tied to real workflows.
- Operational impact is estimated.
- Source-of-truth gaps are identified.
- Owners or proposed owners are named.

Failure conditions:

- The diagnosis jumps directly to tools.
- Bottlenecks are generic.
- No measurable leak or constraint exists.
- Founder memory is treated as documentation.

Approval required:

- Founder/operator approval.

### PRD Approval Gate

Required inputs:

- PRD.
- Scope register.
- Success metrics.
- Constraints and assumptions.

Review criteria:

- Problem, outcome, scope, and exclusions are clear.
- Requirements are testable.
- Success criteria are measurable.
- Risks and open questions are visible.

Failure conditions:

- The PRD is a feature list.
- Scope is open-ended.
- Success criteria are vague.
- Requirements cannot be validated.

Approval required:

- Product owner and founder/operator approval.

### Architecture Approval Gate

Required inputs:

- Architecture Specification.
- System Design Document.
- Data Model where relevant.
- Integration Map where relevant.
- Deployment and Rollback Plan where relevant.

Review criteria:

- Boundaries are clear.
- Data ownership is clear.
- Security, auth, and permissions are addressed.
- Observability and failure handling are addressed.
- Rollback path is defined.

Failure conditions:

- Security is deferred without approval.
- Data model or integration ownership is unclear.
- Vendor or platform decision is assumed.
- Rollback is absent for serious work.

Approval required:

- Technical owner and founder/operator approval.

### Build Approval Gate

Required inputs:

- Approved PRD.
- Approved architecture.
- Implementation Plan.
- Validation plan.

Review criteria:

- The build task is bounded.
- The implementation path is reversible where practical.
- Validation commands are known.
- Human approval checkpoints are explicit.

Failure conditions:

- Agent begins from a vague prompt.
- No validation plan exists.
- Serious edits are made without `proceed`.
- Secrets or protected data are exposed.

Approval required:

- Founder/operator approval using `proceed` for serious or irreversible work.

### Operational Readiness Gate

Required inputs:

- Test evidence.
- Review notes.
- Operating Playbook.
- Monitoring plan.
- Support and escalation map.

Review criteria:

- Owners are assigned.
- Alerts and reporting map to decisions.
- Documentation is discoverable.
- Rollback and support paths are known.

Failure conditions:

- Local validation is presented as production readiness.
- No support owner exists.
- No monitoring or escalation path exists.
- Documentation is incomplete for handoff.

Approval required:

- Technical owner and operator approval.

### Growth Review Gate

Required inputs:

- Adoption Report.
- ROI Review.
- Attribution Report where relevant.
- Growth Backlog.

Review criteria:

- Actual usage is measured.
- ROI is evidence-based.
- Expansion is tied to adoption, retention, or revenue evidence.
- Operations can absorb the next change.

Failure conditions:

- Scaling begins before adoption is proven.
- ROI is asserted without evidence.
- Attribution is unclear.
- Expansion increases unmanaged complexity.

Approval required:

- Founder/operator approval.

## 7. Human Approval Checkpoints

The human operator must approve:

- opportunity selection;
- founder diagnostic findings;
- PRD scope and exclusions;
- architecture boundaries and major tradeoffs;
- serious or irreversible edits;
- public copy changes;
- production deploys;
- client-facing deliverables;
- use of secrets, credentials, or client data;
- vendor or platform decisions that become canonical;
- workflow automation that changes customer, lead, revenue, or delivery behavior;
- growth expansion after launch.

Approval phrase for serious work:

```txt
proceed
```

No `proceed` means no serious or irreversible action.

## 8. AI Assistant Dispatch Prompts

Use bounded prompts. Do not give multiple assistants the same broad assignment.

### Opportunity Intelligence - ChatGPT

```txt
Review/Diagnosis owner: ChatGPT
Actionable AI Assistant Task owner: ChatGPT
Execution location/tool: ChatGPT research/planning thread
Human/operator role: Provide business context and approve or reject opportunity framing
Copy/paste destination: ChatGPT
Approval gate: Opportunity Validation Gate
Success criteria: Produce an Opportunity Brief with demand evidence, alternatives, risks, and disconfirming evidence. Do not recommend a build.

Task:
Evaluate this opportunity using the Founder Intelligence Product Factory Opportunity Intelligence layer. Separate facts, inferences, assumptions, and open questions. Produce an Opportunity Brief, Market Gap Analysis, and Demand Validation Report. Do not create a PRD yet.
```

### Founder Intelligence - ChatGPT Or Obsidian

```txt
Review/Diagnosis owner: ChatGPT
Actionable AI Assistant Task owner: ChatGPT or Obsidian
Execution location/tool: ChatGPT thread or governed vault note
Human/operator role: Confirm workflow reality, exceptions, and owner responsibilities
Copy/paste destination: ChatGPT or Obsidian
Approval gate: Founder Diagnostic Gate
Success criteria: Produce a Founder Intelligence Diagnostic that maps revenue leaks, follow-up failures, attribution gaps, communication breakdowns, knowledge fragmentation, and workflow bottlenecks.

Task:
Diagnose the current operating workflow before recommending tools. Identify bottlenecks, hidden founder knowledge, handoff failures, revenue leaks, attribution gaps, and source-of-truth fragmentation. Produce the required diagnostic artifacts and list what evidence is missing.
```

### Product Intelligence - Claude Or ChatGPT

```txt
Review/Diagnosis owner: ChatGPT
Actionable AI Assistant Task owner: Claude or ChatGPT
Execution location/tool: Git-spec-ready Markdown
Human/operator role: Approve scope, exclusions, and success metrics
Copy/paste destination: Claude Code, ChatGPT, or repo planning doc
Approval gate: PRD Approval Gate
Success criteria: Produce a buildable PRD with scope, out-of-scope, requirements, constraints, assumptions, success metrics, and acceptance criteria.

Task:
Convert the approved opportunity and founder diagnostic into a Product Requirements Document. Do not write code. Define problem, desired outcome, users, user stories, functional requirements, non-functional requirements, scope, out of scope, assumptions, constraints, risks, success metrics, and acceptance criteria.
```

### Architecture Intelligence - Claude Or Codex

```txt
Review/Diagnosis owner: Claude
Actionable AI Assistant Task owner: Claude or Codex
Execution location/tool: Repo docs and architecture files
Human/operator role: Approve system boundaries, platform decisions, and risk tradeoffs
Copy/paste destination: Claude Code or Codex
Approval gate: Architecture Approval Gate
Success criteria: Produce an Architecture Specification that can guide implementation without inventing new source-of-truth paths or bypassing existing repo doctrine.

Task:
Read the approved PRD and existing repo architecture before proposing implementation. Produce an Architecture Specification covering frontend, backend, APIs, database, auth, authorization, observability, infrastructure, security, scalability, integrations, failure modes, and rollback. Do not implement.
```

### Build Intelligence - Codex

```txt
Review/Diagnosis owner: Codex
Actionable AI Assistant Task owner: Codex
Execution location/tool: Local repo worktree
Human/operator role: Approve serious edits with proceed, review diff, decide deploy timing
Copy/paste destination: Codex
Approval gate: Build Approval Gate
Success criteria: Implement only the approved scope, preserve existing architecture, run validation, report files changed, diff summary, rollback, unresolved gaps, and test evidence.

Task:
Read the approved PRD and Architecture Specification first. Confirm branch, recent commits, and working tree state before editing. Produce a pre-edit report. After approval, implement the smallest scoped change, run validation, and report exact files changed, git diff summary, rollback command, unresolved gaps, and whether production deploy is or is not supported by the evidence.
```

### Operational Intelligence - ChatGPT, Codex, Hermes, Or Obsidian

```txt
Review/Diagnosis owner: ChatGPT
Actionable AI Assistant Task owner: ChatGPT, Codex, Hermes, or Obsidian
Execution location/tool: Repo docs, dashboards, CRM, monitoring tools, governed vault
Human/operator role: Assign owners and operating cadence
Copy/paste destination: Relevant assistant or system
Approval gate: Operational Readiness Gate
Success criteria: Produce operating procedures, monitoring plan, support path, dashboard decision map, and Business Memory requirements.

Task:
Convert the validated build into an operating system. Define owners, operating cadence, support and escalation paths, monitoring, reporting, dashboard decisions, Business Memory capture, documentation index, and launch readiness gaps.
```

### Growth Intelligence - ChatGPT

```txt
Review/Diagnosis owner: ChatGPT
Actionable AI Assistant Task owner: ChatGPT
Execution location/tool: Analytics, CRM, dashboard, attribution reports
Human/operator role: Approve expansion priorities and budget
Copy/paste destination: ChatGPT
Approval gate: Growth Review Gate
Success criteria: Produce an evidence-based Growth Backlog tied to adoption, retention, attribution, ROI, and operating capacity.

Task:
Review post-launch evidence. Separate usage, adoption, retention, customer success feedback, attribution, ROI, and operational capacity. Recommend growth priorities only where evidence supports expansion. Identify what should not be scaled yet.
```

## 9. Client-Facing Deliverables

Client-facing deliverables must be clear enough for an operator to understand the work without exposing internal agent mechanics.

Possible deliverables:

- Opportunity Brief;
- Market Gap Analysis;
- Demand Validation Report;
- Founder Intelligence Diagnostic;
- Revenue Leak Assessment;
- Operational Intelligence Report;
- Product Requirements Document;
- Architecture Overview;
- Implementation Roadmap;
- Operating Playbook;
- Dashboard or reporting specification;
- Support and escalation plan;
- Adoption and ROI review;
- Growth Backlog.

Client-facing deliverables must not include:

- internal secrets;
- raw credentials;
- private client data not approved for sharing;
- unreviewed agent reasoning;
- unsupported production-readiness claims;
- broad technology recommendations that were not evaluated against constraints.

## 10. Internal Operating Checklist

Use this checklist before moving between phases.

```txt
Context
[ ] Confirm business objective.
[ ] Confirm current repo/workspace/vault location.
[ ] Confirm branch, recent commits, and working tree state when repo work is involved.
[ ] Confirm existing doctrine, specs, architecture, and source-of-truth docs.
[ ] Confirm secrets/client-data handling rules.

Opportunity
[ ] Problem is operationally defined.
[ ] Buyer, user, operator, and economic owner are identified.
[ ] Demand evidence is documented.
[ ] Alternatives and substitutes are documented.
[ ] Disconfirming evidence is documented.
[ ] Opportunity Validation Gate passed.

Founder Intelligence
[ ] Workflow is mapped.
[ ] Revenue leaks and bottlenecks are documented.
[ ] Attribution and communication gaps are documented.
[ ] Source-of-truth gaps are documented.
[ ] Owners are named or proposed.
[ ] Founder Diagnostic Gate passed.

Product Intelligence
[ ] PRD is written.
[ ] Scope and out-of-scope are explicit.
[ ] Functional and non-functional requirements are written.
[ ] Constraints and assumptions are documented.
[ ] Success metrics and acceptance criteria are measurable.
[ ] PRD Approval Gate passed.

Architecture Intelligence
[ ] Existing architecture was inspected.
[ ] System boundaries are defined.
[ ] Data model and integrations are defined where relevant.
[ ] Auth, permissions, security, and privacy are addressed.
[ ] Observability, failure modes, and rollback are addressed.
[ ] Architecture Approval Gate passed.

Build Intelligence
[ ] Implementation plan is bounded.
[ ] Human approval checkpoints are clear.
[ ] Serious edits received proceed.
[ ] Validation commands were run or skipped with reason.
[ ] Diff and rollback are documented.
[ ] Build Approval Gate passed where required.

Operational Intelligence
[ ] Owners are assigned.
[ ] Operating playbook exists.
[ ] Monitoring and escalation paths exist.
[ ] Reporting maps to decisions.
[ ] Documentation index exists.
[ ] Operational Readiness Gate passed.

Growth Intelligence
[ ] Adoption evidence is reviewed.
[ ] Customer success and retention evidence are reviewed.
[ ] Attribution and ROI are reviewed.
[ ] Growth backlog is prioritized.
[ ] Growth Review Gate passed.
```

## 11. Failure Modes And Rollback Rules

### Failure Modes

| Failure Mode | Signal | Required Response |
| --- | --- | --- |
| Tool-first drift | The work starts with software, AI, automation, or platform choice | Return to Opportunity Intelligence or Founder Intelligence |
| Weak demand | No credible buyer, user, urgency, or willingness-to-pay evidence | Stop product work; gather evidence or reject opportunity |
| Founder-memory dependency | Critical workflow logic exists only in the founder's head | Document workflow and Business Memory requirements before build |
| Vague PRD | Requirements are broad, untestable, or missing success criteria | Stop architecture and rewrite PRD |
| Architecture gap | Data, auth, integrations, observability, or rollback are unclear | Stop build and complete Architecture Intelligence |
| Agent overreach | AI assistant changes scope, architecture, public copy, secrets, or production behavior without approval | Stop work, inspect diff, revert only the offending scoped changes with approval |
| Local-success overclaim | Local tests pass but production readiness is implied without deploy evidence | Reclassify as local validation only and run Operational Readiness Gate |
| Automation of broken process | Automation accelerates unclear or unowned workflow | Disable or pause automation; clarify and govern process first |
| Dashboard without decisions | Reports exist but no owner or decision path exists | Assign decision owner or remove dashboard from readiness claims |
| Scaling too early | Expansion begins before adoption, ROI, or retention evidence exists | Return to Growth Review Gate and require evidence |

### Rollback Rules

For documentation-only changes:

```txt
Rollback by removing the added document or reverting the commit.
```

For code changes:

```txt
Rollback must be tied to the exact files changed and the commit or patch that introduced them.
```

For automation changes:

```txt
Rollback must include how to disable the automation, restore prior manual handling, and verify no queued work remains unmanaged.
```

For production changes:

```txt
Rollback must include deploy target, previous version, migration state, data impact, owner, and verification command or dashboard.
```

For client-facing deliverables:

```txt
Rollback means correcting or withdrawing the deliverable and documenting what changed, why, and who was notified.
```

Never use broad destructive commands as a default rollback. Prefer scoped revert, feature flag disablement, configuration rollback, or documented manual fallback.

## 12. Definition Of Done

The Founder Intelligence Product Factory execution is done only when the relevant phase gate has passed and the operator can inspect the evidence.

Minimum definition of done for the full lifecycle:

- Opportunity evidence is documented.
- Founder operating reality is diagnosed.
- PRD is approved.
- Architecture is approved.
- Build is implemented against the approved scope.
- Validation evidence is recorded.
- Human approval checkpoints were respected.
- Client-facing deliverables are reviewed.
- Operating owner, support path, monitoring, and documentation exist.
- Adoption, attribution, ROI, and growth backlog are reviewed after launch.
- Open risks and skipped artifacts are documented.
- Rollback path is documented.
- Session closeout records completed work, files changed, decisions made, open issues, risks, next action, memory/progress update status, and review status.

For documentation-only doctrine or playbook work, definition of done is narrower:

- The document is added in the canonical repo location.
- The document references, but does not duplicate, companion doctrine.
- Required sections are present.
- Existing unrelated files are untouched.
- Git status and rollback path are reported.
- Commit status is reported clearly.
