import { loadMemoryIndex } from "./memory-index.js";
import { SemanticMemoryRetriever } from "./semantic-memory-retriever.js";
import type { MemorySummary } from "./memory-types.js";

/**
 * Minimal retrieval layer that exposes the memory index as prompt-ready summary text.
 */
export const retrieveRelevantMemorySummary = async (objective: string): Promise<string> => {
  const summary = await retrieveRelevantMemory(objective);
  return summary.summary;
};

export const retrieveRelevantMemory = async (objective: string): Promise<MemorySummary> => {
  const semanticResults = await new SemanticMemoryRetriever().search({
    query: objective,
    limit: 5,
  });

  if (semanticResults.length > 0) {
    return {
      objective,
      summary: [
        "Semantic memory retrieval:",
        `Objective: ${objective}`,
        ...semanticResults.map((result) => `- [${result.entry.kind}] ${result.entry.label} (${result.score.toFixed(3)})`),
      ].join("\n"),
      references: semanticResults.map((result) => ({
        path: result.entry.chunkPath,
        description: `${result.entry.kind} | ${result.entry.label} | score ${result.score.toFixed(3)}`,
      })),
    };
  }

  const index = await loadMemoryIndex();
  const referenceLines = index.references.length === 0
    ? ["No indexed memory references are available."]
    : index.references.map((reference) =>
      reference.description ? `- ${reference.path} - ${reference.description}` : `- ${reference.path}`
    );

  return {
    objective,
    summary: [
      `Memory index: ${index.title}`,
      `Objective: ${objective}`,
      ...referenceLines.slice(0, 8),
    ].join("\n"),
    references: index.references,
  };
};
