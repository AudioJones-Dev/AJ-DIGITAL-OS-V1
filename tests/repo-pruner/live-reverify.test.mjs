#!/usr/bin/env node
// Regression coverage for unrunnable verify_cmd values on live repositories.
//
// Before this fix every finding emitted
//   node skills/repo-pruner/scripts/reverify.mjs --id <id> --config .pruner.yml
// which only resolves when the skill is vendored inside the scanned repository.
// On a live repository the path did not exist (MODULE_NOT_FOUND), and even at
// the correct path reverify.mjs refused any non-fixture target with
// p2-fixture-only:missing-or-invalid-pruner-lab-markers. SKILL.md requires
// every emitted finding to carry a re-runnable verify_cmd, so on live runs that
// guarantee was not met.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { cp, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { buildVerifyCmd, LIVE_REPO_PLACEHOLDER, validateFinding } from "../../skills/repo-pruner/scripts/lib/classifier.mjs";

const repositoryRoot = resolve(import.meta.dirname, "../..");
const skillRoot = resolve(repositoryRoot, "skills/repo-pruner");
const sourceFixture = resolve(repositoryRoot, "fixtures/pruner-lab");
const temporaryRoot = await mkdtemp(join(tmpdir(), "repo-pruner-live-test-"));
if (!basename(temporaryRoot).startsWith("repo-pruner-live-test-")) throw new Error(`unsafe-temporary-root:${temporaryRoot}`);

process.env.npm_config_offline = "true";
process.env.HTTP_PROXY = "http://127.0.0.1:9";
process.env.HTTPS_PROXY = "http://127.0.0.1:9";
process.env.NO_PROXY = "*";

const baseFinding = {
  id: "abc123",
  kind: "cycle",
  classification: "needs-decision",
  locations: [{ path: "src/a.ts", path_class: "code", protected: false }],
  blast_radius: { files: 1, dependents: 0, public_api_touched: false },
  confidence: 0.97,
  rules_applied: ["cycle-needs-decision"],
};

