# Communications Intelligence Layer Spec

## Status

- Stage: PRD and architecture specification
- Runtime implementation: not started
- Intended repo: `C:\dev\AJ-DIGITAL-OS`
- Primary surface: Agent OS dashboard communications panel
- Target schedule: daily processing at 11:30 PM local time

## Problem

Important business context is currently split across email, phone calls, SMS, DMs, and AI chat sessions. That creates several operational problems:

- Follow-ups and promises can be missed.
- Strategic context from ideation chats is not reliably captured into long-term memory.
- CRM records do not reflect the real relationship timeline.
- Call transcripts, SMS threads, DMs, and email threads are not normalized into a shared schema.
- Daily communications are not prioritized in one operator-facing digest.
- Raw messages and synthesized summaries are not separated cleanly for audit, privacy, and retrieval.

## Desired Outcome

AJ Digital OS should provide a Communications Intelligence layer that:

- Captures raw communication data from approved channels.
- Stores raw data immutably with source references and deduplication keys.
- Synthesizes communications into structured summaries, priorities, next actions, and CRM notes.
- Links messages and summaries to contacts, leads, accounts, projects, and knowledge records.
- Writes approved summaries to the Obsidian vault and CRM.
- Presents a priority-ranked daily communications digest in the Agent OS dashboard.
- Runs automatically every day at 11:30 PM, with manual re-run and backfill support.

## Success Criteria

The first production-ready version is successful when:

- Every ingested record has a raw source reference, source channel, timestamp, and content hash.
- Every synthesized summary can be traced back to raw event IDs.
- Contacts and accounts receive CRM notes with who, what, date, channel, priority, and next action.
- Obsidian receives clean Markdown summaries without raw secrets, hidden prompts, or unnecessary personal data.
- The dashboard shows a daily ranked digest from highest to lowest priority.
- Duplicate source messages do not create duplicate CRM notes or vault entries.
- Unsafe writes are blocked or review-gated by policy.
- Calls are transcribed only when the provider and consent workflow are approved.

## Scope

In scope:

- Communication source inventory.
- Canonical schema for raw events, messages, threads, participants, summaries, priorities, next actions, consent, and sync jobs.
- Daily ingestion and synthesis pipeline.
- Channel-specific pipeline rules for email, calls, SMS, DMs, chat sessions, and manual imports.
- CRM write model for contact/account notes and tasks.
- Obsidian vault write model for daily digest and profile/account notes.
- Agent OS dashboard communications panel requirements.
- SOPs for daily operations, backfill, review, correction, and escalation.
- Implementation rollout phases.

Out of scope for this spec:

- Live OAuth setup.
- Secret storage implementation.
- Provider-specific API code.
- Production database migration.
- Legal determination of call-recording consent rules.
- Automatic outbound replies.
- Sending messages in the operator's name.
- Scraping platforms that do not provide approved export or API access.

## Constraints

- Raw credentials, refresh tokens, bot tokens, and session cookies must never be stored in config files.
- Raw payloads must not be written directly into CRM by default.
- CRM and vault writes must be idempotent.
- Mutating CRM writes must be policy-gated.
- Raw call recordings and transcripts require explicit consent and retention policy before automation.
- DMs should use official APIs or export workflows first. Browser scraping is a last resort and should be approval-gated.
- The initial implementation should be additive and must not replace existing connector, normalization, retrieval, dashboard, or Hermes architecture.

## Existing Assets To Reuse

- L3 Connector / Driver layer: `src/connectors/`
- L5 Data Normalization layer: `src/normalization/`
- Conversation schemas: `src/schemas/conversation-thread.schema.ts`, `src/schemas/conversation-turn.schema.ts`
- Retrieval layer: `src/retrieval/`
- System event ledger: `src/core/events/`
- Hermes scheduler and status API: `src/hermes/`
- Dashboard shell: `dashboard/`
- Integration and secret boundary docs: `docs/architecture/integrations-and-secrets-spec.md`
- Conversation memory docs: `docs/architecture/conversation-memory-and-context-stitching-spec.md`
- Semantic memory docs: `docs/architecture/semantic-memory-and-retrieval-spec.md`

