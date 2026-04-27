import { AjOsCliAdapter } from "../adapters/ajos-cli.adapter.js";
import { TelegramAuthService } from "../auth/telegram-auth.js";
import { ControlPlaneHealthService } from "../observability/health.service.js";
import type {
  CommandExecutionResult,
  ParsedTelegramCommand,
  TelegramInboundMessage,
} from "../types/control-plane.types.js";

export class TaskRouter {
  private lastProcessedCommandAt?: string;

  constructor(
    private readonly authService = new TelegramAuthService(),
    private readonly healthService = new ControlPlaneHealthService(authService),
    private readonly cliAdapter = new AjOsCliAdapter(),
  ) {}

  authorize(message: TelegramInboundMessage) {
    return this.authService.authorize(message.telegramUserId, message.telegramChatId);
  }

  async route(parsed: ParsedTelegramCommand): Promise<CommandExecutionResult> {
    this.lastProcessedCommandAt = new Date().toISOString();

    if (parsed.command === "help") {
      return {
        ok: true,
        responseText: [
          "Supported commands:",
          "- /help — show commands",
          "- /status — show local control plane status",
          "- /ops dashboard — show AJ OS dashboard",
          "- /ops pending — show pending approvals",
          "- /ops track <runId> — inspect a run",
        ].join("\n"),
      };
    }

    if (parsed.command === "status") {
      const health = await this.healthService.validateStartup();
      return {
        ok: true,
        responseText: [
          "Status:",
          "- Control plane: running",
          `- Telegram auth: ${health.checks.allowlistConfigured ? "ok" : "invalid"}`,
          `- AJ OS CLI: ${health.checks.cliAvailable ? "available" : "unavailable"}`,
          `- Model drive: ${health.checks.modelRootMounted}`,
          `- Last command: ${this.lastProcessedCommandAt ?? "none"}`,
        ].join("\n"),
      };
    }

    if (parsed.command === "ops-dashboard") {
      const cliResult = await this.cliAdapter.execute("ops-dashboard");
      return {
        ok: cliResult.ok,
        responseText: this.summarizeDashboard(cliResult.stdout, cliResult.stderr),
      };
    }

    if (parsed.command === "ops-pending") {
      const cliResult = await this.cliAdapter.execute("ops-pending");
      return {
        ok: cliResult.ok,
        responseText: this.summarizePending(cliResult.stdout, cliResult.stderr),
      };
    }

    if (parsed.command === "ops-track") {
      const cliResult = await this.cliAdapter.execute("ops-track", parsed.args.runId);
      return {
        ok: cliResult.ok,
        responseText: this.summarizeTrack(parsed.args.runId ?? "", cliResult.stdout, cliResult.stderr),
      };
    }

    return {
      ok: false,
      responseText: "Unsupported command.",
    };
  }

  private summarizeDashboard(stdout: string, stderr: string): string {
    const parsed = tryJsonParse(stdout);
    if (parsed && typeof parsed === "object" && "counts" in parsed) {
      const counts = (parsed as { counts?: Record<string, number> }).counts ?? {};
      return [
        "Dashboard:",
        `- Queued: ${counts.queued ?? 0}`,
        `- Pending Approval: ${counts.pendingApproval ?? 0}`,
        `- Approved: ${counts.approved ?? 0}`,
        `- Executed: ${counts.executed ?? 0}`,
        `- Failed: ${counts.failed ?? 0}`,
      ].join("\n");
    }

    return this.compactFallback("Dashboard", stdout, stderr);
  }

  private summarizePending(stdout: string, stderr: string): string {
    const parsed = tryJsonParse(stdout);
    if (parsed && typeof parsed === "object" && "totalPending" in parsed) {
      const totalPending = Number((parsed as { totalPending?: number }).totalPending ?? 0);
      const pendingApprovals = (parsed as { pendingApprovals?: Array<{ runId?: string }> }).pendingApprovals ?? [];
      const topRuns = pendingApprovals.slice(0, 5).map((item) => item.runId ?? "unknown");

      return [
        `Pending approvals: ${totalPending}`,
        ...(topRuns.length > 0 ? ["Top runs:", ...topRuns.map((runId) => `- ${runId}`)] : ["Top runs:", "- None"]),
      ].join("\n");
    }

    return this.compactFallback("Pending approvals", stdout, stderr);
  }

  private summarizeTrack(runId: string, stdout: string, stderr: string): string {
    const parsed = tryJsonParse(stdout);
    if (parsed && typeof parsed === "object") {
      const summary = (parsed as { summary?: Record<string, unknown> }).summary;
      if (summary) {
        return [
          `Run ${runId}`,
          `- Status: ${readString(summary, "status") ?? "unknown"}`,
          `- Approval: ${readString(summary, "approvalStatus") ?? "unknown"}`,
          `- Updated: ${readString(summary, "updatedAt") ?? "unknown"}`,
        ].join("\n");
      }
    }

    return this.compactFallback(`Run ${runId}`, stdout, stderr);
  }

  private compactFallback(title: string, stdout: string, stderr: string): string {
    const candidate = stdout.trim().length > 0 ? stdout.trim() : stderr.trim();
    const lines = candidate.split("\n").slice(0, 8);
    return `${title}:\n${lines.join("\n") || "No output."}`;
  }
}

function tryJsonParse(value: string): unknown | undefined {
  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return undefined;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return undefined;
  }
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" ? value : undefined;
}
