import type { ConnectorAdapter } from "../connector-types.js";
import { GoogleDriveConnector } from "./google-drive.connector.js";
import { GmailConnector } from "./gmail.connector.js";
import { GoogleCalendarConnector } from "./google-calendar.connector.js";
import { GitHubConnector } from "./github.connector.js";
import { AirtableConnector } from "./airtable.connector.js";
import { WebhookConnector } from "./webhook.connector.js";

export const CONNECTOR_ADAPTERS: Map<string, ConnectorAdapter> = new Map([
  ["google-drive", GoogleDriveConnector],
  ["gmail", GmailConnector],
  ["google-calendar", GoogleCalendarConnector],
  ["github", GitHubConnector],
  ["airtable", AirtableConnector],
  ["webhook", WebhookConnector],
]);

export const DEFAULT_CONNECTORS = [
  GoogleDriveConnector.connector,
  GmailConnector.connector,
  GoogleCalendarConnector.connector,
  GitHubConnector.connector,
  AirtableConnector.connector,
  WebhookConnector.connector,
];

export {
  GoogleDriveConnector,
  GmailConnector,
  GoogleCalendarConnector,
  GitHubConnector,
  AirtableConnector,
  WebhookConnector,
};
