import fs from "node:fs/promises";
import path from "node:path";

export interface MdReportData {
  title: string;
  task: string;
  fields: Record<string, string>;
  notes: string[];
  timestamp: string;
  workflow: string;
  stepCount: number;
  duration: string;
}

export async function writeMdReport(outputPath: string, data: MdReportData): Promise<void> {
  const dir = path.dirname(outputPath);
  await fs.mkdir(dir, { recursive: true });

  const fieldRows = Object.entries(data.fields)
    .map(([key, value]) => `| ${key} | ${value.slice(0, 100)} |`)
    .join("\n");

  const notesBlock =
    data.notes.length > 0 ? data.notes.map((n) => `- ${n}`).join("\n") : "- No notes.";

  const md = `# ${data.title}

**Workflow**: ${data.workflow}
**Task**: ${data.task}
**Timestamp**: ${data.timestamp}
**Steps**: ${data.stepCount}
**Duration**: ${data.duration}

## Extracted Fields

| Field | Value |
|-------|-------|
${fieldRows}

## Notes

${notesBlock}
`;

  await fs.writeFile(outputPath, md, "utf-8");
}
