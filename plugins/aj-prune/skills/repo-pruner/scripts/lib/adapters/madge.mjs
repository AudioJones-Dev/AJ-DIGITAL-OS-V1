import { normalizeRepoPath } from "../normalize.mjs";
import { writePrunerFile } from "../output.mjs";
import { runPackageCli } from "../detector-runtime.mjs";

const parseJson = (value, label) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`madge-invalid-json:${label}`, { cause: error });
  }
};

const sourcePath = (repoRoot, value) => normalizeRepoPath(repoRoot, `src/${value}`);

export async function runMadgeAdapter(repoRoot) {
  const requiredArgs = ["--ts-config", "tsconfig.json", "--extensions", "ts,tsx"];
  const treeExecution = await runPackageCli({
    packageName: "madge",
    args: [...requiredArgs, "--json", "src"],
    cwd: repoRoot,
  });
  const tree = parseJson(treeExecution.stdout, "tree");
  if (!tree || Array.isArray(tree) || Object.keys(tree).length === 0) {
    throw new Error("madge-empty-dependency-tree");
  }

  const cycleExecution = await runPackageCli({
    packageName: "madge",
    args: [...requiredArgs, "--circular", "--json", "src"],
    cwd: repoRoot,
    acceptedExitCodes: [0, 1],
  });
  const cycles = parseJson(cycleExecution.stdout, "cycles");
  if (!Array.isArray(cycles)) throw new Error("madge-cycles-not-array");

  const orphanExecution = await runPackageCli({
    packageName: "madge",
    args: [...requiredArgs, "--orphans", "--json", "src"],
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
