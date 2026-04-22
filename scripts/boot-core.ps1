Set-Location 'C:\dev\aj-digital-os'

Write-Host "=== AJ DIGITAL OS: BOOT CORE STACK ==="

# Verify Docker is available
docker info 1>$null 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "Docker is not available. Start Docker Desktop and try again."
  exit 1
}

Write-Host "`n=== Starting workflow profile ==="
docker compose --profile workflow up -d postgres redis n8n aj-digital-os
if ($LASTEXITCODE -ne 0) {
  Write-Host "Failed to start core workflow services."
  exit 1
}

Write-Host "`n=== Compose status ==="
docker compose ps

Write-Host "`n=== Core URLs ==="
Write-Host "AJ Digital OS: http://localhost:7420"
Write-Host "n8n:          http://localhost:5678"