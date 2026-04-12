export const buildMemoryContext = (memorySummary?: string): string => {
  return memorySummary && memorySummary.trim().length > 0
    ? `Relevant memory:\n${memorySummary.trim()}`
    : "Relevant memory:\nNo memory context was retrieved for this task.";
};
