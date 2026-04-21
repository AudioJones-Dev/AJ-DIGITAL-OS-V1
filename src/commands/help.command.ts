export interface HelpCommandInput {
  json?: boolean;
}

export interface HelpCommandEntry {
  name: string;
  description: string;
  category: "overview" | "inspection" | "queues" | "actions" | "setup" | "architecture";
  examples: string[];
}

export interface HelpAliasEntry {
  alias: string;
  target: string;
  description: string;
}

export interface HelpCommandResult {
  ok: boolean;
  command: "help";
  rendered: boolean;
  commands: HelpCommandEntry[];
  aliases: HelpAliasEntry[];
  warnings: string[];
  errors: string[];
}

/**
 * Terminal-facing help command for the AJ Digital OS operator command layer.
 */
export class HelpCommand {
  /**
   * Renders the operator help screen in human or JSON mode.
   */
  async run(input: HelpCommandInput = {}): Promise<HelpCommandResult> {
    try {
      const commands = this.getCommandEntries();
      const aliases = this.getAliasEntries();

      if (input.json === true) {
        this.printJson({ commands, aliases });
      } else {
        this.renderHumanHelp(commands, aliases);
      }

      return {
        ok: true,
        command: "help",
        rendered: true,
        commands,
        aliases,
        warnings: [],
        errors: [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown help command error.";

      if (input.json === true) {
        this.printJson({ ok: false, command: "help", errors: [message] });
      } else {
        console.log("AJ DIGITAL OS HELP");
        console.log("==================");
        console.log("Failed to render help.");
        console.log("");
        console.log("Errors");
        console.log(`- ${message}`);
      }

      return {
        ok: false,
        command: "help",
        rendered: true,
        commands: [],
        aliases: [],
        warnings: [],
        errors: [message],
      };
    }
  }

  private getCommandEntries(): HelpCommandEntry[] {
    return [
      {
        name: "help",
        description: "Show available operator commands and usage patterns.",
        category: "overview",
        examples: ["help", "help --json"],
      },
      {
        name: "assistant",
        description: "Run the local-first assistant runtime in advisory or orchestrated mode over the Ollama-backed staging path.",
        category: "overview",
        examples: [
          "assistant --brand aj-digital --task \"Draft a blog angle for AI operations\"",
          "assistant --task \"Repurpose this transcript\" --skill transcript-to-content --mode orchestrated --json",
        ],
      },
      {
        name: "assistant-start",
        description: "Verify assistant readiness and launch a single-task assistant session over the current local-first path.",
        category: "overview",
        examples: [
          "assistant-start --brand aj-digital --task \"Draft a short operator brief\"",
          "assistant-start --task \"Repurpose this transcript\" --skill transcript-to-content --mode orchestrated --json",
        ],
      },
      {
        name: "assistant-history",
        description: "Inspect recent assistant task history from the local file-backed assistant session store.",
        category: "overview",
        examples: [
          "assistant-history",
          "assistant-history --limit 10 --json",
        ],
      },
      {
        name: "conversation-history",
        description: "Inspect persisted local conversation threads separate from high-level assistant session metadata.",
        category: "overview",
        examples: [
          "conversation-history",
          "conversation-history --limit 10 --json",
        ],
      },
      {
        name: "conversation-thread",
        description: "Inspect one conversation thread and its recent persisted user/assistant turns.",
        category: "inspection",
        examples: [
          "conversation-thread --threadId <thread-id>",
          "conversation-thread --threadId <thread-id> --limit 12 --json",
        ],
      },
      {
        name: "deliverables",
        description: "Inspect the local file-backed deliverable registry and brand-aware output routing results.",
        category: "overview",
        examples: [
          "deliverables",
          "deliverables --brand aj-digital --status draft --json",
        ],
      },
      {
        name: "list-pending-deliverables",
        description: "Show deliverables currently waiting for explicit approval in the local approval lifecycle.",
        category: "queues",
        examples: [
          "list-pending-deliverables",
          "list-pending-deliverables --brand aj-digital --json",
        ],
      },
      {
        name: "tool-registry",
        description: "Inspect the MCP-ready tool/provider catalog scaffold and any local tool metadata manifests.",
        category: "architecture",
        examples: ["tool-registry", "tool-registry --json"],
      },
      {
        name: "integration-profiles",
        description: "Inspect file-backed API integration and provider profiles with secret references only.",
        category: "architecture",
        examples: ["integration-profiles", "integration-profiles --brand aj-digital --json"],
      },
      {
        name: "model-profiles",
        description: "Inspect file-backed model and fine-tune profile scaffolds with brand/task routing preferences.",
        category: "architecture",
        examples: ["model-profiles", "model-profiles --brand aj-digital --json"],
      },
      {
        name: "memory-index",
        description: "Rebuild or ingest the local semantic memory index for conversations, deliverables, and added knowledge text.",
        category: "architecture",
        examples: ["memory-index --rebuild", "memory-index --text \"Operator notes\" --label notes --json"],
      },
      {
        name: "memory-search",
        description: "Search the local semantic memory layer by query using deterministic cosine similarity over local embeddings.",
        category: "inspection",
        examples: ["memory-search --query \"approval lifecycle\"", "memory-search --query \"client brief\" --json"],
      },
      {
        name: "memory-stats",
        description: "Inspect local semantic memory counts, kinds, and storage directories.",
        category: "architecture",
        examples: ["memory-stats", "memory-stats --json"],
      },
      {
        name: "assistant-shell",
        description: "Run a terminal-native conversational assistant shell over the existing local-first assistant runtime.",
        category: "overview",
        examples: [
          "assistant-shell --brand audio-jones",
          "assistant-shell --brand audio-jones --label morning-ops",
        ],
      },
      {
        name: "ui-start",
        description: "Start the local-first web/chat shell layered on top of the current assistant runtime and file-backed stores.",
        category: "overview",
        examples: ["ui-start", "ui-start --port 4318 --json"],
      },
      {
        name: "healthcheck",
        description: "Validate runtime configuration, writable directories, and provider readiness.",
        category: "overview",
        examples: ["healthcheck", "healthcheck --json"],
      },
      {
        name: "dashboard",
        description: "Show system-wide run metrics and recent activity.",
        category: "overview",
        examples: [
          "dashboard",
          "dashboard --limit 10",
          "dashboard --provider ollama",
          "dashboard --fallbackUsed --json",
        ],
      },
      {
        name: "ollama-probe",
        description: "Probe the supported live Ollama JSON generation path for staging validation.",
        category: "overview",
        examples: ["ollama-probe", "ollama-probe --json"],
      },
      {
        name: "operator-console",
        description: "Show the unified operator control surface.",
        category: "overview",
        examples: [
          "operator-console",
          "operator-console --watch",
          "operator-console --limit 10",
          "operator-console --json",
        ],
      },
      {
        name: "run-summary",
        description: "Inspect one run's lifecycle, approval state, outputs, and warnings.",
        category: "inspection",
        examples: ["run-summary --runId run_123", "run-summary --runId run_123 --json"],
      },
      {
        name: "run-events",
        description: "Inspect the raw event stream for a run.",
        category: "inspection",
        examples: ["run-events --runId run_123", "run-events --runId run_123 --reverse --limit 10"],
      },
      {
        name: "track-run",
        description: "Inspect both summary and events for a run.",
        category: "inspection",
        examples: ["track-run --runId run_123", "track-run --runId run_123 --view full --json"],
      },
      {
        name: "list-pending-approvals",
        description: "Show runs awaiting human approval.",
        category: "queues",
        examples: ["list-pending-approvals", "list-pending-approvals --limit 5", "list-pending-approvals --json"],
      },
      {
        name: "list-approved-runs",
        description: "Show runs in approved state, ready for execution.",
        category: "queues",
        examples: ["list-approved-runs", "list-approved-runs --limit 5", "list-approved-runs --json"],
      },
      {
        name: "list-failed-runs",
        description: "Show failed runs needing attention.",
        category: "queues",
        examples: ["list-failed-runs", "list-failed-runs --limit 5", "list-failed-runs --json"],
      },
      {
        name: "list-executed-runs",
        description: "Show recently executed runs and outputs.",
        category: "queues",
        examples: [
          "list-executed-runs",
          "list-executed-runs --limit 5",
          "list-executed-runs --provider ollama",
          "list-executed-runs --modelFailed --json",
        ],
      },
      {
        name: "approve-run",
        description: "Resolve a pending approval decision for a run.",
        category: "actions",
        examples: [
          "approve-run --runId run_123 --decision approve",
          "approve-run --runId run_123 --decision request_revision",
        ],
      },
      {
        name: "submit-for-approval",
        description: "Move a draft deliverable into the pending approval queue and route its files into the pending output root.",
        category: "actions",
        examples: [
          "submit-for-approval --deliverableId <deliverable-id>",
          "submit-for-approval --deliverableId <deliverable-id> --json",
        ],
      },
      {
        name: "approve-deliverable",
        description: "Approve a pending deliverable and move its files into the approved output root.",
        category: "actions",
        examples: [
          "approve-deliverable --deliverableId <deliverable-id>",
          "approve-deliverable --deliverableId <deliverable-id> --actor operator --json",
        ],
      },
      {
        name: "publish-deliverable",
        description: "Publish an approved deliverable through the local-first publish path without bypassing approval.",
        category: "actions",
        examples: [
          "publish-deliverable --deliverableId <deliverable-id>",
          "publish-deliverable --deliverableId <deliverable-id> --json",
        ],
      },
      {
        name: "execute-run",
        description: "Trigger execution for an approved run through the execution coordinator.",
        category: "actions",
        examples: ["execute-run --runId run_123", "execute-run --runId run_123 --mode auto --json"],
      },
      {
        name: "resume-run",
        description: "Resume a run through the execution resumer.",
        category: "actions",
        examples: ["resume-run --runId run_123", "resume-run --runId run_123 --mode auto --json"],
      },
      {
        name: "seed-demo",
        description: "Generate a demo dataset covering all key run lifecycle states.",
        category: "setup",
        examples: ["seed-demo", "seed-demo --json"],
      },
      {
        name: "assistant-setup",
        description: "Initialize runtime directories and validate the current local assistant install path.",
        category: "setup",
        examples: ["assistant-setup", "assistant-setup --json"],
      },
      {
        name: "assistant-doctor",
        description: "Report whether the assistant is actually ready to use on the current Ollama/local-first path.",
        category: "setup",
        examples: ["assistant-doctor", "assistant-doctor --json"],
      },
    ];
  }

  private getAliasEntries(): HelpAliasEntry[] {
    return [
      { alias: "dash",    target: "dashboard",        description: "Shortcut for dashboard"        },
      { alias: "doctor",  target: "healthcheck",      description: "Shortcut for healthcheck"      },
      { alias: "assistant-chat", target: "assistant-shell", description: "Shortcut for assistant-shell" },
      { alias: "list-deliverables", target: "deliverables", description: "Shortcut for deliverables" },
      { alias: "tools", target: "tool-registry", description: "Shortcut for tool-registry" },
      { alias: "console", target: "operator-console", description: "Shortcut for operator-console" },
      { alias: "approve", target: "approve-run",      description: "Shortcut for approve-run"      },
      { alias: "exec",    target: "execute-run",      description: "Shortcut for execute-run"      },
      { alias: "resume",  target: "resume-run",       description: "Shortcut for resume-run"       },
    ];
  }

  private renderHumanHelp(commands: HelpCommandEntry[], aliases: HelpAliasEntry[]): void {
    console.log("AJ DIGITAL OS HELP");
    console.log("==================");

    this.renderCategory("Overview", commands, "overview");
    this.renderCategory("Inspection", commands, "inspection");
    this.renderCategory("Queues", commands, "queues");
    this.renderCategory("Actions", commands, "actions");
    this.renderCategory("Setup", commands, "setup");
    this.renderCategory("Architecture", commands, "architecture");
    this.renderAliases(aliases);

    console.log("");
    console.log("Recommended Flow");
    console.log("1. console --watch");
    console.log("2. list-pending-approvals");
    console.log("3. approve --runId <id> --decision approve");
    console.log("4. exec --runId <id>");
    console.log("5. run-summary --runId <id>");

    console.log("");
    console.log("JSON Mode");
    console.log("- help --json");
    console.log("");
    console.log("Live Provider Scope");
    console.log("- Ollama/local-first is the supported model-backed launch path in this stage.");
    console.log("- Other providers remain scaffold-only unless implemented and validated.");
  }

  private renderCategory(
    title: string,
    commands: HelpCommandEntry[],
    category: HelpCommandEntry["category"],
  ): void {
    const filtered = commands.filter((entry) => entry.category === category);
    if (filtered.length === 0) {
      return;
    }

    console.log("");
    console.log(title);

    for (const command of filtered) {
      console.log(`- ${this.formatCommandLine(command.name, command.description)}`);
      for (const example of command.examples) {
        console.log(`  ${example}`);
      }
    }
  }

  private renderAliases(aliases: HelpAliasEntry[]): void {
    console.log("");
    console.log("Aliases");

    for (const entry of aliases) {
      console.log(`- ${entry.alias.padEnd(10, " ")}→  ${entry.target}`);
    }
  }

  private formatCommandLine(name: string, description: string): string {
    return `${name.padEnd(28, " ")}${description}`;
  }

  private printJson(payload: unknown): void {
    console.log(JSON.stringify(payload, null, 2));
  }
}
