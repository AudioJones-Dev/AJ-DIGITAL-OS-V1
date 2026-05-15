> **Status: Historical.** This document is an early architecture draft and is no longer authoritative. The canonical architecture lives under `docs/system/` and `docs/architecture/`. See [`docs/DESIGN.md`](docs/DESIGN.md) for navigation and [`docs/system/AJ_DIGITAL_OS_MASTER_ARCHITECTURE_SCHEMA.md`](docs/system/AJ_DIGITAL_OS_MASTER_ARCHITECTURE_SCHEMA.md) for the current schema.

# AJ Digital Agent Architecture
## Based on Claude Code Principles, adapted for AJ Digital OS

**Version:** 1.0  
**Date:** April 1, 2026  
**Owner:** AJ DIGITAL LLC  
**Primary Persona:** Audio Jones / AJ Digital  
**Purpose:** Define the production-grade agent architecture for AJ Digital’s internal AI operating system, built for content, brand intelligence, automation, and media operations.

---

# 1. Executive Summary

AJ Digital should not be built as a single chatbot with many prompts.

It should be built as a **multi-agent operating system** with:

- a **central orchestration layer**
- a **shared schema layer**
- a **strict validation layer**
- a **tool abstraction layer**
- a **human approval layer**
- specialized agents with tightly scoped responsibilities

The Claude Code principle worth borrowing is not “copy the prompt.”  
It is this:

> **Reliable AI systems come from disciplined structure, explicit tool rules, narrow responsibilities, and enforced execution flow.**

For AJ Digital, that means the system should operate like this:

```text
User/Trigger
  ↓
Orchestrator Agent
  ↓
Task Router
  ↓
Specialist Agent
  ↓
Validation Layer
  ↓
Approval Layer
  ↓
Execution Layer
  ↓
Logging + Memory + Revision History
```

---

# 2. Core Design Principles

## 2.1 Prompt is Program
Prompts are not casual instructions.  
They are operational logic.

Each agent must have:

- role
- scope
- allowed actions
- forbidden actions
- required inputs
- output schema
- validation checklist
- escalation rules

## 2.2 Single Responsibility Agents
Each agent should do one job well.

Do not create “super agents” that research, write, validate, publish, schedule, and report all at once.

## 2.3 Tool Access Must Be Scoped
Agents should only access tools required for their role.

Example:
- Research agent can search and summarize
- Publishing agent can write to CMS
- Approval agent can notify Telegram
- Validator agent cannot publish

## 2.4 Structured Outputs Only
All important outputs must be schema-based.

No freeform handoff between major stages.

## 2.5 Validation Before Action
Nothing publishes, sends, mutates, or schedules until validation passes.

## 2.6 Human-in-the-Loop for High-Impact Actions
Any public-facing action should pass through approval unless explicitly whitelisted.

Examples:
- blog publishing
- social scheduling
- client deliverables
- outbound brand strategy docs
- CRM updates affecting clients

---

# 3. AJ Digital OS High-Level Architecture

## 3.1 System Layers

### Layer 1 — Interface Layer
Where tasks enter the system.

**Inputs may come from:**
- ChatGPT conversation
- n8n webhook
- Telegram approval flow
- Google Sheets row change
- Notion database item
- CMS content request
- uploaded transcript / document / clip metadata

### Layer 2 — Orchestration Layer
Determines what kind of job this is and what pipeline to invoke.

**Responsibilities:**
- classify task
- identify objective
- load correct workflow
- assemble context
- assign specialist agents
- manage state
- enforce sequencing

This is the **brainstem** of AJ Digital OS.

### Layer 3 — Agent Layer
Specialized agents perform bounded work.

Examples:
- brand strategist
- transcript analyst
- content writer
- SEO optimizer
- workflow builder
- validator
- publisher

### Layer 4 — Tool Layer
All external systems and actions.

Examples:
- n8n
- Telegram
- Sanity
- Google Drive
- Sheets / Excel
- Notion
- GitHub
- CMS
- scheduling systems
- cloud storage

### Layer 5 — Validation + Governance Layer
Checks accuracy, completeness, schema adherence, and compliance.

