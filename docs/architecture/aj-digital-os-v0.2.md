# AJ Digital OS v0.2 Architecture

## Summary

AJ Digital OS v0.2 extends the current operator-first business agent runtime with additive layers for model providers, prompt assembly, markdown-defined skills, file-backed memory, routing, and tool permissions. The existing CLI, approval flow, workflow registry, and observability model remain authoritative.

## Core Runtime

The orchestrator remains responsible for run creation, context loading, validation, workflow execution, and approval-safe lifecycle transitions. Workflows continue to produce deterministic draft assets while new layers are introduced around them instead of replacing them.

## Provider Abstraction

Model access is isolated behind provider interfaces so local and API-backed inference can be introduced without embedding provider-specific calls in workflows or orchestration. Ollama is the first active backend, while OpenAI, Anthropic, and LM Studio remain scaffolded for later enablement.

## Prompt Assembly

Prompt construction is separated into reusable policy and context modules. System policy, client policy, workflow policy, memory context, and task context are assembled into a consistent prompt contract before any model execution is introduced.

## Markdown Skills

Skills are defined as markdown files with frontmatter so operator workflows can load reusable capability definitions without hardcoding them into the CLI or workflow registry. This layer stays additive until a later execution pass wires skills into runtime decisions.

## Memory Layer

The memory subsystem provides a simple file-backed structure for reusable operating context, client notes, preferences, and workflow history. Retrieval is designed to enrich prompt assembly first, with write paths deferred until the workflow and approval lifecycle can absorb them safely.

## Routing and Tool Permissions

Routing policies determine which provider and model should handle a task, while permission gates define which tools are allowed for a given runtime context. The initial integration phase records routing decisions as observability metadata without changing existing workflow execution.

## Approval-Safe Lifecycle

All additions must preserve the current approval-first control surface. New prompt, memory, routing, and tool layers are introduced in a way that keeps human approval authoritative, maintains the current run lifecycle, and preserves existing dashboard, event, and summary observability flows.
