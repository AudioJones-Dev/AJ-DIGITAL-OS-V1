export interface MemoryReference {
  path: string;
  description?: string;
}

export interface MemoryIndex {
  title: string;
  references: MemoryReference[];
  raw: string;
}

export interface MemorySummary {
  objective: string;
  summary: string;
  references: MemoryReference[];
}

export interface SemanticMemorySummaryReference extends MemoryReference {
  score?: number | undefined;
  kind?: string | undefined;
}

export interface SemanticMemorySummary extends MemorySummary {
  resultCount?: number | undefined;
}