## Architecture Positioning

The Communications Intelligence layer spans these AJ Digital OS layers:

| Layer | Responsibility |
|---|---|
| L3 Connector / Driver | Pull email, SMS, call, DM, CRM, and chat export data through approved adapters |
| L4 Data Ingestion | Store raw events, validate payloads, dedupe by source and external ID |
| L5 Data Normalization | Convert raw messages into canonical participants, threads, messages, and entity links |
| L6 Memory / Retrieval | Store useful summaries and context for later retrieval |
| L7 Intelligence | Summarize, classify, prioritize, extract next actions, and detect open loops |
| L10 Governance | Gate sensitive ingestion, recording, CRM writes, vault writes, and retention |
| L11 Interface / Shell | Show digest, priorities, review queue, sync status, and source traceability |
| L14 Attribution | Link communication outcomes to leads, revenue, follow-up, and operational clarity |

## Channel Inventory

| Channel | First-pass source | Later source | Notes |
|---|---|---|---|
| Email | Gmail connector | Google Workspace OAuth | Start with read-only daily sync |
| Phone calls | Manual transcript import | Approved call provider API | Recording/transcription requires consent policy |
| SMS | Manual export or provider export | Twilio, OpenPhone, or approved provider | Requires phone/provider decision |
| DMs | Manual export | Official platform APIs | Avoid scraping until policy-approved |
| Chat sessions | Local `data/conversations` and exported chat files | Direct app export hooks if available | High-value ideation memory |
| Meetings | Manual transcript import | Calendar plus meeting recorder | Treat like call transcripts |
| CRM notes | CRM connector read | CRM connector read/write | Used for reconciliation and account context |

## Canonical Data Contracts

### Enums

```ts
export type CommunicationChannel =
  | "email"
  | "phone_call"
  | "sms"
  | "dm"
  | "chat_session"
  | "meeting"
  | "crm_note"
  | "manual_import";

export type CommunicationDirection =
  | "inbound"
  | "outbound"
  | "internal"
  | "unknown";

export type CommunicationSensitivity =
  | "public"
  | "internal"
  | "confidential"
  | "restricted";

export type CommunicationPriorityGrade = "A" | "B" | "C" | "D";

export type CommunicationIntent =
  | "lead"
  | "client_delivery"
  | "follow_up"
  | "support"
  | "billing"
  | "partnership"
  | "ideation"
  | "operations"
  | "personal"
  | "unknown";

export type CommunicationSyncTarget =
  | "crm"
  | "obsidian"
  | "retrieval"
  | "dashboard";
```

### Raw Event

Raw events are immutable source records. They are the audit base and must not be edited after capture.

```ts
export interface CommunicationRawEvent {
  rawEventId: string;
  tenantId?: string;
  sourceId: string;
  channel: CommunicationChannel;
  sourceAccountRef?: string;
  externalEventId?: string;
  externalThreadId?: string;
  externalUrl?: string;
  payloadRef: string;
  payloadHash: string;
  occurredAt: string;
  capturedAt: string;
  sensitivity: CommunicationSensitivity;
  ingestionStatus: "received" | "validated" | "rejected" | "normalized";
  rejectionReason?: string;
  metadata: Record<string, unknown>;
}
```

### Participant

```ts
export interface CommunicationParticipant {
  participantId: string;
  tenantId?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  handle?: string;
  platform?: string;
  normalizedContactId?: string;
  normalizedLeadId?: string;
  accountId?: string;
  confidence: number;
  createdAt: string;
  updatedAt: string;
}
```

### Thread

```ts
export interface CommunicationThread {
  threadId: string;
  tenantId?: string;
  title: string;
  channels: CommunicationChannel[];
  status: "open" | "waiting" | "closed" | "archived";
  primaryParticipantId?: string;
  primaryContactId?: string;
  primaryAccountId?: string;
  priorityGrade: CommunicationPriorityGrade;
  lastMessageAt?: string;
  nextActionId?: string;
  sourceThreadRefs: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}
```

### Message

