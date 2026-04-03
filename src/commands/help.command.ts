export interface HelpCommandInput {
  json?: boolean;
}

export interface HelpCommandEntry {
  name: string;
  description: string;
  category: "overview" | "inspection" | "queues" | "actions" | "setup";
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
        name: "dashboard",
        description: "Show system-wide run metrics and recent activity.",
        category: "overview",
        examples: ["dashboard", "dashboard --limit 10", "dashboard --json"],
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
        examples: ["list-executed-runs", "list-executed-runs --limit 5", "list-executed-runs --json"],
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
    ];
  }

  private getAliasEntries(): HelpAliasEntry[] {
    return [
      { alias: "dash",    target: "dashboard",        description: "Shortcut for dashboard"        },
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
    return `${name.padEnd(24, " ")}${description}`;
  }

  private printJson(payload: unknown): void {
    console.log(JSON.stringify(payload, null, 2));
  }
}
