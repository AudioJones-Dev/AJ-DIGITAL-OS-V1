#!/usr/bin/env node
// Regression guard for the P4 byte-parity certification contract.
//
// The 0.4.2-p4 T6 recertification recorded in
// docs/specs/repo-pruner-certification-records.md pinned the fixture
// findings.jsonl to an exact byte count and SHA-256. Any change that shifts
// those bytes invalidates that certification and must be an explicit,
// separately approved decision -- never a side effect of another fix.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const CERTIFIED_FINDINGS_SHA256 = "11BCB9BCF71C0748187B2D32A4AC5971716873EA0E200845C210A8CCB9AA6604";
const CERTIFIED_FINDINGS_BYTES = 14560;
const CERTIFIED_RECORD_COUNT = 20;

const repositoryRoot = resolve(import.meta.dirname, "../..");
const sourceFixture = resolve(repositoryRoot, "fixtures/pruner-lab");
const temporaryRoot = await mkdtemp(join(tmpdir(), "repo-pruner-parity-test-"));
if (!basename(temporaryRoot).startsWith("repo-pruner-parity-test-")) throw new Error(`unsafe-temporary-root:${temporaryRoot}`);

process.env.npm_config_offline = "true";
process.env.HTTP_PROXY = "http://127.0.0.1:9";
process.env.HTTPS_PROXY = "http://127.0.0.1:9";
process.env.NO_PROXY = "*";

try {
  const fixture = join(temporaryRoot, "fixture");
  await cp(sourceFixture, fixture, { recursive: true, filter: (source) => !source.replaceAll("\\", "/").includes("/.pruner/") });
  execFileSync("git", ["init", "--quiet", fixture], { stdio: "ignore" });
  execFileSync("git", ["-C", fixture, "config", "user.email", "fixture@example.invalid"]);
  execFileSync("git", ["-C", fixture, "config", "user.name", "Fixture"]);
  execFileSync("git", ["-C", fixture, "config", "core.autocrlf", "false"]);
  execFileSync("git", ["-C", fixture, "add", "."]);
  execFileSync("git", ["-C", fixture, "commit", "--quiet", "-m", "fixture baseline"]);

  const run = spawnSync(process.execPath, [resolve(repositoryRoot, "skills/repo-pruner/scripts/run-pruner.mjs"), "--repo", fixture], {
    cwd: repositoryRoot,
    encoding: "utf8",
    env: process.env,
    shell: false,
    windowsHide: true,
  });
  assert.equal(run.status, 0, `parity fixture run failed: ${run.stderr}`);

  const manifest = JSON.parse(run.stdout);
  assert.equal(manifest.target_type, "fixture", "parity guard must measure a fixture target");
  assert.equal(manifest.outcome, "complete");
  assert.equal(manifest.reverification, undefined, "a fixture run must not emit live reverification metadata");

  const bytes = await readFile(join(fixture, ".pruner/findings.jsonl"));
  const records = bytes.toString("utf8").trimEnd().split("\n").filter(Boolean);
  assert.equal(records.length, CERTIFIED_RECORD_COUNT, "certified fixture record count changed");
  assert.equal(bytes.length, CERTIFIED_FINDINGS_BYTES, "certified fixture findings byte count changed");
  assert.equal(
    createHash("sha256").update(bytes).digest("hex").toUpperCase(),
    CERTIFIED_FINDINGS_SHA256,
    "certified fixture findings SHA-256 changed -- this breaks the P4 certification contract and requires explicit human approval",
  );

  // The certified command must stay exactly the vendored-skill form, and no
  // finding may leak an absolute path, drive letter, or user name.
  for (const line of records) {
    const finding = JSON.parse(line);
    assert.match(
      finding.verify_cmd,
      /^node skills\/repo-pruner\/scripts\/reverify\.mjs --id \S+ --config \.pruner\.yml$/u,
      `fixture verify_cmd drifted from the certified form: ${finding.verify_cmd}`,
    );
    assert.doesNotMatch(line, /[A-Za-z]:[\\/]/u, "findings.jsonl must never contain an absolute path");
  }

  console.log(`repo-pruner byte-parity test: ${records.length} records, ${bytes.length} bytes, SHA-256 ${CERTIFIED_FINDINGS_SHA256} reproduced`);
} finally {
  const resolved = resolve(temporaryRoot);
  if (resolved.startsWith(resolve(tmpdir())) && basename(resolved).startsWith("repo-pruner-parity-test-")) {
    await rm(resolved, { recursive: true, force: true });
  }
}
