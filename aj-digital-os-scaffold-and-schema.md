> **Status: Historical.** This document is the original scaffold/schema starter and is no longer authoritative. The canonical architecture lives under `docs/system/` and `docs/architecture/`. See [`docs/DESIGN.md`](docs/DESIGN.md) for navigation.

# AJ Digital OS — Scaffold and Schema Starter
## OpenClaude-aligned repository scaffold for VS Code + Copilot build execution

**Version:** 1.0  
**Date:** April 1, 2026

---

# 1. Build Objective

This scaffold turns your current OpenClaude-style runtime into an AJ Digital operating system with:

- orchestrated agent execution
- schema-first handoffs
- client Brand DNA support
- workflow registry
- validation gates
- approval-ready architecture
- local or multi-provider model routing support

This aligns with the current runtime posture in your uploaded OpenClaude materials, including:
- strict TypeScript + `src` root layout fileciteturn0file5
- Zod already available in dependencies fileciteturn0file7
- provider launch profiles, runtime diagnostics, and local model support fileciteturn0file0 fileciteturn0file1
- smart router + Ollama provider extensions for provider flexibility fileciteturn0file2 fileciteturn0file6

---

# 2. Target Repository Structure

```text
openclaude/
├── src/
│   ├── agents/
│   │   ├── orchestrator.agent.ts
│   │   ├── context-loader.agent.ts
│   │   ├── brand-dna.agent.ts
│   │   ├── research.agent.ts
│   │   ├── content.agent.ts
│   │   ├── seo.agent.ts
│   │   ├── validator.agent.ts
│   │   ├── approval.agent.ts
│   │   └── publisher.agent.ts
│   │
│   ├── core/
│   │   ├── validator.ts
│   │   ├── logger.ts
│   │   ├── run-manager.ts
│   │   ├── state-machine.ts
│   │   ├── errors.ts
│   │   └── constants.ts
│   │
│   ├── schemas/
│   │   ├── run.schema.ts
│   │   ├── context-bundle.schema.ts
│   │   ├── brand-dna.schema.ts
│   │   ├── workflow-result.schema.ts
│   │   ├── validation-report.schema.ts
│   │   ├── approval-packet.schema.ts
│   │   ├── content-asset.schema.ts
│   │   └── index.ts
│   │
│   ├── workflows/
│   │   ├── workflow-registry.ts
│   │   ├── first-workflow.ts
│   │   ├── brand-dna.workflow.ts
│   │   ├── blog-authority.workflow.ts
│   │   ├── transcript-to-content.workflow.ts
│   │   └── automation-spec.workflow.ts
│   │
│   ├── tools/
│   │   ├── telegram.tool.ts
│   │   ├── github.tool.ts
│   │   ├── sanity.tool.ts
│   │   ├── gdrive.tool.ts
│   │   ├── ollama.tool.ts
│   │   └── router.tool.ts
│   │
│   ├── services/
│   │   ├── brand-dna/
│   │   │   ├── brand-dna-loader.ts
│   │   │   └── brand-dna-normalizer.ts
│   │   ├── approval/
│   │   │   ├── approval-service.ts
│   │   │   └── telegram-formatter.ts
│   │   ├── content/
│   │   │   ├── content-builder.ts
│   │   │   ├── seo-optimizer.ts
│   │   │   └── transcript-parser.ts
│   │   └── runtime/
│   │       ├── provider-selector.ts
│   │       └── execution-context.ts
│   │
│   ├── data/
│   │   ├── clients/
│   │   │   ├── _template/
│   │   │   │   ├── client-profile.json
│   │   │   │   ├── brand-dna.json
│   │   │   │   ├── project-context.json
│   │   │   │   └── approvals.json
│   │   │   └── aj-digital/
│   │   │       ├── client-profile.json
│   │   │       ├── brand-dna.json
│   │   │       └── project-context.json
│   │   │
│   │   ├── runs/
│   │   ├── drafts/
│   │   ├── approved/
│   │   └── reports/
│   │
│   ├── types/
│   │   ├── agent.types.ts
│   │   ├── workflow.types.ts
│   │   ├── tool.types.ts
│   │   └── run.types.ts
│   │
│   └── index.ts
│
├── reports/
├── docs/
│   ├── architecture.md
│   ├── build-order.md
│   ├── copilot-build-plan.md
│   └── workflow-map.md
│
├── tests/
│   ├── unit/
│   │   ├── validator.test.ts
│   │   ├── workflow-registry.test.ts
│   │   ├── blog-authority.workflow.test.ts
│   │   └── brand-dna-loader.test.ts
│   └── integration/
│       ├── orchestrator.integration.test.ts
│       └── approval.integration.test.ts
│
└── package.json
```

---

# 3. Build Order

## Phase 1 — Foundation
Create first:

1. `src/types/*`
2. `src/schemas/*`
3. `src/core/validator.ts`
4. `src/core/state-machine.ts`
5. `src/core/run-manager.ts`

