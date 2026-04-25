import fs from "node:fs/promises";
import path from "node:path";
import {
  EnforcementBlockedError,
  executeWithEnforcement,
} from "../../security/permissions/enforced-execution.js";
import { resolveAgentContext } from "../../security/agents/agent-registry.js";

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
  const agentContext = resolveAgentContext("browser-agent-md-writer");

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

  try {
    const enforced = await executeWithEnforcement(
      {
        agentId: agentContext.agentId,
        actionType: "write_file",
        target: outputPath,
      },
      {
        permissionLevel: agentContext.permissionLevel,
        environment: agentContext.environment,
      },
      async () => {
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(outputPath, md, "utf-8");
        return { ok: true };
      },
    );

    if (enforced.status === "approval_required") {
      throw new Error(`Markdown report write requires approval: ${enforced.enforcement.reason}`);
    }
  } catch (err: unknown) {
    if (err instanceof EnforcementBlockedError) {
      throw new Error(`Markdown report write blocked by enforcement: ${err.message}`);
    }
    throw err;
  }
}
