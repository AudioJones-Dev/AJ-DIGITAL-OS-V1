<#
.SYNOPSIS
  Roll AJ Digital OS back to a previous commit + (optionally) a volume backup set.

.DESCRIPTION
  Recovery counterpart to deploy.ps1. Checks out a known-good commit, optionally
  restores volumes from a backup set, rebuilds, and brings the stack back up.

  Code rollback is always safe. VOLUME rollback is destructive and only needed
  when a bad migration or data corruption is involved — omit -RestoreSetDir to
  roll back code only (the common case).

.PARAMETER Ref
  Git ref (commit SHA or tag) to roll back to. Required.

.PARAMETER RestoreSetDir
  Optional backup set to restore volumes from (see backup-restore.md). Destructive.

.PARAMETER Compose
  Compose file. Default: docker-compose.unified.yml.

.PARAMETER DryRun
  Print the plan without executing.

.EXAMPLE
  # Code-only rollback to the previous release
  pwsh ./scripts/rollback.ps1 -Ref 5a2c375

  # Full rollback including volume state (bad migration)
  pwsh ./scripts/rollback.ps1 -Ref 5a2c375 -RestoreSetDir G:\AJ-BACKUPS\aj-digital-os\2026-07-05_030000
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][string]$Ref,
  [string]$RestoreSetDir,
  [string]$Compose = "docker-compose.unified.yml",
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Step($msg) { Write-Host "`n=== $msg ===" -ForegroundColor Cyan }
function Run($cmd) {
  if ($DryRun) { Write-Host "DRYRUN> $cmd" -ForegroundColor DarkGray; return }
  Write-Host "> $cmd" -ForegroundColor DarkGray
  Invoke-Expression $cmd
  if ($LASTEXITCODE -ne 0 -and $null -ne $LASTEXITCODE) { throw "Step failed: $cmd" }
}

# Validate the ref exists before we tear anything down.
& git rev-parse --verify "$Ref^{commit}" *> $null
if ($LASTEXITCODE -ne 0) { throw "Ref '$Ref' does not resolve to a commit." }

Step "Rolling back to $Ref"

if ($RestoreSetDir) {
  Step "Stopping stack for volume restore"
  Run "docker compose -f $Compose down"

  Step "Restoring volumes from $RestoreSetDir (destructive)"
  $forceFlag = if ($DryRun) { "" } else { "-Force" }
  Run "pwsh `"$PSScriptRoot\restore-volumes.ps1`" -SetDir `"$RestoreSetDir`" $forceFlag"
}

Step "Checking out $Ref"
Run "git checkout $Ref"

Step "Rebuild"
Run "npm ci"
Run "npm run build"

Step "Compose up"
Run "docker compose -f $Compose up -d --build"

Step "Healthcheck (/status)"
if ($DryRun) {
  Write-Host "DRYRUN> poll http://127.0.0.1:7420/status until 200 (120s timeout)" -ForegroundColor DarkGray
} else {
  $deadline = (Get-Date).AddSeconds(120)
  $ok = $false
  while ((Get-Date) -lt $deadline) {
    try {
      $resp = Invoke-WebRequest -Uri "http://127.0.0.1:7420/status" -TimeoutSec 5 -UseBasicParsing
      if ($resp.StatusCode -eq 200) { $ok = $true; break }
    } catch { Start-Sleep -Seconds 3 }
  }
  if (-not $ok) { throw "Healthcheck FAILED after rollback. Inspect 'docker compose logs aj-digital-os'." }
  Write-Host "Healthcheck OK." -ForegroundColor Green
}

Write-Host "`nNOTE: git is now in detached HEAD at $Ref. Once stable, reconcile main" -ForegroundColor Yellow
Write-Host "(e.g. revert the bad commit on a branch and merge) rather than leaving it detached." -ForegroundColor Yellow
