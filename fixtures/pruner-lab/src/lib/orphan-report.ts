// Nothing imports this file. Its basename appears nowhere else in the repo.
import type { NormalizedLine } from "./types";

export function buildLegacyReport(lines: NormalizedLine[]): string {
  const header = "SKU\tQTY\tTOTAL";
  const rows = lines.map((l) => `${l.sku}\t${l.qty}\t${l.total.toFixed(2)}`);
  return [header, ...rows].join("\n");
}

export function legacyReportFooter(count: number): string {
  return `-- ${count} line(s) --`;
}
