import { describe, expect, it } from "vitest";

import { classifyAgentAction } from "../../../src/security/permissions/action-classifier.js";

describe("action classifier", () => {
  it("classifies MCP tool call", () => {
    const result = classifyAgentAction({
      agentId: "claude-code",
      actionType: "mcp_tool_call",
      toolName: "filesystem-read",
      target: "docs/system",
      clientId: null,
    });

    expect(result.category).toBe("MCP_TOOL_CALL");
    expect(result.risk).toBe("medium");
  });

  it("requires approval for browser purchase/send/delete style actions", () => {
    const result = classifyAgentAction({
      agentId: "claude-code",
      actionType: "browser_action",
      browserAction: "click_purchase_button",
      target: "checkout confirmation",
      clientId: null,
    });

    expect(result.category).toBe("BROWSER_ACTION");
    expect(result.requiresApproval).toBe(true);
    expect(result.risk).toBe("high");
  });
});
