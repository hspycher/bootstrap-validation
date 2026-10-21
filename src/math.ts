export function add(a: number, b: number): number {
  return a + b;
}

export function clampToBoard(value: number, size: number): number {
  return Math.max(0, Math.min(size - 1, value));
}
