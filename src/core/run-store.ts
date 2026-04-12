import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { RunSchema } from "../schemas/run.schema.js";
import type { RunRecord } from "../types/run.types.js";

/**
 * File-backed local persistence for run records.
 */
export class RunStore {
  private readonly runsDirectory: string;

  constructor(runsDirectory = path.resolve("data", "runs")) {
    this.runsDirectory = runsDirectory;
  }

  /**
   * Saves a run record to disk.
   */
  async save(run: RunRecord): Promise<RunRecord> {
    const parsedRun = RunSchema.parse(run);
    await mkdir(this.runsDirectory, { recursive: true });
    await writeFile(this.getRunPath(parsedRun.runId), `${JSON.stringify(parsedRun, null, 2)}\n`, "utf-8");
    return parsedRun;
  }

  /**
   * Loads a run record by run id.
   */
  async get(runId: string): Promise<RunRecord | undefined> {
    try {
      const raw = await readFile(this.getRunPath(runId), "utf-8");
      return RunSchema.parse(JSON.parse(raw));
    } catch (error) {
      if (isFileMissingError(error)) {
        return undefined;
      }

      throw new Error(`Failed to load run \"${runId}\": ${getErrorMessage(error)}`);
    }
  }

  /**
   * Updates an existing run record by applying a mutator.
   */
  async update(runId: string, updater: (run: RunRecord) => RunRecord): Promise<RunRecord> {
    const existingRun = await this.get(runId);

    if (!existingRun) {
      throw new Error(`Run \"${runId}\" was not found.`);
    }

    const updatedRun = updater(existingRun);
    return this.save(updatedRun);
  }

  private getRunPath(runId: string): string {
    return path.join(this.runsDirectory, `${sanitizeRunId(runId)}.json`);
  }
}

const sanitizeRunId = (runId: string): string => runId.replace(/[^a-zA-Z0-9-_]/g, "_");

const isFileMissingError = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return "code" in error && error.code === "ENOENT";
};

const getErrorMessage = (error: unknown): string => (error instanceof Error ? error.message : "Unknown error");
