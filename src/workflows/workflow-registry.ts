import { WorkflowResolutionError } from "../core/errors.js";
import type { WorkflowDefinition } from "../types/workflow.types.js";
import { blogAuthorityWorkflow } from "./blog-authority.workflow.js";
import { transcriptToContentWorkflow } from "./transcript-to-content.workflow.js";

/**
 * In-memory workflow registry for starter orchestration.
 */
export class WorkflowRegistry {
  private readonly workflows = new Map<string, WorkflowDefinition>();

  /**
   * Registers a workflow by its unique id.
   */
  register(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
  }

  /**
   * Resolves the first workflow supporting a task type.
   */
  resolveByTaskType(taskType: string): WorkflowDefinition {
    const workflow = Array.from(this.workflows.values()).find((item) =>
      item.supportedTaskTypes.includes(taskType),
    );

    if (!workflow) {
      throw new WorkflowResolutionError(`No workflow is registered for task type "${taskType}".`);
    }

    return workflow;
  }

  /**
   * Lists registered workflows and their supported task types.
   */
  listSupportedWorkflows(): Array<{ id: string; supportedTaskTypes: string[] }> {
    return Array.from(this.workflows.values()).map((workflow) => ({
      id: workflow.id,
      supportedTaskTypes: workflow.supportedTaskTypes,
    }));
  }
}

/**
 * Creates the default workflow registry used by the starter orchestrator.
 */
export const createDefaultWorkflowRegistry = (): WorkflowRegistry => {
  const registry = new WorkflowRegistry();
  registry.register(blogAuthorityWorkflow);
  registry.register(transcriptToContentWorkflow);
  return registry;
};