### Layer 6 — Memory + Logging Layer
Stores:

- run IDs
- revisions
- task history
- approvals
- schema versions
- output artifacts
- brand DNA references
- client context

---

# 4. Core Agent Types

## 4.1 Orchestrator Agent
### Role
Top-level controller that receives a task and routes it correctly.

### Responsibilities
- classify request
- identify correct workflow
- gather needed context
- invoke specialist agents in order
- enforce validation gates
- determine if approval is required
- finalize run state

### Allowed Actions
- call sub-agents
- assemble context
- write run log
- request validation
- trigger approval workflow

### Not Allowed
- directly publish final content
- bypass validation
- improvise unsupported workflows

## 4.2 Context Loader Agent
### Role
Assemble the context package required for a task.

### Responsibilities
- load client profile
- load brand DNA
- load prior deliverables
- load relevant transcripts/files
- load campaign or project context
- normalize data into shared context schema

### Output
`context_bundle.json`

## 4.3 Brand DNA Agent
### Role
Translate brand identity into machine-usable operating constraints.

### Responsibilities
- interpret voice/tone
- define positioning
- encode audience
- identify strategic boundaries
- derive language patterns
- enforce narrative consistency

### Output
`brand_dna_profile.json`

### Key Use Cases
- writing in client voice
- evaluating fit of ideas
- checking whether messaging matches brand strategy

## 4.4 Research Agent
### Role
Collect evidence, examples, references, competitive intelligence, or source material.

### Responsibilities
- retrieve sources
- summarize findings
- identify contradictions
- extract structured insights
- prepare research briefing objects

### Output
`research_brief.json`

## 4.5 Strategy Agent
### Role
Turn research and context into strategic recommendations.

### Responsibilities
- positioning
- offer design
- content strategy
- category framing
- system recommendations
- narrative architecture

### Output
`strategy_memo.json`

## 4.6 Transcript Intelligence Agent
### Role
Process transcripts into insights, segments, hooks, themes, and content opportunities.

### Responsibilities
- segment content
- identify hooks
- extract frameworks
- find timestamps
- detect quotes
- identify monetizable themes
- map content flywheel opportunities

### Output
`transcript_analysis.json`

## 4.7 Content Generation Agent
### Role
Generate first-draft content from approved inputs.

### Responsibilities
- write blog drafts
- captions
- metadata
- YouTube titles
- descriptions
- emails
- scripts
- outlines

### Constraint
Must write only from validated context bundle and approved schema.

### Output
`content_draft.json`

## 4.8 SEO/AEO Optimization Agent
### Role
Refine content for discoverability and answer-engine performance.

### Responsibilities
- title optimization
- heading structure
- FAQ extraction
- semantic clustering
- snippet optimization
- metadata refinement
- internal linking suggestions

### Output
`content_optimized.json`

## 4.9 Validation Agent
### Role
Quality gate before approval or execution.

### Responsibilities
- schema validation
- factual consistency checks
- brand alignment check
- duplication check
- formatting check
- missing field detection
- publish readiness score

### Output
`validation_report.json`

### Decision Modes
- pass
- pass_with_warnings
- fail

## 4.10 Approval Agent
### Role
Prepare human approval packet and manage decision loop.

### Responsibilities
- summarize deliverable
- include key risks
- format Telegram approval
- map revision options
- capture decision
- return status to orchestrator

### Output
`approval_packet.json`

## 4.11 Publishing Agent
### Role
Execute approved actions in external systems.

### Responsibilities
- publish to CMS
- write rows to sheet
- generate delivery file
- create repo file
- push structured content downstream
- send handoff to posting pipeline

### Constraint
Only receives validated and approved payloads.

## 4.12 Reporting Agent
### Role
Compile post-run summaries and operational dashboards.

### Responsibilities
- weekly reports
- performance rollups
- task summaries
- production throughput
- issue logs
- approval latency

---

# 5. Recommended AJ Digital Agent Groups

## Group A — Brand Intelligence Stack
Used for competitor analysis, brand DNA, positioning, strategy.

