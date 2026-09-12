import { readFile, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { assertPrunerOutput } from "../output.mjs";
import { normalizeRepoPath } from "../normalize.mjs";
import { runPackageCli } from "../detector-runtime.mjs";

const stripFormatSuffix = (name, format) => {
  const suffix = `:${format}`;
  return name.endsWith(suffix) ? name.slice(0, -suffix.length) : name;
};

export async function runJscpdAdapter(repoRoot, config) {
  const outputDirectory = assertPrunerOutput(repoRoot, ".pruner/raw/jscpd");
  await rm(outputDirectory, { recursive: true, force: true });
  const args = [
    ".",
    "--min-lines", String(config.min_lines),
    "--min-tokens", String(config.min_tokens),
    "--reporters", "json",
    "--output", ".pruner/raw/jscpd",
    "--ignore", "**/node_modules/**,**/.git/**,**/.pruner/**,vendor/**",
    "--exit-code", "0",
  ];
  const execution = await runPackageCli({
    packageName: "jscpd",
    args,
    cwd: repoRoot,
  });
  const reportPath = resolve(outputDirectory, "jscpd-report.json");
  let report;
  try {
    report = JSON.parse(await readFile(reportPath, "utf8"));
  } catch (error) {
    throw new Error("jscpd-invalid-json-report", { cause: error });
  }
  if (!Array.isArray(report.duplicates)) throw new Error("jscpd-missing-duplicates-array");

  const records = report.duplicates.map((duplicate) => {
    const firstPath = normalizeRepoPath(repoRoot, stripFormatSuffix(duplicate.firstFile.name, duplicate.format));
    const secondPath = normalizeRepoPath(repoRoot, stripFormatSuffix(duplicate.secondFile.name, duplicate.format));
    return {
      detector: "jscpd",
      kind: "duplication",
      locations: [
        { path: firstPath, line_start: duplicate.firstFile.start, line_end: duplicate.firstFile.end },
        { path: secondPath, line_start: duplicate.secondFile.start, line_end: duplicate.secondFile.end },
      ],
      evidence: {
        duplicated_lines: duplicate.lines,
        duplicated_tokens: duplicate.tokens,
        format: duplicate.format,
      },
    };
  });

  return {
    records,
    dropped_records: 0,
    metadata: {
      detector: "jscpd",
      version: execution.version,
      command: execution.command,
      exit_code: execution.exit_code,
      raw_artifact: ".pruner/raw/jscpd/jscpd-report.json",
      analyzed_sources: report.statistics?.total?.sources ?? null,
    },
  };
}
