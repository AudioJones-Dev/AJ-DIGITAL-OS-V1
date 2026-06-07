# AJ Digital OS Sites Dashboard Brief

## Purpose

Use OpenAI Sites to create a hosted internal dashboard that tracks AJ Digital OS build progress.

This dashboard is for operational visibility only. It is not the AJ Digital OS product app, not the client portal, and not the production command center.

## Deployment Rule

Do not deploy immediately.

Sites deployment URLs are production deployments. First ask Sites to save a deployable version for review. Deploy only after the operator approves the saved version.

## Recommended Access

Initial access mode:

- `admins_only`

Do not widen access until:

- the saved version has been reviewed,
- no secrets or client-private data are visible,
- the intended audience is confirmed,
- the operator explicitly approves deployment/access changes.

## Site Title

AJ Digital OS Build Progress Dashboard

## Audience

- Audio / Tyrone
- AJ Digital internal operators
- Workspace admins

Not for:

- public visitors,
- clients,
- contractors without explicit access,
- automated unauthenticated sharing.

## Core Dashboard Sections

### 1. Executive Status

Show:

- overall build status,
- current phase,
- risk level,
- last updated timestamp,
- next recommended action.

### 2. 16-Layer Architecture Progress

Represent each AJ Digital OS layer:

1. Infrastructure
2. Control Plane / Kernel
3. Connector / Driver
4. Data Ingestion
5. Data Normalization
6. Memory
7. Intelligence
8. Orchestration
9. Agent Execution
10. Governance
11. Interface / Shell
12. Application
13. Observability
14. Attribution
15. Optimization
16. Business Outcome

Each layer card should include:

- status,
- implementation evidence,
- current gap,
- next action,
- risk level.

### 3. Current Repo State

Show:

- repo path: `C:\dev\AJ-DIGITAL-OS`,
- branch: `main`,
- Git relationship: ahead/behind origin,
- modified files count,
- untracked files count,
- runtime/generated file warning.

### 4. ajdigital.app Platform Build

Track:

- public landing page,
- authenticated app shell,
- internal admin portal,
- command center,
- client portal,
- project dashboard,
- communications dashboard,
- deliverables and approvals,
- tenant model,
- role model.

### 5. Recent Changes

Show a manual update table:

- date,
- file or module,
- change summary,
- category,
- owner,
- review status.

### 6. Blockers And Risks

Include:

- tenant isolation not production-ready,
- file-backed runtime stores require migration,
- auth provider not selected,
- client portal not ready for production,
- current worktree is dirty,
- deployment requires approval,
- secrets must stay out of source.

### 7. Approval Gates

Show these gates:

- no production deployment without explicit approval,
- no secret work without approval,
- no destructive cleanup without approval,
- no public/client access until tenant isolation is enforced,
- no automated outbound communication in MVP.

## Status Vocabulary

Use these status labels:

- Implemented
- Partial
- Planned
- Blocked
- Needs Review

Use these risk labels:

- Low
- Medium
- High
- Critical

## Data Handling Rules

- Do not include `.env` values.
- Do not include secrets, API keys, tokens, connection strings, or client-private payloads.
- Do not expose raw runtime logs.
- Do not expose internal stack traces.
- Use summarized repo/build status only.
- Treat the dashboard as a manually updated control-room snapshot unless Sites storage is explicitly requested later.

## Exact Sites Prompt

```txt
@Sites Create a hosted internal dashboard website for AJ Digital OS build progress.

Important deployment instruction:
Do not deploy yet. Save a deployable version for review only. Keep access limited to owner and workspace admins unless I explicitly approve a deployment and access change later.

Product name:
AJ Digital OS Build Progress Dashboard

Purpose:
Create an internal progress dashboard for the AJ Digital OS repo at C:\dev\AJ-DIGITAL-OS and the ajdigital.app platform build. This dashboard is for operational visibility only. It is not the production app, not the client portal, and not a public marketing website.

Audience:
Audio / Tyrone, AJ Digital internal operators, and workspace admins.

Visual style:
Quiet, dense, professional command-center UI. Dark theme. Operational dashboard, not a landing page. Avoid hype, large marketing hero sections, decorative gradients, or fake metrics.

Core sections:
1. Executive Status
2. 16-Layer Architecture Progress
3. Current Repo State
4. ajdigital.app Platform Build
5. Recent Changes
6. Blockers and Risks
7. Approval Gates
8. Next Recommended Actions

Use this 16-layer architecture:
1. Infrastructure
2. Control Plane / Kernel
3. Connector / Driver
4. Data Ingestion
5. Data Normalization
6. Memory
7. Intelligence
8. Orchestration
9. Agent Execution
10. Governance
11. Interface / Shell
12. Application
13. Observability
14. Attribution
15. Optimization
16. Business Outcome

Use these layer status labels:
- Implemented
- Partial
- Planned
- Blocked
- Needs Review

Use these risk labels:
- Low
- Medium
- High
- Critical

Known AJ Digital OS build facts to include:
- Repo path: C:\dev\AJ-DIGITAL-OS.
- The repo is initialized with Git and connected to origin.
- Current branch is main.
- The local branch is ahead of and behind origin, so sync needs review before publishing.
- The worktree is dirty and should be reviewed before any commit or deploy.
- There is an existing Next.js dashboard under dashboard/.
- The Interface / Shell layer is partial.
- Control Plane / Kernel is implemented.
- Orchestration has BEL runtime and DAG execution foundations.
- Attribution is implemented.
- Memory, Intelligence, Governance, Observability, and Interface are partial.
- Infrastructure, Connector / Driver, Data Ingestion, Data Normalization, Application, Optimization, and Business Outcome still have planned or incomplete work.
- Client portal, diagnostic form, mobile approval surface, agent status monitor, ROI dashboard, tenant hardening, and production database migration are not complete.

ajdigital.app platform build items:
- Public landing page
- Authenticated app shell
- Internal admin portal
- Command center
- Client portal
- Project dashboard
- Communications dashboard
- Deliverables and approvals
- Tenant model
- Role model

Data handling:
- Do not include secrets, API keys, .env values, tokens, connection strings, raw logs, or client-private data.
- Summarize runtime state instead of displaying raw JSONL logs.
- Treat this as a manually updated dashboard unless I later ask for Sites durable storage.

Deliverable:
Create the dashboard and save a reviewable version. Report what you created and how I can inspect it. Do not deploy a production version until I explicitly approve it.
```
