import fs from "node:fs/promises";
import path from "node:path";

export async function writeCsv(
  outputPath: string,
  headers: string[],
  rows: Array<Record<string, string>>,
): Promise<void> {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  const escapeCsv = (value: string): string => {
    if (value.includes(",") || value.includes('"') || value.includes("\n")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  const lines: string[] = [headers.map(escapeCsv).join(",")];

  for (const row of rows) {
    const values = headers.map((h) => escapeCsv(row[h] ?? ""));
    lines.push(values.join(","));
  }

  await fs.writeFile(outputPath, lines.join("\n") + "\n", "utf-8");
}