**Agents:**
- Context Loader
- Research Agent
- Brand DNA Agent
- Strategy Agent
- Validation Agent
- Approval Agent

**Primary Outputs:**
- competitor analyses
- brand DNA files
- positioning docs
- messaging architecture
- strategic memos

## Group B — Content Production Stack
Used for transcript-driven content and blog/article production.

**Agents:**
- Context Loader
- Transcript Intelligence Agent
- Content Generation Agent
- SEO/AEO Optimization Agent
- Validation Agent
- Approval Agent
- Publishing Agent

**Primary Outputs:**
- blog drafts
- clip metadata sheets
- show notes
- YouTube assets
- social captions
- newsletter drafts

## Group C — Automation Architecture Stack
Used for building workflows, n8n systems, Git-ready specs.

**Agents:**
- Context Loader
- Research Agent
- Strategy Agent
- Workflow Architect Agent
- Validation Agent
- Approval Agent

Add a dedicated specialist:

### Workflow Architect Agent
**Responsibilities:**
- convert requirements into node maps
- define trigger/action paths
- specify schemas
- define retry/backoff logic
- define logs and alerts
- produce Git-ready workflow spec

## Group D — Client Delivery Stack
Used for client-facing deliverables, audits, decks, proposals.

**Agents:**
- Context Loader
- Brand DNA Agent
- Strategy Agent
- Content Generation Agent
- Validation Agent
- Approval Agent
- Export/Packaging Agent

---

# 6. Workflow Pattern

## 6.1 Canonical Flow

```text
1. Trigger received
2. Orchestrator classifies task
3. Context Loader assembles context
4. Specialist agent executes task
5. Validation Agent checks output
6. If needed, specialist revises
7. Approval Agent prepares approval packet
8. Human approves / requests revision
9. Publishing/Execution Agent performs action
10. Run log + revision history updated
11. Reporting Agent updates summary state
```

## 6.2 Standard State Machine

Each run should move through these states:

```text
queued
→ context_loaded
→ in_progress
→ draft_complete
→ validation_passed | validation_failed
→ pending_approval
→ approved | rejected | revision_requested
→ executed
→ logged
→ closed
```

---

# 7. Shared Schemas

## 7.1 Run Schema

```json
{
  "run_id": "uuid",
  "workflow_type": "content_production",
  "task_type": "blog_generation",
  "client_id": "client_slug",
  "status": "pending_approval",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601",
  "initiator": "user|system|automation",
  "agents_used": [
    "context_loader",
    "content_generation",
    "seo_optimizer",
    "validator",
    "approval"
  ],
  "artifacts": [],
  "validation_result": "pass",
  "approval_status": "pending",
  "revision_count": 0,
  "version": "1.0.0"
}
```

## 7.2 Context Bundle Schema

```json
{
  "client_profile": {},
  "brand_dna": {},
  "project_context": {},
  "source_materials": [],
  "task_brief": {},
  "constraints": {},
  "success_criteria": []
}
```

## 7.3 Agent Output Schema

```json
{
  "agent_name": "content_generation",
  "run_id": "uuid",
  "input_refs": [],
  "output_type": "content_draft",
  "output_payload": {},
  "confidence_notes": [],
  "warnings": [],
  "created_at": "ISO-8601"
}
```

## 7.4 Validation Report Schema

```json
{
  "run_id": "uuid",
  "validator_name": "validation_agent",
  "result": "pass",
  "checks": [
    {
      "name": "schema_compliance",
      "status": "pass",
      "notes": ""
    },
    {
      "name": "brand_alignment",
      "status": "pass",
      "notes": ""
    },
    {
      "name": "missing_fields",
      "status": "pass",
      "notes": ""
    }
  ],
  "warnings": [],
  "required_fixes": []
}
```

## 7.5 Approval Packet Schema

```json
{
  "run_id": "uuid",
  "title": "Blog Draft Ready for Approval",
  "summary": "AEO/SEO blog draft generated for client X.",
  "artifacts": [
    {
      "type": "markdown",
      "path": "/outputs/blogs/post-001.md"
    }
  ],
  "decision_options": [
    "approve",
    "reject",
    "request_revision"
  ],
  "risk_flags": [],
  "prepared_at": "ISO-8601"
}
```

