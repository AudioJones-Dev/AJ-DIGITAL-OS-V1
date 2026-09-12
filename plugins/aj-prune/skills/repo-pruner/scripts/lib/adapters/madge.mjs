import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { normalizeRepoPath } from "../normalize.mjs";
import { writePrunerFile } from "../output.mjs";
import { runPackageCli } from "../detector-runtime.mjs";
import { DEFAULT_CONFIG } from "../config.mjs";

const parseJson = (value, label) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`madge-invalid-json:${label}`, { cause: error });
  }
};

// Madge reports every path relative to its base directory, which it otherwise
// derives from the common ancestor of the scanned roots. Pinning the base to
// the repository root keeps returned paths repository-relative for any root
// layout and removes the `../` escapes a nested root would otherwise produce.
const sourcePath = (repoRoot, value) => normalizeRepoPath(repoRoot, value);

function assertSourceRoots(repoRoot, sourceRoots) {
  const missing = sourceRoots.filter((root) => {
    const absolute = resolve(repoRoot, root);
    return !existsSync(absolute) || !statSync(absolute).isDirectory();
  });
  if (missing.length) throw new Error(`madge-missing-source-root:${missing.join(",")}`);
}

export async function runMadgeAdapter(repoRoot, detectorConfig = DEFAULT_CONFIG.detectors.madge) {
  const sourceRoots = detectorConfig?.source_roots ?? DEFAULT_CONFIG.detectors.madge.source_roots;
  assertSourceRoots(repoRoot, sourceRoots);

  const requiredArgs = ["--ts-config", "tsconfig.json", "--extensions", "ts,tsx", "--basedir", "."];
  const treeExecution = await runPackageCli({
    packageName: "madge",
    args: [...requiredArgs, "--json", ...sourceRoots],
    cwd: repoRoot,
  });
  const tree = parseJson(treeExecution.stdout, "tree");
  if (!tree || Array.isArray(tree) || Object.keys(tree).length === 0) {
    throw new Error("madge-empty-dependency-tree");
  }

  const cycleExecution = await runPackageCli({
    packageName: "madge",
    args: [...requiredArgs, "--circular", "--json", ...sourceRoots],
    cwd: repoRoot,
    acceptedExitCodes: [0, 1],
  });
  const cycles = parseJson(cycleExecution.stdout, "cycles");
  if (!Array.isArray(cycles)) throw new Error("madge-cycles-not-array");

  const orphanExecution = await runPackageCli({
    packageName: "madge",
    args: [...requiredArgs, "--orphans", "--json", ...sourceRoots],
    cwd: repoRoot,
  });
  const orphans = parseJson(orphanExecution.stdout, "orphans");
  if (!Array.isArray(orphans)) throw new Error("madge-orphans-not-array");

  await Promise.all([
    writePrunerFile(repoRoot, ".pruner/raw/madge-tree.json", `${JSON.stringify(tree, null, 2)}\n`),
    writePrunerFile(repoRoot, ".pruner/raw/madge-cycles.json", `${JSON.stringify(cycles, null, 2)}\n`),
    writePrunerFile(repoRoot, ".pruner/raw/madge-orphans.json", `${JSON.stringify(orphans, null, 2)}\n`),
  ]);

  const records = cycles.map((cycle) => {
    const paths = cycle.map((path) => sourcePath(repoRoot, path));
    return {
      detector: "madge",
      kind: "cycle",
      locations: paths.map((path) => ({ path, line_start: null, line_end: null })),
      evidence: { cycle: [...paths, paths[0]], graph_nodes: Object.keys(tree).length },
    };
  });

  return {
    records,
    dependency_graph: Object.fromEntries(Object.entries(tree).map(([source, dependencies]) => [
      sourcePath(repoRoot, source),
      dependencies.map((dependency) => sourcePath(repoRoot, dependency)),
    ])),
    orphan_candidates: orphans.map((path) => sourcePath(repoRoot, path)),
    dropped_records: 0,
    metadata: {
      detector: "madge",
      version: treeExecution.version,
      source_roots: [...sourceRoots],
      commands: [treeExecution, cycleExecution, orphanExecution].map((execution) => ({
        command: execution.command,
        exit_code: execution.exit_code,
      })),
      raw_artifacts: [
        ".pruner/raw/madge-tree.json",
        ".pruner/raw/madge-cycles.json",
        ".pruner/raw/madge-orphans.json",
      ],
      graph_nodes: Object.keys(tree).length,
    },
  };
}
