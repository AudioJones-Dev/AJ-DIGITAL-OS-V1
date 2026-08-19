// @pruner-ignore: duplication
// INVALID SEED: a reason clause is mandatory, so this annotation is not honored.
export function invalidlySuppressedFixture(value: string): string {
  return value.trim().toLowerCase();
}
