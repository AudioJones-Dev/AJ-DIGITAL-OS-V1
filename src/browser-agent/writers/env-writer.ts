import fs from "node:fs/promises";
import path from "node:path";

export async function writeEnvTemplate(
  outputPath: string,
  fields: Record<string, string>,
): Promise<void> {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  const lines: string[] = [
    "# Auto-generated config template",
    `# Source: AJ Digital OS Browser Agent`,
    `# Generated: ${new Date().toISOString()}`,
    "",
  ];

  for (const [key, value] of Object.entries(fields)) {
    const envKey = toScreamingSnake(key);
    lines.push(`${envKey}=${value}`);
  }

  await fs.writeFile(outputPath, lines.join("\n") + "\n", "utf-8");
}

function toScreamingSnake(input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s\-./]+/g, "_")
    .replace(/[^A-Z0-9_]/gi, "")
    .toUpperCase();
}
