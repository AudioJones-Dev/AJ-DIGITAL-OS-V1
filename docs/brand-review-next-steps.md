# Brand Review and Next Steps

## Scope Reviewed
This review is based on the current brand DNA template and schema:
- `src/data/clients/_template/brand-dna.json`
- `src/schemas/brand-dna.schema.ts`

## Brand Snapshot (Current)
The current template signals a strong strategic brand foundation:
- **Positioning:** AI consulting + media systems with a practical operator lens.
- **Value Proposition:** Turning expertise into scalable authority.
- **Differentiation:** Systems thinking, polymath execution, AI+media integration.
- **Voice/Tone:** Clear, direct, strategic; confident and practical.

## Strengths
1. **Clear market orientation** toward founders/operators with execution intent.
2. **Actionable narrative** with a practical promise (authority + scalability).
3. **Built-in writing constraints** that guard against fluff.
4. **CTA clarity** with service-oriented conversion paths.

## Gaps To Address
1. **Proof layer is missing:** no proof statements, outcomes, or credibility markers.
2. **Messaging hierarchy is thin:** no framework for pillar messages by funnel stage.
3. **Audience granularity is broad:** founders/operators/entrepreneurs need segmented pain points.
4. **No objection-handling language:** lacks pre-emptive response to buyer hesitations.
5. **Banned phrases list is empty:** no explicit anti-patterns to protect brand quality.

## Recommended Next Steps

### 1) Build a Brand Messaging Matrix (Week 1)
Create a matrix for each audience segment with:
- pain points
- desired outcomes
- proof points
- message pillars
- CTA by lifecycle stage

**Deliverable:** `docs/brand-messaging-matrix.md`

### 2) Define Proof Assets (Week 1–2)
Document evidence categories:
- quantified outcomes (e.g., time saved, lead quality, revenue lift)
- before/after operating state
- case snapshots
- frameworks/process artifacts

**Deliverable:** `docs/brand-proof-library.md`

### 3) Expand Brand DNA Schema (Week 2)
Add optional fields to make content ops more reliable:
- `proofPoints: string[]`
- `audienceSegments: { segment: string; pains: string[]; outcomes: string[] }[]`
- `messagePillars: string[]`
- `objectionHandling: string[]`
- `contentAngles: string[]`

**Deliverable:** schema extension in `src/schemas/brand-dna.schema.ts` and template update.

### 4) Create Channel-Specific Voice Guides (Week 2)
Translate voice/tone into per-channel rules:
- LinkedIn
- Email newsletter
- Website landing pages
- Short-form video scripts

**Deliverable:** `docs/channel-voice-guidelines.md`

### 5) Launch a 30-Day Content Sprint (Week 3–6)
Publish around three recurring themes:
- authority systems
- AI workflow implementation
- operator playbooks

Cadence recommendation:
- 3 short posts/week
- 1 deep-dive/week
- 1 offer-driven CTA/week

**Deliverable:** `docs/30-day-brand-content-plan.md`

## What To Do Next (Practical Plan)

### Next 48 Hours
1. Pick 2 primary audience segments (example: founder-operator, agency owner).
2. Draft one-page pain/outcome notes per segment.
3. Gather at least 3 proof artifacts (screenshots, metrics, process docs).

### Next 7 Days
1. Complete `docs/brand-messaging-matrix.md` with segment-specific messaging.
2. Complete `docs/brand-proof-library.md` with clear evidence snippets.
3. Draft one LinkedIn post and one email using the new messaging.

### Next 14 Days
1. Extend `src/schemas/brand-dna.schema.ts` with proof and segment fields.
2. Update `src/data/clients/_template/brand-dna.json` to match the expanded schema.
3. Publish the 30-day calendar in `docs/30-day-brand-content-plan.md`.

### First Content Sprint KPI Targets
- 2–3 qualified inbound conversations per week.
- 10%+ save rate on short-form authority posts.
- 2–5% click-through rate on offer-oriented CTA posts.

## Success Criteria
Track brand progress with:
- Content engagement quality (comments/saves/replies, not only impressions)
- Inbound lead fit (operator/founder quality)
- CTA conversion rate by channel
- Sales-call readiness (time spent explaining fundamentals)

## Immediate Priority (Top 3)
1. Build the messaging matrix.
2. Capture and structure proof assets.
3. Update schema/template to operationalize messaging and proof fields.
