export type DepthCapability = "webxr" | "ios-native-required" | "unavailable";

type XRSystemLike = { isSessionSupported: (mode: string) => Promise<boolean> };

export async function detectDepthCapability(): Promise<DepthCapability> {
  const agent = navigator.userAgent;
  const xr = (navigator as Navigator & { xr?: XRSystemLike }).xr;
  if (xr) {
    try {
      if (await xr.isSessionSupported("immersive-ar")) return "webxr";
    } catch { /* Capability checks may be blocked by policy. */ }
  }
  if (/iPhone|iPad|iPod/i.test(agent)) return "ios-native-required";
  return "unavailable";
}
