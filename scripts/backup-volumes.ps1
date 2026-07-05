<#
.SYNOPSIS
  Back up AJ Digital OS Docker named volumes to compressed tarballs.

.DESCRIPTION
  For each durable volume in the stack, runs a throwaway Alpine container that
  tars the volume's contents to <Destination>\<timestamp>\<volume>.tar.gz.
  Postgres additionally gets a logical pg_dump (more portable/restorable than a
  raw file copy) when its container is running.

  Safe to run while the stack is up: volumes are mounted read-only for the tar,
  and pg_dump is a consistent logical snapshot. For a guaranteed-quiescent file
  backup, stop the stack first (docker compose stop).

.PARAMETER Destination
  Root backup directory. Default: G:\AJ-BACKUPS\aj-digital-os (offsite drive).

.PARAMETER Project
  Compose project name / volume prefix. Default: aj-digital-os.

.PARAMETER Full
  Also back up full-profile volumes (ollama, qdrant, loki, alertmanager).

.PARAMETER RetentionDays
  Delete backup sets older than this many days. 0 = keep everything. Default: 14.

.EXAMPLE
  pwsh ./scripts/backup-volumes.ps1
  pwsh ./scripts/backup-volumes.ps1 -Destination D:\backups -RetentionDays 30 -Full
#>
[CmdletBinding()]
param(
  [string]$Destination = "G:\AJ-BACKUPS\aj-digital-os",
  [string]$Project = "aj-digital-os",
  [switch]$Full,
  [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

# Durable volumes in the default profile. n8n encryption key + workflows,
# postgres app data, grafana dashboards/state, prometheus TSDB, open-webui
# chats, and the control-plane app data volume.
$coreVolumes = @(
  "postgres-data", "redis-data", "n8n-data",
  "grafana-data", "prometheus-data", "openwebui-data", "aj-os-data"
)
$fullVolumes = @("ollama-data", "qdrant-data", "loki-data", "alertmanager-data")
$volumes = if ($Full) { $coreVolumes + $fullVolumes } else { $coreVolumes }

# Verify docker is reachable before doing anything.
& docker info *> $null
if ($LASTEXITCODE -ne 0) { throw "Docker is not reachable. Start Docker Desktop and retry." }

$stamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$setDir = Join-Path $Destination $stamp
New-Item -ItemType Directory -Force -Path $setDir | Out-Null
Write-Host "Backup set: $setDir" -ForegroundColor Cyan

$manifest = [ordered]@{ startedAt = $stamp; project = $Project; volumes = @(); pgDump = $null }

foreach ($vol in $volumes) {
  $fullName = "${Project}_${vol}"
  # Does the volume exist? Skip (don't fail) volumes that were never created.
  & docker volume inspect $fullName *> $null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  skip  $fullName (not found)" -ForegroundColor DarkYellow
    continue
  }

  $outFile = "/backup/$vol.tar.gz"
  Write-Host "  dump  $fullName -> $vol.tar.gz"
  # Mount volume read-only; mount the set dir as /backup; tar contents.
  & docker run --rm `
    -v "${fullName}:/data:ro" `
    -v "${setDir}:/backup" `
    alpine sh -c "tar czf $outFile -C /data ."
  if ($LASTEXITCODE -ne 0) { throw "Backup failed for volume $fullName" }
  $manifest.volumes += $vol
}

# Logical Postgres dump when the container is up — the preferred restore path.
$pgContainer = "aj-postgres"
$running = (& docker ps --filter "name=^/${pgContainer}$" --filter "status=running" --format "{{.Names}}")
if ($running -eq $pgContainer) {
  $pgUser = if ($env:POSTGRES_USER) { $env:POSTGRES_USER } else { "aj" }
  $pgDb   = if ($env:POSTGRES_DB)   { $env:POSTGRES_DB }   else { "ajdigital" }
  $dumpPath = Join-Path $setDir "postgres-$pgDb.dump"
  Write-Host "  pgdump ${pgContainer}:${pgDb} -> postgres-$pgDb.dump"
  # Custom format (-Fc) => restorable with pg_restore, parallelizable.
  & docker exec $pgContainer pg_dump -U $pgUser -d $pgDb -Fc | Set-Content -Path $dumpPath -Encoding Byte
  if ($LASTEXITCODE -ne 0) { Write-Warning "pg_dump failed — raw postgres-data tarball is still available." }
  else { $manifest.pgDump = "postgres-$pgDb.dump" }
} else {
  Write-Host "  note  $pgContainer not running — skipping logical pg_dump (raw volume tar captured)" -ForegroundColor DarkYellow
}

$manifest.finishedAt = Get-Date -Format "yyyy-MM-dd_HHmmss"
$manifest | ConvertTo-Json -Depth 4 | Set-Content -Path (Join-Path $setDir "manifest.json")

# Retention: prune old sets by folder timestamp.
if ($RetentionDays -gt 0) {
  $cutoff = (Get-Date).AddDays(-$RetentionDays)
  Get-ChildItem -Path $Destination -Directory |
    Where-Object { $_.Name -match '^\d{4}-\d{2}-\d{2}_\d{6}$' -and $_.CreationTime -lt $cutoff } |
    ForEach-Object {
      Write-Host "  prune $($_.Name) (older than $RetentionDays days)" -ForegroundColor DarkGray
      Remove-Item -Recurse -Force $_.FullName
    }
}

Write-Host "Backup complete: $($manifest.volumes.Count) volume(s)." -ForegroundColor Green
Write-Host $setDir
