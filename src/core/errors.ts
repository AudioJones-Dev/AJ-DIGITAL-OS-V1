/**
 * Raised when schema validation or business validation fails.
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly details: string[] = [],
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

/**
 * Raised when a workflow cannot be found or cannot be used.
 */
export class WorkflowResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkflowResolutionError";
  }
}

/**
 * Raised when a run is moved into an illegal state.
 */
export class StateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StateTransitionError";
  }
}
