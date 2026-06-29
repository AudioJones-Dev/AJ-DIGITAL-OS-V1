# Firecrawl Onboarding (AJ Digital OS)

**Status:** Active — onboarding setup landed on `claude/firecrawl-onboarding-setup-pwmr3w`.
**Scope:** Live web data (search, scrape, crawl, interact) for research, SEO, and lead-gen workflows.
**Date:** 2026-06-29

Firecrawl gives the OS fast, clean web context: search the web, scrape known
URLs into markdown, crawl docs, and interact with live pages when plain
extraction is not enough. It feeds the existing research-style skills
(`seo-research`, `lead-gen`, `blog-authority`, `transcript-to-content`) and the
new `firecrawl` skill (`skills/firecrawl.skill.md`).

## 1. Credentials

`FIRECRAWL_API_KEY` is managed in **Doppler** (project `aj-digital-os`, config
`dev` — see `doppler.yaml`), per `docs/security/remote-secret-operations.md`.
Do not commit it, and do not keep it in a file-backed `.env` for shared/remote
use. `.env` (gitignored) is only acceptable for explicitly-approved local-only
runs.

Set it in Doppler (interactive prompt keeps the value out of shell history):

```bash
doppler secrets set FIRECRAWL_API_KEY --project aj-digital-os --config dev
# verify by name only — never print the value:
doppler secrets --only-names --project aj-digital-os --config dev
```

Run the app with Doppler-injected env so the runtime reads the managed secret
rather than a file:

```bash
doppler run -- node --import ./dist/env.js dist/cli.js <command>
```

> **Rotation:** any key pasted into chat/an agent session is treated as exposed
> and must be rotated — revoke it in the Firecrawl dashboard, then `doppler
> secrets set FIRECRAWL_API_KEY` the replacement.

Get a key one of two ways:

- **Dashboard or CLI auth (default):** sign in or create an account at
  https://www.firecrawl.dev/signin and copy a key from the dashboard, or run the
  CLI auth flow below with `--browser`.
- **Keyless free tier (fallback):** no key required for `scrape`, `search`, and
  `interact` at lower rate limits. `crawl`, `map`, and `agent` still need a key.

## 2. Install (optional — CLI + skills)

The Firecrawl CLI and skill bundle install into the local, gitignored skill
cache. They are agent-session tooling, not shipped repo source:

```bash
npx -y firecrawl-cli@latest init --all --browser
```

Verify the install:

```bash
mkdir -p .firecrawl
firecrawl --status
firecrawl scrape "https://firecrawl.dev" -o .firecrawl/install-check.md
```

## 3. REST API (no install)

When you do not want the CLI, call the REST API directly. This is also how the
onboarding key was smoke-tested for this repo.

- **Base URL:** `https://api.firecrawl.dev/v2`
- **Auth header:** `Authorization: Bearer fc-YOUR_API_KEY`

| Endpoint | Purpose |
| -------- | ------- |
| `POST /search` | Discover pages by query, with optional full-page content |
| `POST /scrape` | Extract clean markdown from a single URL |
| `POST /interact` | Browser actions on live pages (clicks, forms, navigation) |
| `POST /crawl` | Bulk extraction across a site (key required) |
| `POST /map` | URL discovery for a site (key required) |

Smoke test:

```bash
curl -sS -X POST https://api.firecrawl.dev/v2/scrape \
  -H "Authorization: Bearer $FIRECRAWL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://firecrawl.dev","formats":["markdown"]}'
```

A healthy response returns `{"success":true,"data":{"markdown":"..."}}`.

## 4. How it fits the OS

- **Skill:** `skills/firecrawl.skill.md` registers Firecrawl as a native skill
  loaded by `SkillLoader` (`src/skills/skill-loader.ts`), the same path as the
  other `*.skill.md` files.
- **Default flow:** search → scrape → interact. Save or cite the source URL for
  every claim so downstream research, SEO, and lead-gen deliverables stay
  traceable.
- **Approval:** the skill is read-only external retrieval, so
  `approvalRequired: false`, consistent with `seo-research`. Tighten this if
  Firecrawl output is wired into an action that needs an approval gate.

## 5. References

- API reference: https://docs.firecrawl.dev
- AI onboarding overview: https://docs.firecrawl.dev/ai-onboarding
- CLI repo: https://github.com/firecrawl/cli
