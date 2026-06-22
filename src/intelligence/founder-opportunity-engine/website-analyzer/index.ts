import { chromium, type Browser, type Page, type Route } from "playwright";

import type { FounderDisqualifier, FounderSignal, FounderSignalType } from "../types.js";
import {
  anyHostnameMatches,
  hostnameFromUrl,
  type VendorDomainConfig,
} from "./vendor-domain-config.js";
import type {
  RenderedViewportSnapshot,
  RenderedWebsiteSnapshot,
  WebsiteAnalysisResult,
  WebsiteAnalyzer,
  WebsiteAnalyzerInput,
  WebsiteCheckResult,
  WebsiteCheckState,
  WebsiteFormSnapshot,
  WebsiteLinkSnapshot,
} from "./types.js";

export type {
  RenderedViewportSnapshot,
  RenderedWebsiteSnapshot,
  WebsiteAnalysisResult,
  WebsiteAnalyzer,
  WebsiteAnalyzerInput,
  WebsiteCheckResult,
  WebsiteCheckState,
  WebsiteFormSnapshot,
  WebsiteLinkSnapshot,
} from "./types.js";
export {
  DEFAULT_VENDOR_DOMAIN_CONFIG_PATH,
  anyHostnameMatches,
  hostnameFromUrl,
  hostnameMatchesDomain,
  loadVendorDomainConfig,
  normalizeVendorDomainConfig,
  type VendorDomainConfig,
} from "./vendor-domain-config.js";

const SIGNAL_SCORES: Partial<Record<FounderSignalType, number>> = {
  NO_ONLINE_BOOKING: 10,
  NO_CHAT: 10,
  FOLLOWUP_GAP: 5,
  NO_CLICK_TO_CALL: 5,
  OWNER_OPERATED: 10,
  REACHABLE_CONTACT_INFO: 5,
};

const BOOKING_CTA_PATTERN = /\b(book|booking|schedule|appointment|reserve)\b/i;
const OWNER_PATTERN = /\b(owner|founder|locally owned|family owned|owner-operated|owner operated)\b/i;

export interface PlaywrightWebsiteAnalyzerOptions {
  vendorConfig: VendorDomainConfig;
  timeoutMs?: number;
  widgetMountDelayMs?: number;
}

export class PlaywrightWebsiteAnalyzer implements WebsiteAnalyzer {
  private readonly timeoutMs: number;
  private readonly widgetMountDelayMs: number;

  constructor(private readonly options: PlaywrightWebsiteAnalyzerOptions) {
    this.timeoutMs = options.timeoutMs ?? 20_000;
    this.widgetMountDelayMs = options.widgetMountDelayMs ?? 4_000;
  }

  async analyze(input: WebsiteAnalyzerInput): Promise<WebsiteAnalysisResult> {
    const analyzedUrl = input.url ?? `https://${input.domain}`;
    const browser = await chromium.launch({ headless: true });
    try {
      const networkDomains = new Set<string>();
      const desktop = await this.renderViewport(browser, analyzedUrl, networkDomains, 1366, 900);
      const mobile = await this.renderViewport(browser, analyzedUrl, networkDomains, 390, 844);
      return analyzeWebsiteSnapshot(
        {
          domain: input.domain,
          url: analyzedUrl,
          networkDomains: Array.from(networkDomains).sort(),
          siteReachable: desktop.renderSucceeded || mobile.renderSucceeded ? "PRESENT" : "UNKNOWN",
          sslValid: analyzedUrl.startsWith("https://") ? "PRESENT" : "ABSENT",
          desktop,
          mobile,
        },
        this.options.vendorConfig,
      );
    } finally {
      await browser.close();
    }
  }

  private async renderViewport(
    browser: Browser,
    url: string,
    networkDomains: Set<string>,
    width: number,
    height: number,
  ): Promise<RenderedViewportSnapshot> {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.route("**/*", (route: Route) => {
      const hostname = hostnameFromUrl(route.request().url());
      if (hostname) {
        networkDomains.add(hostname);
      }
      void route.continue();
    });

    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: this.timeoutMs });
      await page.waitForTimeout(this.widgetMountDelayMs);
      return pageToSnapshot(page, true);
    } catch {
      return {
        renderSucceeded: false,
        html: "",
        text: "",
        links: [],
        forms: [],
        hasViewportMeta: false,
        hasHorizontalOverflow: false,
      };
    } finally {
      await page.close();
    }
  }
}

