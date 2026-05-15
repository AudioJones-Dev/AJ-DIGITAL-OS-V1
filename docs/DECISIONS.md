---

## ADR-0005 — Ollama as the Supported Live Provider for Staging

**Status:** Accepted

### Context

Multiple model providers are scaffolded in code (Ollama, OpenAI, Anthropic, LM Studio). Treating all of them as "supported" makes operator onboarding ambiguous and complicates production validation.

### Decision

For the current internal staging path, Ollama is the only supported live provider. Other providers exist as scaffolds but are not part of the supported live model-backed validation set.

### Consequences

- Staging validation prioritizes Ollama-specific configuration and readiness checks.
- Production envs pin `ACTIVE_MODEL_PROVIDER=ollama` and `ENABLED_MODEL_PROVIDERS=ollama`.
- Other providers can be enabled at operator discretion but operate outside the supported launch path.
- Re-evaluating provider scope is a future ADR, not a runtime decision.

---

## ADR-0006 — Canonical Monitoring Stack: Prometheus + Grafana + Alertmanager + Blackbox

**Status:** Accepted