import type { IntegrationAuthStrategy } from "../types/integration-config.types.js";
import type { TaskCategoryId } from "../types/task-category.types.js";

export type ConnectorKind =
  | "email"
  | "calendar"
  | "files"
  | "social"
  | "messaging-account"
  | "crm";

export interface ConnectorDefinition {
  id: string;
  kind: ConnectorKind;
  displayName: string;
  description: string;
  authStrategy: IntegrationAuthStrategy;
  supportedOperations: string[];
  requiredScopes: string[];
  defaultTaskCategories: TaskCategoryId[];
  settingsSchemaId?: string | undefined;
  metadata: Record<string, unknown>;
}
