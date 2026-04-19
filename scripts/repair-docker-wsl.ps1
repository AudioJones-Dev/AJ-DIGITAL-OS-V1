param(
  [string]$DockerWslTarget = "F:\CACHE\docker"
)

$ErrorActionPreference = "Stop"
$dockerWslLink = Join-Path $env:LOCALAPPDATA "Docker\wsl"

Write-Host "Step 1: Ensure Docker WSL target path exists"
New-Item -ItemType Directory -Path $DockerWslTarget -Force | Out-Null
Write-Host "OK: $DockerWslTarget"

Write-Host "Step 2: Stop WSL and Docker Desktop processes"
wsl --shutdown
$dockerProcs = @(
  "Docker Desktop",
  "com.docker.backend",
  "com.docker.build",
  "docker-agent",
  "docker-sandbox"
)
foreach ($p in $dockerProcs) {
  Get-Process -Name $p -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
}
Write-Host "OK: WSL and Docker processes stopped"

Write-Host "Step 2b: Detect broken WSL distro BasePath entries"
$lxssRoot = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss"
if (Test-Path $lxssRoot) {
  $broken = @()
  Get-ChildItem $lxssRoot | ForEach-Object {
    $item = Get-ItemProperty $_.PSPath
    if ($item.BasePath -and -not (Test-Path $item.BasePath)) {
      $broken += [PSCustomObject]@{
        Distribution = $item.DistributionName
        BasePath     = $item.BasePath
      }
    }
  }
  if ($broken.Count -gt 0) {
    Write-Warning "These WSL distros have missing BasePath locations:"
    $broken | Format-Table -AutoSize | Out-Host
    Write-Warning "They may fail to start until re-imported or registry paths are corrected."
  } else {
    Write-Host "No broken WSL BasePath entries detected."
  }
}

Write-Host "Step 3: Recreate Docker WSL junction"
if (Test-Path $dockerWslLink) {
  Remove-Item -LiteralPath $dockerWslLink -Force -Recurse -ErrorAction SilentlyContinue
  Start-Sleep -Milliseconds 300
  if (Test-Path $dockerWslLink) {
    throw "Failed to remove existing Docker WSL link at $dockerWslLink"
  }
}
New-Item $dockerWslLink -ItemType Junction -Target $DockerWslTarget | Out-Null
Write-Host "OK: $dockerWslLink -> $DockerWslTarget"

Write-Host "Step 4: Restart Docker Desktop"
Start-Process "C:\Program Files\Docker\Docker\Docker Desktop.exe"
Start-Sleep -Seconds 12

Write-Host "Step 4b: Set default WSL distro to docker-desktop"
wsl --set-default docker-desktop | Out-Host

Write-Host "Step 5: Validate"
wsl --list --verbose | Out-Host
docker info | Out-Host
docker ps | Out-Host

Write-Host "Repair sequence complete."