```ts
export interface CommunicationMessage {
  messageId: string;
  tenantId?: string;
  threadId: string;
  rawEventId: string;
  channel: CommunicationChannel;
  direction: CommunicationDirection;
  senderParticipantId?: string;
  recipientParticipantIds: string[];
  occurredAt: string;
  subject?: string;
  bodyText?: string;
  transcriptText?: string;
  redactedText?: string;
  intent: CommunicationIntent;
  sensitivity: CommunicationSensitivity;
  priorityGrade: CommunicationPriorityGrade;
  requiresResponse: boolean;
  responseDueAt?: string;
  sourceUrl?: string;
  metadata: Record<string, unknown>;
}
```

### Entity Link

Entity links connect communications to CRM, normalized entities, and memory records.

```ts
export interface CommunicationEntityLink {
  linkId: string;
  tenantId?: string;
  sourceType: "thread" | "message" | "summary" | "next_action";
  sourceId: string;
  entityType:
    | "contact"
    | "lead"
    | "account"
    | "tenant"
    | "project"
    | "offer"
    | "knowledge_document"
    | "crm_record";
  entityId: string;
  linkType: "primary" | "mentioned" | "inferred" | "manual";
  confidence: number;
  evidence: string[];
  createdAt: string;
}
```

### Summary

```ts
export interface CommunicationSummary {
  summaryId: string;
  tenantId?: string;
  summaryType: "daily_digest" | "thread" | "call" | "account" | "contact";
  threadId?: string;
  accountId?: string;
  contactId?: string;
  periodStart?: string;
  periodEnd?: string;
  sourceMessageIds: string[];
  sourceRawEventIds: string[];
  title: string;
  bullets: string[];
  decisions: string[];
  openLoops: string[];
  risks: string[];
  priorityGrade: CommunicationPriorityGrade;
  priorityScore: number;
  confidence: number;
  createdAt: string;
  createdBy: "system" | "agent" | "operator";
  metadata: Record<string, unknown>;
}
```

### Next Action

