import { describe, expect, it } from "vitest";
import { inferWindowHeightFromReference } from "./standard-reference-detector";

describe("inferWindowHeightFromReference", () => {
  it("scales a window from a known standard object", () => {
    expect(inferWindowHeightFromReference(1000, 76, 11.4)).toBe(150);
  });

  it("rejects invalid reference geometry", () => {
    expect(inferWindowHeightFromReference(1000, 0, 11.4)).toBeNull();
  });
});
