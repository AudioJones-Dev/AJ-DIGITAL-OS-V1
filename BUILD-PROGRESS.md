> **Status: Historical snapshot (2026-04-11).** Preserved as a build-history artifact. Current roadmap lives at [`docs/ROADMAP.md`](docs/ROADMAP.md); current layer coverage at [`docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md`](docs/architecture/AJ_DIGITAL_OS_LAYER_COVERAGE_INDEX.md).

# AJ Digital OS — Build Progress (2026-04-11)

## Branch: `feat/cli-operator-upgrade`
## Latest Commit: `43d2577` — retrieval layer

---

## Completed Layers (all committed, all tests green)

### 1. Browser Agent (`src/browser-agent/`, 14+ files)
- Playwright headless browser automation
- Session capture / reuse / validation / self-healing
- Multi-step workflows, selector-scoped extraction
- Validated against Sanity.io (4/4 fields correct)

### 2. Model Routing (`src/model-routing/`, 6 files) — commit `c6e5d67`
- `routeModelTask()` central dispatcher
- Providers: openai, local (Ollama), deterministic
- Escalation chain + constraint enforcement

### 3. Local Agent (`src/local-agent/`, 6 files) — commit `760e952`
- Allowlist-gated file operations
- Validators, env-tools, task-mapper
- Modes: generate_env, normalize_config, read, write, patch, transform
- 15/15 tests passing

### 4. Ollama Integration (`local-provider.ts`) — commit `0111b36`
- Real HTTP to Ollama at localhost:11434
- Default model: gemma3:1b (815MB)
- gemma3:4b available but OOM on this machine

### 5. Memory Runtime Hooks (`src/memory-runtime/`, 3 files) — commit `913c3fd`
- `beforeRun()` — bootstrap memory before execution
- `afterRun()` — persist run log + working context
- `onFailure()` — record mistakes + failure state
- `CognitiveMemoryStore` — file-based (logs, mistakes, working-context, run-logs)
- 23/23 tests passing

### 6. Retrieval Layer (`retrieval.ts` + `retrieval-policy.ts`) — commit `43d2577`
- Priority: working_context > last_run > last_failure > recent_logs
- Per-slot char budgets (12K total / 4 slots = 3K each)
- Bounded logs (max 3)
- Structured `RetrievedContext` with `lastRun`/`lastFailure`
- `beforeRun` rewired to use retrieval instead of raw reads
- 39/39 tests passing

---

## After Restart — Pickup Tasks

### Open WebUI (Docker)
Docker pull was in progress for `ghcr.io/open-webui/open-webui:main`.
After restart, check if the image exists and run:
```powershell
# Check if image was pulled
docker images | Select-String "open-webui"

# If not, re-pull and run:
docker run -d -p 3000:8080 --add-host=host.docker.internal:host-gateway -e OLLAMA_BASE_URL=http://host.docker.internal:11434 -v open-webui:/app/backend/data --name open-webui ghcr.io/open-webui/open-webui:main

# Access at: http://localhost:3000
```

### Obsidian
Installer was launched: `C:\Users\tyron.AUDIOJONES\Downloads\Obsidian-1.12.7.exe`
May need to complete setup after restart.

### Ollama
Not in PATH. Start manually:
```powershell
Start-Process "C:\Users\tyron.AUDIOJONES\AppData\Local\Programs\Ollama\ollama.exe" -ArgumentList "serve"
```

---

## Run Tests
```powershell
cd C:\dev\AJ-DIGITAL-OS
npm run build
node --import ./dist/env.js dist/scripts/test-memory-runtime.js   # 39/39
node --import ./dist/env.js dist/scripts/test-agent-modes.js       # 15/15
```

## Architecture Layers Remaining
- [ ] Prompt injection layer (structured prompt building from retrieved memory)
- [ ] Workflow orchestrator (higher-level job scheduling)
- [ ] Distribution / deployment layer
