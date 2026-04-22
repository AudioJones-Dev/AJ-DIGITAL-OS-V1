$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

function Invoke-Git {
  param([string[]]$GitArgs)
  $output = & git @GitArgs 2>&1
  $code = $LASTEXITCODE
  return [PSCustomObject]@{
    Output = $output
    Code = $code
  }
}

Write-Host '=== GIT PREFLIGHT ===' -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"

$checkScript = Join-Path $PSScriptRoot 'git-sync-check.ps1'
if (-not (Test-Path $checkScript)) {
  Write-Host 'ERROR: git-sync-check.ps1 not found.' -ForegroundColor Red
  exit 1
}

Write-Host ''
Write-Host 'Running sync inspection...' -ForegroundColor Yellow
& $checkScript
if ($LASTEXITCODE -ne 0) {
  Write-Host 'Inspection failed. Fix errors above and retry.' -ForegroundColor Red
  exit 1
}

$upstreamResult = Invoke-Git -GitArgs @('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}')
$hasUpstream = $upstreamResult.Code -eq 0
$dirty = ((Invoke-Git -GitArgs @('status', '--porcelain')).Output | Measure-Object).Count -gt 0
$aheadCount = 0
$behindCount = 0
$diverged = $false

if ($hasUpstream) {
  $upstream = ($upstreamResult.Output -join "`n").Trim()
  $countsRaw = ((Invoke-Git -GitArgs @('rev-list', '--left-right', '--count', "$upstream...HEAD")).Output -join ' ').Trim()
  if ($countsRaw -match '^\s*(\d+)\s+(\d+)\s*$') {
    $behindCount = [int]$matches[1]
    $aheadCount = [int]$matches[2]
    $diverged = $behindCount -gt 0 -and $aheadCount -gt 0
  }
}

Write-Host ''
Write-Host '=== NEXT ACTION ===' -ForegroundColor Cyan

if (-not $hasUpstream) {
  Write-Host 'No upstream is configured.' -ForegroundColor Yellow
  Write-Host 'Next: .\scripts\git-branch-upstream.ps1'
  exit 1
}

if ($diverged) {
  Write-Host 'Branch is diverged. Stop and perform manual review.' -ForegroundColor Red
  Write-Host 'Do not auto-rebase or force reset in this state.' -ForegroundColor Yellow
  exit 1
}

if ($dirty) {
  Write-Host 'Working tree is dirty.' -ForegroundColor Yellow
  Write-Host 'Next: .\scripts\git-sync-safe.ps1 (it will create a named stash if needed)'
  exit 0
}

if ($behindCount -gt 0 -and $aheadCount -eq 0) {
  Write-Host 'Branch is clean and behind remote.' -ForegroundColor Yellow
  Write-Host 'Next: .\scripts\git-sync-safe.ps1'
  exit 0
}

if ($aheadCount -gt 0 -and $behindCount -eq 0) {
  Write-Host 'Branch is clean and ahead only.' -ForegroundColor Green
  Write-Host 'Next: review commits, then push manually when ready.'
  exit 0
}

Write-Host 'Branch is clean and in sync.' -ForegroundColor Green
Write-Host 'Next: proceed with development or deployment.'
exit 0
