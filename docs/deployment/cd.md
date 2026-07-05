# Continuous Deployment — manual gated deploy

`.github/workflows/deploy.yml` layers automation on top of `scripts/deploy.ps1`
**without removing the human gate**. The workflow is currently manual-only:
Actions → Deploy → Run workflow. It targets the `production` environment so the
job can pause at an environment approval gate when that gate is configured. Only
then does the self-hosted runner on the box run `deploy.ps1` (backup → pull →
build → migrate → compose up → healthcheck).

```
operator dispatch ─▶ deploy job queues ─▶ production approval gate if configured
                                                   │ approve / run
                                                   ▼
                             self-hosted runner runs scripts/deploy.ps1 on the box
```

This satisfies the governance kernel (deploy is HUMAN_REQUIRED): nothing ships on
merge. A person must intentionally dispatch the workflow, and environment review
should be configured before using it for production.

## One-time operator setup

All three steps are GitHub/host configuration the operator performs once. Until
they exist, the workflow will queue but cannot run (no eligible runner) — which
is fail-safe.

### 1. Self-hosted runner on the box

Repo → Settings → Actions → Runners → New self-hosted runner (Windows x64).
Follow the install commands, then register it with the labels the workflow
targets:

```
# during ./config.cmd, when prompted for additional labels:
aj-os-box
```

The runner needs, on the box: Docker Desktop running, Node 20+, PowerShell 7
(`pwsh`), and the deploy clone at `C:\dev\AJ-DIGITAL-OS` (or set repo variable
`DEPLOY_DIR`). Run the runner as a service so it survives reboots.

> Security: a self-hosted runner executes whatever the workflow says. Keep this
> repo's `main` protected (PR + review required) so only reviewed code can reach
> the deploy job, and restrict who can approve the `production` environment.

### 2. `production` environment with a required reviewer (the gate)

Repo → Settings → Environments → New environment → `production`.
- Under **Required reviewers**, add yourself (and anyone else allowed to approve
  deploys). This is the human gate — without it the auto-start would ship
  unreviewed if a future push trigger is added.
- Optional: restrict deployment branches to `main`.

### 3. Repo variable (only if the clone isn't at the default path)

Repo → Settings → Secrets and variables → Actions → Variables →
`DEPLOY_DIR = C:\dev\AJ-DIGITAL-OS` (or wherever the deploy clone lives).

## Using it

- **Manual:** Actions → Deploy → Run workflow. Inputs let you `skip_migrate` or
  `skip_backup` for edge cases.
- **Future automatic option:** after the `production` environment required
  reviewer and `aj-os-box` runner are verified, add a `push` trigger for `main`
  in `.github/workflows/deploy.yml`. Do not add that trigger until the gate is
  confirmed in GitHub settings.

## Turning it off / rolling back

- Disable deploy workflow: disable the workflow in GitHub Actions or remove the
  workflow file.
- Bad deploy: `scripts/rollback.ps1 -Ref <good-sha>` on the box (add
  `-RestoreSetDir` for volume rollback). See [backup-restore.md](./backup-restore.md).

## Why not fully automatic (no gate)?

Deferred deliberately. Fully automatic deploy-on-merge is possible (drop the
`environment:` line), but it conflicts with the governance kernel's
HUMAN_REQUIRED deploy rule. If you later want it, that's an explicit operator
decision, not a default.
