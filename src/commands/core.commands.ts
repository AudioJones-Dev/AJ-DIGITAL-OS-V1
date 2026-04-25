/**
 * Operating Core — CLI commands.
 *
 * One file per concern would be 12 files of boilerplate. Co-locating them
 * keeps the surface tight while still exposing each as its own class.
 */

import {
  validateStateTransition,
  getAllowedTransitions,
  isTerminalState,
} from "../core/state/run-state-machine.js";
import {
  VALID_RUN_STATE_TRANSITIONS,
  type RunState,
} from "../core/state/run-state-types.js";
import { evaluateActionRisk } from "../core/policy/policy-engine.js";
import {
  listSystemEvents,
  getEventsByRunId,
  getEventsByTenantId,
} from "../core/events/event-ledger.js";
import { replayRunEvents } from "../core/events/event-replay.js";
import {
  listSchemas,
  getSchema,
  exportJsonSchema,
} from "../core/schemas/schema-registry.js";
import {
  checkIdempotency,
} from "../core/idempotency/idempotency-store.js";
import { getMetricSnapshot } from "../core/observability/metrics-store.js";
import type { Environment } from "../core/policy/policy-types.js";
import type { SystemEventCategory } from "../core/events/event-types.js";

interface BaseInput {
  json?: boolean;
}

interface BaseResult {
  ok: boolean;
  error?: string;
}

function emitJson(input: BaseInput, payload: unknown): void {
  if (input.json) console.log(JSON.stringify(payload, null, 2));
}

// ── core-health ─────────────────────────────────────────────────────────

export interface CoreHealthCommandInput extends BaseInput {}
export interface CoreHealthCommandResult extends BaseResult {
  modules: Record<string, string>;
}

export class CoreHealthCommand {
  async run(input: CoreHealthCommandInput): Promise<CoreHealthCommandResult> {
    const modules = {
      state: "v1",
      policy: "v1",
      events: "v1",
      schemas: "v1",
      idempotency: "v1",
      observability: "v1",
      commands: "v1",
    };
    if (input.json) {
      emitJson(input, { ok: true, modules });
    } else {
      console.log("Operating Core — health");
      for (const [k, v] of Object.entries(modules)) console.log(`  ${k.padEnd(15)} ${v}`);
    }
    return { ok: true, modules };
  }
}

// ── state-validate ──────────────────────────────────────────────────────

export interface StateValidateCommandInput extends BaseInput {
  from: string;
  to: string;
  force?: boolean;
}

export interface StateValidateCommandResult extends BaseResult {
  valid: boolean;
  reason?: string;
}

export class StateValidateCommand {
  async run(input: StateValidateCommandInput): Promise<StateValidateCommandResult> {
    const result = validateStateTransition(
      input.from as RunState,
      input.to as RunState,
      input.force ?? false,
    );
    if (input.json) {
      emitJson(input, { ok: result.valid, ...result });
    } else if (result.valid) {
      console.log(`Valid: ${input.from} → ${input.to}${input.force ? " (forced)" : ""}`);
    } else {
      console.log(`Invalid: ${result.reason ?? "unknown"}`);
    }
    const out: StateValidateCommandResult = { ok: result.valid, valid: result.valid };
    if (result.reason !== undefined) out.reason = result.reason;
    return out;
  }
}

// ── state-transitions ───────────────────────────────────────────────────

export interface StateTransitionsCommandInput extends BaseInput {
  state?: string;
}

export interface StateTransitionsCommandResult extends BaseResult {
  transitions: Record<string, string[]>;
}

export class StateTransitionsCommand {
  async run(input: StateTransitionsCommandInput): Promise<StateTransitionsCommandResult> {
    const transitions = input.state
      ? { [input.state]: getAllowedTransitions(input.state as RunState) }
      : (VALID_RUN_STATE_TRANSITIONS as unknown as Record<string, string[]>);
    if (input.json) {
      emitJson(input, { ok: true, transitions });
    } else {
      console.log("Run state transitions");
      console.log("=====================");
      for (const [from, tos] of Object.entries(transitions)) {
        const terminal = isTerminalState(from as RunState) ? " (terminal)" : "";
        console.log(`  ${from}${terminal}: ${tos.length === 0 ? "—" : tos.join(", ")}`);
      }
    }
    return { ok: true, transitions };
  }
}

