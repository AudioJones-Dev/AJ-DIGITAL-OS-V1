// ── Memory Runtime Types ───────────────────────────────────────────

/** Canonical memory record types (cognitive + RAG). */
export type MemoryRecordType =
  | "run_log"
  | "mistake"
  | "working_context"
  | "shared_memory"
  | "rag_document"
  | "rag_report";

/** A single persisted memory record. */
export interface MemoryRecord {
  id: string;
  type: MemoryRecordType;
  workflow: string;
  timestamp: string;
  content: string;
  tags: string[];
  metadata?: Record<string, unknown> | undefined;
}

/** Controls what memory is loaded / written for a given run. */
export interface MemoryPolicy {
  loadWorkingContext: boolean;
  loadRecentLogs: boolean;
  loadMistakes: boolean;
  writeRunLog: boolean;
  writeMistakes: boolean;
  writeWorkingContext: boolean;
}

/** Default policy — full read/write. */
export const DEFAULT_MEMORY_POLICY: MemoryPolicy = {
  loadWorkingContext: true,
  loadRecentLogs: true,
  loadMistakes: true,
  writeRunLog: true,
  writeMistakes: true,
  writeWorkingContext: true,
};

/** Memory bundle produced by beforeRun (prompt-ready). */
export interface CognitiveContext {
  workingContext: string;
  recentLogs: Array<{ file: string; content: string }>;
  mistakes: string[];
}

/** Mutable runtime context threaded through the entire run. */
export interface RunContext {
  runId: string;
  workflow: string;
  task: string;
  startedAt: string;
  memoryPolicy: MemoryPolicy;
  cognitiveContext: CognitiveContext;
  stepCount: number;
  extractedData: Record<string, string>;
  outputFiles: string[];
  notes: string[];
  warnings: string[];
}

/** Result envelope returned by each lifecycle hook. */
export interface HookResult {
  ok: boolean;
  warnings: string[];
  error?: string | undefined;
}

/** Configuration for the cognitive memory file layout. */
export interface MemoryConfig {
  cognitiveRoot: string;
  logsDir: string;
  mistakesFile: string;
  workingContextFile: string;
  maxRecentLogs: number;
  maxPromptContextChars: number;
}
