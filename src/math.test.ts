import { describe, it, expect } from "vitest";
import { add, clampToBoard } from "./math";

describe("add", () => {
  it("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
  });
});

describe("clampToBoard", () => {
  it("clamps below zero to zero", () => {
    expect(clampToBoard(-5, 8)).toBe(0);
  });
  it("clamps above max to size-1", () => {
    expect(clampToBoard(99, 8)).toBe(7);
  });
  it("leaves in-range values unchanged", () => {
    expect(clampToBoard(3, 8)).toBe(3);
  });
});