// ── policy-evaluate ─────────────────────────────────────────────────────

export interface PolicyEvaluateCommandInput extends BaseInput {
  action: string;
  environment: Environment;
  tenantId?: string;
}

export interface PolicyEvaluateCommandResult extends BaseResult {
  decision: string;
  reason: string;
  risk: string;
}

export class PolicyEvaluateCommand {
  async run(input: PolicyEvaluateCommandInput): Promise<PolicyEvaluateCommandResult> {
    const result = evaluateActionRisk(input.action, input.environment, input.tenantId);
    if (input.json) {
      emitJson(input, { ok: true, ...result });
    } else {
      console.log(`Action:      ${input.action}`);
      console.log(`Environment: ${input.environment}`);
      if (input.tenantId) console.log(`Tenant:      ${input.tenantId}`);
      console.log(`Decision:    ${result.decision}`);
      console.log(`Reason:      ${result.reason}`);
      console.log(`Risk:        ${result.risk}`);
    }
    return {
      ok: true,
      decision: result.decision,
      reason: result.reason,
      risk: result.risk,
    };
  }
}

// ── events-list ─────────────────────────────────────────────────────────

export interface EventsListCommandInput extends BaseInput {
  category?: string;
  runId?: string;
  tenantId?: string;
  limit?: number;
}

export interface EventsListCommandResult extends BaseResult {
  events: ReturnType<typeof listSystemEvents>;
}

export class EventsListCommand {
  async run(input: EventsListCommandInput): Promise<EventsListCommandResult> {
    const filter: Parameters<typeof listSystemEvents>[0] = {};
    if (input.category) filter.category = input.category as SystemEventCategory;
    if (input.runId) filter.runId = input.runId;
    if (input.tenantId) filter.tenantId = input.tenantId;
    if (input.limit !== undefined) filter.limit = input.limit;
    const events = listSystemEvents(filter);
    if (input.json) {
      emitJson(input, { ok: true, events });
    } else {
      console.log(`System events: ${events.length}`);
      for (const e of events) {
        console.log(`  [${e.timestamp}] ${e.category}/${e.eventType} run=${e.runId ?? "—"}`);
      }
    }
    return { ok: true, events };
  }
}

// ── events-run ──────────────────────────────────────────────────────────

export interface EventsRunCommandInput extends BaseInput {
  runId: string;
}

export interface EventsRunCommandResult extends BaseResult {
  events: ReturnType<typeof getEventsByRunId>;
}

export class EventsRunCommand {
  async run(input: EventsRunCommandInput): Promise<EventsRunCommandResult> {
    const events = getEventsByRunId(input.runId);
    if (input.json) emitJson(input, { ok: true, events });
    else {
      console.log(`Events for run ${input.runId}: ${events.length}`);
      for (const e of events) console.log(`  [${e.timestamp}] ${e.eventType}`);
    }
    return { ok: true, events };
  }
}

// ── events-tenant ───────────────────────────────────────────────────────

export interface EventsTenantCommandInput extends BaseInput {
  tenantId: string;
}

export interface EventsTenantCommandResult extends BaseResult {
  events: ReturnType<typeof getEventsByTenantId>;
}

export class EventsTenantCommand {
  async run(input: EventsTenantCommandInput): Promise<EventsTenantCommandResult> {
    const events = getEventsByTenantId(input.tenantId);
    if (input.json) emitJson(input, { ok: true, events });
    else {
      console.log(`Events for tenant ${input.tenantId}: ${events.length}`);
      for (const e of events) console.log(`  [${e.timestamp}] ${e.category}/${e.eventType}`);
    }
    return { ok: true, events };
  }
}

