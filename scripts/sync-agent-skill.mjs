#!/usr/bin/env node
import { createHash } from "node:crypto";
import { copyFile, lstat, mkdir, readdir, readFile, rename, rm } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const EXCLUDED_DIRECTORIES = new Set(["node_modules", ".pruner", ".cache", "cache", "coverage"]);
const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

const normalizedPath = (value) => value.split(sep).join("/");

async function collectFiles(root, current = root) {
  const entries = [];
  for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) {
    if (entry.isSymbolicLink()) throw new Error(`skill-sync-symlink-not-supported:${normalizedPath(relative(root, join(current, entry.name)))}`);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) entries.push(...await collectFiles(root, join(current, entry.name)));
    } else if (entry.isFile()) {
      entries.push(join(current, entry.name));
    }
  }
  return entries;
}

export async function normalizedTreeHash(root) {
  const files = await collectFiles(root);
  const hash = createHash("sha256");
  for (const file of files) {
    const path = normalizedPath(relative(root, file));
    const bytes = await readFile(file);
    hash.update(path, "utf8");
    hash.update("\0", "utf8");
    hash.update(bytes);
    hash.update("\0", "utf8");
  }
  return hash.digest("hex").toUpperCase();
}

async function pathState(path) {
  try {
    const stats = await lstat(path);
    return stats.isDirectory() ? "directory" : "not-directory";
  } catch (error) {
    if (error.code === "ENOENT") return "missing";
    throw error;
  }
}

export async function buildSyncPlan(repoRoot, skillName) {
  if (!SKILL_NAME_PATTERN.test(skillName)) throw new Error(`invalid-skill-name:${skillName}`);
  const root = resolve(repoRoot);
  const source = join(root, "skills", skillName);
  if (await pathState(source) !== "directory") throw new Error(`canonical-skill-missing:${normalizedPath(relative(root, source))}`);
  const sourceHash = await normalizedTreeHash(source);
  const destinations = [
    join(root, ".agents", "skills", skillName),
    join(root, ".claude", "skills", skillName),
  ];
  const destinationStates = [];
  for (const destination of destinations) {
    const state = await pathState(destination);
    const hash = state === "directory" ? await normalizedTreeHash(destination) : null;
    destinationStates.push({
      path: normalizedPath(relative(root, destination)),
      absolute_path: destination,
      state: state === "directory" && hash === sourceHash ? "identical" : state === "directory" ? "divergent" : state,
      hash,
    });
  }
  return {
    skill: skillName,
    source: normalizedPath(relative(root, source)),
    source_path: source,
    source_hash: sourceHash,
    destinations: destinationStates,
    exclusions: [...EXCLUDED_DIRECTORIES].sort(),
  };
}

async function copyTree(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const file of await collectFiles(source)) {
    const rel = relative(source, file);
    const target = join(destination, rel);
    await mkdir(dirname(target), { recursive: true });
    await copyFile(file, target);
  }
}

export async function applySyncPlan(plan) {
  const invalid = plan.destinations.filter((destination) => !["missing", "identical"].includes(destination.state));
  if (invalid.length) throw new Error(`skill-sync-refuses-divergent-destination:${invalid.map((item) => item.path).join(",")}`);
  const created = [];
  const staged = [];
  try {
    for (const destination of plan.destinations.filter((item) => item.state === "missing")) {
      const stage = `${destination.absolute_path}.stage-${process.pid}`;
      if (await pathState(stage) !== "missing") throw new Error(`skill-sync-stage-exists:${destination.path}`);
      await copyTree(plan.source_path, stage);
      const stageHash = await normalizedTreeHash(stage);
      if (stageHash !== plan.source_hash) throw new Error(`skill-sync-stage-hash-mismatch:${destination.path}`);
      staged.push(stage);
    }
    const missing = plan.destinations.filter((item) => item.state === "missing");
    for (let index = 0; index < missing.length; index += 1) {
      const destination = missing[index];
      await mkdir(dirname(destination.absolute_path), { recursive: true });
      await rename(staged[index], destination.absolute_path);
      created.push(destination.absolute_path);
    }
  } catch (error) {
    for (const stage of staged) await rm(stage, { recursive: true, force: true });
    for (const destination of created) await rm(destination, { recursive: true, force: true });
    throw error;
  }
  return { created_count: created.length, source_hash: plan.source_hash };
}

function publicPlan(plan) {
  return {
    skill: plan.skill,
    source: plan.source,
    source_hash: plan.source_hash,
    destinations: plan.destinations.map(({ path, state, hash }) => ({ path, state, hash })),
    exclusions: plan.exclusions,
  };
}

async function main() {
  const [skillName, mode, ...extra] = process.argv.slice(2);
  if (!skillName || !["--check", "--apply"].includes(mode) || extra.length) {
    console.error("usage: node scripts/sync-agent-skill.mjs <skill-name> --check|--apply");
    process.exitCode = 2;
    return;
  }
  try {
    const plan = await buildSyncPlan(process.cwd(), skillName);
    if (mode === "--check") {
      console.log(JSON.stringify(publicPlan(plan), null, 2));
      if (plan.destinations.some((destination) => destination.state !== "identical")) process.exitCode = 1;
      return;
    }
    await applySyncPlan(plan);
    const verified = await buildSyncPlan(process.cwd(), skillName);
    if (verified.destinations.some((destination) => destination.state !== "identical")) throw new Error("skill-sync-post-apply-verification-failed");
    console.log(JSON.stringify(publicPlan(verified), null, 2));
  } catch (error) {
    console.error(`skill-sync blocked: ${error.message}`);
    process.exitCode = 2;
  }
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) await main();