---

# 8. Tool Architecture

## 8.1 Tool Layer Philosophy
AJ Digital agents should not speak directly to external tools in an ad hoc way.

Instead, use a **tool abstraction layer**.

That means each external service has a defined contract.

## 8.2 Recommended Tool Domains

### Content Tools
- transcript parsers
- CMS
- metadata generators
- image generation pipeline
- publishing destinations

### Ops Tools
- n8n
- Telegram
- Google Drive
- Notion
- Sheets
- GitHub

### Intelligence Tools
- search/research providers
- file retrieval
- analytics systems
- channel review systems

## 8.3 Tool Spec Pattern

Every tool should define:

- tool name
- purpose
- allowed callers
- required inputs
- expected outputs
- failure modes
- retry rules
- audit logging requirements

Example:

```yaml
tool_name: telegram_approval
purpose: Send approval packet to Telegram and receive decision
allowed_callers:
  - approval_agent
  - orchestrator_agent
required_inputs:
  - run_id
  - title
  - summary
  - artifact_links
expected_outputs:
  - message_id
  - approval_status
failure_modes:
  - telegram_rate_limit
  - network_failure
retry_policy:
  max_attempts: 3
  backoff: [1, 2, 4]
audit_log: true
```

---

# 9. Governance Rules

## 9.1 No Direct Publish Rule
No agent except the Publishing Agent may write final public output.

## 9.2 No Validation Bypass Rule
Any public or client-facing output must pass validation.

## 9.3 No Contextless Generation Rule
No major deliverable can be generated without a context bundle.

## 9.4 No Silent Mutation Rule
Any action that changes data externally must be logged with:

- run_id
- tool used
- timestamp
- payload summary
- outcome

## 9.5 Revision History Rule
Every substantial deliverable must maintain:

- version
- revision reason
- editor/agent
- approval state
- timestamp

---

# 10. Recommended Repo Structure

```text
aj-digital-os/
├── core/
│   ├── system-prompt/
│   │   ├── aj-digital-master-system-prompt.md
│   │   ├── orchestrator-agent.md
│   │   ├── context-loader-agent.md
│   │   ├── brand-dna-agent.md
│   │   ├── research-agent.md
│   │   ├── strategy-agent.md
│   │   ├── transcript-intelligence-agent.md
│   │   ├── content-generation-agent.md
│   │   ├── seo-aeo-agent.md
│   │   ├── validation-agent.md
│   │   ├── approval-agent.md
│   │   ├── publishing-agent.md
│   │   └── reporting-agent.md
│   ├── schemas/
│   │   ├── run.schema.json
│   │   ├── context-bundle.schema.json
│   │   ├── validation-report.schema.json
│   │   ├── approval-packet.schema.json
│   │   └── brand-dna.schema.json
│   ├── tools/
│   │   ├── telegram.tool.yaml
│   │   ├── n8n.tool.yaml
│   │   ├── sanity.tool.yaml
│   │   ├── gdrive.tool.yaml
│   │   └── github.tool.yaml
│   └── policies/
│       ├── validation-policy.md
│       ├── approval-policy.md
│       ├── publishing-policy.md
│       └── logging-policy.md
│
├── workflows/
│   ├── brand-intelligence/
│   ├── content-production/
│   ├── automation-architecture/
│   └── client-delivery/
│
├── clients/
│   ├── _template/
│   │   ├── client-profile.json
│   │   ├── brand-dna.json
│   │   ├── project-context.json
│   │   └── approvals/
│   └── client-name/
│
├── outputs/
│   ├── drafts/
│   ├── approved/
│   ├── published/
│   └── reports/
│
├── logs/
│   ├── runs/
│   ├── approvals/
│   └── errors/
│
└── docs/
    ├── architecture.md
    ├── operating-model.md
    ├── onboarding.md
    └── build-order.md
```

---

# 11. Agent Prompt Template

Use this for every agent file.

