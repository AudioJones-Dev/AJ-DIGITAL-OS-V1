import { readFile } from "node:fs/promises";
import path from "node:path";

import type { AgentResponse } from "../types/agent.types.js";
import { ContextBundleSchema, type ContextBundle } from "../schemas/context-bundle.schema.js";

export interface ContextLoaderInput {
  runId: string;
  taskType: string;
  objective: string;
  clientId: string;
  sourceMaterials?: Array<Record<string, unknown>>;
  constraints?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

/**
 * Loads local client context files and returns a normalized workflow context bundle.
 */
export const loadContextBundle = async (
  input: ContextLoaderInput,
): Promise<AgentResponse<ContextBundle>> => {
  try {
    const clientDirectory = path.resolve("data", "clients", input.clientId);
    const templateDirectory = path.resolve("data", "clients", "_template");

    const [brandDNA, projectContext] = await Promise.all([
      readJsonWithFallback(clientDirectory, templateDirectory, "brand-dna.json"),
      readJsonWithFallback(clientDirectory, templateDirectory, "project-context.json"),
    ]);

    const bundle = ContextBundleSchema.parse({
      runId: input.runId,
      taskType: input.taskType,
      objective: input.objective,
      clientId: input.clientId,
      brandDNA,
      sourceMaterials: input.sourceMaterials ?? [],
      constraints: {
        ...projectContext,
        ...(input.constraints ?? {}),
      },
      metadata: input.metadata ?? {},
    });

    const usedTemplate = !(await fileExists(path.join(clientDirectory, "brand-dna.json")));

    return {
      ok: true,
      agent: "context-loader",
      output: bundle,
      warnings: usedTemplate ? ["Using template client context."] : [],
      errors: [],
    };
  } catch (error) {
    return {
      ok: false,
      agent: "context-loader",
      warnings: [],
      errors: [error instanceof Error ? error.message : "Unknown context loading error."],
    };
  }
};

const readJsonWithFallback = async (
  clientDirectory: string,
  templateDirectory: string,
  fileName: string,
): Promise<Record<string, unknown>> => {
  const preferredFile = path.join(clientDirectory, fileName);
  const templateFile = path.join(templateDirectory, fileName);

  if (await fileExists(preferredFile)) {
    return readJson(preferredFile);
  }

  if (await fileExists(templateFile)) {
    return readJson(templateFile);
  }

  throw new Error(`Required context file is missing: ${preferredFile}`);
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await readFile(filePath, "utf-8");
    return true;
  } catch {
    return false;
  }
};

const readJson = async (filePath: string): Promise<Record<string, unknown>> => {
  const raw = await readFile(filePath, "utf-8");
  const parsed = JSON.parse(raw.replace(/^\uFEFF/, "")) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`File "${filePath}" does not contain a JSON object.`);
  }

  return parsed as Record<string, unknown>;
};
