# Copilot Prompt — AJ Digital OS Scaffold Build
## Paste into Copilot Chat in VS Code

You are helping build a production-grade TypeScript architecture inside an OpenClaude-style codebase.

Your job is to create the scaffold and starter implementation for an AJ Digital operating system layer.

## Context

This repo already has:
- strict TypeScript configuration with `src` as root
- `zod` installed
- OpenClaude-style runtime and CLI
- provider launch profiles
- local Ollama support
- smart router logic
- diagnostics and hardening commands

We are NOT rebuilding the whole runtime.
We ARE adding a schema-first agent/workflow layer on top of it.

## Goal

Create a clean, compiling scaffold for:

- agent orchestration
- workflow registry
- Brand DNA support
- schema validation
- approval packet structure
- client data templates

## Build Rules

- TypeScript only
- Keep code modular and single-responsibility
- Use Zod for all schemas
- Use strict typing
- No hidden external dependencies
- No network calls in the first pass unless the file is explicitly a tool wrapper
- Prefer deterministic starter implementations
- Add concise JSDoc comments
- Do not break existing repo behavior
- Make everything compile cleanly before adding advanced integrations

## Files to create now

Create exactly these files first:

1. `src/types/run.types.ts`
2. `src/types/workflow.types.ts`
3. `src/types/agent.types.ts`
4. `src/schemas/run.schema.ts`
5. `src/schemas/context-bundle.schema.ts`
6. `src/schemas/brand-dna.schema.ts`
7. `src/schemas/content-asset.schema.ts`
8. `src/schemas/workflow-result.schema.ts`
9. `src/schemas/validation-report.schema.ts`
10. `src/schemas/approval-packet.schema.ts`
11. `src/schemas/index.ts`
12. `src/core/validator.ts`
13. `src/core/state-machine.ts`
14. `src/core/run-manager.ts`
15. `src/workflows/workflow-registry.ts`
16. `src/workflows/blog-authority.workflow.ts`
17. `src/agents/orchestrator.agent.ts`
18. `src/agents/context-loader.agent.ts`
19. `src/data/clients/_template/client-profile.json`
20. `src/data/clients/_template/brand-dna.json`
21. `src/data/clients/_template/project-context.json`

## Expected architecture

Use this structure:

```text
src/
  agents/
  core/
  schemas/
  workflows/
  data/clients/_template/
  types/
```

## Required schema details

### Run schema
Must include:
- runId
- workflowId
- taskType
- clientId
- status
- createdAt
- updatedAt
- revisionCount
- approvalRequired
- approvalStatus
- warnings
- errors

### Context bundle schema
Must include:
- runId
- taskType
- objective
- clientId
- brandDNA
- sourceMaterials
- constraints
- metadata

### Brand DNA schema
Must include:
- brandName
- voice
- tone
- audience
- category
- positioning
- differentiators
- corePromise
- philosophy
- writingRules
- bannedPhrases
- preferredCTAs

### Workflow result schema
Must include:
- workflowId
- taskType
- status
- summary
- assets
- warnings

### Validation report schema
Must include:
- ok
- errors
- warnings
- checks

### Approval packet schema
Must include:
- runId
- workflowId
- clientId
- title
- summary
- artifactPreview
- decisionOptions
- riskFlags
- createdAt

## Workflow behavior

### `blog-authority.workflow.ts`
Implement a deterministic starter workflow that:
- accepts a workflow context
- generates title, outline, blog draft, CTA, SEO notes, and hook set
- returns a strict workflow result object
- uses Brand DNA fields where available
- does not call any external APIs

### `workflow-registry.ts`
Implement a simple registry that:
- registers workflows in memory
- resolves a workflow by task type
- lists supported workflows

### `validator.ts`
Implement:
- `validateContext`
- `validateWorkflowResult`

Use Zod-backed runtime validation plus practical business checks.

### `orchestrator.agent.ts`
Implement:
- task input schema
- workflow resolution
- preflight validation
- workflow execution
- post-validation
- structured output

### `context-loader.agent.ts`
Implement a starter local context loader that:
- reads client template or specific client files from `src/data/clients`
- returns a normalized context bundle
- fails clearly if required files are missing

## Coding style

- Use named exports
- Keep functions small
- Prefer pure functions where practical
- No massive files
- Avoid clever abstractions
- Be explicit

## Important

After creating the files, also:
- add minimal barrel export in `src/schemas/index.ts`
- ensure imports are valid
- keep pathing compatible with the repo's strict TypeScript setup
- do not modify unrelated existing files unless required for imports or compile fixes

## Output format

Do the work in two passes:

### Pass 1
Create all files and implementations.

### Pass 2
Review imports, typing, and compile risks. Then propose the next three files to build:
- `src/agents/approval.agent.ts`
- `src/tools/telegram.tool.ts`
- `src/workflows/transcript-to-content.workflow.ts`
