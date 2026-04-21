import type { SkillDefinition } from "./skill-types.js";

/**
 * In-memory registry for markdown-defined skills.
 */
export class SkillRegistry {
  private readonly skills = new Map<string, SkillDefinition>();

  register(skill: SkillDefinition): void {
    this.skills.set(skill.name, skill);
  }

  registerMany(skills: SkillDefinition[]): void {
    for (const skill of skills) {
      this.register(skill);
    }
  }

  resolveByName(name: string): SkillDefinition {
    const skill = this.skills.get(name);

    if (!skill) {
      throw new Error(`Skill "${name}" is not registered.`);
    }

    return skill;
  }

  findByTrigger(trigger: string): SkillDefinition[] {
    const normalizedTrigger = trigger.trim().toLowerCase();

    return Array.from(this.skills.values()).filter((skill) =>
      skill.triggers.some((candidate) => candidate.trim().toLowerCase() === normalizedTrigger)
    );
  }

  list(): SkillDefinition[] {
    return Array.from(this.skills.values()).sort((left, right) => left.name.localeCompare(right.name));
  }
}
