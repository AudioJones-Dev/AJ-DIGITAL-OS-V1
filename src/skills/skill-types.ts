export interface SkillFrontmatter {
  name: string;
  description: string;
  triggers: string[];
  allowedTools: string[];
  modelPreference?: string;
  contextMode?: string;
  workflowId?: string;
  approvalRequired: boolean;
}

export interface SkillDefinition extends SkillFrontmatter {
  filePath: string;
  body: string;
}

export interface SkillExecutionInput {
  skill: SkillDefinition;
  objective: string;
  context?: Record<string, unknown>;
}

export interface SkillExecutionPlan {
  skillName: string;
  objective: string;
  workflowId?: string;
  approvalRequired: boolean;
  allowedTools: string[];
  promptSections: string[];
}
