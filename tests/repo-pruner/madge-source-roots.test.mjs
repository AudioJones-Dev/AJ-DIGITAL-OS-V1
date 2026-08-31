#!/usr/bin/env node
// Regression coverage for the madge adapter's hardcoded "src" scan root.
//
// Before this fix the adapter always invoked `madge ... --json src`. A
// repository without a src/ directory -- a Next.js App Router project using
// app/, lib/, and components/, for example -- made madge exit 1, which failed
// the whole run as `detector-exit:madge:1` and produced no findings at all.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { DEFAULT_CONFIG, resolveConfigObject } from "../../skills/repo-pruner/scripts/lib/config.mjs";
import { runMadgeAdapter } from "../../skills/repo-pruner/scripts/lib/adapters/madge.mjs";

const temporaryRoot = await mkdtemp(join(tmpdir(), "repo-pruner-madge-test-"));
if (!basename(temporaryRoot).startsWith("repo-pruner-madge-test-")) throw new Error(`unsafe-temporary-root:${temporaryRoot}`);

process.env.npm_config_offline = "true";
process.env.HTTP_PROXY = "http://127.0.0.1:9";
process.env.HTTPS_PROXY = "http://127.0.0.1:9";
process.env.NO_PROXY = "*";

const configWithMadge = (madge) => resolveConfigObject({
  version: 1,
  scope: "portfolio",
  base_ref: "origin/main",
  registry: ".dmaic/components.yaml",
  output_dir: ".pruner",
  detectors: {
    jscpd: { enabled: true },
    knip: { enabled: true },
    madge,
    eslint: { enabled: true },
    tsc: { enabled: true },
    tests: { enabled: false, command: null },
  },
  thresholds: { min_confidence_to_emit: 0.6, blast_radius_decision_threshold: 5 },
  path_classes: { excluded_globs: [] },
}).config.detectors.madge;

const rejects = (madge, label) => assert.throws(
  () => configWithMadge(madge),
  /invalid-(?:detector-config:madge\.source_roots|config-unknown-key)/u,
  label,
);

// An App Router style repository: no src/, and a cycle that spans three roots.
async function createAppRouterRepo(root) {
  await mkdir(join(root, "app"), { recursive: true });
  await mkdir(join(root, "lib"), { recursive: true });
  await mkdir(join(root, "components"), { recursive: true });
  await writeFile(join(root, "tsconfig.json"), `${JSON.stringify({
    compilerOptions: { target: "ES2022", module: "ESNext", moduleResolution: "bundler" },
  }, null, 2)}\n`);
  await writeFile(join(root, "app/page.ts"), 'import { load } from "../lib/data";\nexport const page = () => load();\n');
  await writeFile(join(root, "lib/data.ts"), 'import { render } from "../components/card";\nexport const load = () => render();\n');
  await writeFile(join(root, "components/card.ts"), 'import { page } from "../app/page";\nexport const render = () => page;\n');
  await writeFile(join(root, "app/unreferenced.ts"), "export const unreferenced = 1;\n");
}

