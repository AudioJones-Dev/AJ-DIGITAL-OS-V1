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

Write-Host '=== GIT SAFE SYNC ===' -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"

& git rev-parse --is-inside-work-tree 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'ERROR: This directory is not a git repository.' -ForegroundColor Red
  exit 1
}

$dirty = ((Invoke-Git -GitArgs @('status', '--porcelain')).Output | Measure-Object).Count -gt 0
$stashCreated = $false

if ($dirty) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  $stashName = "pre-sync-$stamp"
  Write-Host "Working tree is dirty. Creating stash: $stashName" -ForegroundColor Yellow
  $stashResult = Invoke-Git -GitArgs @('stash', 'push', '-u', '-m', $stashName)
  if ($stashResult.Code -ne 0) {
    Write-Host 'ERROR: Failed to create stash. Sync aborted.' -ForegroundColor Red
    exit 1
  }
  $stashCreated = $true
}

Write-Host 'Fetching remotes...' -ForegroundColor Yellow
$fetchResult = Invoke-Git -GitArgs @('fetch', '--all', '--prune')
if ($fetchResult.Code -ne 0) {
  Write-Host 'ERROR: fetch failed. Sync aborted.' -ForegroundColor Red
  exit 1
}

$branch = ((Invoke-Git -GitArgs @('rev-parse', '--abbrev-ref', 'HEAD')).Output -join "`n").Trim()
$upstreamResult = Invoke-Git -GitArgs @('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}')
if ($upstreamResult.Code -ne 0) {
  Write-Host "No upstream configured for branch '$branch'." -ForegroundColor Yellow
  Write-Host "Run: .\scripts\git-branch-upstream.ps1"
  if ($stashCreated) {
    Write-Host ''
    Write-Host 'Stash was created. Review before applying:' -ForegroundColor Yellow
    & git stash list
  }
  exit 1
}

$upstream = ($upstreamResult.Output -join "`n").Trim()
$countsRaw = ((Invoke-Git -GitArgs @('rev-list', '--left-right', '--count', "$upstream...HEAD")).Output -join ' ').Trim()

if (-not ($countsRaw -match '^\s*(\d+)\s+(\d+)\s*$')) {
  Write-Host 'ERROR: Could not determine ahead/behind state.' -ForegroundColor Red
  exit 1
}

$behindCount = [int]$matches[1]
$aheadCount = [int]$matches[2]

Write-Host "Branch: $branch"
Write-Host "Upstream: $upstream"
Write-Host "Ahead: $aheadCount  Behind: $behindCount"

if ($behindCount -gt 0 -and $aheadCount -eq 0) {
  Write-Host 'Branch is behind only. Running pull --rebase...' -ForegroundColor Green
  & git pull --rebase
  if ($LASTEXITCODE -ne 0) {
    Write-Host 'ERROR: pull --rebase failed. Resolve manually.' -ForegroundColor Red
    if ($stashCreated) {
      Write-Host 'A pre-sync stash exists. Review it after resolving rebase issues.' -ForegroundColor Yellow
      & git stash list
    }
    exit 1
  }
} elseif ($aheadCount -gt 0 -and $behindCount -eq 0) {
  Write-Host 'Local branch is ahead only. No pull needed.' -ForegroundColor Green
  Write-Host 'Review local commits and push manually when ready.' -ForegroundColor Yellow
} elseif ($aheadCount -gt 0 -and $behindCount -gt 0) {
  Write-Host 'Branches have diverged. Manual review is required.' -ForegroundColor Red
  Write-Host 'No automatic reconciliation was performed.' -ForegroundColor Yellow
  if ($stashCreated) {
    Write-Host ''
    Write-Host 'A pre-sync stash exists. Review before applying:' -ForegroundColor Yellow
    & git stash list
  }
  exit 1
} else {
  Write-Host 'Branch is up to date with upstream.' -ForegroundColor Green
}

if ($stashCreated) {
  Write-Host ''
  Write-Host 'A pre-sync stash was created. Review/apply manually:' -ForegroundColor Yellow
  & git stash list
  Write-Host 'Use: git stash show -p stash@{0}'
  Write-Host 'Use: git stash apply stash@{0}'
}

Write-Host ''
Write-Host 'Safe sync completed without destructive operations.' -ForegroundColor Cyan
