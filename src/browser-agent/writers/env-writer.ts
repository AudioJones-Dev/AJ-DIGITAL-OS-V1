import fs from "node:fs/promises";
import path from "node:path";
import {
  EnforcementBlockedError,
  executeWithEnforcement,
} from "../../security/permissions/enforced-execution.js";
import { resolveAgentContext } from "../../security/agents/agent-registry.js";

export async function writeEnvTemplate(
  outputPath: string,
  fields: Record<string, string>,
): Promise<void> {
  const dir = path.dirname(outputPath);
  const agentContext = resolveAgentContext("browser-agent-env-writer");

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
      throw new Error(`Env template write requires approval: ${enforced.enforcement.reason}`);
    }
  } catch (err: unknown) {
    if (err instanceof EnforcementBlockedError) {
      throw new Error(`Env template write blocked by enforcement: ${err.message}`);
    }
    throw err;
  }
}

function toScreamingSnake(input: string): string {
  return input
    .replace(/([a-z])([A-Z])/g, "$1_$2")
    .replace(/[\s\-./]+/g, "_")
    .replace(/[^A-Z0-9_]/gi, "")
    .toUpperCase();
}
