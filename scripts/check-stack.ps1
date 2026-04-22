param(
  [ValidateSet("workflow","ops","full")]
  [string]$Profile = "workflow"
)

Set-Location 'C:\dev\aj-digital-os'

Write-Host "=== AJ DIGITAL OS: STACK HEALTH CHECK ($Profile) ==="

Write-Host "`n--- docker compose --profile $Profile ps"
docker compose --profile $Profile ps

Write-Host "`n--- docker ps"
docker ps

switch ($Profile) {
  "workflow" {
    $checks = @(
      @{ Name = "AJ Digital OS"; Url = "http://localhost:7420/status" },
      @{ Name = "n8n";          Url = "http://localhost:5678" }
    )
  }
  "ops" {
    $checks = @(
      @{ Name = "Prometheus"; Url = "http://localhost:9090/-/healthy" },
      @{ Name = "Grafana";    Url = "http://localhost:3000/api/health" }
    )
  }
  "full" {
    $checks = @(
      @{ Name = "AJ Digital OS"; Url = "http://localhost:7420/status" },
      @{ Name = "n8n";          Url = "http://localhost:5678" },
      @{ Name = "Prometheus";   Url = "http://localhost:9090/-/healthy" },
      @{ Name = "Grafana";      Url = "http://localhost:3000/api/health" }
    )
  }
}

$failed = $false

foreach ($check in $checks) {
  $attempt = 1
  $ok = $false
  $lastError = ""

  while ($attempt -le 3 -and -not $ok) {
    try {
      $resp = Invoke-WebRequest -Uri $check.Url -UseBasicParsing -TimeoutSec 10
      Write-Host ("PASS  {0} -> {1}" -f $check.Name, $resp.StatusCode)
      $ok = $true
    }
    catch {
      $lastError = $_.Exception.Message
      if ($attempt -lt 3) {
        Start-Sleep -Seconds 2
      }
    }

    $attempt++
  }

  if (-not $ok) {
    Write-Host ("FAIL  {0} -> {1}" -f $check.Name, $lastError)
    $failed = $true
  }
}

if ($failed) {
  exit 1
}

exit 0