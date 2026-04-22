$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host '=== AJ DIGITAL OS: FULL BOOT ===' -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"

Write-Host ''
Write-Host '=== PRECHECK: DOCKER ===' -ForegroundColor Yellow
try {
  docker info 1>$null 2>$null
  if ($LASTEXITCODE -ne 0) {
    throw 'Docker is not responding.'
  }
} catch {
  Write-Host 'ERROR: Docker Desktop is not running or not reachable.' -ForegroundColor Red
  Write-Host 'Start Docker Desktop, wait until it is fully up, then rerun this script.' -ForegroundColor Red
  exit 1
}

Write-Host ''
Write-Host '=== START: docker compose --profile full up -d ===' -ForegroundColor Green
docker compose --profile full up -d
if ($LASTEXITCODE -ne 0) {
  Write-Host 'ERROR: Failed to start full profile stack.' -ForegroundColor Red
  exit 1
}

Write-Host ''
Write-Host '=== STATUS: docker compose ps ===' -ForegroundColor Green
docker compose ps

Write-Host ''
Write-Host '=== URLS ===' -ForegroundColor Cyan
Write-Host 'AJ Digital OS: http://localhost:7420'
Write-Host 'Open WebUI:   http://localhost:3001'
Write-Host 'n8n:          http://localhost:5678'
Write-Host 'Prometheus:   http://localhost:9090'
Write-Host 'Grafana:      http://localhost:3000'
