import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import type { SkillDefinition, SkillFrontmatter } from "./skill-types.js";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

export interface SkillLoaderOptions {
  skillsDirectory?: string;
}

/**
 * Loads markdown-defined skills from the repo root.
 */
export class SkillLoader {
  private readonly skillsDirectory: string;

  constructor(options: SkillLoaderOptions = {}) {
    this.skillsDirectory = options.skillsDirectory ?? path.resolve("skills");
  }

  async loadAll(): Promise<SkillDefinition[]> {
    const entries = await readdir(this.skillsDirectory, { withFileTypes: true }).catch((error: unknown) => {
      if (isMissingDirectory(error)) {
        return [];
      }

      throw error;
    });

    const skillFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".skill.md"))
      .map((entry) => path.join(this.skillsDirectory, entry.name));

    const skills = await Promise.all(skillFiles.map((filePath) => this.loadFile(filePath)));
    return skills.sort((left, right) => left.name.localeCompare(right.name));
  }

  async loadFile(filePath: string): Promise<SkillDefinition> {
    const raw = await readFile(filePath, "utf-8");
    const parsed = parseSkillMarkdown(raw);

    return {
      ...parsed.frontmatter,
      filePath,
      body: parsed.body.trim(),
    };
  }
}

const parseSkillMarkdown = (raw: string): { frontmatter: SkillFrontmatter; body: string } => {
  const match = raw.match(FRONTMATTER_PATTERN);

  if (!match) {
    throw new Error("Skill markdown is missing valid frontmatter.");
  }

  const [, frontmatterBlock, body] = match;
  const rawFrontmatter = parseFrontmatterBlock(frontmatterBlock ?? "");

  const name = requireString(rawFrontmatter, "name");
  const description = requireString(rawFrontmatter, "description");
  const modelPreference = optionalString(rawFrontmatter, "modelPreference");
  const contextMode = optionalString(rawFrontmatter, "contextMode");
  const workflowId = optionalString(rawFrontmatter, "workflowId");
  const frontmatter: SkillFrontmatter = {
    name,
    description,
    triggers: requireStringArray(rawFrontmatter, "triggers"),
    allowedTools: requireStringArray(rawFrontmatter, "allowedTools"),
    approvalRequired: requireBoolean(rawFrontmatter, "approvalRequired"),
  };

  if (modelPreference) {
    frontmatter.modelPreference = modelPreference;
  }

  if (contextMode) {
    frontmatter.contextMode = contextMode;
  }

  if (workflowId) {
    frontmatter.workflowId = workflowId;
  }

  return {
    frontmatter,
    body: body ?? "",
  };
};

const parseFrontmatterBlock = (block: string): Record<string, unknown> => {
  const result: Record<string, unknown> = {};
  let currentListKey: string | undefined;

  for (const rawLine of block.split(/\r?\n/)) {
    const line = rawLine.trimEnd();

    if (line.trim().length === 0 || line.trimStart().startsWith("#")) {
      continue;
    }

    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentListKey) {
      const existing = result[currentListKey];
      const items = Array.isArray(existing) ? existing : [];
      items.push(parseScalar(listMatch[1] ?? ""));
      result[currentListKey] = items;
      continue;
    }

    currentListKey = undefined;

    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) {
      throw new Error(`Invalid frontmatter line: "${line}".`);
    }

    const key = line.slice(0, separatorIndex).trim();
    const rawValue = line.slice(separatorIndex + 1).trim();

    if (!key) {
      throw new Error(`Invalid frontmatter key in line: "${line}".`);
    }

    if (!rawValue) {
      result[key] = [];
      currentListKey = key;
      continue;
    }

    result[key] = parseScalar(rawValue);
  }

  return result;
};

const parseScalar = (rawValue: string): unknown => {
  const value = rawValue.trim();

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map(unquote);
  }

  return unquote(value);
};

const unquote = (value: string): string => value.replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");

const requireString = (record: Record<string, unknown>, key: string): string => {
  const value = record[key];

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Skill frontmatter requires a non-empty "${key}" string.`);
  }

  return value.trim();
};

const optionalString = (record: Record<string, unknown>, key: string): string | undefined => {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
};

const requireStringArray = (record: Record<string, unknown>, key: string): string[] => {
  const value = record[key];

  if (!Array.isArray(value)) {
    throw new Error(`Skill frontmatter requires "${key}" to be a list.`);
  }

  const items = value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);

  if (items.length !== value.length) {
    throw new Error(`Skill frontmatter "${key}" must contain only strings.`);
  }

  return items;
};

const requireBoolean = (record: Record<string, unknown>, key: string): boolean => {
  const value = record[key];

  if (typeof value !== "boolean") {
    throw new Error(`Skill frontmatter requires "${key}" to be a boolean.`);
  }

  return value;
};

const isMissingDirectory = (error: unknown): boolean => {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
};
