param(
  [string]$TaskName = "AJDigitalInfraNightlyBackup",
  [string]$RunTime = "02:30"
)

$ErrorActionPreference = "Stop"

$scriptPath = "C:\dev\infra\scripts\nightly-backup.ps1"
if (-not (Test-Path $scriptPath)) {
  throw "Backup script not found at $scriptPath"
}

$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`""

schtasks /Create /TN $TaskName /TR $taskCommand /SC DAILY /ST $RunTime /F | Out-Host
if ($LASTEXITCODE -ne 0) {
  throw "Failed to create scheduled task $TaskName"
}

Write-Host "Scheduled task created: $TaskName at $RunTime daily."
schtasks /Query /TN $TaskName /V /FO LIST | Out-Host
