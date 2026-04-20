# AJ Digital OS Operational Baseline Runbook

## Scope
This runbook defines the minimum repeatable operations baseline for local-first AJ Digital OS infrastructure.

## Prerequisites
- Windows 11 with WSL2 enabled
- Docker Desktop installed and running
- Runtime storage path available at `F:\CACHE`
- Infra repo available at `C:\dev\infra`

## 1) Start/Recover Stack
```powershell
powershell -ExecutionPolicy Bypass -File C:\dev\infra\scripts\bootstrap.ps1 -StartStack
```

Validation:
```powershell
wsl --list --verbose
docker info
docker ps
```

## 2) Provision Monitoring
```powershell
powershell -ExecutionPolicy Bypass -File C:\dev\infra\scripts\provision-monitoring.ps1
```

Validation:
```powershell
Invoke-WebRequest http://localhost:9090/-/healthy
Invoke-RestMethod http://localhost:9090/api/v1/rules
Invoke-RestMethod http://localhost:3001/api/health
```

## 3) Model Baseline
```powershell
powershell -ExecutionPolicy Bypass -File C:\dev\infra\scripts\ollama-bootstrap-models.ps1
docker exec aj-ollama ollama list
```

Expected models:
- `llama3.1`
- `mistral`
- `nomic-embed-text`

## 4) n8n Baseline
Import reference flow:
```powershell
powershell -ExecutionPolicy Bypass -File C:\dev\infra\scripts\n8n-import-reference-flow.ps1
```

Export workflows snapshot:
```powershell
powershell -ExecutionPolicy Bypass -File C:\dev\infra\scripts\n8n-export-workflows.ps1
```

## 5) Backup Baseline
Nightly task:
- Task name: `AJDigitalInfraNightlyBackup`
- Schedule: daily at `02:30 AM` local time
- Script: `C:\dev\infra\scripts\nightly-backup.ps1`

Manual backup run:
```powershell
powershell -ExecutionPolicy Bypass -File C:\dev\infra\scripts\nightly-backup.ps1
```

Backup locations:
- `F:\CACHE\backups\postgres`
- `F:\CACHE\backups\n8n`
- `F:\CACHE\backups\logs`

## 6) Secrets Rotation
1. Update `C:\dev\infra\env\.env`.
2. Sync dependent services:
   - PostgreSQL user password (if changed)
   - n8n encryption key consistency with existing data
   - Grafana admin password reset if needed
3. Restart affected containers:
```powershell
docker compose --env-file C:\dev\infra\env\.env -f C:\dev\infra\compose\docker-compose.yml up -d
```

## 7) Incident Fast Path
1. Check container state:
```powershell
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```
2. Check key endpoints:
```powershell
Invoke-WebRequest http://localhost:3000
Invoke-WebRequest http://localhost:5678
Invoke-WebRequest http://localhost:11434/api/version
Invoke-WebRequest http://localhost:6333/healthz
```
3. Check service logs:
```powershell
docker logs aj-postgres --tail 200
docker logs aj-n8n --tail 200
docker logs aj-prometheus --tail 200
docker logs aj-grafana --tail 200
```

## 8) Current Known Limitation
- Grafana alert contact points and notification policies are not yet configured because destination details (email/Slack/webhook endpoint) were not provided.
