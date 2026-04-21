param(
  [string]$OutputRoot = "F:\CACHE\backups\n8n\workflows"
)

$ErrorActionPreference = "Stop"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outputDir = Join-Path $OutputRoot $timestamp
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null

Write-Host ("Exporting n8n workflows to {0}" -f $outputDir)
docker exec aj-n8n n8n export:workflow --backup --output=/home/node/.n8n/exports
if ($LASTEXITCODE -ne 0) {
  throw "n8n workflow export failed."
}

Write-Host "Copying exported files to host backup directory..."
docker cp aj-n8n:/home/node/.n8n/exports/. $outputDir
if ($LASTEXITCODE -ne 0) {
  throw "Failed copying exported n8n workflows to host."
}
docker exec aj-n8n sh -c "rm -rf /home/node/.n8n/exports/*"
if ($LASTEXITCODE -ne 0) {
  throw "Failed cleaning temporary n8n export files in container."
}

Write-Host "Export complete."
