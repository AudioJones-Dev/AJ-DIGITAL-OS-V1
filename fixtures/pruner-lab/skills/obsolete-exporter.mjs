#!/usr/bin/env node
// DECOY: executable-looking skill support code with no importers.
// skills/** is protected in the AJ Digital OS profile, so this is excluded.
export function exportLegacyReport(rows) {
  return rows.map((row) => JSON.stringify(row)).join("\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log(exportLegacyReport([]));
}