```md
# Agent Name
[agent_name]

## Role
One-sentence definition of the agent's job.

## Mission
What successful execution means.

## Allowed Actions
- action 1
- action 2

## Forbidden Actions
- forbidden 1
- forbidden 2

## Required Inputs
- input 1
- input 2

## Output Contract
Return valid JSON matching:
[linked schema]

## Workflow Rules
1. Read inputs
2. Check missing data
3. Perform task
4. Self-check
5. Return structured output

## Validation Checklist
- schema complete
- no unsupported claims
- aligns with brand DNA
- ready for next stage

## Escalation Rules
If required inputs are missing, return an explicit missing_inputs object.
If confidence is low, set warning flags.
Do not fabricate.
```

---

# 12. Recommended First Four Production Workflows

## 12.1 Brand DNA Engine
### Purpose
Turn raw business/brand inputs into a reusable brand operating profile.

### Flow
```text
Trigger
→ Context Loader
→ Research Agent
→ Brand DNA Agent
→ Strategy Agent
→ Validation Agent
→ Approval Agent
→ Save to client/brand-dna.json
```

## 12.2 Blog Authority Engine
### Purpose
Generate AEO/SEO authority blogs aligned with client brand DNA.

### Flow
```text
Trigger
→ Context Loader
→ Research Agent
→ Content Generation Agent
→ SEO/AEO Agent
→ Validation Agent
→ Approval Agent
→ Publishing Agent
→ Log run
```

## 12.3 Transcript-to-Content Engine
### Purpose
Convert podcast/video transcripts into hooks, titles, clips, captions, and metadata.

### Flow
```text
Transcript Input
→ Context Loader
→ Transcript Intelligence Agent
→ Content Generation Agent
→ Validation Agent
→ Approval Agent
→ Export sheet / publish handoff
```

## 12.4 Automation Spec Builder
### Purpose
Convert operational requirements into Git-ready n8n workflow specs.

### Flow
```text
Request
→ Context Loader
→ Strategy Agent
→ Workflow Architect Agent
→ Validation Agent
→ Approval Agent
→ Save spec to repo
```

---

# 13. Build Order

## Phase 1 — Core Foundation
Build these first:

1. master architecture doc
2. run schema
3. context bundle schema
4. validation report schema
5. approval packet schema
6. orchestrator agent prompt
7. validation agent prompt
8. approval agent prompt

## Phase 2 — Brand Intelligence Stack
Build:

1. context loader agent
2. research agent
3. brand DNA agent
4. strategy agent
5. brand DNA workflow

## Phase 3 — Content Stack
Build:

1. transcript intelligence agent
2. content generation agent
3. SEO/AEO agent
4. publishing agent
5. blog authority workflow
6. transcript-to-content workflow

## Phase 4 — Automation Stack
Build:

1. workflow architect agent
2. n8n tool contract
3. GitHub tool contract
4. automation spec workflow

## Phase 5 — Ops + Reporting
Build:

1. reporting agent
2. dashboard schema
3. run summary pipeline
4. revision history logic

---

# 14. Best-Practice Operating Rules for AJ Digital

## Use narrow agents
Do not let one prompt do everything.

## Use explicit schemas
Every major handoff should be structured.

## Put brand DNA in the center
All client-facing content should run through it.

## Separate draft from publish
Drafting is not execution.

## Log everything important
You will need this for scale, debugging, and client trust.

## Design for review
Approval is not a patch; it is a core system feature.

## Treat prompts like software
Version them, test them, refine them.

---

# 15. Final Architecture Statement

AJ Digital OS should be defined as:

> A multi-agent operating system for brand intelligence, content production, and media automation, built on strict schemas, scoped tool access, validation gates, and human approval workflows.

That is the right architecture for what you are building.

Not a chatbot.  
Not a pile of prompts.  
A real operating system.

---

# 16. Immediate Next Deliverables

The most logical next files to generate are:

1. `docs/architecture.md`
2. `core/system-prompt/aj-digital-master-system-prompt.md`
3. `core/system-prompt/orchestrator-agent.md`
4. `core/system-prompt/validation-agent.md`
5. `core/schemas/run.schema.json`
6. `core/schemas/context-bundle.schema.json`
