import { describe, expect, it } from "vitest";

import {
  analyzeWebsiteSnapshot,
  type RenderedWebsiteSnapshot,
  type VendorDomainConfig,
} from "../../../src/intelligence/founder-opportunity-engine/website-analyzer/index.js";

const vendorConfig: VendorDomainConfig = {
  booking: ["calendly.com"],
  chat: ["tawk.to"],
  aiReceptionist: ["smith.ai"],
};

describe("website analyzer snapshot logic", () => {
  it("returns UNKNOWN instead of ABSENT when render fails", () => {
    const result = analyzeWebsiteSnapshot(
      {
        domain: "example.test",
        url: "https://example.test",
        networkDomains: [],
        siteReachable: "UNKNOWN",
        sslValid: "UNKNOWN",
        desktop: failedViewport(),
        mobile: failedViewport(),
      },
      vendorConfig,
      new Date("2026-06-18T12:00:00.000Z"),
    );

    expect(result.checks.onlineBooking.state).toBe("UNKNOWN");
    expect(result.checks.chat.state).toBe("UNKNOWN");
    expect(result.signals.map((signal) => signal.type)).not.toContain("NO_ONLINE_BOOKING");
    expect(result.signals.map((signal) => signal.type)).not.toContain("NO_CHAT");
  });

  it("separates booking, chat, contact forms, and click-to-call", () => {
    const snapshot: RenderedWebsiteSnapshot = {
      domain: "example.test",
      url: "https://example.test",
      networkDomains: [],
      siteReachable: "PRESENT",
      sslValid: "PRESENT",
      desktop: {
        renderSucceeded: true,
        html: "<html></html>",
        text: "Family owned service business",
        links: [],
        forms: [{ fieldNames: ["name", "email", "message"], text: "Contact us" }],
        hasViewportMeta: true,
        hasHorizontalOverflow: false,
      },
      mobile: {
        renderSucceeded: true,
        html: "<html></html>",
        text: "Family owned service business",
        links: [],
        forms: [{ fieldNames: ["name", "email", "message"], text: "Contact us" }],
        hasViewportMeta: true,
        hasHorizontalOverflow: false,
      },
    };

    const result = analyzeWebsiteSnapshot(snapshot, vendorConfig, new Date("2026-06-18T12:00:00.000Z"));
    const signalTypes = result.signals.map((signal) => signal.type);

    expect(result.checks.contactForm.state).toBe("PRESENT");
    expect(result.checks.onlineBooking.state).toBe("ABSENT");
    expect(result.checks.chat.state).toBe("ABSENT");
    expect(signalTypes).toEqual(
      expect.arrayContaining([
        "NO_ONLINE_BOOKING",
        "NO_CHAT",
        "FOLLOWUP_GAP",
        "NO_CLICK_TO_CALL",
        "OWNER_OPERATED",
        "REACHABLE_CONTACT_INFO",
      ]),
    );
  });
});

function failedViewport() {
  return {
    renderSucceeded: false,
    html: "",
    text: "",
    links: [],
    forms: [],
    hasViewportMeta: false,
    hasHorizontalOverflow: false,
  };
}
