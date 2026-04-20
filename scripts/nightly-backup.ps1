param(
  [string]$InfraRoot = "C:\dev\infra",
  [string]$BackupRoot = "F:\CACHE\backups",
  [int]$RetentionDays = 14
)

$ErrorActionPreference = "Stop"

function Write-Log {
  param(
    [string]$Message,
    [string]$LogFile
  )
  $line = "[{0}] {1}" -f (Get-Date -Format "yyyy-MM-ddTHH:mm:ssK"), $Message
  $line | Tee-Object -FilePath $LogFile -Append
}

function Get-EnvMap {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    throw ".env not found at $Path"
  }

  $map = @{}
  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if ($line.Length -eq 0) { return }
    if ($line.StartsWith("#")) { return }

    $parts = $line.Split("=", 2)
    if ($parts.Count -eq 2) {
      $map[$parts[0].Trim()] = $parts[1].Trim()
    }
  }
  return $map
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"

$postgresDir = Join-Path $BackupRoot "postgres"
$n8nDir = Join-Path $BackupRoot "n8n"
$logDir = Join-Path $BackupRoot "logs"

New-Item -ItemType Directory -Force -Path $postgresDir | Out-Null
New-Item -ItemType Directory -Force -Path $n8nDir | Out-Null
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$logFile = Join-Path $logDir "nightly-backup-$timestamp.log"
Write-Log "Starting nightly backup run." $logFile

$envFile = Join-Path $InfraRoot "env\.env"
$envMap = Get-EnvMap -Path $envFile

$pgDb = $envMap["POSTGRES_DB"]
$pgUser = $envMap["POSTGRES_USER"]

if (-not $pgDb -or -not $pgUser) {
  throw "POSTGRES_DB or POSTGRES_USER missing from $envFile"
}

docker info *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Docker engine is not reachable."
}

# Postgres dump
$postgresDumpFile = Join-Path $postgresDir "postgres-$pgDb-$timestamp.sql"
$dumpCmd = "docker exec aj-postgres pg_dump -U $pgUser -d $pgDb --clean --if-exists --no-owner --no-privileges"
cmd /c "$dumpCmd > `"$postgresDumpFile`""
if ($LASTEXITCODE -ne 0 -or -not (Test-Path $postgresDumpFile)) {
  throw "Postgres backup failed."
}
Write-Log "Postgres backup written: $postgresDumpFile" $logFile

# n8n workflow and credentials export
$workflowDirName = "workflows-$timestamp"
$credDirName = "credentials-$timestamp"
$workflowOutDir = Join-Path $n8nDir $workflowDirName
$credOutDir = Join-Path $n8nDir $credDirName
New-Item -ItemType Directory -Force -Path $workflowOutDir | Out-Null
New-Item -ItemType Directory -Force -Path $credOutDir | Out-Null

$workflowInContainer = "/tmp/$workflowDirName"
$credInContainer = "/tmp/$credDirName"

docker exec aj-n8n /bin/sh -lc "rm -rf '$workflowInContainer' '$credInContainer' && mkdir -p '$workflowInContainer' '$credInContainer'" *> $null
$workflowExport = docker exec aj-n8n n8n export:workflow --backup --output="$workflowInContainer" 2>&1
if ($LASTEXITCODE -ne 0 -and -not ($workflowExport -match "No workflows found")) {
  throw "n8n workflow export failed. $workflowExport"
}
$credExport = docker exec aj-n8n n8n export:credentials --backup --output="$credInContainer" 2>&1
if ($LASTEXITCODE -ne 0 -and -not ($credExport -match "No credentials found")) {
  throw "n8n credentials export failed. $credExport"
}

docker cp "aj-n8n:$workflowInContainer/." "$workflowOutDir" *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Copying n8n workflow export failed."
}
docker cp "aj-n8n:$credInContainer/." "$credOutDir" *> $null
if ($LASTEXITCODE -ne 0) {
  throw "Copying n8n credentials export failed."
}

docker exec aj-n8n /bin/sh -lc "rm -rf '$workflowInContainer' '$credInContainer'" *> $null
Write-Log "n8n exports written: $workflowOutDir and $credOutDir" $logFile

# Retention
$cutoff = (Get-Date).AddDays(-1 * $RetentionDays)
Get-ChildItem $postgresDir -File | Where-Object { $_.LastWriteTime -lt $cutoff } | Remove-Item -Force -ErrorAction SilentlyContinue
Get-ChildItem $n8nDir -Recurse | Where-Object {
  $_.PSIsContainer -and $_.LastWriteTime -lt $cutoff -and ($_.Name -like "workflows-*" -or $_.Name -like "credentials-*")
} | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
Get-ChildItem $logDir -File | Where-Object { $_.LastWriteTime -lt $cutoff } | Remove-Item -Force -ErrorAction SilentlyContinue
Write-Log "Retention applied for files older than $RetentionDays days." $logFile

Write-Log "Nightly backup run completed successfully." $logFile
