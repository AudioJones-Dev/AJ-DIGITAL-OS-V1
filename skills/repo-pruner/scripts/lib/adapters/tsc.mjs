import { writePrunerFile } from "../output.mjs";
import { runPackageCli } from "../detector-runtime.mjs";

export async function runTscHealthAdapter(repoRoot) {
  const execution = await runPackageCli({
    packageName: "typescript",
    binaryName: "tsc",
    args: ["--noEmit", "--incremental", "false", "--pretty", "false"],
    cwd: repoRoot,
    acceptedExitCodes: [0, 1, 2],
  });
  const output = `${execution.stdout}${execution.stderr}`;
  await writePrunerFile(repoRoot, ".pruner/raw/tsc.txt", output.replaceAll("\r\n", "\n"));
  return {
    records: [],
    dropped_records: 0,
    metadata: {
      detector: "tsc",
      version: execution.version,
      command: execution.command,
      exit_code: execution.exit_code,
      health: execution.exit_code === 0 ? "green" : "failing-baseline",
      raw_artifact: ".pruner/raw/tsc.txt",
    },
  };
}
