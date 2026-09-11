import { describe, expect, it } from "vitest";
import { calculateCurtainDrape } from "./curtain-drape";

describe("calculateCurtainDrape", () => {
  it("keeps roller shades nearly flat", () => {
    const result = calculateCurtainDrape({ u: .25, v: .7, uStart: 0, uEnd: 1, windowWidth: 2, style: "roller" });
    expect(Math.abs(result.depth)).toBeLessThan(.002);
    expect(result.u).toBe(.25);
    expect(result.v).toBe(.7);
  });

  it("gives hanging fabric more fullness near the hem", () => {
    const top = calculateCurtainDrape({ u: .1, v: 0, uStart: 0, uEnd: .5, windowWidth: 2, style: "wave" });
    const bottom = calculateCurtainDrape({ u: .1, v: 1, uStart: 0, uEnd: .5, windowWidth: 2, style: "wave" });
    expect(Math.abs(bottom.u - .25)).toBeGreaterThan(Math.abs(top.u - .25));
    expect(bottom.v).toBeGreaterThan(1);
  });
});
