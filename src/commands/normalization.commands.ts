/**
 * L5 — Normalization CLI commands.
 */

import { readFileSync } from "node:fs";

import {
  appendNormalizationAudit,
  emitEntityNormalizationFailed,
  emitEntityNormalized,
  getEntity,
  listEntities,
  normalizeAsset,
  normalizeContact,
  normalizeKnowledgeDocument,
  normalizeLead,
  normalizeOffer,
  normalizeTenant,
  normalizeWorkflow,
  saveEntity,
  NORMALIZED_ENTITY_TYPES,
  type NormalizedEntity,
  type NormalizedEntityType,
} from "../normalization/index.js";

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

function isEntityType(value: string): value is NormalizedEntityType {
  return (NORMALIZED_ENTITY_TYPES as readonly string[]).includes(value);
}

function dispatchNormalize(
  entityType: NormalizedEntityType,
  raw: Record<string, unknown>,
): NormalizedEntity {
  switch (entityType) {
    case "tenant":
      return normalizeTenant(raw);
    case "contact":
      return normalizeContact(raw);
    case "lead":
      return normalizeLead(raw);
    case "offer":
      return normalizeOffer(raw);
    case "asset":
      return normalizeAsset(raw);
    case "workflow":
      return normalizeWorkflow(raw);
    case "knowledge_document":
      return normalizeKnowledgeDocument(raw);
  }
}

// ── normalize-entity ────────────────────────────────────────────────────

export interface NormalizeEntityCommandInput extends BaseInput {
  entityType: string;
  data?: string;
  file?: string;
}

export interface NormalizeEntityCommandResult extends BaseResult {
  entityType?: NormalizedEntityType;
  entity?: NormalizedEntity;
}

export class NormalizeEntityCommand {
  async run(input: NormalizeEntityCommandInput): Promise<NormalizeEntityCommandResult> {
    if (!isEntityType(input.entityType)) {
      const error = `Unknown entityType: ${input.entityType}. Allowed: ${NORMALIZED_ENTITY_TYPES.join(", ")}`;
      console.error(error);
      return { ok: false, error };
    }
    const entityType: NormalizedEntityType = input.entityType;

    let raw: Record<string, unknown>;
    try {
      const source = input.data ?? (input.file ? readFileSync(input.file, "utf-8") : undefined);
      if (!source) {
        const error = "normalize-entity requires --data <json> or --file <path>";
        console.error(error);
        return { ok: false, error };
      }
      raw = JSON.parse(source) as Record<string, unknown>;
    } catch (err: unknown) {
      const error = `Failed to parse input: ${err instanceof Error ? err.message : String(err)}`;
      console.error(error);
      return { ok: false, error };
    }

    try {
      const entity = dispatchNormalize(entityType, raw);
      saveEntity(entityType, entity as never);
      appendNormalizationAudit({
        eventType: "entity_normalized",
        entityType,
        entityId: entity.entityId,
        ...(entity.tenantId !== undefined ? { tenantId: entity.tenantId } : {}),
        payload: { schemaVersion: entity.schemaVersion },
      });
      emitEntityNormalized(entityType, entity);
      if (input.json) {
        emitJson(input, { ok: true, entityType, entity });
      } else {
        console.log(`Normalized ${entityType}: ${entity.entityId}`);
        console.log(`Schema version: ${entity.schemaVersion}`);
      }
      return { ok: true, entityType, entity };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Normalization failed";
      appendNormalizationAudit({
        eventType: "entity_normalization_failed",
        entityType,
        payload: { reason: message },
      });
      emitEntityNormalizationFailed(entityType, message);
      console.error(message);
      return { ok: false, error: message };
    }
  }
}

// ── list-entities ───────────────────────────────────────────────────────

export interface ListEntitiesCommandInput extends BaseInput {
  entityType: string;
  tenantId?: string;
  limit?: number;
}

export interface ListEntitiesCommandResult extends BaseResult {
  entityType?: NormalizedEntityType;
  entities?: NormalizedEntity[];
}

export class ListEntitiesCommand {
  async run(input: ListEntitiesCommandInput): Promise<ListEntitiesCommandResult> {
    if (!isEntityType(input.entityType)) {
      const error = `Unknown entityType: ${input.entityType}`;
      console.error(error);
      return { ok: false, error };
    }
    const entityType: NormalizedEntityType = input.entityType;
    const filter: { tenantId?: string; limit?: number } = {};
    if (input.tenantId !== undefined) filter.tenantId = input.tenantId;
    if (input.limit !== undefined) filter.limit = input.limit;
    const entities = listEntities(entityType, filter) as NormalizedEntity[];
    if (input.json) {
      emitJson(input, { ok: true, entityType, entities });
    } else {
      console.log(`Normalized ${entityType} entities: ${entities.length}`);
      for (const e of entities) {
        const tenant = e.tenantId ? ` tenant=${e.tenantId}` : "";
        console.log(`  ${e.entityId}${tenant} (updated ${e.updatedAt})`);
      }
    }
    return { ok: true, entityType, entities };
  }
}

// ── get-entity ──────────────────────────────────────────────────────────

export interface GetEntityCommandInput extends BaseInput {
  entityType: string;
  entityId: string;
}

export interface GetEntityCommandResult extends BaseResult {
  entityType?: NormalizedEntityType;
  entity?: NormalizedEntity;
}

export class GetEntityCommand {
  async run(input: GetEntityCommandInput): Promise<GetEntityCommandResult> {
    if (!isEntityType(input.entityType)) {
      const error = `Unknown entityType: ${input.entityType}`;
      console.error(error);
      return { ok: false, error };
    }
    const entityType: NormalizedEntityType = input.entityType;
    const entity = getEntity(entityType, input.entityId) as NormalizedEntity | undefined;
    if (!entity) {
      const error = `Entity not found: ${entityType}/${input.entityId}`;
      console.error(error);
      return { ok: false, entityType, error };
    }
    if (input.json) {
      emitJson(input, { ok: true, entityType, entity });
    } else {
      console.log(`Entity ${entityType}/${entity.entityId}`);
      console.log(JSON.stringify(entity, null, 2));
    }
    return { ok: true, entityType, entity };
  }
}
