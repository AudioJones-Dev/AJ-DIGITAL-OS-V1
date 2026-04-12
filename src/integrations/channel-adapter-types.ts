import type { TaskCategoryId } from "../types/task-category.types.js";

export type ChannelAdapterTransport = "terminal" | "messaging" | "web";
export type ChannelAdapterId =
  | "assistant-shell"
  | "local-web-chat"
  | "discord"
  | "telegram"
  | "whatsapp";

export interface ChannelAdapterDefinition {
  id: ChannelAdapterId | string;
  displayName: string;
  transport: ChannelAdapterTransport;
  description: string;
  inboundMessageTypes: string[];
  outboundMessageTypes: string[];
  supportsAttachments: boolean;
  supportsThreading: boolean;
  supportsTypingIndicators: boolean;
  defaultTaskCategory: TaskCategoryId;
  metadata: Record<string, unknown>;
}
