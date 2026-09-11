import { describe, expect, it } from "vitest";
import { estimateLightingFromPixels } from "./scene-lighting";

function roomWithLight(width: number, height: number, brightX: number, brightY: number) {
  const pixels = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const index = (y * width + x) * 4; const bright = x === brightX && y === brightY;
    pixels[index] = bright ? 255 : 45; pixels[index + 1] = bright ? 235 : 50;
    pixels[index + 2] = bright ? 190 : 55; pixels[index + 3] = 255;
  }
  return pixels;
}

describe("estimateLightingFromPixels", () => {
  it("locates a warm source in the upper-left of the photo", () => {
    const result = estimateLightingFromPixels(roomWithLight(8, 8, 0, 0), 8, 8);
    expect(result.directionX).toBeLessThan(0);
    expect(result.directionY).toBeGreaterThan(0);
    expect(result.keyIntensity).toBeGreaterThan(result.ambientIntensity);
    expect(result.keyColor).not.toBe("#ffffff");
  });
});
