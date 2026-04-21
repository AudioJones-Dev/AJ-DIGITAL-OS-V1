import { AssistantSessionStore } from "../core/assistant-session-store.js";
import type { AssistantSessionRecord } from "../types/assistant-session.types.js";

export interface AssistantHistoryCommandInput {
  limit?: number;
  json?: boolean;
}

export interface AssistantHistorySummary {
  total: number;
  succeeded: number;
  failed: number;
  blocked: number;
  latestTimestamp?: string;
}

export interface AssistantHistoryCommandResult {
  ok: boolean;
  command: "assistant-history";
  rendered: boolean;
  entries: AssistantSessionRecord[];
  summary: AssistantHistorySummary;
  warnings: string[];
  errors: string[];
}

export class AssistantHistoryCommand {
  constructor(private readonly sessionStore = new AssistantSessionStore()) {}

  async run(input: AssistantHistoryCommandInput = {}): Promise<AssistantHistoryCommandResult> {
    const entries = await this.sessionStore.list({
      ...(input.limit !== undefined ? { limit: input.limit } : {}),
    });
    const summary = buildHistorySummary(entries);

    if (input.json === true) {
      console.log(JSON.stringify({
        ok: true,
        summary,
        entries,
      }, null, 2));
    } else {
      this.renderHuman(entries, summary);
    }

    return {
      ok: true,
      command: "assistant-history",
      rendered: true,
      entries,
      summary,
      warnings: [],
      errors: [],
    };
  }

  private renderHuman(entries: AssistantSessionRecord[], summary: AssistantHistorySummary): void {
    console.log("AJ DIGITAL OS ASSISTANT HISTORY");
    console.log("===============================");
    console.log(`Total Entries: ${summary.total}`);
    console.log(`Succeeded: ${summary.succeeded}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Blocked: ${summary.blocked}`);
    console.log(`Latest: ${summary.latestTimestamp ?? "-"}`);

    console.log("");
    console.log("Recent Sessions");

    if (entries.length === 0) {
      console.log("- None");
      return;
    }

    for (const entry of entries) {
      const selectedSkill = entry.selectedSkillName ?? "-";
      const selectedWorkflow = entry.selectedWorkflowId ?? "-";
      const modelProfile = entry.modelProfileName ?? entry.modelProfileId ?? "-";
      const agentProfile = entry.agentProfileName ?? entry.agentProfileId ?? "-";
      const route = entry.route ? `${entry.route.provider}/${entry.route.model}` : "-";
      const brand = entry.brandName ?? entry.brandId ?? "-";
      const threadId = entry.conversationThreadId ?? "-";
      const shellMetadata = entry.shellSessionId
        ? ` | shell ${entry.shellSessionLabel ?? entry.shellSessionId}${entry.turnIndex ? `#${entry.turnIndex}` : ""}`
        : "";
      console.log(`- ${entry.timestamp} | ${entry.status} | ${entry.execution ?? entry.mode} | ${route}${shellMetadata}`);
      console.log(`  Task: ${entry.task || "-"} | Brand: ${brand} | Thread: ${threadId}`);
      console.log(`  Skill: ${selectedSkill} | Workflow: ${selectedWorkflow} | Run ID: ${entry.runId ?? "-"}`);
      console.log(`  Agent: ${agentProfile} | Model Profile: ${modelProfile}`);
      if (entry.warnings.length > 0) {
        console.log(`  Warnings: ${entry.warnings.join(" | ")}`);
      }
      if (entry.errors.length > 0) {
        console.log(`  Errors: ${entry.errors.join(" | ")}`);
      }
    }
  }
}

const buildHistorySummary = (entries: AssistantSessionRecord[]): AssistantHistorySummary => {
  return {
    total: entries.length,
    succeeded: entries.filter((entry) => entry.status === "succeeded").length,
    failed: entries.filter((entry) => entry.status === "failed").length,
    blocked: entries.filter((entry) => entry.status === "blocked").length,
    ...(entries[0]?.timestamp ? { latestTimestamp: entries[0].timestamp } : {}),
  };
};
