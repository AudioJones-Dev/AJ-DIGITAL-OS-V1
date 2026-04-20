# AJ Digital OS Onboarding

## What AJ Digital OS Is

AJ Digital OS is a local-first TypeScript workflow operating system for approval-gated AI runs, deterministic execution, local publishing, and file-based observability. The main operator interface is the CLI.

## Prerequisites

- Node.js and npm installed
- Git installed
- Access to this repository
- Optional: a linked CLI via `npm link` if you want the `aj-digital-os` command directly

## Install Steps

```bash
npm install
```

## Build Steps

Run the standard validation and build sequence:

```bash
npm run typecheck
npm run build
```

## CLI Verification Steps

Verify the command surface from the compiled entrypoint through the npm scripts:

```bash
npm run cli:help
npm run cli:console
```

You can also use the generic CLI pattern:

```bash
npm run cli -- dashboard
npm run cli -- run-summary --runId <test-run-id>
```

If you want the installable CLI locally:

```bash
npm run link:local
aj-digital-os help
```


## Demo Data + Smoke Validation

To quickly validate a realistic local operator surface:

```bash
npm run seed:demo
npm run smoke:cli
```

`seed:demo` creates deterministic run and event data under `src/data/runs` and `src/data/reports/runs`.

## Key Docs To Read Next

- `README.md`
- `docs/operator-playbook.md`
- `docs/recovery-playbook.md`
- `docs/system-architecture.md`
- `docs/publish-preparation-checklist.md`
- `docs/go-live-production-plan.md`
- `docs/versioning-policy.md`