```ts
export interface CommunicationNextAction {
  actionId: string;
  tenantId?: string;
  threadId?: string;
  summaryId?: string;
  accountId?: string;
  contactId?: string;
  title: string;
  description?: string;
  owner: "operator" | "agent" | "unassigned";
  status: "open" | "in_review" | "done" | "dismissed";
  priorityGrade: CommunicationPriorityGrade;
  dueAt?: string;
  sourceMessageIds: string[];
  crmTaskId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Consent Record

```ts
export interface CommunicationConsentRecord {
  consentId: string;
  tenantId?: string;
  participantId?: string;
  accountId?: string;
  channel: CommunicationChannel;
  consentType: "recording" | "transcription" | "archival" | "crm_sync";
  status: "granted" | "denied" | "unknown" | "not_required";
  jurisdiction?: string;
  evidenceRef?: string;
  effectiveAt?: string;
  expiresAt?: string;
  createdAt: string;
}
```

### Sync Job

```ts
export interface CommunicationSyncJob {
  syncJobId: string;
  tenantId?: string;
  target: CommunicationSyncTarget;
  sourceType: "summary" | "next_action" | "thread" | "message";
  sourceId: string;
  targetRef?: string;
  idempotencyKey: string;
  status: "pending" | "in_review" | "synced" | "failed" | "skipped";
  error?: string;
  createdAt: string;
  updatedAt: string;
}
```

## Logical Postgres Storage Model

This is the target DB shape. The first local implementation may use file-backed stores under `runtime/communications/`, but the schema should stay Postgres-compatible.

### Tables

| Table | Purpose |
|---|---|
| `communication_sources` | Registered source accounts and connector references |
| `communication_raw_events` | Immutable raw event audit records |
| `communication_participants` | Person identity candidates from email, phone, handles, CRM, and chat |
| `communication_threads` | Cross-message conversation grouping |
| `communication_messages` | Normalized messages, calls, transcripts, and chat turns |
| `communication_entity_links` | Links to contacts, leads, accounts, offers, projects, and knowledge docs |
| `communication_summaries` | Daily, thread, call, contact, and account summaries |
| `communication_next_actions` | Follow-up tasks and open loops |
| `communication_consent_records` | Consent and recording/transcription permission evidence |
| `communication_sync_jobs` | CRM, vault, retrieval, and dashboard write state |

### Required Indexes

- `communication_raw_events(source_id, external_event_id)` unique when `external_event_id` is present.
- `communication_raw_events(tenant_id, captured_at desc)`.
- `communication_raw_events(ingestion_status, captured_at desc)`.
- `communication_messages(thread_id, occurred_at desc)`.
- `communication_messages(channel, occurred_at desc)`.
- `communication_threads(tenant_id, priority_grade, last_message_at desc)`.
- `communication_participants(email)` where email is not null.
- `communication_participants(phone)` where phone is not null.
- `communication_entity_links(entity_type, entity_id)`.
- `communication_summaries(summary_type, period_start, period_end)`.
- `communication_next_actions(status, priority_grade, due_at)`.
- `communication_sync_jobs(target, status, updated_at desc)`.

### Storage Rules

- Use stable IDs with time-sortable values where possible.
- Index all foreign key columns.
- Prefer composite indexes for dashboard and digest queries.
- Store raw payload bodies by reference when large or sensitive.
- Store redacted text separately from raw payload references.
- Keep summary text traceable to source raw event IDs.

## Priority Framework

Priority grades should be explainable, not opaque.

| Grade | Meaning | Operator expectation |
|---|---|---|
| A | Urgent, revenue-relevant, blocked, deadline-bound, client/prospect risk, or direct action required | Review first, same-day or next-morning action |
| B | Important relationship context, follow-up needed, promising opportunity, active project context | Review within 1 to 3 days |
| C | Useful reference, idea, light update, no immediate action | Store and make retrievable |
| D | Low-value, duplicate, FYI, spam-like, no action | Archive or skip synthesis |

### Score Components

| Component | Range | Signals |
|---|---:|---|
| Urgency | 0-25 | deadlines, blocked work, direct requests, time-sensitive wording |
| Revenue relevance | 0-25 | prospects, proposals, invoices, conversion, retention, referrals |
| Relationship importance | 0-20 | client, hot lead, partner, internal operator priority |
| Risk | 0-15 | dissatisfaction, confusion, legal/finance/security, missed promise |
| Action clarity | 0-15 | clear next step, owner, due date, requested reply |

Grade mapping:

- A: 80-100
- B: 60-79
- C: 35-59
- D: 0-34

Each score must store both `priorityScore` and `priorityRationale`.

## Synthesis Framework

Every synthesized record should answer:

- Who was involved?
- What happened?
- When did it happen?
- Which channel did it come from?
- What business context does it relate to?
- What decision, request, promise, or open loop was created?
- What is the priority grade and why?
- What should happen next?
- Where was it written: CRM, vault, retrieval, dashboard, or review queue?

### Summary Bullet Rules

- Use bullets for facts and actions, not vague sentiment.
- Keep each bullet tied to a source message or thread.
- Separate decisions from next actions.
- Flag uncertain identity matches.
- Flag missing contact/account links.
- Never include raw credentials, auth tokens, or hidden prompts.
- Prefer concise, operator-readable language.

## Daily Pipeline

Hermes schedule target:

```ts
{
  id: "communications-digest-daily",
  name: "Communications Digest - Daily",
  cron: "every day 23:30",
  enabled: false,
  mission: {
    mission_type: "extract_normalize_store",
    objective: "Pull, normalize, synthesize, and route daily communications",
    input: {
      scope: "all_enabled_communication_sources",
      lookback_hours: 24,
      write_crm: "review_gated",
      write_vault: true
    },
    priority: "high"
  }
}
```

### Pipeline Stages

1. **Source sync**
   - Read each enabled communications connector.
   - Use cursor-based sync where possible.
   - Capture source account, external ID, thread ID, timestamp, and payload hash.

2. **Raw archive**
   - Write raw event record before synthesis.
   - Store payload body or payload reference.
   - Compute idempotency key.

3. **Validation**
   - Validate required fields.
   - Reject malformed records.
   - Classify sensitivity.
   - Check consent requirements for calls and transcriptions.

4. **Deduplication**
   - Match by source ID plus external event ID.
   - Fallback to payload hash and timestamp window.
   - Do not re-create summaries or CRM notes for duplicate records.

5. **Transcription**
   - Calls enter this stage only if consent and provider policy are approved.
   - Store transcript as raw or restricted event.
   - Create a redacted text variant for synthesis.

6. **Normalization**
   - Create participants, messages, and threads.
   - Attach source message IDs.
   - Map emails, phone numbers, handles, and names to candidate contacts.

7. **Entity resolution**
   - Match to normalized contacts, leads, accounts, projects, and CRM records.
   - Store confidence and evidence.
   - Route low-confidence matches to review.

8. **Synthesis**
   - Summarize per thread and per day.
   - Extract open loops, decisions, commitments, and next actions.
   - Score priority and store rationale.

9. **Routing**
   - Write approved summaries to Obsidian.
   - Write approved notes and tasks to CRM.
   - Ingest retrieval-safe summaries into memory.
   - Materialize dashboard digest.

10. **Observability**
   - Emit system events.
   - Emit attribution events for meaningful business outcomes.
   - Store sync job status and errors.

## Channel-Specific Pipelines

### Email

Recommended first pass:

- Gmail read-only sync.
- Pull messages changed since last cursor.
- Capture thread ID, message ID, sender, recipients, subject, body text, labels, and attachments metadata.
- Do not ingest full attachments by default.
- Summarize full threads, not isolated messages, when thread context is available.

### Phone Calls

Recommended first pass:

- Manual transcript import.
- Later: approved provider API for recordings and transcripts.
- Store call metadata: caller, callee, start time, duration, recording ref, transcript ref.
- Do not process recordings until consent policy is active.
- Create call summary with decisions, objections, follow-ups, and CRM note.

### SMS

Recommended first pass:

- Provider export or manual import.
- Later: Twilio, OpenPhone, or selected provider connector.
- Thread by phone number pair and provider conversation ID.
- Preserve timestamps and direction.
- Detect direct asks, booking intent, urgent follow-up, and missed-response risk.

### DMs

Recommended first pass:

- Manual export from each platform.
- Later: official platform APIs where available.
- No browser scraping without separate approval.
- Normalize handles to participant records with platform tags.
- Keep identity confidence lower unless email, phone, or CRM match exists.

### Chat Sessions

Recommended first pass:

- Ingest local AJ Digital OS conversation records from `data/conversations/`.
- Add manual export import for ChatGPT, Claude, Codex, and other ideation sessions.
- Classify sessions as ideation, implementation, decision log, client context, or SOP context.
- Store synthesis into retrieval and Obsidian, not CRM by default unless linked to a contact/account.

### Manual Imports

Manual imports should support:

- `.md`
- `.txt`
- `.json`
- `.jsonl`
- `.csv`

Each import must include:

- source channel
- date range
- operator-provided source label
- optional contact/account hint
- sensitivity classification

## CRM Write Model

CRM writes should start review-gated.

### Contact / Account Note Format

```md
Communication Summary

