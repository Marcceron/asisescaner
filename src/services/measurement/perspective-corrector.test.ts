import { describe, expect, it } from "vitest";
import type { Point } from "@/domain/types";
import { correctRectanglePerspective } from "./perspective-corrector";

function projectedRectangle(): [Point, Point, Point, Point] {
  const imageWidth = 2000; const imageHeight = 1500; const focal = 1200;
  const yaw = 20 * Math.PI / 180; const pitch = -10 * Math.PI / 180;
  const r1 = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const r2 = [Math.sin(yaw) * Math.sin(pitch), Math.cos(pitch), Math.cos(yaw) * Math.sin(pitch)];
  const project = (x: number, y: number): Point => {
    const X = r1[0] * x + r2[0] * y; const Y = r1[1] * x + r2[1] * y; const Z = 3000 + r1[2] * x + r2[2] * y;
    return { x: (1000 + focal * X / Z) / imageWidth, y: (750 + focal * Y / Z) / imageHeight };
  };
  return [project(-400, -500), project(400, -500), project(400, 500), project(-400, 500)];
}

describe("correctRectanglePerspective", () => {
  it("recovers the metric aspect ratio of a tilted rectangle", () => {
    const result = correctRectanglePerspective(projectedRectangle(), 2000, 1500);
    expect(result.method).toBe("metric-homography");
    expect(result.aspectRatio).toBeCloseTo(.8, 2);
  });
});
