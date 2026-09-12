// DECOY: generated duplication, copy B.
export function renderGeneratedGraph(nodes: string[]): string {
  const normalized = nodes
    .map((node) => node.trim())
    .filter((node) => node.length > 0)
    .sort((a, b) => a.localeCompare(b));

  const lines = ["graph TD"];
  for (let index = 0; index < normalized.length; index += 1) {
    const current = normalized[index];
    const next = normalized[index + 1];
    lines.push(`  N${index}[${current}]`);
    if (next) {
      lines.push(`  N${index} --> N${index + 1}`);
    }
  }

  return `${lines.join("\n")}\n`;
}
