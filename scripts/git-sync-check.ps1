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

Write-Host '=== GIT SYNC CHECK ===' -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"

& git rev-parse --is-inside-work-tree 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'ERROR: This directory is not a git repository.' -ForegroundColor Red
  exit 1
}

$branch = ((Invoke-Git -GitArgs @('rev-parse', '--abbrev-ref', 'HEAD')).Output -join "`n").Trim()
$upstreamResult = Invoke-Git -GitArgs @('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}')
$hasUpstream = $upstreamResult.Code -eq 0
$upstream = if ($hasUpstream) { ($upstreamResult.Output -join "`n").Trim() } else { '(none)' }

Write-Host ''
Write-Host '=== BRANCH / REMOTE INFO ===' -ForegroundColor Yellow
Write-Host "Current branch: $branch"
Write-Host "Upstream: $upstream"
Write-Host 'Remotes:'
& git remote -v

Write-Host ''
Write-Host '=== STATUS (BEFORE FETCH) ===' -ForegroundColor Yellow
& git status --short --branch

Write-Host ''
Write-Host '=== BRANCH TRACKING ===' -ForegroundColor Yellow
& git branch -vv

Write-Host ''
Write-Host '=== FETCH --ALL --PRUNE ===' -ForegroundColor Yellow
& git fetch --all --prune

Write-Host ''
Write-Host '=== STATUS (AFTER FETCH) ===' -ForegroundColor Yellow
& git status --short --branch

Write-Host ''
Write-Host '=== RECENT GRAPH ===' -ForegroundColor Yellow
& git log --oneline --decorate --graph --max-count=15 --all

$dirty = ((Invoke-Git -GitArgs @('status', '--porcelain')).Output | Measure-Object).Count -gt 0
$localAhead = $false
$remoteAhead = $false
$diverged = $false
$aheadCount = 0
$behindCount = 0

if ($hasUpstream) {
  $countsRaw = ((Invoke-Git -GitArgs @('rev-list', '--left-right', '--count', "$upstream...HEAD")).Output -join ' ').Trim()
  if ($countsRaw -match '^\s*(\d+)\s+(\d+)\s*$') {
    $behindCount = [int]$matches[1]
    $aheadCount = [int]$matches[2]
    $localAhead = $aheadCount -gt 0 -and $behindCount -eq 0
    $remoteAhead = $behindCount -gt 0 -and $aheadCount -eq 0
    $diverged = $behindCount -gt 0 -and $aheadCount -gt 0
  }
}

Write-Host ''
Write-Host '=== STATE FLAGS ===' -ForegroundColor Yellow
Write-Host "Working tree dirty: $dirty"
Write-Host "Local ahead: $localAhead"
Write-Host "Remote ahead: $remoteAhead"
Write-Host "Branches diverged: $diverged"
if ($hasUpstream) {
  Write-Host "Ahead commits: $aheadCount"
  Write-Host "Behind commits: $behindCount"
}

Write-Host ''
Write-Host '=== SUMMARY ===' -ForegroundColor Cyan
if (-not $hasUpstream) {
  Write-Host 'No upstream is configured for the current branch. Set upstream before syncing.'
} elseif ($diverged) {
  Write-Host 'Local and remote have diverged. Manual review is required before any rebase or merge.'
} elseif ($localAhead) {
  Write-Host 'Local branch has commits not on remote. No pull needed. Review and push when ready.'
} elseif ($remoteAhead) {
  Write-Host 'Remote branch is ahead. A safe rebase pull can be performed.'
} else {
  Write-Host 'Local and remote are in sync.'
}

if ($dirty) {
  Write-Host 'Working tree has uncommitted changes. Stash or commit before risky sync steps.'
} else {
  Write-Host 'Working tree is clean.'
}
