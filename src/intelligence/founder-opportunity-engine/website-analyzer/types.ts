import type { FounderDisqualifier, FounderSignal } from "../types.js";

export type WebsiteCheckState = "PRESENT" | "ABSENT" | "UNKNOWN";

export interface WebsiteCheckResult {
  state: WebsiteCheckState;
  rationale: string;
}

export interface WebsiteAnalyzerInput {
  domain: string;
  url?: string;
}

export interface WebsiteAnalyzer {
  analyze(input: WebsiteAnalyzerInput): Promise<WebsiteAnalysisResult>;
}

export interface WebsiteAnalysisResult {
  domain: string;
  analyzedUrl: string;
  analyzedAt: string;
  checks: {
    siteReachable: WebsiteCheckResult;
    sslValid: WebsiteCheckResult;
    mobileResponsive: WebsiteCheckResult;
    onlineBooking: WebsiteCheckResult;
    chat: WebsiteCheckResult;
    contactForm: WebsiteCheckResult;
    clickToCall: WebsiteCheckResult;
    staleWebsite: WebsiteCheckResult;
    alreadySolved: WebsiteCheckResult;
    ownerOperated: WebsiteCheckResult;
  };
  signals: FounderSignal[];
  disqualifiers: FounderDisqualifier[];
  networkDomains: string[];
}

export interface RenderedWebsiteSnapshot {
  domain: string;
  url: string;
  networkDomains: string[];
  siteReachable?: WebsiteCheckState;
  sslValid?: WebsiteCheckState;
  footerCopyrightYear?: number;
  latestContentDate?: string;
  desktop: RenderedViewportSnapshot;
  mobile: RenderedViewportSnapshot;
}

export interface RenderedViewportSnapshot {
  renderSucceeded: boolean;
  html: string;
  text: string;
  links: WebsiteLinkSnapshot[];
  forms: WebsiteFormSnapshot[];
  hasViewportMeta: boolean;
  hasHorizontalOverflow: boolean;
}

export interface WebsiteLinkSnapshot {
  href: string;
  text: string;
}

export interface WebsiteFormSnapshot {
  fieldNames: string[];
  text: string;
}
