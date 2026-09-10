import type { Point, WindowDetection } from "@/domain/types";

export interface WindowDetector { detect(image: HTMLImageElement | HTMLCanvasElement): Promise<WindowDetection[]> }

type Line = { slope: number; intercept: number };

function peak(scores: number[], start: number, end: number) {
  let index = start; let value = -Infinity;
  for (let i = start; i < end; i += 1) if (scores[i] > value) { value = scores[i]; index = i; }
  return { index, value };
}

function regression(samples: Array<{ independent: number; dependent: number }>): Line {
  const n = samples.length || 1;
  const xMean = samples.reduce((sum, p) => sum + p.independent, 0) / n;
  const yMean = samples.reduce((sum, p) => sum + p.dependent, 0) / n;
  const numerator = samples.reduce((sum, p) => sum + (p.independent - xMean) * (p.dependent - yMean), 0);
  const denominator = samples.reduce((sum, p) => sum + (p.independent - xMean) ** 2, 0) || 1;
  const slope = numerator / denominator;
  return { slope, intercept: yMean - slope * xMean };
}

function intersection(vertical: Line, horizontal: Line): Point {
  const denominator = 1 - horizontal.slope * vertical.slope;
  const y = (horizontal.slope * vertical.intercept + horizontal.intercept) / (Math.abs(denominator) < 0.01 ? 1 : denominator);
  return { x: vertical.slope * y + vertical.intercept, y };
}

function bounds(polygon: [Point, Point, Point, Point]) {
  const xs = polygon.map((p) => p.x); const ys = polygon.map((p) => p.y);
  const x = Math.min(...xs); const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

export class AssistedWindowDetector implements WindowDetector {
  async detect(image: HTMLImageElement | HTMLCanvasElement): Promise<WindowDetection[]> {
    const sourceWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
    const sourceHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
    const width = Math.min(360, sourceWidth);
    const height = Math.max(80, Math.round(sourceHeight * width / sourceWidth));
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return [this.fallback(sourceWidth, sourceHeight)];
    context.drawImage(image, 0, 0, width, height);
    const rgba = context.getImageData(0, 0, width, height).data;
    const gray = new Float32Array(width * height);
    for (let i = 0; i < gray.length; i += 1) gray[i] = rgba[i * 4] * .299 + rgba[i * 4 + 1] * .587 + rgba[i * 4 + 2] * .114;

    const xScores = new Array(width).fill(0); const yScores = new Array(height).fill(0);
    for (let y = Math.round(height * .08); y < height * .92; y += 1) {
      for (let x = Math.round(width * .04); x < width * .96; x += 1) {
        xScores[x] += Math.abs(gray[y * width + x + 1] - gray[y * width + x - 1]);
        yScores[y] += Math.abs(gray[(y + 1) * width + x] - gray[(y - 1) * width + x]);
      }
    }
    const left = peak(xScores, Math.round(width * .06), Math.round(width * .46));
    const right = peak(xScores, Math.round(width * .54), Math.round(width * .94));
    const top = peak(yScores, Math.round(height * .06), Math.round(height * .46));
    const bottom = peak(yScores, Math.round(height * .54), Math.round(height * .94));

    const verticalLine = (base: number) => regression(Array.from({ length: 18 }, (_, i) => {
      const y = Math.round(height * (.12 + i * .044)); let best = base; let score = -1;
      for (let x = Math.max(2, base - 12); x <= Math.min(width - 3, base + 12); x += 1) {
        const next = Math.abs(gray[y * width + x + 1] - gray[y * width + x - 1]);
        if (next > score) { score = next; best = x; }
      }
      return { independent: y / height, dependent: best / width };
    }));
    const horizontalLine = (base: number) => regression(Array.from({ length: 18 }, (_, i) => {
      const x = Math.round(width * (.12 + i * .044)); let best = base; let score = -1;
      for (let y = Math.max(2, base - 12); y <= Math.min(height - 3, base + 12); y += 1) {
        const next = Math.abs(gray[(y + 1) * width + x] - gray[(y - 1) * width + x]);
        if (next > score) { score = next; best = y; }
      }
      return { independent: x / width, dependent: best / height };
    }));

    const leftLine = verticalLine(left.index); const rightLine = verticalLine(right.index);
    const topLine = horizontalLine(top.index); const bottomLine = horizontalLine(bottom.index);
    const polygon = [intersection(leftLine, topLine), intersection(rightLine, topLine), intersection(rightLine, bottomLine), intersection(leftLine, bottomLine)] as [Point, Point, Point, Point];
    const box = bounds(polygon);
    const valid = polygon.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y) && p.x > -.05 && p.x < 1.05 && p.y > -.05 && p.y < 1.05) && box.width > .2 && box.height > .2;
    if (!valid) return [this.fallback(sourceWidth, sourceHeight)];
    const safePolygon = polygon.map((p) => ({ x: Math.max(.015, Math.min(.985, p.x)), y: Math.max(.015, Math.min(.985, p.y)) })) as [Point, Point, Point, Point];
    return [{ id: crypto.randomUUID(), confidence: .62, polygon: safePolygon, boundingBox: bounds(safePolygon), imageWidth: sourceWidth, imageHeight: sourceHeight, detectionSource: "automatic", timestamp: new Date().toISOString() }];
  }

  private fallback(width: number, height: number): WindowDetection {
    const polygon: [Point, Point, Point, Point] = [{ x: .18, y: .2 }, { x: .82, y: .17 }, { x: .82, y: .82 }, { x: .19, y: .8 }];
    return { id: crypto.randomUUID(), confidence: .25, polygon, boundingBox: bounds(polygon), imageWidth: width, imageHeight: height, detectionSource: "automatic", timestamp: new Date().toISOString() };
  }
}

export class OnnxWindowDetector implements WindowDetector {
  async detect(): Promise<WindowDetection[]> { throw new Error("El modelo ONNX de detección todavía no está configurado."); }
}
