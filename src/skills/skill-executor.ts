import type { SkillExecutionInput, SkillExecutionPlan } from "./skill-types.js";

/**
 * Builds a lightweight execution plan for a skill without invoking models or tools.
 */
export class SkillExecutor {
  prepare(input: SkillExecutionInput): SkillExecutionPlan {
    const promptSections = [
      `Skill: ${input.skill.name}`,
      `Description: ${input.skill.description}`,
      `Objective: ${input.objective}`,
      input.skill.body,
    ];

    if (input.context && Object.keys(input.context).length > 0) {
      promptSections.push(`Context:\n${JSON.stringify(input.context, null, 2)}`);
    }

    return {
      skillName: input.skill.name,
      objective: input.objective,
      ...(input.skill.workflowId ? { workflowId: input.skill.workflowId } : {}),
      approvalRequired: input.skill.approvalRequired,
      allowedTools: input.skill.allowedTools,
      promptSections,
    };
  }
}
