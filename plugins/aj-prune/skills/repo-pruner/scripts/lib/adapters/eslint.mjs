import { createRequire } from "node:module";
import { readFile, readdir } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { assertPinnedPackage } from "../detector-runtime.mjs";
import { normalizeRepoPath, stableCompare } from "../normalize.mjs";
import { writePrunerFile } from "../output.mjs";

const require = createRequire(import.meta.url);
const excludedRoots = new Set([".git", ".pruner", "node_modules", "vendor"]);

async function collectTypeScriptFiles(repoRoot) {
  const files = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((left, right) => stableCompare(left.name, right.name));
    for (const entry of entries) {
      const absolute = resolve(directory, entry.name);
      const rel = relative(repoRoot, absolute).split(sep).join("/");
      if (entry.isDirectory()) {
        if (!excludedRoots.has(rel.split("/")[0])) await visit(absolute);
      } else if (/\.(?:ts|tsx)$/u.test(entry.name)) {
        files.push(rel);
      }
    }
  }
  await visit(resolve(repoRoot));
  return files.sort(stableCompare);
}

const parseMetric = (message, pattern, label) => {
  const match = pattern.exec(message);
  if (!match) throw new Error(`eslint-unrecognized-${label}-message:${message}`);
  return Number(match[1]);
};

export async function measureEslint(repoRoot, config, { useTypeScriptParser = true } = {}) {
  await Promise.all([
    assertPinnedPackage("eslint"),
    assertPinnedPackage("@typescript-eslint/parser"),
    assertPinnedPackage("eslint-plugin-sonarjs"),
  ]);
  const { ESLint } = require("eslint");
  const parser = require("@typescript-eslint/parser");
  const sonarjs = require("eslint-plugin-sonarjs");
  const files = await collectTypeScriptFiles(repoRoot);
  if (files.length === 0) throw new Error("eslint-no-typescript-files");

  const override = {
    files: ["**/*.ts", "**/*.tsx"],
    ...(useTypeScriptParser ? {
      languageOptions: {
        parser,
        parserOptions: {
          ecmaVersion: "latest",
          sourceType: "module",
          ecmaFeatures: { jsx: true },
        },
      },
    } : {}),
    plugins: { sonarjs },
    rules: {
      "max-lines": ["error", {
        max: config.max_lines,
        skipBlankLines: false,
        skipComments: false,
      }],
      complexity: ["error", config.complexity],
      "sonarjs/cognitive-complexity": ["error", config.complexity],
    },
  };
  const eslint = new ESLint({
    cwd: resolve(repoRoot),
    overrideConfigFile: true,
    overrideConfig: [override],
  });
  const results = await eslint.lintFiles(files);
  const normalizedResults = results.map((result) => ({
    filePath: normalizeRepoPath(repoRoot, result.filePath),
    messages: result.messages.map((message) => ({
      ruleId: message.ruleId,
      message: message.message,
      line: message.line,
      endLine: message.endLine ?? null,
    })),
  }));
  return { files, results: normalizedResults };
}

export async function runEslintAdapter(repoRoot, config) {
  const measurement = await measureEslint(repoRoot, config);
  const parseErrors = measurement.results.flatMap((result) =>
    result.messages
      .filter((message) => message.ruleId === null)
      .map((message) => ({ path: result.filePath, line: message.line, message: message.message })));
  await writePrunerFile(repoRoot, ".pruner/raw/eslint.json", `${JSON.stringify(measurement.results, null, 2)}\n`);
  if (parseErrors.length > 0) {
    const error = new Error(`eslint-parse-errors:${parseErrors.length}`);
    error.parse_errors = parseErrors;
    throw error;
  }

  const records = [];
  const complexityByLocation = new Map();
  for (const result of measurement.results) {
    for (const message of result.messages) {
      if (message.ruleId === "max-lines") {
        const contents = await readFile(resolve(repoRoot, result.filePath), "utf8");
        const lines = contents.replace(/\r\n?/gu, "\n").replace(/\n$/u, "").split("\n").length;
        records.push({
          detector: "eslint",
          kind: "oversized",
          locations: [{ path: result.filePath, line_start: 1, line_end: lines }],
          evidence: { lines, threshold: config.max_lines, rule: "max-lines" },
        });
      } else if (message.ruleId === "complexity" || message.ruleId === "sonarjs/cognitive-complexity") {
        const key = `${result.filePath}:${message.line}`;
        const record = complexityByLocation.get(key) ?? {
          detector: "eslint",
          kind: "complexity",
          locations: [{ path: result.filePath, line_start: message.line, line_end: message.endLine ?? message.line }],
          evidence: {
            cyclomatic_complexity: null,
            cognitive_complexity: null,
            threshold: config.complexity,
          },
        };
        if (message.ruleId === "complexity") {
          record.evidence.cyclomatic_complexity = parseMetric(
            message.message,
            /complexity of (\d+)/u,
            "complexity",
          );
        } else {
          record.evidence.cognitive_complexity = parseMetric(
            message.message,
            /Cognitive Complexity from (\d+)/u,
            "cognitive-complexity",
          );
        }
        complexityByLocation.set(key, record);
      }
    }
  }
  records.push(...complexityByLocation.values());

  return {
    records,
    dropped_records: 0,
    metadata: {
      detector: "eslint",
      version: (await assertPinnedPackage("eslint")).version,
      parser: {
        name: "@typescript-eslint/parser",
        version: (await assertPinnedPackage("@typescript-eslint/parser")).version,
      },
      sonarjs: {
        name: "eslint-plugin-sonarjs",
        version: (await assertPinnedPackage("eslint-plugin-sonarjs")).version,
      },
      command: ["eslint-api", "--typescript-parser", "--no-fix"],
      exit_code: 0,
      raw_artifact: ".pruner/raw/eslint.json",
      analyzed_files: measurement.files.length,
      parse_errors: 0,
    },
  };
}
