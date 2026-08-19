# Detector adapter contract

P2 pins and implements the following detector contract. Always invoke these
packages through the skill-local adapter runtime; never reconstruct their
commands from prose.

| Package | Exact version |
|---|---:|
| `jscpd` | `5.0.14` |
| `knip` | `6.31.0` |
| `madge` | `8.0.0` |
| `eslint` | `10.8.0` |
| `eslint-plugin-sonarjs` | `4.2.0` |
| `@typescript-eslint/parser` | `8.65.0` |
| `typescript` | `5.9.3` |

## Invariants for every adapter

- Resolve the executable from the skill package directory.
- Verify the resolved package version against the lockfile.
- Never use bare `npx`, `npm exec` without `--offline`, a global binary, an API,
  or a hosted service.
- Run with repository root as working directory and explicit output under
  `.pruner/raw/**`.
- Disable fix mode, builds, coverage, snapshots, generators, and caches outside
  `.pruner/`.
- Parse raw output into a normalized adapter record; never classify inside an
  adapter.
- Record command, exit code, version, and raw artifact path in the manifest.
- Missing or mismatched packages block the run before any actionable output.

## P2 adapter surfaces

| Adapter | Evidence | Full-context rule |
|---|---|---|
| `jscpd` | duplicated blocks | Scan repository context; exclusions reduce parsing noise but never grant actionability |
| `knip` | unused files, exports, dependencies, unresolved imports | Resolve the complete entry graph before classification |
| `madge` | cycles and orphan candidates | Run circular and orphan modes separately against the full project graph |
| `eslint` | complexity, cognitive complexity, line thresholds | Use a bundled read-only config and never `--fix` |
| `tsc` | type-health evidence | Invoke `--noEmit`; failures are baseline evidence, not pruning findings |
| project test adapter | behavior-health evidence | Run only an explicitly configured command proven not to update coverage, snapshots, or generated output |
| annotation scanner | invalid `@pruner-ignore` directives | Deterministic local scanner implemented by the runner |

Build commands are permanently outside the core run because common builds
write `dist/`, `.next/`, or other source-adjacent output.

## Fail-closed empirical requirements

### Madge TypeScript graph

Pass both `--extensions ts,tsx` and `--ts-config tsconfig.json` for every
fixture TypeScript graph invocation. Run the dependency tree first and reject
an empty object before accepting cycle or orphan output. Madge 8 returns exit
code 1 when the seeded cycle is found; accept that finding exit only when
stdout is valid cycle JSON and the prerequisite tree is non-empty.

Treat `--orphans` output as candidates. Corroborate a candidate with Knip
before attaching `madge-orphan` as a second evidence signal. Count unmatched
candidates as dropped raw records, including the project entry point.

### ESLint TypeScript parsing

Load the pinned TypeScript parser object directly from the skill-local package.
Treat every ESLint message with `ruleId: null` as a parse/configuration error
and block the adapter when any exist. Record built-in cyclomatic complexity and
SonarJS cognitive complexity as separate evidence fields; do not substitute
one for the other.

### jscpd Markdown behavior

Do not pass `--format` and do not raise the configured `15` line / `70`
token thresholds to hide documentation noise. jscpd 5.0.14 detects the seeded
documentation and prompt pairs as `markdown`. Preserve those raw normalized
records so P3 protection tests exercise real detector output.

## Full-graph component rule

Run every enabled adapter against the complete fixture graph. Apply
changed-surface filtering only after normalization. When any location
intersects the changed-path set, choose the lexicographically first changed
location as `primary_path`, emit the record, and retain every unchanged
context location.

## Reverification

Every finding uses the canonical wrapper:

```text
node skills/repo-pruner/scripts/reverify.mjs --id <finding-id> --config .pruner.yml
```

The wrapper must load the recorded adapter, exact version, normalized inputs,
and original configuration. If it cannot reproduce a raw record with one
command, drop the finding and increment `dropped_records`.
