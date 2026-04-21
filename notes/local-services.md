# Local Services

## OpenClaw
Install (PowerShell):
```powershell
iwr -useb https://openclaw.ai/install.ps1 | iex
```

Bootstrap:
```powershell
openclaw onboard --install-daemon
openclaw gateway status
openclaw dashboard
```

Default local UI:
- http://127.0.0.1:18789

## Hermes
Dashboard:
```powershell
hermes dashboard
```

Expected dashboard:
- http://127.0.0.1:9119

API server settings example:
```text
API_SERVER_ENABLED=true
API_SERVER_KEY=your-secret-key
API_SERVER_PORT=8642
API_SERVER_HOST=127.0.0.1
```

Run gateway:
```powershell
hermes gateway
```

Expected API URL:
- http://127.0.0.1:8642/v1

## LM Studio
- Start local server from Developer tab
- Or run:
```powershell
lms server start
```

## Ollama
```powershell
ollama serve
```

Runtime:
- http://127.0.0.1:11434
