# Secret Hygiene

- `.env` must never be committed to git.
- Any API key or credential shown in terminal output should be treated as exposed and rotated.
- Use `.env.example` as the safe template for sharing required variables.
- Keep separate credentials for development and production environments.
- Prefer Docker secrets or a vault-based secret manager as the next hardening step.
- Avoid pasting raw secrets into chat, logs, screenshots, or tickets.
