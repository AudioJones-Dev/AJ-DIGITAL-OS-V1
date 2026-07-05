# Backup & Restore — Docker volumes

Disaster-recovery procedure for the AJ Digital OS stack. All durable state lives
in Docker named volumes (`aj-digital-os_*`); if the host is lost, these scripts
are what stand between you and a full rebuild.

## What gets backed up

`scripts/backup-volumes.ps1` captures the default-profile durable volumes:

| Volume | Holds |
|---|---|
| `postgres-data` | Primary Postgres data (also dumped logically — see below) |
| `redis-data` | Redis AOF |
| `n8n-data` | n8n workflows **and its auto-generated encryption key** |
| `grafana-data` | Grafana state |
| `prometheus-data` | Prometheus TSDB |
| `openwebui-data` | Open WebUI chats/config |
| `aj-os-data` | Control-plane app data (`/app/data`) |

`-Full` adds `ollama-data`, `qdrant-data`, `loki-data`, `alertmanager-data`.

Each volume is tarred to `<Destination>\<timestamp>\<volume>.tar.gz`. Postgres
additionally gets a logical `pg_dump -Fc` (`postgres-<db>.dump`) when the
container is running — that's the preferred restore path (portable, versioned,
`pg_restore`-able) with the raw tarball as a fallback.

> **n8n note:** n8n encrypts credentials with a key stored inside `n8n-data`.
> Restoring `n8n-data` from the same set keeps workflows and key together. Never
> restore a mismatched n8n volume + key or stored credentials become unreadable.

## Back up

```powershell
# Default: back up to G:\AJ-BACKUPS\aj-digital-os, keep 14 days, stack can stay up
pwsh ./scripts/backup-volumes.ps1

# Custom destination + retention, include full-profile volumes
pwsh ./scripts/backup-volumes.ps1 -Destination D:\backups -RetentionDays 30 -Full
```

Safe while the stack is running: volumes mount read-only for the tar, and
`pg_dump` is a consistent logical snapshot. For a guaranteed-quiescent file copy,
`docker compose -f docker-compose.unified.yml stop` first.

Verified round-trip: a seeded volume tars to host and restores into a fresh
volume with file contents (including nested dirs) intact.

### Schedule it (Windows Task Scheduler)

```powershell
$action  = New-ScheduledTaskAction -Execute "pwsh.exe" `
  -Argument "-File C:\dev\AJ-DIGITAL-OS\scripts\backup-volumes.ps1"
$trigger = New-ScheduledTaskTrigger -Daily -At 3am
Register-ScheduledTask -TaskName "AJ-OS-Volume-Backup" -Action $action -Trigger $trigger
```

## Restore

**Stop the stack first — the scripts refuse to run while `aj-*` containers hold the volumes.**

```powershell
docker compose -f docker-compose.unified.yml down

# Restore every volume in a set
pwsh ./scripts/restore-volumes.ps1 -SetDir G:\AJ-BACKUPS\aj-digital-os\2026-07-05_030000

# Restore only specific volumes
pwsh ./scripts/restore-volumes.ps1 -SetDir <set> -Volumes postgres-data,n8n-data
```

Restore is **destructive** — it clears each target volume before extracting, and
prompts for a typed `RESTORE` confirmation (`-Force` to skip).

### Preferred Postgres path (logical restore)

When the set contains `postgres-<db>.dump`, restore that instead of the raw
`postgres-data` tarball:

```powershell
docker compose -f docker-compose.unified.yml up -d postgres
docker exec -i aj-postgres pg_restore -U $env:POSTGRES_USER -d $env:POSTGRES_DB `
  --clean --if-exists < "G:\AJ-BACKUPS\aj-digital-os\2026-07-05_030000\postgres-ajdigital.dump"
```

## RPO / RTO

- **RPO** ≈ time since last backup → run daily (or hourly for Postgres via a
  more frequent `pg_dump`-only job).
- **RTO** ≈ minutes: `down` → restore tarballs → `up`. Test a restore into throwaway
  volumes quarterly so the procedure is known-good before you need it.
