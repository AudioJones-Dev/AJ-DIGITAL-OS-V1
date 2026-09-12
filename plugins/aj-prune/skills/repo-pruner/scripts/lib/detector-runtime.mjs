import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DETECTOR_VERSIONS } from "./constants.mjs";

export const SKILL_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

const DETECTOR_ENV_ALLOWLIST = [
  "PATH",
  "PATHEXT",
  "SystemRoot",
  "WINDIR",
  "ComSpec",
  "TEMP",
  "TMP",
  "HOME",
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "npm_config_offline",
];

const readEnvironmentValue = (source, requestedName) => {
  const match = Object.entries(source).find(([name]) => name.toLowerCase() === requestedName.toLowerCase());
  return match?.[1];
};

export function createDetectorEnvironment(source = process.env) {
  const environment = {};
  for (const name of DETECTOR_ENV_ALLOWLIST) {
    const value = readEnvironmentValue(source, name);
    if (typeof value === "string") environment[name] = value;
  }
  environment.CI = "1";
  environment.NO_COLOR = "1";
  environment.TZ = "UTC";
  return environment;
}

const packagePath = (packageName, nodeModulesRoot) =>
  join(nodeModulesRoot, ...packageName.split("/"), "package.json");

export async function assertPinnedPackage(packageName, {
  nodeModulesRoot = join(SKILL_ROOT, "node_modules"),
} = {}) {
  const expected = DETECTOR_VERSIONS[packageName];
  if (!expected) throw new Error(`unapproved-detector-package:${packageName}`);
  let manifest;
  try {
    manifest = JSON.parse(await readFile(packagePath(packageName, nodeModulesRoot), "utf8"));
  } catch (error) {
    throw new Error(`missing-pinned-detector:${packageName}`, { cause: error });
  }
  if (manifest.version !== expected) {
    throw new Error(`detector-version-mismatch:${packageName}:expected=${expected}:actual=${manifest.version}`);
  }
  return { manifest, packageRoot: dirname(packagePath(packageName, nodeModulesRoot)), version: expected };
}

export async function resolvePackageBinary(packageName, binaryName = packageName) {
  const resolvedPackage = await assertPinnedPackage(packageName);
  const bin = resolvedPackage.manifest.bin;
  const relativeBinary = typeof bin === "string" ? bin : bin?.[binaryName];
  if (typeof relativeBinary !== "string" || !relativeBinary) {
    throw new Error(`missing-detector-binary:${packageName}:${binaryName}`);
  }
  const binary = resolve(resolvedPackage.packageRoot, relativeBinary);
  if (!binary.startsWith(resolve(resolvedPackage.packageRoot))) {
    throw new Error(`detector-binary-outside-package:${packageName}`);
  }
  return { ...resolvedPackage, binary };
}

export async function runPackageCli({
  packageName,
  binaryName = packageName,
  args,
  cwd,
  acceptedExitCodes = [0],
  env = process.env,
}) {
  const resolvedPackage = await resolvePackageBinary(packageName, binaryName);
  const result = spawnSync(process.execPath, [resolvedPackage.binary, ...args], {
    cwd,
    encoding: "utf8",
    env: createDetectorEnvironment(env),
    maxBuffer: 64 * 1024 * 1024,
    shell: false,
    windowsHide: true,
  });
  if (result.error) throw new Error(`detector-spawn-failed:${packageName}`, { cause: result.error });
  const exitCode = result.status ?? -1;
  if (!acceptedExitCodes.includes(exitCode)) {
    const error = new Error(`detector-exit:${packageName}:${exitCode}`);
    error.stdout = result.stdout ?? "";
    error.stderr = result.stderr ?? "";
    throw error;
  }
  return {
    command: ["node", `${packageName}:${binaryName}`, ...args],
    exit_code: exitCode,
    stderr: result.stderr ?? "",
    stdout: result.stdout ?? "",
    version: resolvedPackage.version,
  };
}