## Phase 2 — Workflow Base
Create next:

1. `src/workflows/workflow-registry.ts`
2. `src/workflows/blog-authority.workflow.ts`
3. `src/agents/orchestrator.agent.ts`
4. `src/agents/context-loader.agent.ts`

## Phase 3 — Brand DNA Layer
Create next:

1. `src/schemas/brand-dna.schema.ts`
2. `src/services/brand-dna/brand-dna-loader.ts`
3. `src/services/brand-dna/brand-dna-normalizer.ts`
4. `src/agents/brand-dna.agent.ts`

## Phase 4 — Approval + Publishing
Create next:

1. `src/schemas/approval-packet.schema.ts`
2. `src/tools/telegram.tool.ts`
3. `src/services/approval/approval-service.ts`
4. `src/agents/approval.agent.ts`
5. `src/agents/publisher.agent.ts`

## Phase 5 — Expansion Workflows
Then add:

1. `brand-dna.workflow.ts`
2. `transcript-to-content.workflow.ts`
3. `automation-spec.workflow.ts`

---

# 4. Required Core Types

## `src/types/run.types.ts`

```ts
export type RunStatus =
  | "queued"
  | "context_loaded"
  | "in_progress"
  | "draft_complete"
  | "validation_passed"
  | "validation_failed"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "revision_requested"
  | "executed"
  | "logged"
  | "closed";

export interface RunRecord {
  runId: string;
  workflowId: string;
  taskType: string;
  clientId: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  revisionCount: number;
  approvalRequired: boolean;
  approvalStatus: "not_required" | "pending" | "approved" | "rejected";
  warnings: string[];
  errors: string[];
}
```

## `src/types/workflow.types.ts`

```ts
export interface WorkflowContext {
  runId: string;
  taskType: string;
  objective: string;
  clientId: string;
  brandDNA: Record<string, unknown>;
  sourceMaterials: Array<Record<string, unknown>>;
  constraints: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface WorkflowAsset {
  type: "title" | "outline" | "blog_draft" | "cta" | "seo_notes" | "hook_set";
  value: string;
}

export interface WorkflowExecutionResult {
  workflowId: string;
  taskType: string;
  status: "draft_complete" | "needs_revision" | "failed";
  summary: string;
  assets: WorkflowAsset[];
  warnings: string[];
}

export interface WorkflowDefinition {
  id: string;
  supportedTaskTypes: string[];
  execute(context: WorkflowContext): Promise<WorkflowExecutionResult>;
}
```

## `src/types/agent.types.ts`

```ts
export interface AgentResponse<T = unknown> {
  ok: boolean;
  agent: string;
  output?: T;
  warnings: string[];
  errors: string[];
}
```

---

# 5. Required Core Schemas

## `src/schemas/run.schema.ts`

```ts
import { z } from "zod";

export const RunSchema = z.object({
  runId: z.string().min(1),
  workflowId: z.string().min(1),
  taskType: z.string().min(1),
  clientId: z.string().min(1),
  status: z.enum([
    "queued",
    "context_loaded",
    "in_progress",
    "draft_complete",
    "validation_passed",
    "validation_failed",
    "pending_approval",
    "approved",
    "rejected",
    "revision_requested",
    "executed",
    "logged",
    "closed",
  ]),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  revisionCount: z.number().int().min(0),
  approvalRequired: z.boolean(),
  approvalStatus: z.enum(["not_required", "pending", "approved", "rejected"]),
  warnings: z.array(z.string()).default([]),
  errors: z.array(z.string()).default([]),
});

export type RunRecord = z.infer<typeof RunSchema>;
```

## `src/schemas/context-bundle.schema.ts`

```ts
import { z } from "zod";

export const ContextBundleSchema = z.object({
  runId: z.string().min(1),
  taskType: z.string().min(1),
  objective: z.string().min(1),
  clientId: z.string().min(1),
  brandDNA: z.record(z.unknown()).default({}),
  sourceMaterials: z.array(z.record(z.unknown())).default([]),
  constraints: z.record(z.unknown()).default({}),
  metadata: z.record(z.unknown()).default({}),
});

export type ContextBundle = z.infer<typeof ContextBundleSchema>;
```

## `src/schemas/brand-dna.schema.ts`

```ts
import { z } from "zod";

export const BrandDNASchema = z.object({
  brandName: z.string().min(1),
  voice: z.string().min(1),
  tone: z.string().min(1),
  audience: z.string().min(1),
  category: z.string().min(1),
  positioning: z.string().min(1),
  differentiators: z.array(z.string()).default([]),
  corePromise: z.string().min(1),
  philosophy: z.string().optional(),
  writingRules: z.array(z.string()).default([]),
  bannedPhrases: z.array(z.string()).default([]),
  preferredCTAs: z.array(z.string()).default([]),
});

export type BrandDNA = z.infer<typeof BrandDNASchema>;
```

