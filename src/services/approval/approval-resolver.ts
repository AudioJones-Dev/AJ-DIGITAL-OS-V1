import { logger } from "../../core/logger.js";
import { RunManager } from "../../core/run-manager.js";
import type { ApprovalDecision, ApprovalStatus, RunStatus } from "../../types/run.types.js";

export interface ResolveApprovalInput {
  runId: string;
  decision: ApprovalDecision;
  actor?: string | undefined;
}

export interface ResolveApprovalResult {
  ok: boolean;
  runId: string;
  previousStatus: RunStatus;
  newStatus: RunStatus;
  approvalStatus: ApprovalStatus;
  resumeExecution: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Resolves a human approval decision and updates the persisted run state.
 */
export class ApprovalResolver {
  constructor(private readonly runManager = new RunManager()) {}

  /**
   * Applies an approval decision to a pending run.
   */
  async resolve(input: ResolveApprovalInput): Promise<ResolveApprovalResult> {
    const run = await this.runManager.getRun(input.runId);

    if (!run) {
      return {
        ok: false,
        runId: input.runId,
        previousStatus: "closed",
        newStatus: "closed",
        approvalStatus: "rejected",
        resumeExecution: false,
        errors: [`Run \"${input.runId}\" was not found.`],
        warnings: [],
      };
    }

    if (run.status !== "pending_approval") {
      return {
        ok: false,
        runId: input.runId,
        previousStatus: run.status,
        newStatus: run.status,
        approvalStatus: run.approvalStatus,
        resumeExecution: false,
        errors: [`Run \"${input.runId}\" is not awaiting approval.`],
        warnings: [],
      };
    }

    switch (input.decision) {
      case "approve": {
        const updatedRun = await this.runManager.markApproved(input.runId, input.actor);
        logger.info("Run approved.", {
          runId: updatedRun.runId,
          approvedBy: updatedRun.approvedBy,
        });
        return {
          ok: true,
          runId: updatedRun.runId,
          previousStatus: run.status,
          newStatus: updatedRun.status,
          approvalStatus: updatedRun.approvalStatus,
          resumeExecution: true,
          errors: [],
          warnings: [],
        };
      }
      case "reject": {
        const updatedRun = await this.runManager.markRejected(input.runId, input.actor);
        logger.info("Run rejected.", {
          runId: updatedRun.runId,
          approvedBy: updatedRun.approvedBy,
        });
        return {
          ok: true,
          runId: updatedRun.runId,
          previousStatus: run.status,
          newStatus: updatedRun.status,
          approvalStatus: updatedRun.approvalStatus,
          resumeExecution: false,
          errors: [],
          warnings: [],
        };
      }
      case "request_revision": {
        const updatedRun = await this.runManager.markRevisionRequested(input.runId, input.actor);
        logger.info("Run marked for revision.", {
          runId: updatedRun.runId,
          approvedBy: updatedRun.approvedBy,
          revisionCount: updatedRun.revisionCount,
        });
        return {
          ok: true,
          runId: updatedRun.runId,
          previousStatus: run.status,
          newStatus: updatedRun.status,
          approvalStatus: updatedRun.approvalStatus,
          resumeExecution: false,
          errors: [],
          warnings: [],
        };
      }
    }
  }
}
