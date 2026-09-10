import { describe, expect, it } from "vitest";
import { projectIntoQuadrilateral } from "./perspective";

describe("projectIntoQuadrilateral", () => {
  it("maps every asset corner to the detected window corner", () => {
    const polygon = [{ x: .2, y: .1 }, { x: .8, y: .2 }, { x: .7, y: .9 }, { x: .3, y: .8 }] as const;
    expect(projectIntoQuadrilateral([...polygon], 0, 0)).toEqual(polygon[0]);
    expect(projectIntoQuadrilateral([...polygon], 1, 0).x).toBeCloseTo(polygon[1].x);
    expect(projectIntoQuadrilateral([...polygon], 1, 1).x).toBeCloseTo(polygon[2].x);
    expect(projectIntoQuadrilateral([...polygon], 0, 1).y).toBeCloseTo(polygon[3].y);
  });
});
