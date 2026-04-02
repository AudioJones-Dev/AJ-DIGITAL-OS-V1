/**
 * Shared output contract for agent-style entry points.
 */
export interface AgentResponse<T = unknown> {
  ok: boolean;
  agent: string;
  output?: T;
  warnings: string[];
  errors: string[];
}
