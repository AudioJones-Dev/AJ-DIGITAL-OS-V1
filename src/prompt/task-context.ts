export const buildTaskContext = (objective: string, sourceMaterials: unknown[] = []): string => {
  const sourceSummary = sourceMaterials.length === 0
    ? "No source materials were supplied."
    : `Source materials provided: ${JSON.stringify(sourceMaterials, null, 2)}`;

  return [
    `Objective:\n${objective.trim()}`,
    sourceSummary,
  ].join("\n\n");
};
