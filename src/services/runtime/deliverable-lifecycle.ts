import { mkdir, rename } from "node:fs/promises";
import path from "node:path";

import { PublisherAgent } from "../../agents/publisher.agent.js";
import { DeliverableStore } from "../../core/deliverable-store.js";
import { SemanticMemoryIndexer } from "../../memory/semantic-memory-indexer.js";
import { syncOutcomeFromLocalStatus } from "../deliverables.js";
import type { DeliverableRecord, DeliverableStatus } from "../../types/deliverable.types.js";
import { OutputPathResolver } from "./output-path-resolver.js";

const VALID_LIFECYCLE_TRANSITIONS: Readonly<Record<DeliverableStatus, DeliverableStatus[]>> = {
  draft: ["pending_approval"],
  pending_approval: ["approved"],
  approved: ["published"],
  published: [],
  failed: [],
  archived: [],
};

export interface DeliverableLifecycleResult {
  ok: boolean;
  action: "submit_for_approval" | "approve" | "publish";
  deliverable?: DeliverableRecord | undefined;
  warnings: string[];
  errors: string[];
}

export interface DeliverableLifecycleInput {
  deliverableId: string;
  actor?: string;
  notes?: string;
}

export class DeliverableLifecycleService {
  constructor(
    private readonly store = new DeliverableStore(),
    private readonly outputPathResolver = new OutputPathResolver(),
    private readonly semanticMemoryIndexer = new SemanticMemoryIndexer(),
  ) {}

