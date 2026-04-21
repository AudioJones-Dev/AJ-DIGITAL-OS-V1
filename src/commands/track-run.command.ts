import {
  RunSummaryService,
  type RunSummaryResult,
} from "../services/observability/run-summary.js";
import {
  RunTracker,
  type RunEvent,
} from "../services/observability/run-tracker.js";

export type TrackRunViewMode = "summary" | "events" | "full";

export interface TrackRunCommandInput {
  runId: string;
  view?: TrackRunViewMode;
  json?: boolean;
  limit?: number;
  reverse?: boolean;
}

export interface TrackRunCommandResult {
  ok: boolean;
  command: "track-run";
  runId: string;
  view: TrackRunViewMode;
  rendered: boolean;
  summary?: RunSummaryResult;
  events?: RunEvent[];
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing command for unified observability on a single run.
 */
export class TrackRunCommand {
  constructor(
    private readonly runSummaryService = new RunSummaryService(),
    private readonly runTracker = new RunTracker(),
  ) {}

  /**
   * Loads and renders a run summary, event stream, or both.
   */
  async run(input: TrackRunCommandInput): Promise<TrackRunCommandResult> {
    const runId = input.runId.trim();
    const view = input.view ?? "full";

    if (runId.length === 0) {
      const error = "A non-empty runId is required.";
      if (input.json === true) {
        console.log(JSON.stringify({ ok: false, runId: input.runId, view, errors: [error] }, null, 2));
      } else {
        console.log("AJ DIGITAL OS TRACK RUN");
        console.log("=======================");
        console.log(error);
      }

      return {
        ok: false,
        command: "track-run",
        runId: input.runId,
        view,
        rendered: true,
        warnings: [],
        errors: [error],
      };
    }

    try {
      const summary = view === "events" ? undefined : await this.runSummaryService.getSummary({ runId });
      const rawEvents = view === "summary" ? undefined : await this.runTracker.getRunEvents(runId);
      const events = rawEvents === undefined
        ? undefined
        : this.applyLimit(this.applyOrdering(rawEvents, input.reverse === true), input.limit);

      if (input.json === true) {
        const payload: { runId: string; view: TrackRunViewMode; summary?: RunSummaryResult; events?: RunEvent[] } = {
          runId,
          view,
        };
        if (summary) {
          payload.summary = summary;
        }
        if (events) {
          payload.events = events;
        }
        this.printJson(payload);
      } else {
        this.renderHuman(runId, view, summary, events, rawEvents?.length ?? 0);
      }

      const ok = summary ? summary.ok : true;
      return {
        ok,
        command: "track-run",
        runId,
        view,
        rendered: true,
        ...(summary ? { summary } : {}),
        ...(events ? { events } : {}),
        warnings: [],
        errors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown observability error.";
      if (input.json === true) {
        console.log(JSON.stringify({ ok: false, runId, view, errors: [message] }, null, 2));
      } else {
        console.log("AJ DIGITAL OS TRACK RUN");
        console.log("=======================");
        console.log(`Run ID: ${runId}`);
        console.log(message);
      }

      return {
        ok: false,
        command: "track-run",
        runId,
        view,
        rendered: true,
        warnings: [],
        errors: [message],
      };
    }
  }

  private applyOrdering(events: RunEvent[], reverse: boolean): RunEvent[] {
    return reverse ? [...events].reverse() : [...events];
  }

  private applyLimit(events: RunEvent[], limit: number | undefined): RunEvent[] {
    if (limit === undefined || !Number.isFinite(limit) || limit <= 0) {
      return events;
    }

    return events.slice(0, Math.floor(limit));
  }

  private renderHuman(
    runId: string,
    view: TrackRunViewMode,
    summary: RunSummaryResult | undefined,
    events: RunEvent[] | undefined,
    totalEventCount: number,
  ): void {
    console.log("AJ DIGITAL OS TRACK RUN");
    console.log("=======================");
    console.log(`Run ID: ${runId}`);
    console.log(`View: ${view}`);

    if (view === "summary" || view === "full") {
      this.renderHumanSummary(summary);
    }

    if (view === "events" || view === "full") {
      this.renderHumanEvents(events, totalEventCount);
    }
  }

  private renderHumanSummary(summary: RunSummaryResult | undefined): void {
    console.log("");
    console.log("Summary");

    if (!summary) {
      console.log("- None");
      return;
    }

    if (!summary.ok) {
      console.log("- Run not found.");
      if (summary.errors.length > 0) {
        for (const error of summary.errors) {
          console.log(`- ${error}`);
        }
      }
      return;
    }

    console.log(`- Client: ${summary.clientId ?? "-"}`);
    console.log(`- Workflow: ${summary.workflowId ?? "-"}`);
    console.log(`- Task Type: ${summary.taskType ?? "-"}`);
    console.log(`- Status: ${summary.status ?? "-"}`);
    console.log(`- Approval Status: ${summary.approvalStatus ?? "-"}`);
    console.log(`- Updated At: ${summary.updatedAt ?? "-"}`);
    console.log(`- Published Path: ${summary.publishedPath ?? "-"}`);
    console.log(`- Model Outcome: ${summary.modelExecution?.lastOutcome ?? "not_attempted"}`);
    console.log(`- Model Provider: ${summary.modelExecution?.provider ?? "-"}`);
    console.log(`- Model Name: ${summary.modelExecution?.model ?? "-"}`);

    this.renderWarnings(summary.warnings);
    this.renderErrors(summary.errors);
  }

  private renderHumanEvents(events: RunEvent[] | undefined, totalEventCount: number): void {
    console.log("");
    console.log("Events");

    if (!events || totalEventCount === 0) {
      console.log("- None");
      return;
    }

    for (const [index, event] of events.entries()) {
      console.log(this.renderEventRow(index + 1, event));
    }
  }

  private renderEventRow(index: number, event: RunEvent): string {
    const parts = [event.timestamp, event.type];

    if (event.message) {
      parts.push(event.message);
    }

    const compactMetadata = this.renderCompactMetadata(event);
    if (compactMetadata) {
      parts.push(compactMetadata);
    }

    return `${index}. ${parts.join(" | ")}`;
  }

  private renderCompactMetadata(event: RunEvent): string | undefined {
    if (!event.metadata) {
      return undefined;
    }

    const compactParts: string[] = [];
    const filename = this.readStringMetadata(event.metadata, ["fileName", "filename", "artifact", "path"]);
    const target = this.readStringMetadata(event.metadata, ["target"]);
    const status = this.readStringMetadata(event.metadata, ["status"]);
    const messageId = this.readNumberMetadata(event.metadata, ["messageId"]);
    const provider = this.readStringMetadata(event.metadata, ["provider"]);
    const model = this.readStringMetadata(event.metadata, ["model"]);
    const reason = this.readStringMetadata(event.metadata, ["reason"]);
    const repaired = this.readBooleanMetadata(event.metadata, ["repaired"]);

    if (filename) {
      compactParts.push(filename);
    }

    if (target) {
      compactParts.push(`target=${target}`);
    }

    if (status) {
      compactParts.push(`status=${status}`);
    }

    if (messageId !== undefined) {
      compactParts.push(`messageId=${messageId}`);
    }

    if (provider) {
      compactParts.push(`provider=${provider}`);
    }

    if (model) {
      compactParts.push(`model=${model}`);
    }

    if (repaired === true) {
      compactParts.push("repaired=true");
    }

    if (reason) {
      compactParts.push(`reason=${reason}`);
    }

    return compactParts.length > 0 ? compactParts.join(" | ") : undefined;
  }

  private readStringMetadata(metadata: Record<string, unknown>, keys: string[]): string | undefined {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === "string" && value.trim().length > 0) {
        return value;
      }
    }

    return undefined;
  }

  private readNumberMetadata(metadata: Record<string, unknown>, keys: string[]): number | undefined {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === "number") {
        return value;
      }
    }

    return undefined;
  }

  private readBooleanMetadata(metadata: Record<string, unknown>, keys: string[]): boolean | undefined {
    for (const key of keys) {
      const value = metadata[key];
      if (typeof value === "boolean") {
        return value;
      }
    }

    return undefined;
  }

  private renderWarnings(warnings: string[]): void {
    console.log("");
    console.log("Warnings");

    if (warnings.length === 0) {
      console.log("- None");
      return;
    }

    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  }

  private renderErrors(errors: string[]): void {
    console.log("");
    console.log("Errors");

    if (errors.length === 0) {
      console.log("- None");
      return;
    }

    for (const error of errors) {
      console.log(`- ${error}`);
    }
  }

  private printJson(payload: { runId: string; view: TrackRunViewMode; summary?: RunSummaryResult; events?: RunEvent[] }): void {
    console.log(JSON.stringify(payload, null, 2));
  }
}