Date: {{occurred_at_or_period}}
Channel: {{channel}}
Participants: {{participants}}
Priority: {{priority_grade}} ({{priority_score}})
Context: {{summary_title}}

Summary:
- {{bullet_1}}
- {{bullet_2}}
- {{bullet_3}}

Decisions:
- {{decision}}

Open Loops:
- {{open_loop}}

Next Action:
- {{owner}}: {{action}} by {{due_at}}

Source:
- AJ Digital OS communication summary {{summary_id}}
```

### CRM Task Rules

Create a CRM task when:

- priority is A or B and `requiresResponse` is true
- a due date is detected
- the summary includes a direct ask
- the thread is linked to an active lead, proposal, or client delivery item

Do not create a CRM task when:

- priority is C or D
- identity match confidence is below the review threshold
- sensitivity is restricted
- the content is an internal ideation-only chat

## Obsidian Vault Write Model

Target folder structure:

```txt
Communications/
  Daily Digests/
    YYYY-MM-DD Communications Digest.md
  Calls/
    YYYY-MM-DD - Participant or Account - Call Summary.md
  People/
    Person Name - Communication Log.md
  Accounts/
    Account Name - Communication Timeline.md
  Chat Sessions/
    YYYY-MM-DD - Topic - Session Summary.md
```

### Daily Digest Template

```md
# Communications Digest - {{date}}

