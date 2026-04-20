param(
  [string]$FlowPath = "C:\dev\infra\n8n\workflows\aj-reference-flow.json"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $FlowPath)) {
  throw "Flow file not found: $FlowPath"
}

Write-Host "Copying reference workflow JSON into n8n container..."
docker cp $FlowPath aj-n8n:/tmp/aj-reference-flow.json
if ($LASTEXITCODE -ne 0) {
  throw "Failed to copy workflow file into n8n container."
}

Write-Host "Importing workflow into n8n..."
docker exec aj-n8n n8n import:workflow --input=/tmp/aj-reference-flow.json
if ($LASTEXITCODE -ne 0) {
  throw "n8n workflow import failed."
}

Write-Host "Cleaning temporary file in container..."
docker exec -u 0 aj-n8n sh -c "rm -f /tmp/aj-reference-flow.json"
if ($LASTEXITCODE -ne 0) {
  throw "Failed to remove temporary workflow file from n8n container."
}

Write-Host "Import complete."
