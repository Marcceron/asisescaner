type CurtainDrapeInput = {
  u: number;
  v: number;
  uStart: number;
  uEnd: number;
  windowWidth: number;
  style?: string;
};

/** Deterministic fabric deformation: full enough to catch light, subtle enough to preserve perspective. */
export function calculateCurtainDrape({ u, v, uStart, uEnd, windowWidth, style }: CurtainDrapeInput) {
  if (style === "roller") {
    return { u, v, depth: Math.sin(u * Math.PI * 2) * windowWidth * .0008 };
  }

  const panelWidth = Math.max(.001, uEnd - uStart);
  const localU = (u - uStart) / panelWidth;
  const center = (uStart + uEnd) / 2;
  const foldCount = style === "sheer" ? 6.5 : style === "blackout" ? 4.25 : 5.5;
  const softness = style === "sheer" ? 1.18 : style === "blackout" ? .72 : 1;
  const phase = localU * foldCount * Math.PI * 2;

  // The folds loosen toward the floor and include a smaller harmonic so they
  // do not resemble a mathematically perfect corrugated sheet.
  const fall = .68 + .44 * Math.pow(v, .85);
  const primaryFold = Math.sin(phase + v * .16);
  const secondaryFold = Math.sin(phase * 2.03 + .8 + v * .72) * .22;
  const broadSway = Math.sin(localU * Math.PI * 2 + v * 2.1) * .07 * v;
  const depth = (primaryFold + secondaryFold + broadSway) * windowWidth * .014 * fall * softness;

  // A small amount of fullness and an uneven hem create a softer silhouette
  // without losing the quadrilateral detected for the window.
  const fullness = .035 * Math.pow(v, 1.7) * softness;
  const adjustedU = center + (u - center) * (1 + fullness)
    + Math.sin(v * Math.PI) * Math.sin(localU * Math.PI * 2 + .4) * .0025;
  const hem = Math.pow(v, 10) * (.004 + .004 * (.5 + .5 * Math.sin(phase + .6)));

  return { u: adjustedU, v: v + hem, depth };
}
