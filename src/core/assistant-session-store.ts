import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { AssistantSessionSchema } from "../schemas/assistant-session.schema.js";
import type { AssistantSessionRecord } from "../types/assistant-session.types.js";
import {
  EnforcementBlockedError,
  executeWithEnforcement,
} from "../security/permissions/enforced-execution.js";
import { resolveAgentContext } from "../security/agents/agent-registry.js";

export interface ListAssistantSessionsInput {
  limit?: number;
}

export class AssistantSessionStore {
  private readonly sessionsDirectory: string;

  constructor(sessionsDirectory = path.resolve("data", "assistant", "history")) {
    this.sessionsDirectory = sessionsDirectory;
  }

  async save(session: AssistantSessionRecord): Promise<AssistantSessionRecord> {
    const parsedSession = AssistantSessionSchema.parse(session);
    const outputPath = this.getSessionPath(parsedSession.timestamp, parsedSession.sessionId);
    const agentContext = resolveAgentContext("assistant-session-store");
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
          await mkdir(this.sessionsDirectory, { recursive: true });
          await writeFile(
            outputPath,
            `${JSON.stringify(parsedSession, null, 2)}\n`,
            "utf-8",
          );
          return { ok: true };
        },
      );

      if (enforced.status === "approval_required") {
        throw new Error(`Assistant session save requires approval: ${enforced.enforcement.reason}`);
      }
    } catch (err: unknown) {
      if (err instanceof EnforcementBlockedError) {
        throw new Error(`Assistant session save blocked by enforcement: ${err.message}`);
      }
      throw err;
    }

    return parsedSession;
  }

  async list(input: ListAssistantSessionsInput = {}): Promise<AssistantSessionRecord[]> {
    await mkdir(this.sessionsDirectory, { recursive: true });
    const entries = await readdir(this.sessionsDirectory, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => entry.name)
      .sort((left, right) => right.localeCompare(left));

    const limitedFiles = typeof input.limit === "number" && input.limit > 0
      ? files.slice(0, input.limit)
      : files;

    const sessions = await Promise.all(
      limitedFiles.map(async (fileName) => {
        const raw = await readFile(path.join(this.sessionsDirectory, fileName), "utf-8");
        return AssistantSessionSchema.parse(JSON.parse(raw));
      }),
    );

    return sessions.sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  }

  private getSessionPath(timestamp: string, sessionId: string): string {
    return path.join(this.sessionsDirectory, `${sanitizeTimestamp(timestamp)}-${sanitizeId(sessionId)}.json`);
  }
}

const sanitizeTimestamp = (timestamp: string): string => timestamp.replace(/[^0-9TZ-]/g, "_");
const sanitizeId = (value: string): string => value.replace(/[^a-zA-Z0-9-_]/g, "_");
