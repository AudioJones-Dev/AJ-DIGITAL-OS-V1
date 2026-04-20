# AJ Digital OS Grafana Dashboard Map

## 1) Runtime Health
- Panel: Container up/down status
- Panel: Restart count by container
- Panel: Container CPU %
- Panel: Container memory usage

## 2) Model Serving (Ollama)
- Panel: Request throughput
- Panel: Avg response latency
- Panel: Error rate
- Panel: Active model inventory

## 2a) Infra Resources
- Panel: Host memory usage %
- Panel: Host root disk usage %
- Panel: Container CPU cores used
- Panel: Container memory working set
- Panel: Container network I/O

## 3) Queue and Workflow (n8n + Redis)
- Panel: n8n executions total
- Panel: n8n failed executions
- Panel: Redis memory usage
- Panel: Redis ops/sec

## 4) Data Layer
- Panel: PostgreSQL connections
- Panel: PostgreSQL cache hit ratio
- Panel: PostgreSQL TPS
- Panel: Qdrant request count
- Panel: Qdrant latency p95

## 5) Logs (Loki)
- Panel: Log volume by service
- Panel: Error logs by service
- Panel: Warning logs by service

## 6) Alert Seeds
- Alert: Any core service down > 2m
- Alert: PostgreSQL unavailable
- Alert: Redis memory > 85%
- Alert: n8n failures spike > baseline
- Alert: Ollama error rate > 5%
- Delivery route: Prometheus -> Alertmanager -> n8n webhook

## Provisioned Baseline (Implemented)
- Datasources: Prometheus (`uid=prometheus`), Loki (`uid=loki`)
- Dashboard provider folder: `AJ Digital OS`
- Starter dashboard file: `monitoring/grafana/dashboards/aj-core-health.json`
- Resource dashboard file: `monitoring/grafana/dashboards/aj-infra-resources.json`
- Prometheus rules file: `monitoring/alerts/core-services.yml`
- Prometheus infra rules file: `monitoring/alerts/infra-resources.yml`
