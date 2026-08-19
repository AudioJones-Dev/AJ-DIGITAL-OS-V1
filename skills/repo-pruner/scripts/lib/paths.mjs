import { minimatch } from "minimatch";
import { normalizeRepoPath, stableCompare } from "./normalize.mjs";

export const PORTABLE_EXCLUDED_GLOBS = Object.freeze([
  "docs/**", "**/*.md", "**/*.mdx", "PRD*", "BUILD-SPEC*", "AGENTS.md",
  "CLAUDE.md", "prompts/**", "**/*.prompt.*", "**/migrations/**", "**/schema.*",
  "**/*.sql", "**/generated/**", "**/*.gen.*", "**/dist/**", "**/.next/**",
  "**/coverage/**", "**/node_modules/**", ".env*", "**/.env*", "**/*.config.*",
  "**/deploy/**", "**/deployment/**", "LICENSE*", "NOTICE*", "legal/**",
]);

export const AJ_OS_PROTECTED_GLOBS = Object.freeze([
  ".dmaic/**", ".agents/**", ".claude/**", ".codex/**", ".mcpjam/**", ".tools/**",
  ".github/**", ".dashboard/**", "skills/**", "config/**", "graphify-out/**",
  "runtime/**", "logs/**", "dist/**", "node_modules/**", "data/**", "memory/**",
  "output/**", "sessions/**", "env/**", "supabase/**", "sql/**", "n8n/**",
  "monitoring/**", "compose/**", "traefik/**", "**/migrations/**", "**/schema.*",
  "**/.cache/**", "**/.npm-cache/**", "**/.pnpm-store/**", "**/.turbo/**",
  "**/.vite/**", "**/.parcel-cache/**", "**/.pytest_cache/**", "**/__pycache__/**",
  "**/.ruff_cache/**", "docker-compose*.yml", "Dockerfile", "Procfile", "doppler.yaml",
  ".env", ".env.*",
]);

const match = (path, pattern) => minimatch(path, pattern, {
  dot: true,
  nocase: false,
  matchBase: false,
  nocomment: true,
  nonegate: true,
});

export const matchesAnyGlob = (path, patterns) => patterns.some((pattern) => match(path, pattern));

export function protectionRuleForPath(path, extraGlobs = []) {
  const firstSegment = path.split("/")[0];
  if (firstSegment.startsWith(".")) return "top-level-dot-directory-exclusion";
  if (matchesAnyGlob(path, extraGlobs)) return "repo-config-exclusion";
  if (matchesAnyGlob(path, ["prompts/**", "**/*.prompt.*"])) return "portable-prompt-exclusion";
  if (matchesAnyGlob(path, ["docs/**", "**/*.md", "**/*.mdx"])) return "portable-doc-exclusion";
  if (matchesAnyGlob(path, ["graphify-out/**"])) return "aj-os-graphify-output-exclusion";
  if (matchesAnyGlob(path, ["skills/**"])) return "aj-os-skills-exclusion";
  if (matchesAnyGlob(path, ["config/**"])) return "aj-os-config-exclusion";
  if (matchesAnyGlob(path, PORTABLE_EXCLUDED_GLOBS)) return "portable-default-exclusion";
  if (matchesAnyGlob(path, AJ_OS_PROTECTED_GLOBS)) return "aj-os-protected-default";
  return null;
}

export function classifyPath(path) {
  const firstSegment = path.split("/")[0];
  if (firstSegment.startsWith(".") || matchesAnyGlob(path, ["skills/**", "config/**", "env/**", "compose/**", "traefik/**"])) return "config";
  if (matchesAnyGlob(path, ["graphify-out/**", "**/generated/**", "**/*.gen.*", "**/dist/**", "**/.next/**", "**/coverage/**", "**/node_modules/**", "**/.cache/**", "**/__pycache__/**"])) return "generated";
  if (matchesAnyGlob(path, ["prompts/**", "**/*.prompt.*"])) return "prompt";
  if (matchesAnyGlob(path, ["docs/**", "**/*.md", "**/*.mdx", "PRD*", "BUILD-SPEC*", "LICENSE*", "NOTICE*", "legal/**"])) return "doc";
  if (matchesAnyGlob(path, ["test/**", "tests/**", "__tests__/**", "**/test/**", "**/tests/**", "**/__tests__/**", "**/*.test.*", "**/*.spec.*"])) return "test";
  if (path === "package.json") return "code";
  if (matchesAnyGlob(path, ["**/*.config.*", "**/*.json", "**/*.yaml", "**/*.yml", "**/*.toml", "**/*.sql", "**/migrations/**", "**/schema.*", "docker-compose*.yml", "Dockerfile", "Procfile"])) return "config";
  return "code";
}

export function resolveRegistryMatches(path, registry) {
  if (!registry) return { component: null, ambiguous: false, candidates: [] };
  const candidates = registry.components
    .filter((component) => [...component.paths, ...component.test_paths].some((pattern) => match(path, pattern)))
    .sort((left, right) => stableCompare(left.id, right.id));
  if (candidates.length < 2) return { component: candidates[0] ?? null, ambiguous: false, candidates };
  const signatures = new Set(candidates.map((component) => JSON.stringify({
    owner: component.owner,
    protected: component.protected,
    status: component.status,
  })));
  return { component: signatures.size === 1 ? candidates[0] : null, ambiguous: signatures.size > 1, candidates };
}

export function normalizeFindingPath(repoRoot, path) {
  const normalized = normalizeRepoPath(repoRoot, path);
  if (normalized === ".") throw new Error(`invalid-finding-path:${path}`);
  return normalized;
}
