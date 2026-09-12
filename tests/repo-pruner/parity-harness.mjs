#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { arch, platform, release } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const APPROVED_MATRIX = Object.freeze({
  platform: "win32",
  arch: "x64",
  os_release_prefix: "10.0.26200.",
  node: "24.18.0",
  npm: "11.16.0",
  git: "git version 2.55.0.windows.3",
  powershell: "7.6.3",
  claude: "2.1.220",
  codex: "0.146.0",
});

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex").toUpperCase();

const WINDOWS_COMMAND_SHIMS = new Set(["npm", "claude", "codex"]);

export function commandExecutable(name, targetPlatform = process.platform) {
  return targetPlatform === "win32" && WINDOWS_COMMAND_SHIMS.has(name) ? `${name}.cmd` : name;
}

export function commandInvocation(name, args = [], targetPlatform = process.platform, commandProcessor = process.env.ComSpec ?? "cmd.exe") {
  const file = commandExecutable(name, targetPlatform);
  return targetPlatform === "win32" && file.endsWith(".cmd")
    ? { file: commandProcessor, args: ["/d", "/s", "/c", file, ...args] }
    : { file, args };
}

export async function certifyParity({ artifacts, environment, fixtureCommit, configBytes, lockfileBytes }) {
  const problems = [];
  for (const key of ["platform", "arch", "node", "npm", "git", "powershell", "claude", "codex"]) {
    if (environment[key] !== APPROVED_MATRIX[key]) problems.push(`${key}:expected=${APPROVED_MATRIX[key]}:actual=${environment[key]}`);
  }
  if (!environment.os_release.startsWith(APPROVED_MATRIX.os_release_prefix)) problems.push(`os_release:expected-prefix=${APPROVED_MATRIX.os_release_prefix}:actual=${environment.os_release}`);
  if (!environment.cursor) problems.push("cursor:version-required");
  const hashes = Object.fromEntries(await Promise.all(Object.entries(artifacts).map(async ([host, path]) => [host, sha256(await readFile(path))])));
  const uniqueHashes = new Set(Object.values(hashes));
  if (uniqueHashes.size !== 1) problems.push("findings-byte-parity-mismatch");
  return {
    version: 1,
    certification: problems.length ? "failed" : "passed",
    problems,
    matrix: environment,
    fixture_commit: fixtureCommit,
    config_sha256: sha256(configBytes),
    lockfile_sha256: sha256(lockfileBytes),
    findings_sha256: hashes,
  };
}

const command = (name, args = []) => {
  const invocation = commandInvocation(name, args);
  return execFileSync(invocation.file, invocation.args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
};
const versionTail = (value) => value.match(/\d+\.\d+\.\d+/u)?.[0] ?? value;

export function parseWindowsRelease(value) {
  const match = value.match(/\bVersion\s+(\d+\.\d+\.\d+\.\d+)\b/iu);
  if (!match) throw new Error("windows-release-unparseable");
  return match[1];
}

function detectedOsRelease() {
  if (platform() !== "win32") return release();
  return parseWindowsRelease(command(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", "ver"]));
}

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

async function main() {
  const args = process.argv.slice(2);
  const fixture = valueAfter(args, "--fixture");
  const cursorVersion = valueAfter(args, "--cursor-version");
  const artifacts = {
    claude: valueAfter(args, "--claude-findings"),
    codex: valueAfter(args, "--codex-findings"),
    cursor: valueAfter(args, "--cursor-findings"),
  };
  if (!fixture || !cursorVersion || Object.values(artifacts).some((value) => !value)) {
    console.error("usage: node tests/repo-pruner/parity-harness.mjs --fixture <repo> --cursor-version <version> --claude-findings <file> --codex-findings <file> --cursor-findings <file>");
    process.exitCode = 2;
    return;
  }
  const root = resolve(fixture);
  const environment = {
    platform: platform(),
    arch: arch(),
    os_release: detectedOsRelease(),
    node: process.versions.node,
    npm: command("npm", ["--version"]),
    git: command("git", ["--version"]),
    powershell: command("pwsh", ["-NoProfile", "-Command", "$PSVersionTable.PSVersion.ToString()"]),
    claude: versionTail(command("claude", ["--version"])),
    codex: versionTail(command("codex", ["--version"])),
    cursor: cursorVersion,
  };
  const result = await certifyParity({
    artifacts,
    environment,
    fixtureCommit: command("git", ["-C", root, "rev-parse", "HEAD"]),
    configBytes: await readFile(resolve(root, ".pruner.yml")),
    lockfileBytes: await readFile(resolve(import.meta.dirname, "../../skills/repo-pruner/package-lock.json")),
  });
  console.log(JSON.stringify(result, null, 2));
  if (result.certification !== "passed") process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