try {
  // --- configuration contract -------------------------------------------
  assert.deepEqual(
    DEFAULT_CONFIG.detectors.madge,
    { enabled: true, source_roots: ["src"] },
    "the default must stay [\"src\"] so certified fixture behaviour is unchanged",
  );
  assert.deepEqual(configWithMadge({ enabled: true }).source_roots, ["src"], "omitting source_roots must fall back to the default");
  assert.deepEqual(configWithMadge({ enabled: true, source_roots: ["app", "lib", "components"] }).source_roots, ["app", "lib", "components"]);
  assert.deepEqual(configWithMadge({ enabled: true, source_roots: ["./app/", "lib"] }).source_roots, ["app", "lib"], "roots must be normalized");

  rejects({ enabled: true, source_roots: [] }, "an empty root list is malformed config");
  rejects({ enabled: true, source_roots: ["../outside"] }, "a parent-escaping root is malformed config");
  rejects({ enabled: true, source_roots: ["/etc"] }, "an absolute POSIX root is malformed config");
  rejects({ enabled: true, source_roots: ["C:/windows"] }, "an absolute Windows root is malformed config");
  rejects({ enabled: true, source_roots: ["app", "./app"] }, "duplicate roots are malformed config");
  rejects({ enabled: true, source_roots: [""] }, "an empty root is malformed config");
  rejects({ enabled: true, roots: ["app"] }, "an unknown madge key is malformed config");

  // The published schema must agree with the runtime validator. The `\.\.`
  // escaping matters: an unescaped `..` matches any two characters and would
  // wrongly reject short roots such as `ui` or `db`.
  const schema = JSON.parse(await readFile(resolve(import.meta.dirname, "../../skills/repo-pruner/schemas/config.schema.json"), "utf8"));
  assert.equal(schema.properties.detectors.properties.madge.$ref, "#/$defs/madge", "madge needs its own schema def to allow source_roots");
  const rootPattern = new RegExp(schema.$defs.madge.properties.source_roots.items.pattern, "u");
  for (const accepted of ["src", "app", "ui", "db", "a/b", "components"]) {
    assert.ok(rootPattern.test(accepted), `schema must accept the repository-relative root ${accepted}`);
  }
  for (const refused of ["../x", "a/../b", "..", "x/..", "/etc", "C:/windows"]) {
    assert.ok(!rootPattern.test(refused), `schema must refuse ${refused}`);
  }

  // --- the reported failure, and its fix ---------------------------------
  const repo = join(temporaryRoot, "app-router");
  await createAppRouterRepo(repo);

  await assert.rejects(
    () => runMadgeAdapter(repo, { enabled: true, source_roots: ["src"] }),
    /^Error: madge-missing-source-root:src$/u,
    "a missing configured root must fail closed with a named cause, not an opaque detector-exit:madge:1",
  );

  const result = await runMadgeAdapter(repo, { enabled: true, source_roots: ["app", "lib", "components"] });

  assert.deepEqual(result.metadata.source_roots, ["app", "lib", "components"], "the manifest must record what was scanned");
  for (const invocation of result.metadata.commands) {
    assert.ok(invocation.command.includes("--ts-config"), "every madge invocation must keep --ts-config");
    assert.ok(invocation.command.includes("--extensions"), "every madge invocation must keep --extensions");
    assert.ok(invocation.command.includes("--basedir"), "every madge invocation must pin the base directory");
    for (const root of ["app", "lib", "components"]) assert.ok(invocation.command.includes(root), `madge must scan ${root}`);
  }

  // Every emitted path must be repository-relative: no "src/" prefix, and no
  // "../" escape from a cross-root import.
  const graphPaths = [...Object.keys(result.dependency_graph), ...Object.values(result.dependency_graph).flat()];
  const allPaths = [...graphPaths, ...result.orphan_candidates, ...result.records.flatMap((r) => r.locations.map((l) => l.path))];
  assert.ok(allPaths.length > 0, "the adapter must return a non-empty graph");
  for (const path of allPaths) {
    assert.doesNotMatch(path, /(?:^|\/)\.\.(?:\/|$)/u, `path escaped its root: ${path}`);
    assert.doesNotMatch(path, /^src\//u, `path was wrongly prefixed with src/: ${path}`);
    assert.match(path, /^(?:app|lib|components)\//u, `path is not repository-relative: ${path}`);
  }

  assert.ok(result.dependency_graph["app/page.ts"]?.includes("lib/data.ts"), "cross-root imports must resolve repository-relative");
  assert.ok(result.dependency_graph["lib/data.ts"]?.includes("components/card.ts"), "the graph must span every configured root");

  // The three-root cycle is exactly the evidence the src/ hardcoding lost.
  const cycle = result.records.find((record) => record.kind === "cycle");
  assert.ok(cycle, "the seeded cross-root cycle must be detected");
  assert.deepEqual(
    [...new Set(cycle.locations.map((location) => location.path))].sort(),
    ["app/page.ts", "components/card.ts", "lib/data.ts"],
    "the cycle must name all three cross-root participants",
  );

  assert.ok(result.orphan_candidates.includes("app/unreferenced.ts"), "orphan candidates must also be repository-relative");

  console.log(`repo-pruner madge source-roots test: ${result.records.length} cycle record(s), ${Object.keys(result.dependency_graph).length} graph nodes across app/lib/components; config contract and fail-closed missing-root passed`);
} finally {
  const resolved = resolve(temporaryRoot);
  if (resolved.startsWith(resolve(tmpdir())) && basename(resolved).startsWith("repo-pruner-madge-test-")) {
    await rm(resolved, { recursive: true, force: true });
  }
}
