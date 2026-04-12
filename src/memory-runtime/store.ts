import { mkdir, readdir, readFile, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import type { MemoryConfig, MemoryRecord } from "./types.js";

// ── Default config ─────────────────────────────────────────────────

const DEFAULT_CONFIG: MemoryConfig = {
  cognitiveRoot: path.resolve("memory"),
  logsDir: path.resolve("memory", "logs"),
  mistakesFile: path.resolve("memory", "mistakes.md"),
  workingContextFile: path.resolve("memory", "working-context.md"),
  maxRecentLogs: 3,
  maxPromptContextChars: 12_000,
};

// ── Cognitive Memory Store ─────────────────────────────────────────

export class CognitiveMemoryStore {
  readonly config: MemoryConfig;

  constructor(config?: Partial<MemoryConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ── Working Context ────────────────────────────────────────────

  async getWorkingContext(): Promise<string> {
    return safeRead(this.config.workingContextFile);
  }

  async updateWorkingContext(content: string): Promise<void> {
    await ensureDir(path.dirname(this.config.workingContextFile));
    await writeFile(this.config.workingContextFile, content, "utf-8");
  }

  // ── Daily Logs ─────────────────────────────────────────────────

  async appendDailyLog(entry: string): Promise<string> {
    await ensureDir(this.config.logsDir);
    const filename = dateFilename();
    const filePath = path.join(this.config.logsDir, filename);
    await appendFile(filePath, entry + "\n\n", "utf-8");
    return filePath;
  }

  async getRecentLogs(): Promise<Array<{ file: string; content: string }>> {
    try {
      const files = (await readdir(this.config.logsDir))
        .filter((name) => name.endsWith(".md"))
        .sort()
        .reverse()
        .slice(0, this.config.maxRecentLogs);

      const results: Array<{ file: string; content: string }> = [];
      for (const name of files) {
        const full = path.join(this.config.logsDir, name);
        const content = await readFile(full, "utf-8");
        results.push({ file: name, content: truncate(content, this.config.maxPromptContextChars) });
      }
      return results;
    } catch {
      return [];
    }
  }

  // ── Mistakes ───────────────────────────────────────────────────

  async appendMistake(record: {
    workflow: string;
    error: string;
    cause: string;
    fix: string;
  }): Promise<void> {
    await ensureDir(path.dirname(this.config.mistakesFile));
    const entry = [
      `## ${new Date().toISOString()}`,
      `- Workflow: ${record.workflow}`,
      `- Error: ${record.error}`,
      `- Cause: ${record.cause}`,
      `- Fix: ${record.fix}`,
      "",
    ].join("\n");
    await appendFile(this.config.mistakesFile, entry + "\n", "utf-8");
  }

  async getRelevantMistakes(workflow: string): Promise<string[]> {
    try {
      const content = await readFile(this.config.mistakesFile, "utf-8");
      const lower = workflow.toLowerCase();
      return content
        .split("## ")
        .filter(Boolean)
        .filter((chunk) => chunk.toLowerCase().includes(lower))
        .slice(-5)
        .map((chunk) => "## " + chunk.trim());
    } catch {
      return [];
    }
  }

  // ── Run Log (structured JSON) ──────────────────────────────────

  async writeRunLog(record: MemoryRecord): Promise<string> {
    const logsDir = path.join(this.config.cognitiveRoot, "run-logs");
    await ensureDir(logsDir);
    const filename = `${record.id}.json`;
    const filePath = path.join(logsDir, filename);
    await writeFile(filePath, JSON.stringify(record, null, 2) + "\n", "utf-8");
    return filePath;
  }
}

// ── Helpers ────────────────────────────────────────────────────────

function dateFilename(date = new Date()): string {
  return date.toISOString().slice(0, 10) + ".md";
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max) + "\n…[truncated]";
}

async function safeRead(filePath: string): Promise<string> {
  try {
    return await readFile(filePath, "utf-8");
  } catch {
    return "";
  }
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}