## `src/schemas/content-asset.schema.ts`

```ts
import { z } from "zod";

export const ContentAssetSchema = z.object({
  type: z.enum(["title", "outline", "blog_draft", "cta", "seo_notes", "hook_set"]),
  value: z.string().min(1),
});

export type ContentAsset = z.infer<typeof ContentAssetSchema>;
```

## `src/schemas/workflow-result.schema.ts`

```ts
import { z } from "zod";
import { ContentAssetSchema } from "./content-asset.schema";

export const WorkflowResultSchema = z.object({
  workflowId: z.string().min(1),
  taskType: z.string().min(1),
  status: z.enum(["draft_complete", "needs_revision", "failed"]),
  summary: z.string().min(1),
  assets: z.array(ContentAssetSchema),
  warnings: z.array(z.string()).default([]),
});

export type WorkflowResult = z.infer<typeof WorkflowResultSchema>;
```

## `src/schemas/validation-report.schema.ts`

```ts
import { z } from "zod";

export const ValidationCheckSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["pass", "fail", "warning"]),
  notes: z.string().optional(),
});

export const ValidationReportSchema = z.object({
  ok: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  checks: z.array(ValidationCheckSchema),
});

export type ValidationReport = z.infer<typeof ValidationReportSchema>;
```

## `src/schemas/approval-packet.schema.ts`

```ts
import { z } from "zod";

export const ApprovalPacketSchema = z.object({
  runId: z.string().min(1),
  workflowId: z.string().min(1),
  clientId: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  artifactPreview: z.string().min(1),
  decisionOptions: z.array(
    z.enum(["approve", "reject", "request_revision"])
  ).default(["approve", "reject", "request_revision"]),
  riskFlags: z.array(z.string()).default([]),
  createdAt: z.string().min(1),
});

export type ApprovalPacket = z.infer<typeof ApprovalPacketSchema>;
```

---

# 6. Suggested Client Data Templates

## `src/data/clients/_template/client-profile.json`

```json
{
  "clientId": "client-slug",
  "clientName": "Client Name",
  "industry": "industry",
  "primaryOffer": "offer",
  "website": "",
  "notes": []
}
```

## `src/data/clients/_template/brand-dna.json`

```json
{
  "brandName": "Client Name",
  "voice": "clear, direct, strategic",
  "tone": "confident, practical, sharp",
  "audience": "founders, operators, entrepreneurs",
  "category": "AI consulting and media systems",
  "positioning": "Builds scalable authority and operational systems using AI and media",
  "differentiators": [
    "systems thinking",
    "polymath operator perspective",
    "AI + media integration"
  ],
  "corePromise": "turn expertise into scalable authority",
  "philosophy": "bullshit input, bullshit output",
  "writingRules": [
    "write clearly",
    "lead with strategic utility",
    "avoid fluff"
  ],
  "bannedPhrases": [],
  "preferredCTAs": [
    "book a strategy call",
    "request a system audit"
  ]
}
```

## `src/data/clients/_template/project-context.json`

```json
{
  "activeWorkflows": [],
  "channels": [],
  "approvalMode": "telegram",
  "notes": []
}
```

---

# 7. Minimum Files Copilot Should Generate First

Generate in this order:

1. `src/types/run.types.ts`
2. `src/types/workflow.types.ts`
3. `src/schemas/run.schema.ts`
4. `src/schemas/context-bundle.schema.ts`
5. `src/schemas/brand-dna.schema.ts`
6. `src/schemas/content-asset.schema.ts`
7. `src/schemas/workflow-result.schema.ts`
8. `src/schemas/validation-report.schema.ts`
9. `src/schemas/approval-packet.schema.ts`
10. `src/core/validator.ts`
11. `src/workflows/workflow-registry.ts`
12. `src/workflows/blog-authority.workflow.ts`
13. `src/agents/orchestrator.agent.ts`
14. `src/agents/context-loader.agent.ts`

---

# 8. Non-Negotiable Build Rules

- Use TypeScript only.
- Use named exports unless there is a strong reason not to.
- Keep every file single-responsibility.
- Use Zod for all runtime validation.
- No `any` unless absolutely unavoidable.
- Every workflow must return a strict `WorkflowExecutionResult`.
- Every external side effect should be wrapped in a `tool` or `service`.
- No publishing action should happen inside the orchestrator.
- Approval must remain a separate layer.
- File paths must be Windows-safe and repo-safe.
- Add lightweight JSDoc comments for exported classes and functions.
- Prefer deterministic starter logic over hidden LLM calls.
- Make first pass compile clean before adding tool integrations.

---

# 9. What This Scaffold Gives You

This scaffold gives you the exact missing middle layer between:
- the OpenClaude execution engine and provider system fileciteturn0file1
- the smart routing and local provider extensions you uploaded fileciteturn0file2 fileciteturn0file6
- the AJ Digital agent architecture you want to operationalize

It is the correct starting point for Copilot-assisted build execution.