  async submitForApproval(input: DeliverableLifecycleInput): Promise<DeliverableLifecycleResult> {
    return this.transition({
      action: "submit_for_approval",
      deliverableId: input.deliverableId,
      nextStatus: "pending_approval",
      approvalRequired: true,
      ...(input.actor ? { actor: input.actor } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });
  }

  async approveDeliverable(input: DeliverableLifecycleInput): Promise<DeliverableLifecycleResult> {
    return this.transition({
      action: "approve",
      deliverableId: input.deliverableId,
      nextStatus: "approved",
      approvalRequired: true,
      ...(input.actor ? { actor: input.actor } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });
  }

  async publishDeliverable(input: DeliverableLifecycleInput): Promise<DeliverableLifecycleResult> {
    const deliverable = await this.store.getById(input.deliverableId);
    if (!deliverable) {
      return {
        ok: false,
        action: "publish",
        warnings: [],
        errors: [`Deliverable "${input.deliverableId}" was not found.`],
      };
    }

    if (deliverable.status !== "approved") {
      return {
        ok: false,
        action: "publish",
        deliverable,
        warnings: [],
        errors: [`Deliverable "${input.deliverableId}" must be approved before it can be published.`],
      };
    }

    if (deliverable.runId && !deliverable.outputPath && deliverable.outputFiles.length === 0) {
      const publishResult = await new PublisherAgent().publish({ runId: deliverable.runId, target: "local" });
      const updated = publishResult.ok
        ? await this.store.getLatestByRunId(deliverable.runId)
        : deliverable;
      if (publishResult.ok && updated) {
        await this.safeIndexDeliverable(updated);
      }
      return {
        ok: publishResult.ok,
        action: "publish",
        ...(updated ? { deliverable: updated } : {}),
        warnings: publishResult.warnings,
        errors: publishResult.errors,
      };
    }

    return this.transition({
      action: "publish",
      deliverableId: input.deliverableId,
      nextStatus: "published",
      approvalRequired: deliverable.approvalRequired,
      ...(input.actor ? { actor: input.actor } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    });
  }

  private async transition(input: {
    action: DeliverableLifecycleResult["action"];
    deliverableId: string;
    nextStatus: "pending_approval" | "approved" | "published";
    actor?: string;
    notes?: string;
    approvalRequired: boolean;
  }): Promise<DeliverableLifecycleResult> {
    try {
      const existing = await this.store.getById(input.deliverableId);
      if (!existing) {
        return {
          ok: false,
          action: input.action,
          warnings: [],
          errors: [`Deliverable "${input.deliverableId}" was not found.`],
        };
      }

      if (!this.canTransition(existing.status, input.nextStatus)) {
        return {
          ok: false,
          action: input.action,
          deliverable: existing,
          warnings: [],
          errors: [
            `Deliverable "${input.deliverableId}" cannot transition from "${existing.status}" to "${input.nextStatus}".`,
          ],
        };
      }

      const moved = await this.moveOutputArtifacts(existing, input.nextStatus);
      const timestamp = new Date().toISOString();
      const deliverable = await this.store.transition(existing.deliverableId, input.nextStatus, (current) => ({
        ...current,
        status: input.nextStatus,
        approvalRequired: input.approvalRequired,
        approvalPolicy: {
          ...current.approvalPolicy,
          approvalRequired: input.approvalRequired,
          approvalMode: input.approvalRequired
            ? current.approvalPolicy.approvalMode === "not_required"
              ? "manual_review_required"
              : current.approvalPolicy.approvalMode
            : current.approvalPolicy.approvalMode,
        },
        outputPolicy: {
          ...current.outputPolicy,
          pendingPath: current.outputPolicy.pendingPath ?? path.join(path.dirname(current.outputPolicy.draftsPath), "pending"),
        },
        ...(moved.outputPath ? { outputPath: moved.outputPath } : current.outputPath ? { outputPath: current.outputPath } : {}),
        outputFiles: moved.outputFiles.length > 0 ? moved.outputFiles : current.outputFiles,
        updatedAt: timestamp,
        ...(input.nextStatus === "approved"
          ? {
              approvedAt: timestamp,
              approvedBy: input.actor?.trim() || "operator",
            }
          : {}),
        ...(input.notes !== undefined ? { approvalNotes: input.notes } : {}),
        ...(input.nextStatus === "published" ? { publishedAt: timestamp } : {}),
      }));
      await this.safeIndexDeliverable(deliverable);
      await this.safeSyncOutcome(deliverable.deliverableId, input.nextStatus, deliverable.runId);

      return {
        ok: true,
        action: input.action,
        deliverable,
        warnings: moved.warnings,
        errors: [],
      };
    } catch (error) {
      return {
        ok: false,
        action: input.action,
        warnings: [],
        errors: [error instanceof Error ? error.message : "Unknown deliverable lifecycle error."],
      };
    }
  }

  private async moveOutputArtifacts(
    deliverable: DeliverableRecord,
    nextStatus: "pending_approval" | "approved" | "published",
  ): Promise<{ outputPath?: string; outputFiles: string[]; warnings: string[] }> {
    const warnings: string[] = [];
    const currentRoot = this.resolveStageRoot(deliverable, deliverable.status);
    const nextRoot = this.resolveStageRoot(deliverable, nextStatus);

    if (!currentRoot || !nextRoot) {
      return {
        ...(deliverable.outputPath ? { outputPath: deliverable.outputPath } : {}),
        outputFiles: [...deliverable.outputFiles],
        warnings,
      };
    }

    await this.outputPathResolver.ensureDirectories({
      brandRoot: path.dirname(nextRoot),
      drafts: deliverable.outputPolicy.draftsPath,
      pending: deliverable.outputPolicy.pendingPath ?? path.join(path.dirname(deliverable.outputPolicy.draftsPath), "pending"),
      approved: deliverable.outputPolicy.approvedPath,
      published: deliverable.outputPolicy.publishedPath,
      source: "fallback",
      ...(deliverable.brandId ? { brandId: deliverable.brandId } : {}),
      ...(deliverable.clientId ? { clientId: deliverable.clientId } : {}),
    });

    if (deliverable.outputPath && isWithinRoot(deliverable.outputPath, currentRoot)) {
      const nextPath = path.join(nextRoot, path.relative(currentRoot, deliverable.outputPath));
      await mkdir(path.dirname(nextPath), { recursive: true });
      await rename(deliverable.outputPath, nextPath);
      return {
        outputPath: nextPath,
        outputFiles: deliverable.outputFiles.map((entry) => remapPath(entry, currentRoot, nextRoot)),
        warnings,
      };
    }

    if (deliverable.outputFiles.length === 0) {
      return {
        ...(deliverable.outputPath ? { outputPath: deliverable.outputPath } : {}),
        outputFiles: [],
        warnings,
      };
    }

    const movedFiles: string[] = [];
    for (const filePath of deliverable.outputFiles) {
      if (!isWithinRoot(filePath, currentRoot)) {
        movedFiles.push(filePath);
        continue;
      }

      const nextPath = path.join(nextRoot, path.relative(currentRoot, filePath));
      await mkdir(path.dirname(nextPath), { recursive: true });
      await rename(filePath, nextPath);
      movedFiles.push(nextPath);
    }

    return {
      ...(deliverable.outputPath ? { outputPath: remapPath(deliverable.outputPath, currentRoot, nextRoot) } : {}),
      outputFiles: movedFiles,
      warnings,
    };
  }

  private resolveStageRoot(
    deliverable: DeliverableRecord,
    status: DeliverableStatus,
  ): string | undefined {
    switch (status) {
      case "draft":
        return deliverable.outputPolicy.draftsPath;
      case "pending_approval":
        return deliverable.outputPolicy.pendingPath ?? path.join(path.dirname(deliverable.outputPolicy.draftsPath), "pending");
      case "approved":
        return deliverable.outputPolicy.approvedPath;
      case "published":
        return deliverable.outputPolicy.publishedPath;
      default:
        return undefined;
    }
  }

  private canTransition(currentStatus: DeliverableStatus, nextStatus: DeliverableStatus): boolean {
    return (VALID_LIFECYCLE_TRANSITIONS[currentStatus] ?? []).includes(nextStatus);
  }

  private async safeIndexDeliverable(deliverable: DeliverableRecord): Promise<void> {
    try {
      await this.semanticMemoryIndexer.indexDeliverable(deliverable);
    } catch {
      // Semantic memory indexing is best-effort.
    }
  }

  private async safeSyncOutcome(deliverableId: string, status: DeliverableStatus, runId?: string): Promise<void> {
    try {
      await syncOutcomeFromLocalStatus(deliverableId, status, undefined, runId);
    } catch {
      // Outcome sync is best-effort — does not block lifecycle.
    }
  }
}

const isWithinRoot = (candidate: string, root: string): boolean => {
  const relative = path.relative(root, candidate);
  return relative.length > 0 && !relative.startsWith("..") && !path.isAbsolute(relative);
};

const remapPath = (candidate: string, fromRoot: string, toRoot: string): string => {
  if (!isWithinRoot(candidate, fromRoot)) {
    return candidate;
  }

  return path.join(toRoot, path.relative(fromRoot, candidate));
};