## Priority A

- [ ] {{who}} - {{summary}}
  Channel: {{channel}} | Next: {{next_action}} | Source: {{summary_id}}

## Priority B

- [ ] {{who}} - {{summary}}
  Channel: {{channel}} | Next: {{next_action}} | Source: {{summary_id}}

## Priority C

- {{who}} - {{summary}}

## Archived / Low Signal

- {{count}} low-priority or duplicate items archived.

## Open Loops

- {{owner}} - {{action}} - {{due_date}}

## CRM Sync

- Synced: {{synced_count}}
- Review needed: {{review_count}}
- Failed: {{failed_count}}
```

### Vault Rules

- Vault notes should contain synthesized summaries, not uncontrolled raw payloads.
- Sensitive or restricted content should be replaced with a redaction notice.
- Every vault note should include source summary IDs.
- Person and account notes should append new dated entries, not overwrite prior context.
- Chat ideation summaries should preserve decisions, frameworks, naming, and open questions.

## Dashboard Requirements

Add an Agent OS dashboard Communications panel.

### Main Board Digest

Show:

- Today's priority count by A/B/C/D.
- Highest-priority communications list.
- Bullet digest grouped by priority.
- Open loops and next actions.
- CRM sync status.
- Vault sync status.
- Unmatched participants needing review.
- Failed connector or sync jobs.

### List Columns

| Column | Description |
|---|---|
| Priority | A/B/C/D grade |
| Channel | Email, call, SMS, DM, chat |
| Who | Participant/contact/account |
| Context | Summary title or thread topic |
| Next action | Required action and due date |
| Source time | Most recent message timestamp |
| Status | Open, waiting, synced, review needed |

### Drilldown View

Each item should show:

- Summary bullets.
- Decisions.
- Open loops.
- Source messages count.
- Linked contact/account.
- CRM note status.
- Vault note status.
- Priority rationale.
- Confidence warnings.

## SOPs

### SOP 1: Daily Communications Review

1. Open the Communications dashboard panel each morning.
2. Review all A priority items first.
3. Confirm or edit suggested next actions.
4. Approve CRM notes and tasks.
5. Check unmatched participants.
6. Confirm Obsidian digest was written.
7. Mark reviewed digest complete.

### SOP 2: Manual Transcript Import

1. Save transcript as `.txt` or `.md`.
2. Add source label, date, participants, and channel.
3. Mark sensitivity.
4. Run manual import.
5. Review identity matches.
6. Approve summary.
7. Approve CRM/vault sync.

### SOP 3: Incorrect Contact Or Account Link

1. Open the communication drilldown.
2. Mark the link as incorrect.
3. Select the correct contact/account.
4. Re-run entity resolution for that thread.
5. Regenerate summary only if the account context changed.
6. Re-sync CRM note only after review.

### SOP 4: Sensitive Or Restricted Content

1. Confirm sensitivity classification.
2. Block CRM write by default.
3. Write only redacted vault summary if needed.
4. Store raw payload in restricted storage only.
5. Add retention review flag.

### SOP 5: Backfill

1. Choose source and date range.
2. Run dry-run import.
3. Review estimated count, duplicate count, and sensitivity flags.
4. Approve import.
5. Run synthesis in batches.
6. Review CRM/vault sync queue before writes.

### SOP 6: Failed Daily Job

1. Check dashboard failed jobs.
2. Inspect connector errors.
3. Re-run the failed source only.
4. Do not re-run CRM writes unless idempotency keys are confirmed.
5. Escalate auth failures to operator setup.

## Review Gates

The following require explicit operator approval before implementation:

- Production CRM write access.
- Phone call recording and transcription.
- SMS provider connection.
- DM platform connection.
- Browser-based extraction.
- Secret storage or OAuth setup.
- Backfill larger than 30 days.
- Automatic outbound replies.
- Any workflow that sends communication in the operator's name.

## Proposed Implementation Files

Future implementation should be additive.

```txt
src/communications/
  communication-types.ts
  communication-store.ts
  communication-ingestor.ts
  communication-normalizer.ts
  communication-identity-resolver.ts
  communication-synthesizer.ts
  communication-priority-scorer.ts
  communication-crm-sync.ts
  communication-vault-writer.ts
  communication-digest.ts
  index.ts

