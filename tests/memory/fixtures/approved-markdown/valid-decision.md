---
type: decision
status: approved
version: 1
scope: global
tenant_id: null
project_id: project-memory-layer
agent_id: null
source: obsidian_export
confidence: 1.0
created_at: 2026-06-05
updated_at: 2026-06-05
approved_by: audio
deprecated_at: null
tags: [memory, router, architecture]
---

# Decision: Router Before Backends

AJ Digital OS agents request memory through the Memory Router before any database, vector, graph, or runtime memory backend is exposed.
