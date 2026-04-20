param(
  [switch]$ForceRecreate
)

$ErrorActionPreference = "Stop"

$infraRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$composeFile = Join-Path $infraRoot "compose\docker-compose.yml"
$envFile = Join-Path $infraRoot "env\.env"

Write-Host "[1/4] Starting monitoring services (prometheus, blackbox-exporter, grafana, loki)..."
$upArgs = @(
  "compose",
  "--env-file", $envFile,
  "-f", $composeFile,
  "up",
  "-d"
)
if ($ForceRecreate) {
  $upArgs += "--force-recreate"
}
$upArgs += @("prometheus", "blackbox-exporter", "grafana", "loki")
& docker @upArgs

Write-Host "[2/4] Checking container status..."
docker compose --env-file $envFile -f $composeFile ps

Write-Host "[3/4] Validating Prometheus health and loaded rules..."
$promHealth = Invoke-WebRequest -Uri "http://localhost:9090/-/healthy" -UseBasicParsing
if ($promHealth.StatusCode -ne 200) {
  throw "Prometheus health check failed."
}
$rules = Invoke-RestMethod -Uri "http://localhost:9090/api/v1/rules" -Method Get
$ruleCount = ($rules.data.groups | ForEach-Object { $_.rules.Count } | Measure-Object -Sum).Sum
Write-Host ("Prometheus rules loaded: {0}" -f $ruleCount)

Write-Host "[4/4] Validating Grafana health..."
$grafanaHealth = Invoke-RestMethod -Uri "http://localhost:3001/api/health" -Method Get
Write-Host ("Grafana status: {0}" -f $grafanaHealth.database)

Write-Host "Monitoring provisioning complete."
