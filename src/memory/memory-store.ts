import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Safe file-backed primitives for memory reads and writes.
 */
export class MemoryStore {
  constructor(private readonly rootDirectory = path.resolve("memory")) {}

  async read(relativePath: string): Promise<string | undefined> {
    const filePath = this.resolve(relativePath);

    try {
      return await readFile(filePath, "utf-8");
    } catch (error) {
      if (isMissingFile(error)) {
        return undefined;
      }

      throw error;
    }
  }

  async save(relativePath: string, content: string): Promise<string> {
    const filePath = this.resolve(relativePath);
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf-8");
    return filePath;
  }

  resolve(relativePath: string): string {
    return path.join(this.rootDirectory, relativePath);
  }
}

const isMissingFile = (error: unknown): boolean => {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
};