// Build a live (non-fixture) repository by stripping the pruner-lab markers.
async function createLiveRepo(target) {
  await cp(sourceFixture, target, { recursive: true, filter: (source) => !source.replaceAll("\\", "/").includes("/.pruner/") });
  await rm(join(target, "EXPECTED.json"), { force: true });
  const manifest = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
  manifest.name = "live-repository-under-test";
  delete manifest.repoPrunerFixture;
  await writeFile(join(target, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  execFileSync("git", ["init", "--quiet", target], { stdio: "ignore" });
  execFileSync("git", ["-C", target, "config", "user.email", "live@example.invalid"]);
  execFileSync("git", ["-C", target, "config", "user.name", "Live"]);
  execFileSync("git", ["-C", target, "config", "core.autocrlf", "false"]);
  execFileSync("git", ["-C", target, "add", "."]);
  execFileSync("git", ["-C", target, "commit", "--quiet", "-m", "live baseline"]);
}

const runNode = (script, args, cwd) => spawnSync(process.execPath, [script, ...args], {
  cwd, encoding: "utf8", env: process.env, shell: false, windowsHide: true,
});

// Split a command line the way a shell does, honouring double quotes. Naive
// splitting on spaces is exactly the assumption that hid the unquoted-path
// defect, so the test must not repeat it.
function tokenize(commandLine) {
  return (commandLine.match(/"[^"]*"|\S+/gu) ?? []).map((token) =>
    token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1) : token);
}

try {
  // --- emitted command shape --------------------------------------------
  const fixtureCmd = buildVerifyCmd({ findingId: "abc123", targetType: "fixture", scope: "portfolio" });
  const liveCmd = buildVerifyCmd({ findingId: "abc123", targetType: "live", scope: "component" });

  assert.equal(fixtureCmd, "node skills/repo-pruner/scripts/reverify.mjs --id abc123 --config .pruner.yml", "the certified fixture command must not change");
  assert.equal(liveCmd, `node scripts/reverify.mjs --id abc123 --config .pruner.yml --repo "${LIVE_REPO_PLACEHOLDER}" --scope component --live-repository`);
  assert.ok(liveCmd.includes(`"${LIVE_REPO_PLACEHOLDER}"`), "the placeholder must be quoted so a path containing whitespace survives substitution");
  assert.deepEqual(validateFinding({ ...baseFinding, verify_cmd: fixtureCmd }), [], "the fixture command must stay valid");
  assert.deepEqual(validateFinding({ ...baseFinding, verify_cmd: liveCmd }), [], "the live command must be accepted by the finding validator");
  assert.ok(validateFinding({ ...baseFinding, verify_cmd: "node scripts/reverify.mjs --id abc123" }).includes("verify_cmd"), "a malformed command must still be rejected");

  // The live command must never carry machine-specific detail.
  assert.doesNotMatch(liveCmd, /[A-Za-z]:[\\/]/u, "verify_cmd must never contain an absolute path");
  assert.ok(!liveCmd.includes(skillRoot), "verify_cmd must never contain the resolved skill root");

  // --- reverify.mjs authorization gate ------------------------------------
  const live = join(temporaryRoot, "live");
  await createLiveRepo(live);
  const reverifyScript = resolve(skillRoot, "scripts/reverify.mjs");

  const unauthorized = runNode(reverifyScript, ["--id", "whatever", "--config", ".pruner.yml", "--repo", live], skillRoot);
  assert.equal(unauthorized.status, 2, "a live repository must be blocked without the authorization flags");
  assert.match(unauthorized.stderr, /repo-pruner blocked: live-repository-flag-required/u);

  const noScope = runNode(reverifyScript, ["--id", "whatever", "--config", ".pruner.yml", "--repo", live, "--live-repository"], skillRoot);
  assert.equal(noScope.status, 2, "a live repository must be blocked without an explicit scope");
  assert.match(noScope.stderr, /repo-pruner blocked: explicit-scope-required-for-live-run/u);

  // --- a live run emits a verify_cmd that actually runs --------------------
  const run = runNode(resolve(skillRoot, "scripts/run-pruner.mjs"), ["--repo", live, "--scope", "portfolio", "--live-repository"], repositoryRoot);
  assert.equal(run.status, 0, `live run failed: ${run.stderr}`);
  const manifest = JSON.parse(run.stdout);
  assert.equal(manifest.target_type, "live");

  // The manifest carries the substitution for the emitted placeholder.
  assert.ok(manifest.reverification, "a live manifest must record how to resolve the emitted placeholder");
  assert.equal(manifest.reverification.placeholder, LIVE_REPO_PLACEHOLDER);
  // The runner resolves real paths, so compare against realpath: on Windows a
  // temp directory arrives here in its 8.3 short form.
  assert.equal(await realpath(manifest.reverification.working_directory), await realpath(skillRoot));
  assert.equal(await realpath(manifest.reverification.repository_root), await realpath(live));

  const findings = (await readFile(join(live, ".pruner/findings.jsonl"), "utf8")).trimEnd().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  assert.ok(findings.length > 0, "the live run must emit findings to reverify");
  for (const finding of findings) {
    assert.deepEqual(validateFinding(finding), [], `live finding ${finding.id} failed validation`);
    assert.match(finding.verify_cmd, /--live-repository$/u, "every live finding must emit the live command form");
  }

  // measure.md / findings.jsonl must stay free of machine-specific detail.
  const findingsBytes = await readFile(join(live, ".pruner/findings.jsonl"), "utf8");
  assert.doesNotMatch(findingsBytes, /[A-Za-z]:[\\/]/u, "live findings.jsonl must never contain an absolute path");

  // Execute the emitted command verbatim, substituting only the documented
  // placeholder, from the working directory the manifest names.
  const subject = findings[0];
  const emitted = subject.verify_cmd.replace(LIVE_REPO_PLACEHOLDER, live);
  const parts = tokenize(emitted);
  assert.equal(parts[0], "node", "the emitted command must invoke node");
  assert.equal(parts[parts.indexOf("--repo") + 1], live, "--repo must survive tokenization as a single argument");
  const reverified = runNode(resolve(manifest.reverification.working_directory, parts[1]), parts.slice(2), manifest.reverification.working_directory);
  assert.equal(reverified.status, 0, `emitted verify_cmd did not run: ${reverified.stderr}`);
  assert.equal(JSON.parse(reverified.stdout).id, subject.id, "the emitted verify_cmd must reproduce its own finding");

  // --- a repository root containing whitespace ---------------------------
  // Windows user profiles and many working directories contain spaces. An
  // unquoted placeholder splits --repo across two argv entries, so the command
  // silently stops addressing the repository it names.
  const spaced = join(temporaryRoot, "live repo with spaces");
  await createLiveRepo(spaced);
  const spacedRun = runNode(resolve(skillRoot, "scripts/run-pruner.mjs"), ["--repo", spaced, "--scope", "portfolio", "--live-repository"], repositoryRoot);
  assert.equal(spacedRun.status, 0, `live run on a whitespace path failed: ${spacedRun.stderr}`);
  const spacedManifest = JSON.parse(spacedRun.stdout);
  const spacedFindings = (await readFile(join(spaced, ".pruner/findings.jsonl"), "utf8")).trimEnd().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  assert.ok(spacedFindings.length > 0, "the whitespace-path run must emit findings");

  const spacedSubject = spacedFindings[0];
  const spacedTokens = tokenize(spacedSubject.verify_cmd.replace(LIVE_REPO_PLACEHOLDER, spaced));
  assert.equal(spacedTokens[spacedTokens.indexOf("--repo") + 1], spaced, "a whitespace repository path must survive as one argument");
  const spacedReverify = runNode(
    resolve(spacedManifest.reverification.working_directory, spacedTokens[1]),
    spacedTokens.slice(2),
    spacedManifest.reverification.working_directory,
  );
  assert.equal(spacedReverify.status, 0, `emitted verify_cmd failed on a whitespace path: ${spacedReverify.stderr}`);
  assert.equal(JSON.parse(spacedReverify.stdout).id, spacedSubject.id, "the emitted verify_cmd must reproduce its finding from a whitespace path");

  console.log(`repo-pruner live reverify test: ${findings.length} live findings, authorization gate, verify_cmd round-trip, and whitespace-path round-trip passed`);
} finally {
  const resolved = resolve(temporaryRoot);
  if (resolved.startsWith(resolve(tmpdir())) && basename(resolved).startsWith("repo-pruner-live-test-")) {
    await rm(resolved, { recursive: true, force: true });
  }
}
