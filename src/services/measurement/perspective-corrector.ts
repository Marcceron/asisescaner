import type { Point } from "@/domain/types";

export type CorrectedRectangle = {
  aspectRatio: number;
  method: "metric-homography" | "symmetric-edges";
  confidence: number;
  correctedCorners: [Point, Point, Point, Point];
};

type Homography = { a: number; b: number; c: number; d: number; e: number; f: number; g: number; h: number };

function homographyFromUnitSquare([p0, p1, p2, p3]: [Point, Point, Point, Point]): Homography | null {
  const dx1 = p1.x - p2.x; const dx2 = p3.x - p2.x; const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y; const dy2 = p3.y - p2.y; const dy3 = p0.y - p1.y + p2.y - p3.y;
  const denominator = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(denominator) < 1e-9) return null;
  const g = (dx3 * dy2 - dx2 * dy3) / denominator;
  const h = (dx1 * dy3 - dx3 * dy1) / denominator;
  return {
    a: p1.x - p0.x + g * p1.x, b: p3.x - p0.x + h * p3.x, c: p0.x,
    d: p1.y - p0.y + g * p1.y, e: p3.y - p0.y + h * p3.y, f: p0.y,
    g, h,
  };
}

function clamp(value: number, min = 0, max = 1) { return Math.max(min, Math.min(max, value)); }
function pixelDistance(a: Point, b: Point, width: number, height: number) { return Math.hypot((b.x - a.x) * width, (b.y - a.y) * height); }

export function correctRectanglePerspective(
  polygon: [Point, Point, Point, Point],
  imageWidth: number,
  imageHeight: number,
): CorrectedRectangle {
  const pixels = polygon.map((point) => ({ x: point.x * imageWidth, y: point.y * imageHeight })) as [Point, Point, Point, Point];
  const top = pixelDistance(polygon[0], polygon[1], imageWidth, imageHeight);
  const bottom = pixelDistance(polygon[3], polygon[2], imageWidth, imageHeight);
  const left = pixelDistance(polygon[0], polygon[3], imageWidth, imageHeight);
  const right = pixelDistance(polygon[1], polygon[2], imageWidth, imageHeight);
  const fallbackRatio = Math.sqrt(Math.max(1, top * bottom) / Math.max(1, left * right));
  const edgeConsistency = 1 - ((Math.abs(top - bottom) / Math.max(top, bottom, 1)) + (Math.abs(left - right) / Math.max(left, right, 1))) / 2;
  const homography = homographyFromUnitSquare(pixels);
  let aspectRatio = fallbackRatio;
  let method: CorrectedRectangle["method"] = "symmetric-edges";

  if (homography) {
    const cx = imageWidth / 2; const cy = imageHeight / 2;
    const x1 = homography.a - cx * homography.g; const y1 = homography.d - cy * homography.g;
    const x2 = homography.b - cx * homography.h; const y2 = homography.e - cy * homography.h;
    const denominator = homography.g * homography.h;
    const focalSquared = -((x1 * x2) + (y1 * y2)) / denominator;
    const maxDimension = Math.max(imageWidth, imageHeight);
    if (Number.isFinite(focalSquared) && focalSquared > (maxDimension * .2) ** 2 && focalSquared < (maxDimension * 10) ** 2) {
      const focal = Math.sqrt(focalSquared);
      const widthScale = Math.hypot(x1 / focal, y1 / focal, homography.g);
      const heightScale = Math.hypot(x2 / focal, y2 / focal, homography.h);
      const candidate = widthScale / Math.max(heightScale, 1e-9);
      if (Number.isFinite(candidate) && candidate >= .1 && candidate <= 10) {
        aspectRatio = candidate;
        method = "metric-homography";
      }
    }
  }

  const safeRatio = clamp(aspectRatio, .1, 10);
  return {
    aspectRatio: safeRatio,
    method,
    confidence: clamp(edgeConsistency * (method === "metric-homography" ? .9 : .72), .25, .9),
    correctedCorners: [{ x: 0, y: 0 }, { x: safeRatio, y: 0 }, { x: safeRatio, y: 1 }, { x: 0, y: 1 }],
  };
}
