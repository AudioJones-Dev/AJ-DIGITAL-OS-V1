# First Boot Runbook

## Preconditions

1. Docker Desktop is running and healthy.
2. You are in the repo root: `C:\dev\aj-digital-os`.
3. A valid `.env` file exists in the repo root.

## Start Sequence

1. Start core services first:
   - `docker compose --profile workflow up -d postgres redis n8n aj-digital-os`
2. Start the full stack:
   - `docker compose --profile full up -d`

## Validation Commands

1. `docker compose --profile full config`
2. `docker compose ps`
3. `docker ps`

## Health URLs

- AJ Digital OS: http://localhost:7420/status
- n8n: http://localhost:5678
- Prometheus: http://localhost:9090/-/healthy
- Grafana: http://localhost:3000/api/health

## Common Failure Cases

1. Docker not running: Docker Desktop is stopped or still initializing.
2. Missing config mounts: expected files under `monitoring/` are absent or path is wrong.
3. Bad `.env`: missing required variables or malformed values.
4. Port collisions: ports 3000, 3001, 4317, 5678, 7420, 9090 already in use.

## Recovery Steps

1. Stop stack: `docker compose down`
2. Relaunch core: `docker compose --profile workflow up -d postgres redis n8n aj-digital-os`
3. Inspect logs per service: `docker compose logs <service>`
4. Relaunch full stack: `docker compose --profile full up -d`
