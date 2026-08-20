// Reached ONLY via dynamic import in src/lib/dynamic-loader.ts.
// Knip will report this as unused. It is not.
import type { NormalizedLine } from "../lib/types";

export default function csvExport(lines: NormalizedLine[]): string {
  return lines.map((l) => [l.sku, l.qty, l.total].join(",")).join("\n");
}
