import { RunStore } from "../../core/run-store.js";
import { logger } from "../../core/logger.js";
import type { RunRecord } from "../../types/run.types.js";
import { RunTracker, type RunEvent } from "./run-tracker.js";

export interface ModelExecutionSummary {
  attempted: boolean;
  succeeded: boolean;
  repaired: boolean;
  failed: boolean;
  fallbackUsed: boolean;
  lastOutcome:
    | "not_attempted"
    | "succeeded"
    | "repaired_success"
    | "failed"
    | "fallback_used";
  provider?: string;
  model?: string;
  lastReason?: string;
}

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
  modelExecution?: ModelExecutionSummary;
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
    const modelExecution = this.deriveModelExecutionSummary(events);

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
      ...(modelExecution ? { modelExecution } : {}),
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

  private deriveModelExecutionSummary(events: RunEvent[]): ModelExecutionSummary | undefined {
    const modelEvents = events.filter((event) => isModelExecutionEventType(event.type));

    if (modelEvents.length === 0) {
      return undefined;
    }

    const attemptedEvent = modelEvents.find((event) => event.type === "model_execution_attempted");
    const succeededEvent = modelEvents.find((event) => event.type === "model_execution_succeeded");
    const failedEvent = modelEvents.find((event) => event.type === "model_execution_failed");
    const fallbackEvent = modelEvents.find((event) => event.type === "model_execution_fallback_used");
    const lastModelEvent = modelEvents.at(-1);
    const repaired = succeededEvent?.metadata?.repaired === true;
    const provider = this.readStringMetadata(modelEvents, "provider");
    const model = this.readStringMetadata(modelEvents, "model");
    const lastReason = this.readStringMetadata(modelEvents, "reason");

    return {
      attempted: attemptedEvent !== undefined,
      succeeded: succeededEvent !== undefined,
      repaired,
      failed: failedEvent !== undefined,
      fallbackUsed: fallbackEvent !== undefined,
      lastOutcome: this.deriveLastModelOutcome(lastModelEvent?.type, repaired),
      ...(provider ? { provider } : {}),
      ...(model ? { model } : {}),
      ...(lastReason ? { lastReason } : {}),
    };
  }

  private deriveLastModelOutcome(
    eventType: RunEvent["type"] | undefined,
    repaired: boolean,
  ): ModelExecutionSummary["lastOutcome"] {
    switch (eventType) {
      case "model_execution_succeeded":
        return repaired ? "repaired_success" : "succeeded";
      case "model_execution_failed":
        return "failed";
      case "model_execution_fallback_used":
        return "fallback_used";
      default:
        return "not_attempted";
    }
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

  private readStringMetadata(events: RunEvent[], key: string): string | undefined {
    for (let index = events.length - 1; index >= 0; index -= 1) {
      const value = events[index]?.metadata?.[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
    }

    return undefined;
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

const isModelExecutionEventType = (type: RunEvent["type"]): boolean => {
  switch (type) {
    case "model_execution_attempted":
    case "model_execution_succeeded":
    case "model_execution_parse_failed":
    case "model_execution_fallback_used":
    case "model_execution_failed":
      return true;
    default:
      return false;
  }
};
