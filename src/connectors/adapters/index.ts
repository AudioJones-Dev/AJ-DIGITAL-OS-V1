import type { ConnectorAdapter } from "../connector-types.js";
import { GoogleDriveConnector } from "./google-drive.connector.js";
import { GmailConnector } from "./gmail.connector.js";
import { GoogleCalendarConnector } from "./google-calendar.connector.js";
import { GitHubConnector } from "./github.connector.js";
import { AirtableConnector } from "./airtable.connector.js";
import { WebhookConnector } from "./webhook.connector.js";
import { ResendConnector } from "./resend.connector.js";
import { PostizConnector } from "./postiz.connector.js";
import { CanvaConnector } from "./canva.connector.js";
import { MetaOrganicConnector } from "./meta-organic.connector.js";
import { GoogleAdsConnector } from "./google-ads.connector.js";

export const CONNECTOR_ADAPTERS: Map<string, ConnectorAdapter> = new Map([
  ["google-drive", GoogleDriveConnector],
  ["gmail", GmailConnector],
  ["google-calendar", GoogleCalendarConnector],
  ["github", GitHubConnector],
  ["airtable", AirtableConnector],
  ["webhook", WebhookConnector],
  ["resend", ResendConnector],
  // Social Ops Phase 1 — disabled-by-default stubs
  ["postiz", PostizConnector],
  ["canva", CanvaConnector],
  ["meta-organic", MetaOrganicConnector],
  ["google-ads", GoogleAdsConnector],
]);

export const DEFAULT_CONNECTORS = [
  GoogleDriveConnector.connector,
  GmailConnector.connector,
  GoogleCalendarConnector.connector,
  GitHubConnector.connector,
  AirtableConnector.connector,
  WebhookConnector.connector,
  ResendConnector.connector,
  // Social Ops Phase 1 — disabled-by-default stubs
  PostizConnector.connector,
  CanvaConnector.connector,
  MetaOrganicConnector.connector,
  GoogleAdsConnector.connector,
];

export {
  GoogleDriveConnector,
  GmailConnector,
  GoogleCalendarConnector,
  GitHubConnector,
  AirtableConnector,
  WebhookConnector,
  ResendConnector,
  PostizConnector,
  CanvaConnector,
  MetaOrganicConnector,
  GoogleAdsConnector,
};
