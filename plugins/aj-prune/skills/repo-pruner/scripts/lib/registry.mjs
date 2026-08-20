import { DMAIC_STATUSES } from "./constants.mjs";
import { readFile, realpath } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { parse } from "yaml";

const nonEmpty = (value) => typeof value === "string" && value.trim().length > 0;

export function normalizeRegistryObject(input) {
  if (!input || input.version !== 1 || !Array.isArray(input.components)) throw new Error("invalid-registry-root");
  return {
    version: 1,
    components: input.components.map((component, index) => {
      if (!nonEmpty(component.id)) throw new Error(`invalid-component-id:${index}`);
      if (!Array.isArray(component.paths) || component.paths.length === 0 || component.paths.some((path) => !nonEmpty(path))) throw new Error(`invalid-component-paths:${component.id}`);
      if (component.test_paths !== undefined && (!Array.isArray(component.test_paths) || component.test_paths.some((path) => !nonEmpty(path)))) throw new Error(`invalid-component-test-paths:${component.id}`);
      if (!DMAIC_STATUSES.includes(component.status)) throw new Error(`invalid-component-status:${component.id}`);
      if (!nonEmpty(component.owner)) throw new Error(`invalid-component-owner:${component.id}`);
      if (component.protected !== undefined && typeof component.protected !== "boolean") throw new Error(`invalid-component-protected:${component.id}`);
      const isProtected = component.protected ?? false;
      if (isProtected && !nonEmpty(component.protection_reason)) throw new Error(`missing-protection-reason:${component.id}`);
      return {
        id: component.id,
        paths: [...component.paths],
        test_paths: [...(component.test_paths ?? [])],
        status: component.status,
        owner: component.owner,
        protected: isProtected,
        protection_reason: isProtected ? component.protection_reason.trim() : null,
      };
    }),
  };
}

export async function loadRegistry(repoRoot, registryPath) {
  const root = resolve(repoRoot);
  const target = resolve(root, registryPath);
  const lexicalRelative = relative(root, target);
  if (!lexicalRelative || lexicalRelative === ".." || lexicalRelative.startsWith(`..${sep}`)) {
    return { valid: false, registry: null, reason: "registry-outside-repository" };
  }
  let contents;
  try {
    const [realRoot, realTarget] = await Promise.all([realpath(root), realpath(target)]);
    const physicalRelative = relative(realRoot, realTarget);
    if (!physicalRelative || physicalRelative === ".." || physicalRelative.startsWith(`..${sep}`)) {
      return { valid: false, registry: null, reason: "registry-outside-repository" };
    }
    contents = await readFile(realTarget, "utf8");
  } catch (error) {
    return {
      valid: false,
      registry: null,
      reason: error.code === "ENOENT" ? "registry-missing" : "registry-unreadable",
    };
  }
  try {
    return { valid: true, registry: normalizeRegistryObject(parse(contents)), reason: null };
  } catch (error) {
    return { valid: false, registry: null, reason: `registry-invalid:${error.message}` };
  }
}
