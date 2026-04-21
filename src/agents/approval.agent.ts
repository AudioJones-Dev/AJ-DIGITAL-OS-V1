import { ApprovalPacketSchema, type ApprovalPacket } from "../schemas/approval-packet.schema.js";
import { TelegramTool } from "../tools/telegram.tool.js";
import { config } from "../core/config.js";

export interface ApprovalResult {
  status: "pending" | "approved" | "rejected";
  messageId?: number;
  warnings: string[];
  errors: string[];
}

/**
 * Prepares and sends approval packets through Telegram.
 */
export class ApprovalAgent {
  private readonly telegram: TelegramTool;

  constructor(telegram = new TelegramTool()) {
    this.telegram = telegram;
  }

  /**
   * Sends an approval request and returns the initial approval state.
   */
  async requestApproval(packet: ApprovalPacket): Promise<ApprovalResult> {
    const parsedPacket = ApprovalPacketSchema.safeParse(packet);
    if (!parsedPacket.success) {
      return {
        status: "pending",
        warnings: [],
        errors: parsedPacket.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`),
      };
    }

    const message = this.formatMessage(parsedPacket.data);
    const chatId = config.telegramChatId;

    const response = await this.telegram.sendMessage({
      chatId,
      text: message,
    });

    if (!response.ok) {
      return {
        status: "pending",
        warnings: [],
        errors: [response.error ?? "Telegram send failed"],
      };
    }

    return response.messageId === undefined
      ? {
          status: "pending",
          warnings: [],
          errors: [],
        }
      : {
          status: "pending",
          messageId: response.messageId,
          warnings: [],
          errors: [],
        };
  }

  private formatMessage(packet: ApprovalPacket): string {
    const preview = packet.artifactPreview.slice(0, 500);

    return [
      "*Approval Required*",
      "",
      `*Run ID:* ${escapeMarkdown(packet.runId)}`,
      `*Client:* ${escapeMarkdown(packet.clientId)}`,
      `*Workflow:* ${escapeMarkdown(packet.workflowId)}`,
      `*Title:* ${escapeMarkdown(packet.title)}`,
      "",
      "*Summary:*",
      escapeMarkdown(packet.summary),
      "",
      "*Preview:*",
      escapeMarkdown(preview),
      "",
      "*Actions:*",
      packet.decisionOptions.map(formatDecisionOption).join(" | "),
    ].join("\n");
  }
}

const formatDecisionOption = (option: ApprovalPacket["decisionOptions"][number]): string => {
  switch (option) {
    case "request_revision":
      return "Revise";
    case "approve":
      return "Approve";
    case "reject":
      return "Reject";
  }
};

const escapeMarkdown = (value: string): string => value.replace(/([_\*\[\]()~`>#+\-=|{}.!])/g, "\\$1");
