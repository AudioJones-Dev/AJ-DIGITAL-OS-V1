# Protection and path classification

Apply portable exclusions, the AJ Digital OS profile, and registry protection
before detector-specific classification. Repository configuration may append
exclusions but may never remove defaults.

## Portable defaults

```text
docs/**                 **/*.md                 **/*.mdx
PRD*                    BUILD-SPEC*             AGENTS.md
CLAUDE.md               prompts/**              **/*.prompt.*
**/migrations/**        **/schema.*             **/*.sql
**/generated/**         **/*.gen.*              **/dist/**
**/.next/**             **/coverage/**           **/node_modules/**
.env*                   **/.env*                **/*.config.*
**/deploy/**            **/deployment/**         LICENSE*
NOTICE*                 legal/**
```

## AJ Digital OS protected defaults

If the first normalized path segment starts with `.`, exclude it. This is a
classifier rule, not a literal glob, and covers current and future tool,
workspace, governance, and cache directories.

Also exclude:

```text
.dmaic/**               skills/**               config/**
graphify-out/**         runtime/**              logs/**
dist/**                 node_modules/**          data/**
memory/**               output/**               sessions/**
env/**                  supabase/**             sql/**
n8n/**                  monitoring/**           compose/**
traefik/**              **/migrations/**         **/schema.*
**/.cache/**            **/.npm-cache/**         **/.pnpm-store/**
**/.turbo/**            **/.vite/**              **/.parcel-cache/**
**/.pytest_cache/**     **/__pycache__/**        **/.ruff_cache/**
docker-compose*.yml     Dockerfile               Procfile
doppler.yaml            .env                    .env.*
```

## Registry extension

Preserve the existing registry keys `id`, plural `paths`, optional
`test_paths`, `status`, and `owner`. Add only:

- `protected: boolean`, default `false` when absent;
- `protection_reason: non-empty string`, required when `protected: true`.

Reject truthy strings, missing reasons, incompatible component overlaps, and
malformed registries. Do not mutate the registry.

Resolve the configured registry against the repository root before reading it.
Reject lexical escapes and symlinks or junctions whose real path is outside the
repository.

Portfolio scope requires a valid registry and fails closed without one.
Component scope may continue evidence-only, but statuses are `null`, the run is
incomplete, and every otherwise-actionable result becomes `needs-decision`.

## Never-touch domains

Public APIs and exported types, auth/authz, billing and financial calculation,
environment contracts, schemas/migrations, deployment/infrastructure, and AJ
Digital OS approval/attribution/Hermes/model-router/BEL/API-route behavior are
never actionable. Set `public_api_touched: true` and require Analyze unless an
earlier protected-path exclusion forces `excluded`.

For a mixed-location record, one protected location forces the whole record to
`excluded`.
