import fs from "node:fs/promises";
import path from "node:path";
import {
  EnforcementBlockedError,
  executeWithEnforcement,
} from "../../security/permissions/enforced-execution.js";
import { resolveAgentContext } from "../../security/agents/agent-registry.js";

export async function writeCsv(
  outputPath: string,
  headers: string[],
  rows: Array<Record<string, string>>,
): Promise<void> {
  const dir = path.dirname(outputPath);
  const agentContext = resolveAgentContext("browser-agent-csv-writer");

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
        await fs.writeFile(outputPath, lines.join("\n") + "\n", "utf-8");
        return { ok: true };
      },
    );

    if (enforced.status === "approval_required") {
      throw new Error(`CSV write requires approval: ${enforced.enforcement.reason}`);
    }
  } catch (err: unknown) {
    if (err instanceof EnforcementBlockedError) {
      throw new Error(`CSV write blocked by enforcement: ${err.message}`);
    }
    throw err;
  }
}
