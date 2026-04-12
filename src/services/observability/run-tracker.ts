import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

import { logger } from "../../core/logger.js";

export type RunEventType =
  | "run_created"
  | "context_loaded"
  | "model_route_selected"
  | "model_execution_attempted"
  | "model_execution_succeeded"
  | "model_execution_parse_failed"
  | "model_execution_fallback_used"
  | "model_execution_failed"
  | "workflow_started"
  | "workflow_completed"
  | "validation_passed"
  | "validation_failed"
  | "approval_requested"
  | "approval_approved"
  | "approval_rejected"
  | "approval_revision_requested"
  | "execution_requested"
  | "execution_skipped"
  | "execution_denied"
  | "execution_started"
  | "execution_completed"
  | "execution_failed"
  | "warning"
  | "error"
  | "artifact_written";

export interface RunEvent {
  eventId: string;
  runId: string;
  type: RunEventType;
  timestamp: string;
  actor?: string | undefined;
  source?: string | undefined;
  message?: string | undefined;
  metadata?: Record<string, unknown> | undefined;
}

const RunEventSchema = z.object({
  eventId: z.string().min(1),
  runId: z.string().min(1),
  type: z.enum([
    "run_created",
    "context_loaded",
    "model_route_selected",
    "model_execution_attempted",
    "model_execution_succeeded",
    "model_execution_parse_failed",
    "model_execution_fallback_used",
    "model_execution_failed",
    "workflow_started",
    "workflow_completed",
    "validation_passed",
    "validation_failed",
    "approval_requested",
    "approval_approved",
    "approval_rejected",
    "approval_revision_requested",
    "execution_requested",
    "execution_skipped",
    "execution_denied",
    "execution_started",
    "execution_completed",
    "execution_failed",
    "warning",
    "error",
    "artifact_written",
  ]),
  timestamp: z.string().min(1),
  actor: z.string().min(1).optional(),
  source: z.string().min(1).optional(),
  message: z.string().min(1).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const RunEventArraySchema = z.array(RunEventSchema);

/**
 * File-backed tracker for structured run lifecycle events.
 */
export class RunTracker {
  constructor(
    private readonly reportsDirectory = path.resolve("data", "reports", "runs"),
  ) {}

  /**
   * Appends a validated event to the run's event log.
   */
  async track(event: RunEvent): Promise<void> {
    const validatedEvent = this.validateEvent(event);
    const eventFilePath = this.resolveEventFilePath(validatedEvent.runId);
    const events = await this.readEventsFile(validatedEvent.runId);
    const fileExists = events.length > 0;

    if (!fileExists) {
      logger.info("Run tracker creating event file.", {
        runId: validatedEvent.runId,
        eventFilePath,
      });
    }

    events.push(validatedEvent);
    await this.writeEventsFile(validatedEvent.runId, events);

    logger.info("Run tracker tracked event.", {
      runId: validatedEvent.runId,
      eventId: validatedEvent.eventId,
      type: validatedEvent.type,
    });
  }

  /**
   * Returns the parsed event log for a run, or an empty array when absent.
   */
  async getRunEvents(runId: string): Promise<RunEvent[]> {
    return this.readEventsFile(runId);
  }

  /**
   * Tracks a warning event for a run.
   */
  async trackWarning(runId: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.track(this.buildEvent(runId, "warning", message, metadata));
  }

  /**
   * Tracks an error event for a run.
   */
  async trackError(runId: string, message: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.track(this.buildEvent(runId, "error", message, metadata));
  }

  /**
   * Tracks that execution has started for a run.
   */
  async trackExecutionStarted(runId: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.track(this.buildEvent(runId, "execution_started", "Execution started.", metadata));
  }

  /**
   * Tracks that execution has completed for a run.
   */
  async trackExecutionCompleted(runId: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.track(this.buildEvent(runId, "execution_completed", "Execution completed.", metadata));
  }

  /**
   * Tracks that approval was requested for a run.
   */
  async trackApprovalRequested(runId: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.track(this.buildEvent(runId, "approval_requested", "Approval requested.", metadata));
  }

  /**
   * Tracks model routing metadata selected by the orchestrator.
   */
  async trackModelRouteSelected(runId: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.track(this.buildEvent(runId, "model_route_selected", "Model route selected.", metadata));
  }

  /**
   * Tracks model execution lifecycle events for model-backed workflows.
   */
  async trackModelExecutionEvent(
    runId: string,
    type:
      | "model_execution_attempted"
      | "model_execution_succeeded"
      | "model_execution_parse_failed"
      | "model_execution_fallback_used"
      | "model_execution_failed",
    metadata?: Record<string, unknown>,
    message?: string,
  ): Promise<void> {
    const resolvedMessage = message && message.trim().length > 0 ? message : this.getModelExecutionMessage(type);
    await this.track(this.buildEvent(runId, type, resolvedMessage, metadata));
  }

  private resolveEventFilePath(runId: string): string {
    return path.join(this.reportsDirectory, `${this.sanitizeRunId(runId)}.events.json`);
  }

  private async readEventsFile(runId: string): Promise<RunEvent[]> {
    const eventFilePath = this.resolveEventFilePath(runId);

    try {
      const raw = await readFile(eventFilePath, "utf-8");
      return RunEventArraySchema.parse(JSON.parse(raw));
    } catch (error) {
      if (this.isFileMissingError(error)) {
        return [];
      }

      logger.error("Run tracker failed to load event file.", {
        runId,
        eventFilePath,
        error: error instanceof Error ? error.message : "Unknown error",
      });

      throw new Error(`Failed to read run events for \"${runId}\".`);
    }
  }

  private async writeEventsFile(runId: string, events: RunEvent[]): Promise<void> {
    const eventFilePath = this.resolveEventFilePath(runId);
    await mkdir(this.reportsDirectory, { recursive: true });
    await writeFile(eventFilePath, `${JSON.stringify(events, null, 2)}\n`, "utf-8");
  }

  private buildEvent(
    runId: string,
    type: RunEventType,
    message: string,
    metadata?: Record<string, unknown>,
  ): RunEvent {
    return this.validateEvent({
      eventId: randomUUID(),
      runId,
      type,
      timestamp: new Date().toISOString(),
      message,
      ...(metadata ? { metadata } : {}),
    });
  }

  private getModelExecutionMessage(
    type:
      | "model_execution_attempted"
      | "model_execution_succeeded"
      | "model_execution_parse_failed"
      | "model_execution_fallback_used"
      | "model_execution_failed",
  ): string {
    switch (type) {
      case "model_execution_attempted":
        return "Model execution attempted.";
      case "model_execution_succeeded":
        return "Model execution succeeded.";
      case "model_execution_parse_failed":
        return "Model execution parse failed.";
      case "model_execution_fallback_used":
        return "Model execution fallback used.";
      case "model_execution_failed":
        return "Model execution failed.";
    }
  }

  private validateEvent(event: RunEvent): RunEvent {
    const parsed = RunEventSchema.safeParse(event);

    if (!parsed.success) {
      const errors = parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`);
      logger.error("Run tracker rejected invalid event.", {
        runId: event.runId,
        errors,
      });
      throw new Error(`Invalid run event: ${errors.join("; ")}`);
    }

    return parsed.data;
  }

  private sanitizeRunId(runId: string): string {
    return runId.replace(/[^a-zA-Z0-9-_]/g, "_");
  }

  private isFileMissingError(error: unknown): boolean {
    return error instanceof Error && "code" in error && error.code === "ENOENT";
  }
}
