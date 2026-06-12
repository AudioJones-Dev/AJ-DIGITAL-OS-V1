# Follow-up: Ollama Host Reachability from aj-digital-os Container

**Status:** Open — not yet investigated  
**Priority:** Low (non-blocking; preload failure is caught and logged gracefully)  
**Discovered:** 2026-05-23 during scheduler overflow fix closeout  
**Related fix:** `fix(hermes): prevent scheduler timer overflow` (separate commit)

---

## Symptom

At container startup, the following error appears in `docker logs aj-digital-os`:

```
[BOOT] Model preload failed latencyMs=115 TypeError: fetch failed
  [cause]: Error: connect ECONNREFUSED 192.168.65.254:11434
    errno: -111, code: 'ECONNREFUSED', syscall: 'connect'
    address: 192.168.65.254, port: 11434
```

The IP `192.168.65.254` is the Docker Desktop host gateway (the Windows host as seen from inside a Linux container on WSL2/Docker Desktop). Port `11434` is the default Ollama listen port.

## Root Cause (suspected)

Ollama is running on the Windows host (or in WSL2) but is **not** binding to `0.0.0.0`. It likely binds only to `127.0.0.1`, making it unreachable from inside the Docker network even via the host gateway address.

## Impact

- Model preload at startup fails silently — the container continues to start normally.
- Any feature that calls Ollama synchronously at runtime will also fail until this is resolved.
- **Does not cause CPU/RAM regression** — this is purely a connectivity gap.

## Suggested Investigation Steps

1. On the Windows host, confirm Ollama is running and its bound address:
   ```powershell
   netstat -ano | Select-String ":11434"
   ```
2. If bound only to `127.0.0.1`, set the environment variable before launching Ollama:
   ```powershell
   $env:OLLAMA_HOST = "0.0.0.0"
   ollama serve
   ```
   Or add `OLLAMA_HOST=0.0.0.0` to the Ollama service/startup configuration.
3. Inside the running container, verify reachability after the change:
   ```bash
   docker exec aj-digital-os wget -qO- http://192.168.65.254:11434/api/tags
   ```
4. Alternatively, consider running Ollama as a Docker service on `aj-os-net` so it is reachable by service name rather than host gateway IP.

## Do NOT Bundle With Scheduler Fix

This issue is **independent** of the 32-bit timer overflow bug. Keep them in separate commits and separate investigations to maintain a clean audit trail.
