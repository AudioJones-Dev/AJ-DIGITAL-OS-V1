/**
 * Operating Core — Event replay
 *
 * Provides a deterministic, time-ordered view of a run's events for
 * dashboards & post-mortems.
 */

import { getEventsByRunId } from "./event-ledger.js";
import type { SystemEvent } from "./event-types.js";

export function replayRunEvents(runId: string): SystemEvent[] {
  const events = getEventsByRunId(runId);
  return events.slice().sort((a, b) => {
    if (a.timestamp === b.timestamp) {
      return a.eventId.localeCompare(b.eventId);
    }
    return a.timestamp.localeCompare(b.timestamp);
  });
}