// ── events-replay ───────────────────────────────────────────────────────

export interface EventsReplayCommandInput extends BaseInput {
  runId: string;
}

export interface EventsReplayCommandResult extends BaseResult {
  events: ReturnType<typeof replayRunEvents>;
}

export class EventsReplayCommand {
  async run(input: EventsReplayCommandInput): Promise<EventsReplayCommandResult> {
    const events = replayRunEvents(input.runId);
    if (input.json) emitJson(input, { ok: true, events });
    else {
      console.log(`Replay for run ${input.runId}: ${events.length} events`);
      for (const e of events) console.log(`  [${e.timestamp}] ${e.eventType}`);
    }
    return { ok: true, events };
  }
}

// ── schemas-list ────────────────────────────────────────────────────────

export interface SchemasListCommandInput extends BaseInput {}
export interface SchemasListCommandResult extends BaseResult {
  schemas: ReturnType<typeof listSchemas>;
}

export class SchemasListCommand {
  async run(input: SchemasListCommandInput): Promise<SchemasListCommandResult> {
    const schemas = listSchemas();
    if (input.json) emitJson(input, { ok: true, schemas });
    else {
      console.log("Registered schemas");
      for (const s of schemas) console.log(`  ${s.name.padEnd(24)} ${s.version}`);
    }
    return { ok: true, schemas };
  }
}

// ── schema-inspect ──────────────────────────────────────────────────────

export interface SchemaInspectCommandInput extends BaseInput {
  name: string;
}

export interface SchemaInspectCommandResult extends BaseResult {
  name: string;
  version?: string;
  jsonSchema?: Record<string, unknown>;
}

export class SchemaInspectCommand {
  async run(input: SchemaInspectCommandInput): Promise<SchemaInspectCommandResult> {
    const reg = getSchema(input.name);
    if (!reg) {
      const error = `Unknown schema: ${input.name}`;
      console.error(error);
      return { ok: false, name: input.name, error };
    }
    const jsonSchema = exportJsonSchema(input.name);
    if (input.json) emitJson(input, { ok: true, name: reg.name, version: reg.version, jsonSchema });
    else {
      console.log(`Schema: ${reg.name} (v${reg.version})`);
      console.log(JSON.stringify(jsonSchema, null, 2));
    }
    return { ok: true, name: reg.name, version: reg.version, jsonSchema };
  }
}

// ── idempotency-check ───────────────────────────────────────────────────

export interface IdempotencyCheckCommandInput extends BaseInput {
  idempotencyKey: string;
  commandHash: string;
}

export interface IdempotencyCheckCommandResult extends BaseResult {
  status: string;
  record?: unknown;
}

export class IdempotencyCheckCommand {
  async run(input: IdempotencyCheckCommandInput): Promise<IdempotencyCheckCommandResult> {
    const result = checkIdempotency(input.idempotencyKey, input.commandHash);
    if (input.json) emitJson(input, { ok: true, ...result });
    else {
      console.log(`Status: ${result.status}`);
      if (result.record) console.log(`Record: ${JSON.stringify(result.record, null, 2)}`);
    }
    const out: IdempotencyCheckCommandResult = { ok: true, status: result.status };
    if (result.record !== undefined) out.record = result.record;
    return out;
  }
}

// ── metrics-snapshot ────────────────────────────────────────────────────

export interface MetricsSnapshotCommandInput extends BaseInput {}
export interface MetricsSnapshotCommandResult extends BaseResult {
  metrics: Record<string, number>;
}

export class MetricsSnapshotCommand {
  async run(input: MetricsSnapshotCommandInput): Promise<MetricsSnapshotCommandResult> {
    const metrics = getMetricSnapshot();
    if (input.json) emitJson(input, { ok: true, metrics });
    else {
      console.log("Operating Core metrics");
      for (const [k, v] of Object.entries(metrics)) console.log(`  ${k.padEnd(40)} ${v}`);
    }
    return { ok: true, metrics };
  }
}
