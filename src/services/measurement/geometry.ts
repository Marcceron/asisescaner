import type { KnownMeasurement, Measurement, Point } from "@/domain/types";
import { correctRectanglePerspective } from "./perspective-corrector";

export function distance(a: Point, b: Point, width: number, height: number) {
  return Math.hypot((b.x - a.x) * width, (b.y - a.y) * height);
}

function round(value: number, decimals = 1) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function calculateMeasurement(
  polygon: [Point, Point, Point, Point],
  imageWidth: number,
  imageHeight: number,
  knownMeasurement: KnownMeasurement | null,
): Measurement {
  const corrected = correctRectanglePerspective(polygon, imageWidth, imageHeight);
  const empty: Measurement = {
    widthCm: 0, heightCm: 0, diagonalCm: 0, calibrated: false,
    calibrationReferenceCm: null, knownEdge: null,
    perspectiveCorrected: corrected.method === "metric-homography",
    geometryConfidence: round(corrected.confidence * 100, 0),
    errorMarginPercent: 0,
  };
  if (!knownMeasurement || !Number.isFinite(knownMeasurement.value) || knownMeasurement.value <= 0) return empty;

  const widthCm = knownMeasurement.edge === "width" ? knownMeasurement.value : knownMeasurement.value * corrected.aspectRatio;
  const heightCm = knownMeasurement.edge === "height" ? knownMeasurement.value : knownMeasurement.value / corrected.aspectRatio;
  const diagonalCm = Math.hypot(widthCm, heightCm);
  return {
    widthCm: round(widthCm), heightCm: round(heightCm), diagonalCm: round(diagonalCm, 2),
    calibrated: true, calibrationReferenceCm: knownMeasurement.value, knownEdge: knownMeasurement.edge,
    perspectiveCorrected: corrected.method === "metric-homography",
    geometryConfidence: round(corrected.confidence * 100, 0),
    errorMarginPercent: knownMeasurement.source === "standard-object"
      ? Math.max(18, Math.round((1 - (knownMeasurement.confidence ?? .72)) * 100))
      : corrected.method === "metric-homography" ? 12 : 8,
  };
}

export function polygonBounds(points: [Point, Point, Point, Point]) {
  const xs = points.map((point) => point.x); const ys = points.map((point) => point.y);
  const x = Math.min(...xs); const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}
