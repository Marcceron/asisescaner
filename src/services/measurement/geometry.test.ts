import { describe, expect, it } from "vitest";
import { calculateMeasurement, polygonBounds } from "./geometry";

const rectangle = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }] as const;

describe("calculateMeasurement", () => {
  it("case 1: derives 150 cm height from 800×1000 px and a 120 cm width", () => {
    const result = calculateMeasurement([...rectangle], 800, 1000, { value: 120, unit: "centimeters", edge: "width" });
    expect(result.widthCm).toBe(120); expect(result.heightCm).toBe(150);
    expect(result.calibrated).toBe(true); expect(result.knownEdge).toBe("width");
  });

  it("case 2: calculates the real diagonal", () => {
    const result = calculateMeasurement([...rectangle], 800, 1000, { value: 120, unit: "centimeters", edge: "width" });
    expect(result.diagonalCm).toBeCloseTo(192.09, 2);
  });

  it("case 3: derives 120 cm width when height is known", () => {
    const result = calculateMeasurement([...rectangle], 800, 1000, { value: 150, unit: "centimeters", edge: "height" });
    expect(result.widthCm).toBe(120); expect(result.heightCm).toBe(150); expect(result.knownEdge).toBe("height");
  });

  it("does not invent centimeters without a known measurement", () => {
    const result = calculateMeasurement([...rectangle], 800, 1000, null);
    expect(result.widthCm).toBe(0); expect(result.heightCm).toBe(0); expect(result.diagonalCm).toBe(0); expect(result.calibrated).toBe(false);
  });
});

describe("polygonBounds", () => {
  it("returns normalized extents", () => {
    const inset = [{ x: .1, y: .2 }, { x: .6, y: .2 }, { x: .6, y: .7 }, { x: .1, y: .7 }] as const;
    const result = polygonBounds([...inset]);
    expect(result.x).toBeCloseTo(.1); expect(result.y).toBeCloseTo(.2); expect(result.width).toBeCloseTo(.5); expect(result.height).toBeCloseTo(.5);
  });
});