src/commands/
  communications-import.command.ts
  communications-digest.command.ts
  communications-review.command.ts

src/hermes/missions/
  communications-digest-daily.ts

dashboard/app/communications/
  page.tsx

tests/communications/
  communication-normalizer.test.ts
  communication-priority-scorer.test.ts
  communication-digest.test.ts
  communication-sync-idempotency.test.ts

runtime/communications/
  raw-events.json
  participants.json
  threads.json
  messages.json
  summaries.json
  next-actions.json
  sync-jobs.json
  communications-audit.jsonl
```

## Rollout Plan

### Phase 0: Decisions And Policy

- Confirm CRM.
- Confirm phone/SMS provider.
- Confirm Obsidian vault path.
- Confirm retention and consent rules.
- Confirm whether CRM writes are review-gated or automatic.

### Phase 1: Local Schema And Manual Import

- Add TypeScript contracts.
- Add file-backed store.
- Add manual import for `.md`, `.txt`, `.json`, `.jsonl`, and `.csv`.
- Add priority scorer tests.
- Add digest command.

### Phase 2: Chat Sessions And Gmail

- Ingest local conversation memory.
- Add Gmail read-only connector path.
- Create daily summary and dashboard endpoint.
- Write Obsidian digest in review-gated mode.

### Phase 3: CRM Review Queue

- Add CRM note/task sync jobs.
- Add review queue.
- Add idempotent CRM write behavior.
- Keep automatic writes disabled until approved.

### Phase 4: Calls And SMS

- Add selected provider adapter.
- Add transcription import.
- Add consent checks.
- Add call and SMS-specific summary templates.

### Phase 5: DMs And Cross-Channel Identity

- Add official export/API import per platform.
- Improve participant resolution across email, phone, handle, and CRM.
- Add unmatched participant dashboard queue.

### Phase 6: Real-Time Alerts

- Keep nightly digest as the default.
- Add immediate alerts only for A priority events after scoring is proven.

## Open Questions

1. Which CRM is the system of record?
2. Which phone/SMS provider owns call logs and transcripts?
3. What is the exact Obsidian vault path?
4. Should CRM notes/tasks be review-gated indefinitely or only during rollout?
5. Which DM platforms matter first?
6. What retention period should apply to raw payloads, transcripts, and summaries?
7. Should personal/non-business messages be skipped, redacted, or summarized into private memory?
8. What accounts, clients, and offers should be treated as high-priority by default?
9. Should the 11:30 PM digest cover calendar day, last 24 hours, or business-day window?

## Acceptance Test Checklist

- Raw event deduplication prevents duplicate records.
- Priority scorer returns expected A/B/C/D grades from fixtures.
- Entity resolution stores confidence and evidence.
- Restricted content blocks CRM sync.
- CRM sync jobs are idempotent.
- Vault writer appends without overwriting prior notes.
- Daily digest groups items by priority.
- Hermes schedule definition can represent `every day 23:30`.
- Dashboard API returns digest, next actions, unmatched participants, and sync errors.
- System events are emitted for ingestion, synthesis, sync success, and sync failure.

## Recommended Immediate Next Step

Do not implement live connectors first.

The next safest build step is Phase 1: local schema, file-backed store, manual import, priority scoring, and a CLI digest command. That proves the framework using controlled transcripts and exported chats before any live OAuth, CRM write, call recording, SMS, or DM integration is introduced.
