export async function loadExporter(name: string) {
  // Computed specifier — static analysis cannot resolve this target.
  const mod = await import(`../plugins/${name}`);
  return mod.default;
}
