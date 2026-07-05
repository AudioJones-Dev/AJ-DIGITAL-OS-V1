<#
.SYNOPSIS
  Restore AJ Digital OS Docker named volumes from a backup set.

.DESCRIPTION
  Reverses backup-volumes.ps1. Given a backup set directory (containing
  <volume>.tar.gz files and a manifest.json), restores each tarball into its
  named volume. DESTRUCTIVE: the target volume's current contents are replaced.

  The stack MUST be stopped first so nothing holds the volumes open:
    docker compose -f docker-compose.unified.yml down

  For Postgres, prefer the logical dump when present (postgres-*.dump): it is
  restored with pg_restore into a running postgres container after the stack is
  back up. This script restores the raw volume tar by default and prints the
  pg_restore command for the logical path.

.PARAMETER SetDir
  The backup set directory to restore from (the timestamped folder).

.PARAMETER Project
  Compose project name / volume prefix. Default: aj-digital-os.

.PARAMETER Volumes
  Restore only these volume short-names (e.g. postgres-data). Default: all in the set.

.PARAMETER Force
  Skip the interactive confirmation.

.EXAMPLE
  pwsh ./scripts/restore-volumes.ps1 -SetDir G:\AJ-BACKUPS\aj-digital-os\2026-07-05_120000
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$SetDir,
  [string]$Project = "aj-digital-os",
  [string[]]$Volumes,
  [switch]$Force
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $SetDir)) { throw "Backup set not found: $SetDir" }

& docker info *> $null
if ($LASTEXITCODE -ne 0) { throw "Docker is not reachable. Start Docker Desktop and retry." }

# Refuse to run while the stack containers are up (they hold the volumes).
$up = (& docker ps --filter "name=aj-" --format "{{.Names}}")
if ($up) {
  throw "Stack containers are running ($($up -replace "`n", ', ')). Stop them first: docker compose -f docker-compose.unified.yml down"
}

$tarballs = Get-ChildItem -Path $SetDir -Filter "*.tar.gz"
if ($Volumes) {
  $tarballs = $tarballs | Where-Object { $Volumes -contains ($_.BaseName -replace '\.tar$', '') }
}
if (-not $tarballs) { throw "No matching .tar.gz files in $SetDir" }

Write-Host "About to restore into project '$Project':" -ForegroundColor Yellow
$tarballs | ForEach-Object { Write-Host "  $($_.Name) -> ${Project}_$($_.BaseName -replace '\.tar$','')" }
Write-Host "This REPLACES the current contents of those volumes." -ForegroundColor Red

if (-not $Force) {
  $answer = Read-Host "Type RESTORE to proceed"
  if ($answer -ne "RESTORE") { Write-Host "Aborted."; return }
}

foreach ($tar in $tarballs) {
  $vol = $tar.BaseName -replace '\.tar$', ''
  $fullName = "${Project}_${vol}"

  # Ensure the target volume exists (create empty if missing).
  & docker volume inspect $fullName *> $null
  if ($LASTEXITCODE -ne 0) { & docker volume create $fullName | Out-Null }

  Write-Host "  restore $($tar.Name) -> $fullName"
  # Wipe then extract, in one throwaway container. `find -mindepth 1 -delete`
  # clears the volume contents (never the /data mountpoint itself) including
  # dotfiles, without the footgun of a literal rm -rf glob.
  & docker run --rm `
    -v "${fullName}:/data" `
    -v "${SetDir}:/backup:ro" `
    alpine sh -c "find /data -mindepth 1 -delete; tar xzf /backup/$($tar.Name) -C /data"
  if ($LASTEXITCODE -ne 0) { throw "Restore failed for $fullName" }
}

$pgDump = Get-ChildItem -Path $SetDir -Filter "postgres-*.dump" -ErrorAction SilentlyContinue | Select-Object -First 1
Write-Host "Volume restore complete." -ForegroundColor Green
if ($pgDump) {
  Write-Host ""
  Write-Host "Logical Postgres dump present: $($pgDump.Name)" -ForegroundColor Cyan
  Write-Host "For a clean logical restore instead of the raw tar, bring the stack up and run:"
  Write-Host "  docker compose -f docker-compose.unified.yml up -d postgres"
  Write-Host "  docker exec -i aj-postgres pg_restore -U `$POSTGRES_USER -d `$POSTGRES_DB --clean --if-exists < `"$($pgDump.FullName)`""
}