export function analyzeWebsiteSnapshot(
  snapshot: RenderedWebsiteSnapshot,
  vendorConfig: VendorDomainConfig,
  now = new Date(),
): WebsiteAnalysisResult {
  const derivedAt = now.toISOString();
  const renderSucceeded = snapshot.desktop.renderSucceeded || snapshot.mobile.renderSucceeded;
  const fullRenderSucceeded = snapshot.desktop.renderSucceeded && snapshot.mobile.renderSucceeded;
  const networkDomains = snapshot.networkDomains;
  const allLinks = [...snapshot.desktop.links, ...snapshot.mobile.links];
  const allForms = [...snapshot.desktop.forms, ...snapshot.mobile.forms];
  const allText = `${snapshot.desktop.text}\n${snapshot.mobile.text}`;

  const bookingPresent =
    anyHostnameMatches(networkDomains, vendorConfig.booking) ||
    linkToVendor(allLinks, vendorConfig.booking, BOOKING_CTA_PATTERN);
  const chatPresent = anyHostnameMatches(networkDomains, vendorConfig.chat);
  const aiReceptionistPresent = anyHostnameMatches(networkDomains, vendorConfig.aiReceptionist);
  const contactFormPresent = allForms.some(formLooksLikeContact);
  const clickToCallPresent = allLinks.some((link) => link.href.trim().toLowerCase().startsWith("tel:"));
  const ownerOperatedPresent = OWNER_PATTERN.test(allText);

  const onlineBooking = presenceCheck(
    fullRenderSucceeded,
    bookingPresent,
    "Known booking vendor or scheduler CTA detected.",
    "No scheduler vendor detected after full desktop and mobile render.",
    "Booking could not be determined because one or more renders failed.",
  );
  const chat = presenceCheck(
    fullRenderSucceeded,
    chatPresent,
    "Known chat or instant-response vendor detected.",
    "No known chat vendor detected after full desktop and mobile render.",
    "Chat could not be determined because one or more renders failed.",
  );
  const contactForm = presenceCheck(
    renderSucceeded,
    contactFormPresent,
    "Contact form detected in rendered markup.",
    "No contact form detected in rendered markup.",
    "Contact form could not be determined because render failed.",
  );
  const clickToCall = presenceCheck(
    renderSucceeded,
    clickToCallPresent,
    "Click-to-call link detected.",
    "No tel: click-to-call link detected.",
    "Click-to-call could not be determined because render failed.",
  );
  const alreadySolved = presenceCheck(
    fullRenderSucceeded,
    (bookingPresent && chatPresent) || aiReceptionistPresent,
    "Booking plus chat or answering vendor is already present.",
    "No already-solved vendor combination detected.",
    "Already-solved status could not be determined because one or more renders failed.",
  );
  const ownerOperated = presenceCheck(
    renderSucceeded,
    ownerOperatedPresent,
    "Owner or founder language detected on the rendered website.",
    "No owner or founder language detected on the rendered website.",
    "Owner-operated fit could not be determined because render failed.",
  );

  const mobileResponsive = mobileResponsiveCheck(snapshot);
  const sslValid = {
    state: snapshot.sslValid ?? "UNKNOWN",
    rationale: snapshot.sslValid === "PRESENT"
      ? "HTTPS resolved for the analyzed URL."
      : snapshot.sslValid === "ABSENT"
        ? "HTTPS was not confirmed for the analyzed URL."
        : "SSL validity was not checked.",
  } satisfies WebsiteCheckResult;
  const staleWebsite = staleWebsiteCheck(snapshot, now);
  const siteReachable = {
    state: snapshot.siteReachable ?? (renderSucceeded ? "PRESENT" : "UNKNOWN"),
    rationale: renderSucceeded
      ? "At least one viewport rendered successfully."
      : "No successful rendered viewport was available.",
  } satisfies WebsiteCheckResult;

  const signals: FounderSignal[] = [];
  const disqualifiers: FounderDisqualifier[] = [];

  addAbsentSignal(signals, onlineBooking, "NO_ONLINE_BOOKING", derivedAt, onlineBooking.rationale);
  addAbsentSignal(signals, chat, "NO_CHAT", derivedAt, chat.rationale);
  if (contactForm.state === "PRESENT" && onlineBooking.state === "ABSENT" && chat.state === "ABSENT") {
    signals.push(createSignal("FOLLOWUP_GAP", derivedAt, "Contact form appears to be the only website response path."));
  }
  addAbsentSignal(signals, clickToCall, "NO_CLICK_TO_CALL", derivedAt, clickToCall.rationale);
  if (mobileResponsive.state === "ABSENT" || sslValid.state === "ABSENT" || staleWebsite.state === "PRESENT") {
    signals.push(createSignal("WEAK_WEBSITE", derivedAt, "Website maturity signal fired from SSL, mobile, or staleness checks.", 0));
  }
  if (alreadySolved.state === "PRESENT") {
    signals.push(createSignal("ALREADY_SOLVED", derivedAt, alreadySolved.rationale, 0));
    disqualifiers.push({
      code: "ALREADY_SOLVED",
      reason: alreadySolved.rationale,
    });
  }
  if (ownerOperated.state === "PRESENT") {
    signals.push(createSignal("OWNER_OPERATED", derivedAt, ownerOperated.rationale));
  }
  if (clickToCall.state === "PRESENT" || contactForm.state === "PRESENT") {
    signals.push(createSignal("REACHABLE_CONTACT_INFO", derivedAt, "Website exposes reachable contact information."));
  }

  return {
    domain: snapshot.domain,
    analyzedUrl: snapshot.url,
    analyzedAt: derivedAt,
    checks: {
      siteReachable,
      sslValid,
      mobileResponsive,
      onlineBooking,
      chat,
      contactForm,
      clickToCall,
      staleWebsite,
      alreadySolved,
      ownerOperated,
    },
    signals,
    disqualifiers,
    networkDomains,
  };
}

