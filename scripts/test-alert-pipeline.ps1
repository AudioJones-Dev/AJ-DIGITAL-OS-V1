param(
  [string]$WorkflowId = "f7a6c123-b7d2-4a24-a959-4720c5a8fbbe",
  [int]$WaitSeconds = 14
)

$ErrorActionPreference = "Stop"

Write-Host "[1/4] Verifying Prometheus -> Alertmanager wiring..."
$am = Invoke-RestMethod -Uri "http://localhost:9090/api/v1/alertmanagers" -Method Get
if ($am.status -ne "success" -or $am.data.activeAlertmanagers.Count -lt 1) {
  throw "No active Alertmanager configured in Prometheus."
}

Write-Host "[2/4] Capturing n8n execution count baseline..."
$before = docker exec aj-postgres psql -U ajadmin -d ajdigital -t -A -c "select count(*) from execution_entity;"
if ($LASTEXITCODE -ne 0) {
  throw "Failed reading execution count baseline."
}
$before = [int]$before.Trim()

Write-Host "[3/4] Sending synthetic alert to Alertmanager..."
$alertName = "AJPipelineSmokeTest{0}" -f (Get-Date -Format "HHmmss")
$now = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
$payload = @"
[{"labels":{"alertname":"$alertName","severity":"warning","job":"manual-smoke"},"annotations":{"summary":"alert pipeline smoke test"},"startsAt":"$now"}]
"@
$tmp = Join-Path $env:TEMP "alert-pipeline-test.json"
Set-Content -Path $tmp -Value $payload -Encoding ascii

$code = curl.exe -s -o NUL -w "%{http_code}" -X POST -H "Content-Type: application/json" --data-binary "@$tmp" http://localhost:9093/api/v2/alerts
if ($code -ne "200") {
  throw "Alertmanager did not accept test alert. HTTP code: $code"
}

Write-Host ("Waiting {0}s for delivery..." -f $WaitSeconds)
Start-Sleep -Seconds $WaitSeconds

Write-Host "[4/4] Checking delivery result..."
$after = docker exec aj-postgres psql -U ajadmin -d ajdigital -t -A -c "select count(*) from execution_entity;"
if ($LASTEXITCODE -ne 0) {
  throw "Failed reading execution count after test."
}
$after = [int]$after.Trim()

if ($after -le $before) {
  throw "Pipeline test failed: n8n execution count did not increase (before=$before, after=$after)."
}

Write-Host ("PASS: alert pipeline delivered (before={0}, after={1}, +{2})" -f $before, $after, ($after - $before))
