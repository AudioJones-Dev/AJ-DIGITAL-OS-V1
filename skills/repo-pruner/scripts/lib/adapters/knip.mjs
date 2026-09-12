import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { normalizeRepoPath } from "../normalize.mjs";
import { writePrunerFile } from "../output.mjs";
import { assertPinnedPackage } from "../detector-runtime.mjs";

const location = (repoRoot, path, line = null) => ({
  path: normalizeRepoPath(repoRoot, path),
  line_start: Number.isInteger(line) ? line : null,
  line_end: Number.isInteger(line) ? line : null,
});

export async function runKnipAdapter(repoRoot) {
  const resolvedPackage = await assertPinnedPackage("knip");
  const previousRawTransfer = process.env.KNIP_DISABLE_RAW_TRANSFER;
  process.env.KNIP_DISABLE_RAW_TRANSFER = "1";
  let results;
  try {
    const [{ main }, { createOptions }] = await Promise.all([
      import(pathToFileURL(resolve(resolvedPackage.packageRoot, "dist/index.js"))),
      import(pathToFileURL(resolve(resolvedPackage.packageRoot, "dist/util/create-options.js"))),
    ]);
    const options = await createOptions({
      args: {
        directory: repoRoot,
        "no-gitignore": true,
        "no-progress": true,
        tsConfig: "tsconfig.json",
      },
    });
    results = await main(options);
  } finally {
    if (typeof previousRawTransfer === "string") process.env.KNIP_DISABLE_RAW_TRANSFER = previousRawTransfer;
    else delete process.env.KNIP_DISABLE_RAW_TRANSFER;
  }
  if (!results?.issues || typeof results.issues !== "object") throw new Error("knip-missing-issues-object");
  const report = {
    issues: results.issues,
    counters: results.counters,
    configuration_hints: results.configurationHints,
  };
  await writePrunerFile(repoRoot, ".pruner/raw/knip.json", `${JSON.stringify(report, null, 2)}\n`);

  const issueEntries = (kind) => Object.entries(results.issues[kind] ?? {}).flatMap(([file, symbols]) =>
    Object.values(symbols).map((item) => ({ file, item })));

  const records = [];
  let droppedRecords = 0;
  for (const { item } of issueEntries("files")) {
    records.push({
      detector: "knip",
      kind: "dead-code",
      locations: [location(repoRoot, item.symbol)],
      evidence: { issue_type: "unused-file", static_dependents: 0 },
    });
  }
  for (const issueType of ["exports", "types"]) {
    for (const { file, item } of issueEntries(issueType)) {
      records.push({
        detector: "knip",
        kind: "dead-code",
        locations: [location(repoRoot, file, item.line)],
        evidence: {
          issue_type: "unused-export",
          static_dependents: 0,
          symbol: item.symbol,
        },
      });
    }
  }
  for (const [issueType, dependencyType] of [["dependencies", "dependency"], ["devDependencies", "devDependency"]]) {
    for (const { file, item } of issueEntries(issueType)) {
      records.push({
        detector: "knip",
        kind: "unused-dep",
        locations: [location(repoRoot, file, item.line)],
        evidence: { dependency: item.symbol, dependency_type: dependencyType, static_uses: 0 },
      });
    }
  }
  for (const key of ["binaries", "catalog", "catalogReferences", "cycles", "duplicates", "enumMembers", "namespaceMembers", "nsExports", "nsTypes", "optionalPeerDependencies", "unlisted", "unresolved"]) {
    droppedRecords += issueEntries(key).length;
  }

  return {
    records,
    dropped_records: droppedRecords,
    metadata: {
      detector: "knip",
      version: resolvedPackage.version,
      command: ["knip-api", "--no-gitignore", "--tsConfig", "tsconfig.json"],
      exit_code: 0,
      raw_artifact: ".pruner/raw/knip.json",
      issue_groups: Object.values(results.issues).reduce((total, group) => total + Object.keys(group).length, 0),
    },
  };
}
