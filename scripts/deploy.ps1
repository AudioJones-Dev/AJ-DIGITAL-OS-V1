<#
.SYNOPSIS
  Deploy AJ Digital OS to the local host from main.

.DESCRIPTION
  One scripted, gated deploy path — the operator runs it; nothing auto-fires on
  merge (deploy stays a human action per the governance kernel). Sequence:

    1. Preflight   — on main, clean tree, Docker up, .env sane (no placeholders)
    2. Backup      — snapshot volumes before touching anything (skippable)
    3. Pull        — fast-forward main
    4. Build       — npm ci + npm run build
    5. Migrate     — node dist/cli.js db-migrate (ordered, tracked runner)
    6. Up          — docker compose up -d --build
    7. Healthcheck — poll /status until healthy or timeout

  Any failing step aborts the rest. Use -DryRun to print the plan without
  executing. Pair with rollback.ps1 if a deploy goes bad.

.PARAMETER Compose
  Compose file. Default: docker-compose.unified.yml.

.PARAMETER SkipBackup
  Skip the pre-deploy volume backup (not recommended).

.PARAMETER SkipMigrate
  Skip db-migrate (e.g. no schema change in this deploy).

.PARAMETER DryRun
  Print each step without executing.

.EXAMPLE
  pwsh ./scripts/deploy.ps1
  pwsh ./scripts/deploy.ps1 -DryRun
  pwsh ./scripts/deploy.ps1 -SkipMigrate
#>
[CmdletBinding()]
param(
  [string]$Compose = "docker-compose.unified.yml",
  [switch]$SkipBackup,
  [switch]$SkipMigrate,
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

# ── 1. Preflight ─────────────────────────────────────────────────────────
Step "Preflight"
$branch = (& git rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne "main") { throw "Not on main (on '$branch'). Deploy from main only." }

$dirty = (& git status --porcelain)
if ($dirty) { throw "Working tree is dirty. Commit/stash before deploying:`n$dirty" }

& docker info *> $null
if ($LASTEXITCODE -ne 0) { throw "Docker is not reachable. Start Docker Desktop and retry." }

if (-not (Test-Path ".env")) { throw ".env not found in $repoRoot. A real .env is required to deploy." }
$envText = Get-Content ".env" -Raw
# Refuse to deploy with placeholder or unset critical credentials.
$required = @("HERMES_STATUS_API_KEY", "POSTGRES_PASSWORD", "GRAFANA_ADMIN_PASSWORD", "N8N_BASIC_AUTH_PASSWORD")
$bad = @()
foreach ($k in $required) {
  $m = [regex]::Match($envText, "(?m)^\s*$k\s*=\s*(.*)$")
  $val = if ($m.Success) { $m.Groups[1].Value.Trim().Trim('"') } else { "" }
  if ($val -eq "" -or $val -in @("change-me", "change-me-now")) { $bad += $k }
}
if ($bad.Count -gt 0) {
  throw "These credentials are unset/placeholder in .env: $($bad -join ', ').`nSet real values (e.g. openssl rand -hex 32) before deploying."
}
Write-Host "Preflight OK: on main, clean, docker up, .env credentials set." -ForegroundColor Green

# ── 2. Backup ────────────────────────────────────────────────────────────
if (-not $SkipBackup) {
  Step "Pre-deploy volume backup"
  Run "pwsh `"$PSScriptRoot\backup-volumes.ps1`""
} else {
  Write-Host "Skipping backup (-SkipBackup)." -ForegroundColor DarkYellow
}

# ── 3. Pull ──────────────────────────────────────────────────────────────
Step "Pull main (fast-forward only)"
Run "git pull --ff-only origin main"

# ── 4. Build ─────────────────────────────────────────────────────────────
Step "Install + build"
Run "npm ci"
Run "npm run build"

# ── 5. Migrate ───────────────────────────────────────────────────────────
if (-not $SkipMigrate) {
  Step "Database migrations"
  Run "node dist/cli.js db-migrate --json"
} else {
  Write-Host "Skipping migrations (-SkipMigrate)." -ForegroundColor DarkYellow
}

# ── 6. Up ────────────────────────────────────────────────────────────────
Step "Compose up"
Run "docker compose -f $Compose up -d --build"

# ── 7. Healthcheck ───────────────────────────────────────────────────────
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
  if (-not $ok) {
    throw "Healthcheck FAILED: /status did not return 200 within 120s. Check 'docker compose logs aj-digital-os' and consider rollback.ps1."
  }
  Write-Host "Healthcheck OK: /status is live." -ForegroundColor Green
}

Step "Deploy complete"
$sha = (& git rev-parse --short HEAD).Trim()
Write-Host "Deployed main @ $sha" -ForegroundColor Green
