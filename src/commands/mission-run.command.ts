import { readFile } from "node:fs/promises";
import { executeMissionFromEnvelope } from "../missions/mission-entry.js";
import type { MissionEnvelope, MissionResultEnvelope } from "../missions/mission-entry-types.js";
import { validateMissionEnvelope } from "../missions/mission-entry-types.js";

// ── Input ──────────────────────────────────────────────────────────

export interface MissionRunCommandInput {
  /** Path to a mission envelope JSON file. */
  file?: string | undefined;
  /** Inline JSON envelope (alternative to file). */
  envelope?: string | undefined;
  /** Output as JSON instead of human-readable. */
  json?: boolean;
}

// ── Result ─────────────────────────────────────────────────────────

export interface MissionRunCommandResult {
  ok: boolean;
  command: "mission-run";
  result: MissionResultEnvelope | null;
  error: string | null;
}

// ── Command ────────────────────────────────────────────────────────

export class MissionRunCommand {
  async run(input: MissionRunCommandInput = {}): Promise<MissionRunCommandResult> {
    // ── Parse envelope ──────────────────────────────────────────
    let envelope: MissionEnvelope;
    try {
      envelope = await resolveEnvelope(input);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (input.json) {
        console.log(JSON.stringify({ ok: false, command: "mission-run", result: null, error: message }));
      } else {
        console.error(`Mission envelope error: ${message}`);
      }
      return { ok: false, command: "mission-run", result: null, error: message };
    }

    // ── Validate ────────────────────────────────────────────────
    const validation = validateMissionEnvelope(envelope);
    if (!validation.valid) {
      const error = `Invalid envelope: ${validation.errors.join("; ")}`;
      if (input.json) {
        console.log(JSON.stringify({ ok: false, command: "mission-run", result: null, error }));
      } else {
        console.error(error);
      }
      return { ok: false, command: "mission-run", result: null, error };
    }

    // ── Execute ─────────────────────────────────────────────────
    const result = await executeMissionFromEnvelope(envelope);

    // ── Output ──────────────────────────────────────────────────
    if (input.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      printHumanReadable(result);
    }

    return { ok: result.ok, command: "mission-run", result, error: result.ok ? null : result.summary };
  }
}

// ── Envelope Resolution ────────────────────────────────────────────

async function resolveEnvelope(input: MissionRunCommandInput): Promise<MissionEnvelope> {
  if (input.file) {
    const content = await readFile(input.file, "utf-8");
    return parseEnvelopeJson(content);
  }
  if (input.envelope) {
    return parseEnvelopeJson(input.envelope);
  }
  throw new Error("Either --file or --envelope is required.");
}

function parseEnvelopeJson(raw: string): MissionEnvelope {
  try {
    return JSON.parse(raw) as MissionEnvelope;
  } catch {
    throw new Error("Failed to parse mission envelope as JSON.");
  }
}

// ── Human-Readable Output ──────────────────────────────────────────

function printHumanReadable(result: MissionResultEnvelope): void {
  const icon = result.ok ? "✅" : "❌";
  console.log(`\n${icon} Mission ${result.mission_id}`);
  console.log(`   Type:     ${result.mission_type}`);
  console.log(`   Status:   ${result.status}`);
  console.log(`   Summary:  ${result.summary}`);
  console.log(`   Duration: ${result.metrics.durationMs}ms`);
  console.log(`   Steps:    ${result.metrics.steps}`);
  console.log(`   Roles:    ${result.metrics.rolesUsed.join(", ") || "none"}`);

  if (result.metrics.escalations > 0) {
    console.log(`   Escalations: ${result.metrics.escalations}`);
  }
  if (result.artifacts.length > 0) {
    console.log(`   Artifacts:`);
    for (const a of result.artifacts) {
      console.log(`     - ${a}`);
    }
  }
  if (result.alerts.length > 0) {
    console.log(`   Alerts:`);
    for (const a of result.alerts) {
      console.log(`     ⚠ ${a}`);
    }
  }
  if (result.failure_ref) {
    console.log(`   Failure ref: ${result.failure_ref}`);
  }
  console.log();
}
