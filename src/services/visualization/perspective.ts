import type { Point } from "@/domain/types";

export type PerspectivePose = { yaw: number; pitch: number; rotation: number };

export function projectIntoQuadrilateral(
  [p0, p1, p2, p3]: [Point, Point, Point, Point],
  u: number,
  v: number,
): Point {
  const dx1 = p1.x - p2.x; const dx2 = p3.x - p2.x; const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y; const dy2 = p3.y - p2.y; const dy3 = p0.y - p1.y + p2.y - p3.y;
  const determinant = dx1 * dy2 - dx2 * dy1;
  if (Math.abs(determinant) < 1e-9) {
    return { x: p0.x + u * (p1.x - p0.x) + v * (p3.x - p0.x), y: p0.y + u * (p1.y - p0.y) + v * (p3.y - p0.y) };
  }
  const g = (dx3 * dy2 - dx2 * dy3) / determinant;
  const h = (dx1 * dy3 - dx3 * dy1) / determinant;
  const a = p1.x - p0.x + g * p1.x; const b = p3.x - p0.x + h * p3.x;
  const d = p1.y - p0.y + g * p1.y; const e = p3.y - p0.y + h * p3.y;
  const denominator = g * u + h * v + 1;
  return { x: (a * u + b * v + p0.x) / denominator, y: (d * u + e * v + p0.y) / denominator };
}

// This adapter keeps the detected quadrilateral as the source of truth for
// today's previews and for future optimized GLB/glTF assets.
export function estimatePerspective([topLeft, topRight, bottomRight, bottomLeft]: [Point, Point, Point, Point]): PerspectivePose {
  const topWidth = Math.hypot(topRight.x - topLeft.x, topRight.y - topLeft.y);
  const bottomWidth = Math.hypot(bottomRight.x - bottomLeft.x, bottomRight.y - bottomLeft.y);
  const leftHeight = Math.hypot(bottomLeft.x - topLeft.x, bottomLeft.y - topLeft.y);
  const rightHeight = Math.hypot(bottomRight.x - topRight.x, bottomRight.y - topRight.y);
  return { yaw: Math.atan2(rightHeight - leftHeight, Math.max(leftHeight, rightHeight)) * 180 / Math.PI, pitch: Math.atan2(bottomWidth - topWidth, Math.max(topWidth, bottomWidth)) * 180 / Math.PI, rotation: Math.atan2(topRight.y - topLeft.y, topRight.x - topLeft.x) * 180 / Math.PI };
}
