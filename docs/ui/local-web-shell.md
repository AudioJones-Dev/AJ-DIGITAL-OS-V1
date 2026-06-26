# Local Web Shell

## Purpose

The local web shell is the first browser-based assistant control surface for AJ Digital OS.

It is intentionally thin and local-first:

- it reuses the existing assistant runtime
- it reuses assistant history
- it now reuses persisted conversation threads and turns
- it now shows semantic retrieval results from the local memory layer
- it reuses deliverable registry data
- it surfaces brands, tool registry, integration profiles, and model profiles from local file-backed stores

## Start Path

Use:

```bash
npm run cli -- ui-start
```

Default URL:

- `http://127.0.0.1:4318`

Optional overrides:

```bash
node dist/cli.js ui-start --host 127.0.0.1 --port 4318
```

## Current Views

The first version includes:

- chat workspace
- recent assistant session sidebar
- persisted conversation thread continuation
- brand selector
- agent/model picker
- advisory versus orchestrated mode picker
- right-side metadata and deliverables panel
- right-side memory panel for retrieved semantic context
- deliverables view with thin local lifecycle actions
- read-only integrations view
- read-only model profiles view
- read-only tool registry view

## Honest Limitations

- no production-grade frontend framework is introduced in this patch
- no live OAuth or external account auth flow is implemented
- no live Discord, Telegram, or WhatsApp runtime is implemented
- file attach and local path attach are scaffold-level UI controls only
- deliverable actions are local lifecycle controls only and do not introduce external approval systems
- model profile selection now routes into runtime when a local model profile exists
- semantic memory, embeddings, and vector retrieval are not implemented
- transcript editing and advanced thread management are not implemented

## Reference Workspace

Generated visual reference files should live under:

- `ui/reference/`

They should be treated as design inputs only, not as production runtime code.
