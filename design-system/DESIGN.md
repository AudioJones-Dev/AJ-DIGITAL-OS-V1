# Audio Jones — Design System

**Design language:** Editorial Intelligence Systems
**Mode:** Dark-first
**Scope:** Canonical source of truth for AJ Digital OS and every tool across the Audio Jones ecosystem.

**Brand thesis:** Apple restraint × Linear product polish × Palantir operational
seriousness, applied to a broadsheet-grade editorial canvas.

> Structure (token architecture, type tiers, component model) was adapted from a
> Firecrawl design-system extraction of a reference site, then fully re-skinned to
> Audio Jones brand values. It is an Audio Jones system, not a clone.

## Files

| File | Purpose |
| ---- | ------- |
| `tokens/audio-jones.tokens.css` | CSS custom properties — the runtime source of truth |
| `tokens/audio-jones.tokens.json` | W3C-style design tokens — for tooling / generators |
| `components/components.css` | Component layer (buttons, cards, sections, native controls, badges) |
| `components/preview.html` | Self-contained visual preview (open in a browser) |

The repo's code theme (`src/ui/design-tokens.ts` → `--ui-*` variables) is kept in
sync with these tokens so the local web shell renders the same brand.

---

## 1. Color

Signal-yellow is **semantic, not decorative.** It marks the single most important
action or state in a view. One primary signal CTA per major section.

| Role | Token | Hex |
| ---- | ----- | --- |
| Signal (primary CTA) | `--aj-signal` | `#E8FF5A` |
| On-signal foreground | `--aj-signal-ink` | `#080808` |
| Data / links / info | `--aj-data` | `#4DACFF` |
| Critical | `--aj-critical` | `#FF4545` |
| Warning | `--aj-warning` | `#FFB340` |
| Success | `--aj-success` | `#3DFFB0` |
| Canvas base | `--aj-base` | `#080808` |
| Surface 1 / 2 / 3 | `--aj-surface-1/2/3` | `#0F0F0F` / `#161616` / `#1E1E1E` |
| Text primary / secondary / muted | `--aj-text*` | `#F2F2F2` / `#A8A8A8` / `#6E6E6E` |
| Border / strong | `--aj-border*` | `#222222` / `#333333` |
| Paper (light-split) / ink | `--aj-paper` / `--aj-ink` | `#F4F1E9` / `#080808` |

---

## 2. Typography

| Role | Family | Token |
| ---- | ------ | ----- |
| Headlines / display | **Syne** | `--aj-font-display` |
| Body / UI | **DM Sans** | `--aj-font-body` |
| Mono / data / labels | **DM Mono** | `--aj-font-mono` |

- Labels and eyebrows are **DM Mono, uppercase, tracked** (`--aj-ls-label`).
- Display headlines use Syne 800 with tight tracking (`--aj-ls-display`).
- Type scale: `label 12 → caption 13 → small 14 → body 16 → lead 18 → subhead 20
  → h4 24 → h3 32 → h2 40 → h1 48 → display 64 → hero 84`.

---

## 3. Core rules (doctrine)

- Dark-first canvas.
- Signal-yellow is semantic, not decorative.
- One primary signal CTA per major section.
- Borders and spacing carry hierarchy.
- **Avoid:** generic AI gradients, playful SaaS styling, excessive glass,
  cyberpunk, blobs, decorative animation.
- Lead-capture critical paths use **native controls** (`.aj-input/.aj-select/
  .aj-textarea`), not shared Button/Select abstractions.

---

## 4. Resolved governance

These close the previously-unresolved decisions. They are decisions, not guesses —
override here and the tokens follow.

### Radius — **brand kit wins (sharper)**
Drift was: external brand kit `4px` vs implementation `10px` buttons / `20px`
cards (and the legacy theme's `18/24px`). Resolution:

| Token | Value | Use |
| ----- | ----- | --- |
| `--aj-radius-none` | `0` | flush / editorial rules |
| `--aj-radius-control` | `4px` | buttons, inputs, selects (**replaces 10px**) |
| `--aj-radius-card` | `8px` | cards, panels (**replaces 18–24px**) |
| `--aj-radius-pill` | `999px` | badges, toggles, avatars only |

Rationale: Palantir operational seriousness + "borders and spacing carry
hierarchy" favor sharper geometry; 4px honors the external brand kit.

### Container width — **standardized**
| Token | Value | Use |
| ----- | ----- | --- |
| `--aj-container-prose` | `680px` | editorial reading column |
| `--aj-container-app` | `1280px` | operating shell |
| `--aj-container-wide` | `1440px` | marketing / broadsheet |
| `--aj-container-gutter` | `24px` | inline gutter |

### Elevation — **surfaces + borders, not shadows**
Dark-first hierarchy comes from surface layering (`base → surface-1/2/3`) and
borders. Shadow (`--aj-elevation-overlay`) is reserved for true overlays (menus,
modals, popovers). No glow, no AI gradient — this retires the legacy
`--ui-shadow-glow` and gradient backgrounds.

### Light-split — **documented**
The editorial "paper" surface (`--aj-paper` on `--aj-ink`) is for long-form
editorial, case studies, and printable reports. Use sparingly; it is the
deliberate inverse moment against the dark canvas, not a theme toggle.

---

## 5. Still open (brand doctrine, not visual)

Carried over from the prior DESIGN.md — these are copy/naming decisions, tracked
here but not blocking the visual system:

- Belief statement + hero copy model.
- Preferred / avoided language list.
- "Founder Intelligence Systems" naming.
- Acceptance checklist for shipped surfaces.

---

## 6. Provenance

- Reference extraction performed with Firecrawl (scrape → theme CSS → tokens).
  See `output/design-systems/` for the raw reference analysis.
- Re-skin date: 2026-06-29.