async function pageToSnapshot(page: Page, renderSucceeded: boolean): Promise<RenderedViewportSnapshot> {
  return page.evaluate((success) => {
    const links = Array.from(document.querySelectorAll("a")).map((anchor) => ({
      href: anchor.getAttribute("href") ?? "",
      text: anchor.textContent ?? "",
    }));
    const forms = Array.from(document.querySelectorAll("form")).map((form) => ({
      fieldNames: Array.from(form.querySelectorAll("input, textarea, select")).map((field) =>
        [
          field.getAttribute("name"),
          field.getAttribute("id"),
          field.getAttribute("placeholder"),
          field.getAttribute("aria-label"),
        ]
          .filter(Boolean)
          .join(" "),
      ),
      text: form.textContent ?? "",
    }));

    return {
      renderSucceeded: success,
      html: document.documentElement.outerHTML,
      text: document.body.innerText ?? "",
      links,
      forms,
      hasViewportMeta: Boolean(document.querySelector('meta[name="viewport"]')),
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 8,
    };
  }, renderSucceeded);
}

function linkToVendor(
  links: readonly WebsiteLinkSnapshot[],
  vendorDomains: readonly string[],
  textPattern: RegExp,
): boolean {
  return links.some((link) => {
    const hostname = hostnameFromUrl(link.href);
    if (!hostname) {
      return false;
    }
    return textPattern.test(link.text) && anyHostnameMatches([hostname], vendorDomains);
  });
}

function formLooksLikeContact(form: WebsiteFormSnapshot): boolean {
  const searchable = `${form.text} ${form.fieldNames.join(" ")}`.toLowerCase();
  return /email|message|phone|name|contact/.test(searchable);
}

function presenceCheck(
  renderSucceeded: boolean,
  present: boolean,
  presentRationale: string,
  absentRationale: string,
  unknownRationale: string,
): WebsiteCheckResult {
  if (!renderSucceeded) {
    return { state: "UNKNOWN", rationale: unknownRationale };
  }
  return present
    ? { state: "PRESENT", rationale: presentRationale }
    : { state: "ABSENT", rationale: absentRationale };
}

function mobileResponsiveCheck(snapshot: RenderedWebsiteSnapshot): WebsiteCheckResult {
  if (!snapshot.mobile.renderSucceeded) {
    return {
      state: "UNKNOWN",
      rationale: "Mobile responsiveness could not be determined because mobile render failed.",
    };
  }

  if (snapshot.mobile.hasViewportMeta && !snapshot.mobile.hasHorizontalOverflow) {
    return {
      state: "PRESENT",
      rationale: "Mobile viewport meta is present and no horizontal overflow was detected.",
    };
  }

  return {
    state: "ABSENT",
    rationale: "Mobile render is missing viewport support or shows horizontal overflow.",
  };
}

function staleWebsiteCheck(snapshot: RenderedWebsiteSnapshot, now: Date): WebsiteCheckResult {
  const year = snapshot.footerCopyrightYear;
  if (year === undefined) {
    return {
      state: "UNKNOWN",
      rationale: "Website staleness could not be determined from available metadata.",
    };
  }

  const stale = now.getUTCFullYear() - year >= 2;
  return stale
    ? { state: "PRESENT", rationale: "Footer copyright appears stale." }
    : { state: "ABSENT", rationale: "Footer copyright does not appear stale." };
}

function addAbsentSignal(
  signals: FounderSignal[],
  check: WebsiteCheckResult,
  type: FounderSignalType,
  derivedAt: string,
  rationale: string,
): void {
  if (check.state === "ABSENT") {
    signals.push(createSignal(type, derivedAt, rationale));
  }
}

function createSignal(
  type: FounderSignalType,
  derivedAt: string,
  rationale: string,
  score = SIGNAL_SCORES[type] ?? 0,
): FounderSignal {
  return {
    type,
    score,
    source: "website-analyzer",
    derivedAt,
    rationale,
  };
}
