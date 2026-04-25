/**
 * Operating Core — Command Envelope v1
 *
 * Universal envelope for any command going through the Operating Core
 * executor. Validated against the `CommandEnvelope` schema in the registry.
 */

import { randomUUID } from "node:crypto";

import type { ActorType, Environment } from "../policy/policy-types.js";
import { createIdempotencyKey } from "../idempotency/idempotency-utils.js";

export interface CommandEnvelope<TPayload = Record<string, unknown>> {
  commandId: string;
  idempotencyKey: string;
  commandType: string;
  tenantId?: string;
  actorId: string;
  actorType: ActorType;
  environment: Environment;
  payload: TPayload;
  createdAt: string;
  correlationId?: string;
}

export interface BuildEnvelopeOptions<TPayload> {
  commandType: string;
  payload: TPayload;
  actorId: string;
  actorType: ActorType;
  environment: Environment;
  tenantId?: string;
  idempotencyKey?: string;
  correlationId?: string;
}

export function buildCommandEnvelope<TPayload extends Record<string, unknown>>(
  opts: BuildEnvelopeOptions<TPayload>,
): CommandEnvelope<TPayload> {
  const idempotencyKey =
    opts.idempotencyKey ?? createIdempotencyKey(opts.commandType, opts.payload);
  return {
    commandId: randomUUID(),
    idempotencyKey,
    commandType: opts.commandType,
    actorId: opts.actorId,
    actorType: opts.actorType,
    environment: opts.environment,
    payload: opts.payload,
    createdAt: new Date().toISOString(),
    ...(opts.tenantId !== undefined ? { tenantId: opts.tenantId } : {}),
    ...(opts.correlationId !== undefined ? { correlationId: opts.correlationId } : {}),
  };
}
