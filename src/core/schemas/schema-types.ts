/**
 * Operating Core — Schema Registry v1 types
 */

import { z } from "zod";

export interface SchemaRegistration {
  name: string;
  version: string;
  schema: z.ZodTypeAny;
}

export interface SchemaSummary {
  name: string;
  version: string;
}

export interface SchemaValidationResult {
  valid: boolean;
  errors?: string[];
}
