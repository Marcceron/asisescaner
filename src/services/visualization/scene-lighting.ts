export type SceneLighting = {
  directionX: number;
  directionY: number;
  keyColor: string;
  ambientColor: string;
  keyIntensity: number;
  ambientIntensity: number;
};

export const defaultSceneLighting: SceneLighting = {
  directionX: -.35,
  directionY: .7,
  keyColor: "#fff8ed",
  ambientColor: "#e7edf5",
  keyIntensity: 2.1,
  ambientIntensity: .48,
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const toHex = (value: number) => Math.round(clamp(value, 0, 255)).toString(16).padStart(2, "0");
const colorHex = (red: number, green: number, blue: number, whiteMix: number) => {
  const mix = (channel: number) => channel * (1 - whiteMix) + 255 * whiteMix;
  return `#${toHex(mix(red))}${toHex(mix(green))}${toHex(mix(blue))}`;
};

/** Finds the weighted centroid and color of the brightest part of a downsampled room image. */
export function estimateLightingFromPixels(pixels: Uint8ClampedArray, width: number, height: number): SceneLighting {
  if (width < 1 || height < 1 || pixels.length < width * height * 4) return defaultSceneLighting;

  const samples: { x: number; y: number; light: number; red: number; green: number; blue: number }[] = [];
  let meanLight = 0; let meanRed = 0; let meanGreen = 0; let meanBlue = 0;
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const index = (y * width + x) * 4;
    const red = pixels[index]; const green = pixels[index + 1]; const blue = pixels[index + 2];
    const light = (.2126 * red + .7152 * green + .0722 * blue) / 255;
    samples.push({ x, y, light, red, green, blue });
    meanLight += light; meanRed += red; meanGreen += green; meanBlue += blue;
  }
  meanLight /= samples.length; meanRed /= samples.length; meanGreen /= samples.length; meanBlue /= samples.length;
  const ordered = samples.map((sample) => sample.light).sort((a, b) => a - b);
  const threshold = ordered[Math.floor((ordered.length - 1) * .82)];

  let weightTotal = 0; let xTotal = 0; let yTotal = 0;
  let redTotal = 0; let greenTotal = 0; let blueTotal = 0; let brightTotal = 0;
  for (const sample of samples) {
    if (sample.light < threshold) continue;
    const weight = .025 + Math.pow(Math.max(0, sample.light - threshold), 1.4);
    weightTotal += weight; xTotal += sample.x * weight; yTotal += sample.y * weight;
    redTotal += sample.red * weight; greenTotal += sample.green * weight; blueTotal += sample.blue * weight;
    brightTotal += sample.light * weight;
  }
  if (!weightTotal) return defaultSceneLighting;

  const brightLight = brightTotal / weightTotal;
  return {
    directionX: clamp((xTotal / weightTotal / Math.max(1, width - 1) - .5) * 2, -1, 1),
    directionY: clamp((.5 - yTotal / weightTotal / Math.max(1, height - 1)) * 2, -1, 1),
    keyColor: colorHex(redTotal / weightTotal, greenTotal / weightTotal, blueTotal / weightTotal, .42),
    ambientColor: colorHex(meanRed, meanGreen, meanBlue, .68),
    keyIntensity: clamp(1.45 + (brightLight - meanLight) * 1.9, 1.45, 2.85),
    ambientIntensity: clamp(.26 + meanLight * .32, .26, .58),
  };
}

export async function estimateSceneLighting(imageSource: string): Promise<SceneLighting> {
  try {
    const image = new Image();
    image.decoding = "async";
    image.src = imageSource;
    if (!image.complete) await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve(); image.onerror = () => reject(new Error("Image unavailable"));
    });
    await image.decode().catch(() => undefined);
    const width = 48; const height = Math.max(24, Math.round(width * image.naturalHeight / image.naturalWidth));
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) return defaultSceneLighting;
    context.drawImage(image, 0, 0, width, height);
    return estimateLightingFromPixels(context.getImageData(0, 0, width, height).data, width, height);
  } catch {
    return defaultSceneLighting;
  }
}
