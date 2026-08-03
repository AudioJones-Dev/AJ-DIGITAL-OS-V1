import { helperB } from "./b";

export function helperA(n: number): number {
  return n <= 0 ? 0 : helperB(n - 1) + 1;
}
