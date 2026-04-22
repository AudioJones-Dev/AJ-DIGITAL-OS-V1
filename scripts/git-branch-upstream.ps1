param(
  [string]$Branch,
  [string]$Remote = 'origin'
)

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

Write-Host '=== GIT BRANCH UPSTREAM HELPER ===' -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"

& git rev-parse --is-inside-work-tree 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host 'ERROR: This directory is not a git repository.' -ForegroundColor Red
  exit 1
}

if (-not $Branch) {
  $Branch = ((Invoke-Git -GitArgs @('rev-parse', '--abbrev-ref', 'HEAD')).Output -join "`n").Trim()
}

$upstreamResult = Invoke-Git -GitArgs @('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}')
$upstream = if ($upstreamResult.Code -eq 0) { ($upstreamResult.Output -join "`n").Trim() } else { '(none)' }

Write-Host ''
Write-Host "Current branch: $Branch"
Write-Host "Current upstream: $upstream"
Write-Host ''
Write-Host 'Remotes:' -ForegroundColor Yellow
& git remote -v

Write-Host ''
Write-Host 'Example command to set upstream:' -ForegroundColor Yellow
Write-Host "git branch --set-upstream-to=$Remote/$Branch $Branch"

Write-Host ''
Write-Host 'Optional checks before setting upstream:' -ForegroundColor Yellow
Write-Host "git branch -a | findstr /R /C:\"$Remote/$Branch\""
Write-Host 'git branch -vv'
