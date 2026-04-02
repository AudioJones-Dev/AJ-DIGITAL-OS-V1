import { z } from "zod";

export const ValidationCheckSchema = z.object({
  name: z.string().min(1),
  status: z.enum(["pass", "fail", "warning"]),
  notes: z.string().optional(),
});

export const ValidationReportSchema = z.object({
  ok: z.boolean(),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  checks: z.array(ValidationCheckSchema),
});

export type ValidationReport = z.infer<typeof ValidationReportSchema>;
