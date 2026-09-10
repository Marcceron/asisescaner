import type { Point } from "@/domain/types";
import { distance } from "./geometry";

export type StandardReferencePrediction = {
  object: ReferenceKind;
  label: string;
  confidence: number;
  referenceHeightCm: number;
  detected: boolean;
  windowHeightCm: number;
  referenceBox: { x: number; y: number; width: number; height: number };
};

export type ReferenceKind = "switch-plate" | "cup" | "bottle" | "custom";

export const referencePresets: Record<ReferenceKind, { label: string; heightCm: number }> = {
  "switch-plate": { label: "Apagador / contacto", heightCm: 11.4 },
  cup: { label: "Taza", heightCm: 9.5 },
  bottle: { label: "Botella", heightCm: 21 },
  custom: { label: "Objeto personalizado", heightCm: 10 },
};

const SWITCH_PLATE_HEIGHT_CM = 11.4;

export function inferWindowHeightFromReference(windowHeightPx: number, referenceHeightPx: number, referenceHeightCm: number) {
  if (windowHeightPx <= 0 || referenceHeightPx <= 0 || referenceHeightCm <= 0) return null;
  const result = windowHeightPx * referenceHeightCm / referenceHeightPx;
  return Number.isFinite(result) ? Math.round(result * 10) / 10 : null;
}

function integral(values: Float32Array, width: number, height: number) {
  const result = new Float64Array((width + 1) * (height + 1));
  for (let y = 1; y <= height; y += 1) {
    let row = 0;
    for (let x = 1; x <= width; x += 1) {
      row += values[(y - 1) * width + x - 1];
      result[y * (width + 1) + x] = result[(y - 1) * (width + 1) + x] + row;
    }
  }
  return result;
}

function areaSum(data: Float64Array, stride: number, x: number, y: number, width: number, height: number) {
  const x2 = x + width; const y2 = y + height;
  return data[y2 * stride + x2] - data[y * stride + x2] - data[y2 * stride + x] + data[y * stride + x];
}

export class StandardReferenceDetector {
  async detect(image: HTMLImageElement | HTMLCanvasElement, window: [Point, Point, Point, Point]): Promise<StandardReferencePrediction | null> {
    const sourceWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
    const sourceHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
    const width = Math.min(260, sourceWidth); const height = Math.max(100, Math.round(sourceHeight * width / sourceWidth));
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true }); if (!context) return null;
    context.drawImage(image, 0, 0, width, height);
    const pixels = context.getImageData(0, 0, width, height).data;
    const gray = new Float32Array(width * height); const edges = new Float32Array(width * height);
    for (let i = 0; i < gray.length; i += 1) gray[i] = pixels[i * 4] * .299 + pixels[i * 4 + 1] * .587 + pixels[i * 4 + 2] * .114;
    for (let y = 1; y < height - 1; y += 1) for (let x = 1; x < width - 1; x += 1) {
      const i = y * width + x;
      edges[i] = Math.abs(gray[i + 1] - gray[i - 1]) + Math.abs(gray[i + width] - gray[i - width]);
    }
    const edgeIntegral = integral(edges, width, height); const grayIntegral = integral(gray, width, height); const stride = width + 1;
    const minX = Math.min(...window.map((p) => p.x)); const maxX = Math.max(...window.map((p) => p.x));
    const minY = Math.min(...window.map((p) => p.y)); const maxY = Math.max(...window.map((p) => p.y));
    let best: { score: number; x: number; y: number; width: number; height: number } | null = null;

    for (let boxHeight = Math.round(height * .035); boxHeight <= height * .11; boxHeight += 3) {
      const boxWidth = Math.max(5, Math.round(boxHeight / 1.63));
      for (let y = 3; y + boxHeight < height - 3; y += 3) for (let x = 3; x + boxWidth < width - 3; x += 3) {
        const nx = (x + boxWidth / 2) / width; const ny = (y + boxHeight / 2) / height;
        const insideWindow = nx > minX && nx < maxX && ny > minY && ny < maxY;
        const besideWindow = (nx < minX || nx > maxX) && nx > minX - .3 && nx < maxX + .3 && ny > minY - .08 && ny < maxY + .22;
        if (insideWindow || !besideWindow || boxWidth < 5 || boxHeight < 8) continue;
        const inset = 2;
        const outer = areaSum(edgeIntegral, stride, x, y, boxWidth, boxHeight);
        const inner = areaSum(edgeIntegral, stride, x + inset, y + inset, boxWidth - inset * 2, boxHeight - inset * 2);
        const borderAverage = (outer - inner) / Math.max(1, boxWidth * boxHeight - (boxWidth - 4) * (boxHeight - 4));
        const brightness = areaSum(grayIntegral, stride, x + inset, y + inset, boxWidth - 4, boxHeight - 4) / Math.max(1, (boxWidth - 4) * (boxHeight - 4));
        const innerEdges = inner / Math.max(1, (boxWidth - 4) * (boxHeight - 4));
        const score = borderAverage - innerEdges * .3 + Math.max(0, brightness - 125) * .045;
        if (!best || score > best.score) best = { score, x, y, width: boxWidth, height: boxHeight };
      }
    }
    if (!best || best.score < 30) return null;
    const confidence = Math.min(.92, .62 + (best.score - 30) / 80);
    if (confidence < .8) return null;
    const referenceHeightPx = best.height * sourceHeight / height;
    const windowHeightPx = Math.sqrt(
      distance(window[0], window[3], sourceWidth, sourceHeight) * distance(window[1], window[2], sourceWidth, sourceHeight),
    );
    const windowHeightCm = inferWindowHeightFromReference(windowHeightPx, referenceHeightPx, SWITCH_PLATE_HEIGHT_CM);
    if (windowHeightCm === null || windowHeightCm < 35 || windowHeightCm > 450) return null;
    return {
      object: "switch-plate", label: referencePresets["switch-plate"].label, confidence,
      referenceHeightCm: SWITCH_PLATE_HEIGHT_CM, detected: true,
      windowHeightCm,
      referenceBox: { x: best.x / width, y: best.y / height, width: best.width / width, height: best.height / height },
    };
  }
}
