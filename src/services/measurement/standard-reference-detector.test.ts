import { describe, expect, it } from "vitest";
import { inferWindowHeightFromReference } from "./standard-reference-detector";

describe("inferWindowHeightFromReference", () => {
  it("scales a window from a known standard object", () => {
    expect(inferWindowHeightFromReference(1000, 76, 11.4)).toBe(150);
  });

  it("rejects invalid reference geometry", () => {
    expect(inferWindowHeightFromReference(1000, 0, 11.4)).toBeNull();
  });

  it("applies the manual offset once without changing the entered height", () => {
    const reference = { referenceHeightCm: 10, calibrationOffsetCm: 4 };
    expect(inferWindowHeightFromReference(500, 50, reference.referenceHeightCm, reference.calibrationOffsetCm)).toBe(140);
    expect(inferWindowHeightFromReference(500, 50, reference.referenceHeightCm, reference.calibrationOffsetCm)).toBe(140);
    expect(reference.referenceHeightCm).toBe(10);
    expect(inferWindowHeightFromReference(500, 50, 10)).toBe(100);
    expect(inferWindowHeightFromReference(500, 50, 0, 4)).toBeNull();
  });
});
