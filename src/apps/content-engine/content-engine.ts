/**
 * L12 Application Layer — Content Engine.
 *
 * Manages content briefs, production DAG plans, and publication tracking
 * using the BEL DAG runtime and the Governance Layer.
 */

import { randomUUID } from "node:crypto";

import { emitEvent } from "../../attribution/attribution-tracker.js";
import { createDagRun } from "../../bel/dag/dag-runtime.js";
import type {
  BelDagEdge,
  BelDagNode,
  BelDagPlan,
} from "../../bel/dag/dag-types.js";
import { evaluateGovernance } from "../../governance/governance-engine.js";
import type { GovernanceRequest } from "../../governance/governance-types.js";
import {
  getEntity,
  saveEntity,
} from "../../normalization/normalization-store.js";
import { normalizeAsset } from "../../normalization/normalizer.js";
import type { NormalizedAsset } from "../../normalization/normalization-types.js";

import {
  contentTypeToAssetType,
  type ContentBriefInput,
  type ContentBriefResult,
  type PublishResult,
} from "./content-engine-types.js";

const TAG = "[CONTENT-ENGINE]";
const CONTENT_AGENT_ID = "content-engine";

function fireAttribution(
  eventType: "content_brief_created" | "content_published",
  runId: string,
  metadata: Record<string, unknown>,
  tenantId: string | undefined,
): void {
  try {
    void emitEvent({
      eventType,
      runId,
      agentId: CONTENT_AGENT_ID,
      channel: "blog",
      ...(tenantId !== undefined ? { clientId: tenantId } : {}),
      metadata,
    }).catch((err: unknown) => {
      console.warn(
        `${TAG} attribution emit failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    });
  } catch (err) {
    console.warn(
      `${TAG} attribution emit threw: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

function buildPlan(
  input: ContentBriefInput,
  briefId: string,
): BelDagPlan {
  const stages: Array<{ id: string; type: BelDagNode["type"]; name: string }> = [
    { id: "input", type: "input", name: "Input" },
    { id: "research", type: "retrieve", name: "Research" },
    { id: "draft", type: "generate", name: "Draft" },
    { id: "review", type: "approval_gate", name: "Review" },
    { id: "publish", type: "publish", name: "Publish" },
  ];

  const nodes: BelDagNode[] = stages.map((s) => ({
    nodeId: s.id,
    type: s.type,
    name: s.name,
    status: "pending",
    riskLevel: "low",
    inputRefs: [],
    outputRefs: [],
    attempts: 0,
    maxAttempts: 3,
  }));

  const edges: BelDagEdge[] = [];
  for (let i = 0; i < stages.length - 1; i += 1) {
    edges.push({ from: stages[i]!.id, to: stages[i + 1]!.id });
  }

  const plan: BelDagPlan = {
    dagId: `content-brief-${briefId}`,
    runId: `run-${briefId}`,
    name: `content-brief:${input.contentType}`,
    version: "1.0.0",
    environment: "development",
    policyVersion: "v1",
    nodes,
    edges,
    createdAt: new Date().toISOString(),
    createdBy: input.createdBy,
    ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
  };
  return plan;
}

export async function createContentBrief(
  input: ContentBriefInput,
): Promise<ContentBriefResult> {
  if (!input.title || !input.description || !input.createdBy) {
    return {
      ok: false,
      error: "title, description, and createdBy are required",
    };
  }

  try {
    const governanceReq: GovernanceRequest = {
      content: `${input.title}\n\n${input.description}`,
    };
    if (input.tenantId !== undefined) governanceReq.tenantId = input.tenantId;
    const governance = evaluateGovernance(governanceReq);

    if (governance.overall === "block") {
      return {
        ok: false,
        governanceStatus: "block",
        governanceWarnings: governance.warnings,
        blockedReasons: governance.blockedReasons,
        error: "governance blocked content brief",
      };
    }

    const briefId = `brief_${randomUUID()}`;
    const asset = normalizeAsset({
      entityId: briefId,
      title: input.title,
      type: contentTypeToAssetType(input.contentType),
      format: input.format ?? "markdown",
      status: "draft",
      tags: input.tags ?? [],
      channel: input.channel,
      ...(input.tenantId !== undefined ? { tenantId: input.tenantId } : {}),
    });
    const savedAsset = saveEntity("asset", asset);

    let dagRunId: string | undefined;
    try {
      const plan = buildPlan(input, briefId);
      const state = createDagRun(plan, {
        actor: input.createdBy,
        skipPersist: true,
      });
      dagRunId = state.runId;
    } catch (err) {
      console.warn(
        `${TAG} DAG plan creation failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    fireAttribution(
      "content_brief_created",
      briefId,
      {
        briefId,
        contentType: input.contentType,
        channel: input.channel,
        ...(dagRunId !== undefined ? { dagRunId } : {}),
        governanceOutcome: governance.overall,
      },
      input.tenantId,
    );

    return {
      ok: true,
      briefId,
      ...(dagRunId !== undefined ? { dagRunId } : {}),
      asset: savedAsset,
      governanceStatus: governance.overall,
      governanceWarnings: governance.warnings,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "content engine error";
    return { ok: false, error: message };
  }
}

export async function publishContent(
  briefId: string,
  patch: Partial<NormalizedAsset> = {},
): Promise<PublishResult> {
  if (!briefId) {
    return { ok: false, error: "briefId is required" };
  }

  try {
    const existing = getEntity("asset", briefId);
    if (!existing) {
      return { ok: false, error: `asset not found: ${briefId}` };
    }

    const merged: NormalizedAsset = {
      ...existing,
      ...patch,
      entityId: existing.entityId,
      status: "published",
      updatedAt: new Date().toISOString(),
    };

    const governance = evaluateGovernance({
      content: merged.title,
      ...(merged.tenantId !== undefined ? { tenantId: merged.tenantId } : {}),
    });

    if (governance.overall === "block") {
      return {
        ok: false,
        asset: existing,
        governanceStatus: "block",
        blockedReasons: governance.blockedReasons,
        governanceWarnings: governance.warnings,
        error: "governance blocked publish",
      };
    }

    const saved = saveEntity("asset", merged);

    fireAttribution(
      "content_published",
      saved.entityId,
      {
        briefId: saved.entityId,
        type: saved.type,
        channel: saved.channel ?? null,
        governanceOutcome: governance.overall,
      },
      saved.tenantId,
    );

    return {
      ok: true,
      asset: saved,
      governanceStatus: governance.overall,
      governanceWarnings: governance.warnings,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "publish error";
    return { ok: false, error: message };
  }
}
