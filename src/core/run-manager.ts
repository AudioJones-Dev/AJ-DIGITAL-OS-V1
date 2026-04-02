import { randomUUID } from "node:crypto";

import { RunSchema } from "../schemas/run.schema.js";
import type { ApprovalStatus, RunRecord, RunStatus } from "../types/run.types.js";
import type { WorkflowExecutionResult } from "../types/workflow.types.js";
import { assertValidTransition } from "./state-machine.js";
import { RunStore } from "./run-store.js";

export interface CreateRunInput {
  workflowId: string;
  taskType: string;
  clientId: string;
  approvalRequired?: boolean;
}

export interface RunUpdateDetails {
  warnings?: string[];
  errors?: string[];
  approvalStatus?: ApprovalStatus;
  approvalMessageId?: number | undefined;
  approvedAt?: string | undefined;
  approvedBy?: string | undefined;
  workflowResult?: WorkflowExecutionResult | undefined;
  publishedPath?: string | undefined;
  publishedFiles?: string[] | undefined;
  revisionCount?: number;
}

/**
 * Creates and updates persisted run records for the starter scaffold.
 */
export class RunManager {
  constructor(private readonly store = new RunStore()) {}

  /**
   * Creates a new run in the queued state.
   */
  async createRun(input: CreateRunInput): Promise<RunRecord> {
    const timestamp = new Date().toISOString();
    const approvalRequired = input.approvalRequired ?? true;
    const run = RunSchema.parse({
      runId: randomUUID(),
      workflowId: input.workflowId,
      taskType: input.taskType,
      clientId: input.clientId,
      status: "queued",
      createdAt: timestamp,
      updatedAt: timestamp,
      revisionCount: 0,
      approvalRequired,
      approvalStatus: approvalRequired ? "not_requested" : "not_required",
      warnings: [],
      errors: [],
    });

    return this.store.save(run);
  }

  /**
   * Retrieves a previously created run.
   */
  async getRun(runId: string): Promise<RunRecord | undefined> {
    return this.store.get(runId);
  }

  /**
   * Moves a run into a new valid status and persists the change.
   */
  async updateStatus(runId: string, status: RunStatus, details?: RunUpdateDetails): Promise<RunRecord> {
    return this.store.update(runId, (current) => this.buildUpdatedRun(current, status, details));
  }

  /**
   * Marks a run as awaiting human approval.
   */
  async markPendingApproval(runId: string, details?: RunUpdateDetails): Promise<RunRecord> {
    return this.updateStatus(runId, "pending_approval", {
      ...details,
      approvalStatus: "pending",
    });
  }

  /**
   * Marks a run as approved.
   */
  async markApproved(runId: string, approvedBy?: string): Promise<RunRecord> {
    const details: RunUpdateDetails = {
      approvalStatus: "approved",
      approvedAt: new Date().toISOString(),
    };

    if (approvedBy) {
      details.approvedBy = approvedBy;
    }

    return this.updateStatus(runId, "approved", details);
  }

  /**
   * Marks a run as rejected.
   */
  async markRejected(runId: string, approvedBy?: string): Promise<RunRecord> {
    const details: RunUpdateDetails = {
      approvalStatus: "rejected",
    };

    if (approvedBy) {
      details.approvedBy = approvedBy;
    }

    return this.updateStatus(runId, "rejected", details);
  }

  /**
   * Marks a run as needing revision.
   */
  async markRevisionRequested(runId: string, approvedBy?: string): Promise<RunRecord> {
    const current = await this.getRun(runId);

    if (!current) {
      throw new Error(`Run \"${runId}\" was not found.`);
    }

    const details: RunUpdateDetails = {
      approvalStatus: "revision_requested",
      revisionCount: current.revisionCount + 1,
    };

    if (approvedBy) {
      details.approvedBy = approvedBy;
    }

    return this.updateStatus(runId, "revision_requested", details);
  }

  /**
   * Marks a run as executed and records the written artifact paths.
   */
  async markExecuted(runId: string, details: Pick<RunUpdateDetails, "publishedPath" | "publishedFiles">): Promise<RunRecord> {
    return this.updateStatus(runId, "executed", details);
  }

  private buildUpdatedRun(current: RunRecord, status: RunStatus, details?: RunUpdateDetails): RunRecord {
    assertValidTransition(current.status, status);

    return RunSchema.parse({
      ...current,
      ...details,
      status,
      updatedAt: new Date().toISOString(),
    });
  }
}
