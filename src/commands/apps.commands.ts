/**
 * L12 Application Layer — CLI command surface.
 */

import { createOffer } from "../apps/offer-engine/index.js";
import type {
  CreateOfferInput,
  OfferEngineResult,
} from "../apps/offer-engine/index.js";
import { runDiagnosis } from "../apps/diagnostic-engine/index.js";
import type {
  DiagnosticInput,
  DiagnosticResult,
} from "../apps/diagnostic-engine/index.js";
import {
  createContentBrief,
  publishContent,
} from "../apps/content-engine/index.js";
import type {
  ContentBriefInput,
  ContentBriefResult,
  PublishResult,
} from "../apps/content-engine/index.js";

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

// ── offer-create ───────────────────────────────────────────────────────

export interface OfferCreateCommandInput extends BaseInput, CreateOfferInput {}

export interface OfferCreateCommandResult extends BaseResult {
  result: OfferEngineResult;
}

export class OfferCreateCommand {
  async run(input: OfferCreateCommandInput): Promise<OfferCreateCommandResult> {
    const { json: _json, ...rest } = input;
    const result = await createOffer(rest);
    if (input.json) {
      emitJson(input, { ok: result.ok, result });
    } else {
      console.log(`Offer: ${result.ok ? "created" : "failed"}`);
      console.log(`  governanceStatus: ${result.governanceStatus}`);
      if (result.mapScore !== undefined) {
        console.log(`  mapScore: ${result.mapScore} (${result.decisionBand})`);
      }
      if (result.offer) console.log(`  entityId: ${result.offer.entityId}`);
      for (const r of result.blockedReasons ?? []) console.log(`  blocked: ${r}`);
      for (const w of result.warnings ?? []) console.log(`  warn: ${w}`);
      if (result.error) console.log(`  error: ${result.error}`);
    }
    return {
      ok: result.ok,
      result,
      ...(result.error !== undefined ? { error: result.error } : {}),
    };
  }
}

// ── diagnose ───────────────────────────────────────────────────────────

export interface DiagnoseCommandInput extends BaseInput, DiagnosticInput {}

export interface DiagnoseCommandResult extends BaseResult {
  result: DiagnosticResult;
}

export class DiagnoseCommand {
  async run(input: DiagnoseCommandInput): Promise<DiagnoseCommandResult> {
    const { json: _json, ...rest } = input;
    const result = await runDiagnosis(rest);
    if (input.json) {
      emitJson(input, { ok: result.ok, result });
    } else {
      console.log(`Diagnosis: ${result.ok ? "complete" : "failed"}`);
      console.log(`  constraints: ${result.constraints.length}`);
      console.log(`  recommendations: ${result.recommendations.length}`);
      console.log(`  retrievalContext: ${result.retrievalContext.length}`);
      if (result.retrievalTraceId) console.log(`  traceId: ${result.retrievalTraceId}`);
      for (const rec of result.recommendations) {
        console.log(`  - [${rec.priority}] ${rec.action} (mapScore=${rec.mapScore ?? "n/a"})`);
      }
      if (result.error) console.log(`  error: ${result.error}`);
    }
    return {
      ok: result.ok,
      result,
      ...(result.error !== undefined ? { error: result.error } : {}),
    };
  }
}

// ── content-brief ──────────────────────────────────────────────────────

export interface ContentBriefCommandInput extends BaseInput, ContentBriefInput {}

export interface ContentBriefCommandResult extends BaseResult {
  result: ContentBriefResult;
}

export class ContentBriefCommand {
  async run(input: ContentBriefCommandInput): Promise<ContentBriefCommandResult> {
    const { json: _json, ...rest } = input;
    const result = await createContentBrief(rest);
    if (input.json) {
      emitJson(input, { ok: result.ok, result });
    } else {
      console.log(`Content brief: ${result.ok ? "created" : "failed"}`);
      if (result.briefId) console.log(`  briefId: ${result.briefId}`);
      if (result.dagRunId) console.log(`  dagRunId: ${result.dagRunId}`);
      if (result.governanceStatus) console.log(`  governanceStatus: ${result.governanceStatus}`);
      for (const r of result.blockedReasons ?? []) console.log(`  blocked: ${r}`);
      for (const w of result.governanceWarnings ?? []) console.log(`  warn: ${w}`);
      if (result.error) console.log(`  error: ${result.error}`);
    }
    return {
      ok: result.ok,
      result,
      ...(result.error !== undefined ? { error: result.error } : {}),
    };
  }
}

// ── content-publish ────────────────────────────────────────────────────

export interface ContentPublishCommandInput extends BaseInput {
  briefId: string;
  publishedUri?: string;
}

export interface ContentPublishCommandResult extends BaseResult {
  result: PublishResult;
}

export class ContentPublishCommand {
  async run(input: ContentPublishCommandInput): Promise<ContentPublishCommandResult> {
    if (!input.briefId) {
      return {
        ok: false,
        error: "briefId is required",
        result: { ok: false, error: "briefId is required" },
      };
    }
    const patch: Parameters<typeof publishContent>[1] = {};
    if (input.publishedUri !== undefined) patch.publishedUri = input.publishedUri;
    const result = await publishContent(input.briefId, patch);
    if (input.json) {
      emitJson(input, { ok: result.ok, result });
    } else {
      console.log(`Content publish: ${result.ok ? "published" : "failed"}`);
      if (result.asset) {
        console.log(`  status: ${result.asset.status}`);
        if (result.asset.publishedUri) console.log(`  publishedUri: ${result.asset.publishedUri}`);
      }
      if (result.governanceStatus) console.log(`  governanceStatus: ${result.governanceStatus}`);
      for (const r of result.blockedReasons ?? []) console.log(`  blocked: ${r}`);
      if (result.error) console.log(`  error: ${result.error}`);
    }
    return {
      ok: result.ok,
      result,
      ...(result.error !== undefined ? { error: result.error } : {}),
    };
  }
}
