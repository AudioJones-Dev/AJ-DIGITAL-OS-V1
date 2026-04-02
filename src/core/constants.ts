import type { RunStatus } from "../types/run.types.js";

/**
 * Allowed state transitions for the AJ Digital run lifecycle.
 */
export const RUN_STATE_TRANSITIONS: Record<RunStatus, RunStatus[]> = {
  queued: ["context_loaded"],
  context_loaded: ["in_progress"],
  in_progress: ["draft_complete", "validation_failed"],
  draft_complete: ["validation_passed", "validation_failed"],
  validation_passed: ["pending_approval", "executed"],
  validation_failed: ["in_progress", "closed"],
  pending_approval: ["approved", "rejected", "revision_requested"],
  approved: ["executed"],
  rejected: ["closed"],
  revision_requested: ["in_progress", "closed"],
  executed: ["logged"],
  logged: ["closed"],
  closed: [],
};
