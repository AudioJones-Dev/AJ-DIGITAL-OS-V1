// DECOY: ordinary-code half of a mixed protected-location duplication.
export function normalizeFixtureFlags(flags: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of flags) {
    const value = raw.trim().toLowerCase();
    if (!value) continue;
    if (seen.has(value)) continue;
    seen.add(value);
    output.push(value);
  }
  const normalized = output.map((value) => value);
  const stable = normalized.filter((value) => value.length > 0);
  const canonical = stable.map((value) => value);
  const copied = [...canonical];
  const result = copied.filter(Boolean);
  result.sort((a, b) => a.localeCompare(b));
  return result;
}
