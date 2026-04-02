import {
  RunTracker,
  type RunEvent,
} from "../services/observability/run-tracker.js";

export interface RunEventsCommandInput {
  runId: string;
  json?: boolean;
  limit?: number;
  reverse?: boolean;
}

export interface RunEventsCommandResult {
  ok: boolean;
  command: "run-events";
  runId: string;
  rendered: boolean;
  eventCount: number;
  events: RunEvent[];
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing command for rendering a run's raw event history.
 */
export class RunEventsCommand {
  constructor(private readonly runTracker = new RunTracker()) {}

  /**
   * Loads, formats, and renders run events in human or JSON mode.
   */
  async run(input: RunEventsCommandInput): Promise<RunEventsCommandResult> {
    const runId = input.runId.trim();

    if (runId.length === 0) {
      const error = "A non-empty runId is required.";
      if (input.json === true) {
        console.log(JSON.stringify({ ok: false, runId: input.runId, errors: [error] }, null, 2));
      } else {
        console.log("AJ DIGITAL OS RUN EVENTS");
        console.log("========================");
        console.log(error);
      }

      return {
        ok: false,
        command: "run-events",
        runId: input.runId,
        rendered: true,
        eventCount: 0,
        events: [],
        warnings: [],
        errors: [error],
      };
    }

    try {
      const events = await this.runTracker.getRunEvents(runId);
      const orderedEvents = this.applyOrdering(events, input.reverse === true);
      const limitedEvents = this.applyLimit(orderedEvents, input.limit);

      if (input.json === true) {
        this.printJson(limitedEvents);
      } else {
        this.renderHumanEvents(runId, limitedEvents, events.length);
      }

      return {
        ok: true,
        command: "run-events",
        runId,
        rendered: true,
        eventCount: events.length,
        events: limitedEvents,
        warnings: [],
        errors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown event load error.";
      if (input.json === true) {
        console.log(JSON.stringify({ ok: false, runId, errors: [message] }, null, 2));
      } else {
        console.log("AJ DIGITAL OS RUN EVENTS");
        console.log("========================");
        console.log(`Run ID: ${runId}`);
        console.log(message);
      }

      return {
        ok: false,
        command: "run-events",
        runId,
        rendered: true,
        eventCount: 0,
        events: [],
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

  private renderHumanEvents(runId: string, events: RunEvent[], totalEventCount: number): void {
    console.log("AJ DIGITAL OS RUN EVENTS");
    console.log("========================");
    console.log(`Run ID: ${runId}`);

    if (totalEventCount === 0) {
      console.log("No events found.");
      return;
    }

    console.log(`Event Count: ${totalEventCount}`);
    console.log("");
    console.log("Events");

    for (const [index, event] of events.entries()) {
      console.log(this.renderEventRow(index + 1, event));
    }
  }

  private renderEventRow(index: number, event: RunEvent): string {
    const parts = [event.timestamp, event.type];

    if (event.message) {
      parts.push(event.message);
    }

    const metadataSuffix = this.renderCompactMetadata(event);
    if (metadataSuffix) {
      parts.push(metadataSuffix);
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

  private printJson(events: RunEvent[]): void {
    console.log(JSON.stringify(events, null, 2));
  }
}
