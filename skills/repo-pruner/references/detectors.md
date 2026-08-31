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

#### Configurable source roots

The scanned roots come from `detectors.madge.source_roots` in `.pruner.yml`.
The key is optional and defaults to `["src"]`, which reproduces the certified
fixture invocation byte for byte. Repositories without a `src/` directory — a
Next.js App Router project using `app/`, `lib/`, and `components/`, for
example — must list their own roots:

```yaml
detectors:
  madge:
    enabled: true
    source_roots: [app, lib, components]
```

Each root must be repository-relative, non-empty, unique, and free of `..`
segments; absolute roots are rejected as malformed config. A configured root
that does not resolve to a directory fails closed as
`madge-missing-source-root:<roots>` before any detector executes, instead of
surfacing as the opaque `detector-exit:madge:1` that a missing `src/`
previously produced.

Always pass `--basedir .` with the repository root as the working directory.
Madge otherwise reports every path relative to the common ancestor of the
scanned roots, so the shape of returned paths changes as roots are added, and a
scanned file that imports outside its own root comes back as a `../` escape.
Pinning the base directory makes returned paths repository-relative for any
root layout, so the adapter must not prefix them.

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

A fixture finding uses the canonical wrapper, run from the scanned repository,
which vendors the skill at `skills/repo-pruner/`:

```text
node skills/repo-pruner/scripts/reverify.mjs --id <finding-id> --config .pruner.yml
```

A live repository does not contain the skill, so that path does not resolve
there. Live findings emit the package-relative form instead, run with the skill
package as the working directory:

```text
node scripts/reverify.mjs --id <finding-id> --config .pruner.yml --repo <repository-root> --scope <portfolio|component> --live-repository
```

`<repository-root>` stays a literal placeholder in `findings.jsonl`, which must
never carry absolute paths, host names, or user names. The runner records the
substitution — `working_directory`, `repository_root`, and `command_template` —
under `reverification` in `.pruner/run-manifest.json`, which is outside the
byte-parity assertion.

Reverifying a live repository clears the same explicit
`--repo` / `--scope` / `--live-repository` gate that `run-pruner.mjs` enforces;
omitting any of the three stops the wrapper before detector execution. A
pruner-lab fixture still reverifies with no authorization flags.

The wrapper must load the recorded adapter, exact version, normalized inputs,
and original configuration. If it cannot reproduce a raw record with one
command, drop the finding and increment `dropped_records`.
