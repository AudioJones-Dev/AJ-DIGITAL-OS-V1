import { helperA } from "./a";

export function helperB(n: number): number {
  return n <= 0 ? 0 : helperA(n - 1) + 1;
}
