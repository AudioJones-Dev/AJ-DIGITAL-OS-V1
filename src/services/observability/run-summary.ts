import { RunStore } from "../../core/run-store.js";
import { logger } from "../../core/logger.js";
import type { RunRecord } from "../../types/run.types.js";
import { RunTracker, type RunEvent } from "./run-tracker.js";

export interface RunSummaryInput {
  runId: string;
}

export interface RunSummaryResult {
  ok: boolean;
  runId: string;
  clientId?: string;
  workflowId?: string;
  taskType?: string;
  status?: string;
  approvalStatus?: string;
  publishedPath?: string;
  publishedFiles: string[];
  revisionCount?: number;
  createdAt?: string;
  updatedAt?: string;
  approvedAt?: string;
  approvedBy?: string;
  approvalMessageId?: number;
  eventCount: number;
  lastEventType?: string;
  warnings: string[];
  errors: string[];
  events: RunEvent[];
}

/**
 * Read-only aggregation service for operator-facing run summaries.
 */
export class RunSummaryService {
  constructor(
    private readonly runStore = new RunStore(),
    private readonly runTracker = new RunTracker(),
  ) {}

  /**
   * Returns an aggregated summary for a single run.
   */
  async getSummary(input: RunSummaryInput): Promise<RunSummaryResult> {
    logger.info("Run summary requested.", {
      runId: input.runId,
    });

    const run = await this.loadRun(input.runId);
    if (!run) {
      logger.warn("Run summary requested for missing run.", {
        runId: input.runId,
      });
      return this.buildNotFoundResult(input.runId);
    }

    const events = await this.loadEvents(input.runId);
    const warnings = this.aggregateWarnings(run, events);
    const errors = this.aggregateErrors(run, events);
    const lastEventType = this.deriveLastEventType(events);

    logger.info("Run summary aggregated.", {
      runId: run.runId,
      eventCount: events.length,
      status: run.status,
    });

    return {
      ok: true,
      runId: run.runId,
      clientId: run.clientId,
      workflowId: run.workflowId,
      taskType: run.taskType,
      status: run.status,
      approvalStatus: run.approvalStatus,
      ...(run.publishedPath ? { publishedPath: run.publishedPath } : {}),
      publishedFiles: run.publishedFiles ?? [],
      revisionCount: run.revisionCount,
      createdAt: run.createdAt,
      updatedAt: run.updatedAt,
      ...(run.approvedAt ? { approvedAt: run.approvedAt } : {}),
      ...(run.approvedBy ? { approvedBy: run.approvedBy } : {}),
      ...(run.approvalMessageId !== undefined ? { approvalMessageId: run.approvalMessageId } : {}),
      eventCount: events.length,
      ...(lastEventType ? { lastEventType } : {}),
      warnings,
      errors,
      events,
    };
  }

  private async loadRun(runId: string): Promise<RunRecord | undefined> {
    return this.runStore.get(runId);
  }

  private async loadEvents(runId: string): Promise<RunEvent[]> {
    return this.runTracker.getRunEvents(runId);
  }

  private deriveLastEventType(events: RunEvent[]): string | undefined {
    const lastEvent = events.at(-1);
    return lastEvent?.type;
  }

  private aggregateWarnings(run: RunRecord, events: RunEvent[]): string[] {
    const eventWarnings = events
      .filter((event) => event.type === "warning" && typeof event.message === "string")
      .map((event) => event.message as string);

    return this.dedupeMessages([...run.warnings, ...eventWarnings]);
  }

  private aggregateErrors(run: RunRecord, events: RunEvent[]): string[] {
    const eventErrors = events
      .filter((event) => event.type === "error" && typeof event.message === "string")
      .map((event) => event.message as string);

    return this.dedupeMessages([...run.errors, ...eventErrors]);
  }

  private dedupeMessages(messages: string[]): string[] {
    return Array.from(new Set(messages.filter((message) => message.trim().length > 0)));
  }

  private buildNotFoundResult(runId: string): RunSummaryResult {
    return {
      ok: false,
      runId,
      publishedFiles: [],
      eventCount: 0,
      warnings: [],
      errors: [`Run \"${runId}\" was not found.`],
      events: [],
    };
  }
}
