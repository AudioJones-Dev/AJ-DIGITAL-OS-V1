param(
  [switch]$StartStack
)

$ErrorActionPreference = "Stop"

$dirs = @(
  "C:\dev\infra",
  "C:\dev\infra\compose",
  "C:\dev\infra\env",
  "C:\dev\infra\scripts",
  "C:\dev\infra\monitoring",
  "C:\dev\infra\docs",
  "F:\CACHE\docker",
  "F:\CACHE\ollama",
  "F:\CACHE\open-webui",
  "F:\CACHE\postgres",
  "F:\CACHE\redis",
  "F:\CACHE\qdrant",
  "F:\CACHE\n8n",
  "F:\CACHE\grafana",
  "F:\CACHE\prometheus",
  "F:\CACHE\loki",
  "F:\CACHE\backups",
  "F:\CACHE\logs"
)

Write-Host "[1/4] Ensuring base directories..."
foreach ($d in $dirs) {
  New-Item -ItemType Directory -Path $d -Force | Out-Null
}

$envPath = "C:\dev\infra\env\.env"
$envExample = "C:\dev\infra\env\.env.example"

Write-Host "[2/4] Ensuring env file..."
if (-not (Test-Path $envPath)) {
  if (Test-Path $envExample) {
    Copy-Item $envExample $envPath
    Write-Host "Created $envPath from .env.example"
  } else {
    Write-Warning ".env.example not found at $envExample"
  }
}

Write-Host "[3/4] Validating Docker + WSL..."
wsl --list --verbose | Out-Host
docker info | Out-Null
Write-Host "Docker engine is reachable."

if ($StartStack) {
  Write-Host "[4/4] Starting compose stack..."
  Push-Location "C:\dev\infra\compose"
  try {
    docker compose --env-file ../env/.env up -d
    docker ps | Out-Host
  } finally {
    Pop-Location
  }
} else {
  Write-Host "[4/4] Skipped stack start. Run with -StartStack to launch containers."
}

Write-Host "Bootstrap complete."
