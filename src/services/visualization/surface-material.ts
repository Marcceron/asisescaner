import { CanvasTexture, DoubleSide, FrontSide, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from "three";
import type { Product } from "@/domain/types";
import { fabricPatterns, materialPresets, type MaterialKind } from "@/data/materials";

/** Small deterministic textures keep the material finish lightweight and reproducible. */
export function createSurfaceMaterial(product?: Product, fabric = false) {
  const kind: MaterialKind = product?.material ?? (fabric ? "linen" : product?.id === "rod-wood" ? "wood" : "metal");
  const preset = materialPresets[kind];
  const color = product?.tone ?? (product?.id === "rod-white" ? "#eeeeea" : product?.id === "rod-black" ? "#17191c" : preset.color);
  const wood = kind === "wood" || kind === "walnut";
  const pattern = fabric ? product?.pattern : undefined;
  const material = new MeshStandardMaterial({
    color, metalness: fabric ? 0 : preset.metalness, roughness: preset.roughness,
    side: fabric ? DoubleSide : FrontSide,
    transparent: fabric, opacity: fabric && product?.renderStyle === "sheer" ? .5 : 1,
  });
  if (wood || fabric) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = color; ctx.fillRect(0, 0, 256, 256);
      if (wood) {
        // Vertical grain follows cylinders' longitudinal UV direction.
        for (let x = 0; x < 256; x += 2) {
          ctx.strokeStyle = `rgba(30,16,8,${.045 + .07 * (1 + Math.sin(x * 1.71)) / 2})`;
          ctx.lineWidth = 1 + (x % 3);
          ctx.beginPath();
          for (let y = 0; y <= 256; y += 4) {
            const px = x + 2 * Math.sin(y * Math.PI * 2 / 256 + x * .13);
            if (y === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
          }
          ctx.stroke();
        }
      } else {
        if (pattern) {
          ctx.fillStyle = fabricPatterns[pattern].color;
          if (pattern === "stripes") {
            for (let x = 0; x < 256; x += 64) ctx.fillRect(x + 24, 0, 12, 256);
          } else if (pattern === "grid") {
            for (let p = 0; p < 256; p += 64) {
              ctx.fillRect(p, 0, 3, 256); ctx.fillRect(0, p, 256, 3);
            }
          } else {
            for (let y = 32; y < 256; y += 64) for (let x = 32; x < 256; x += 64) {
              ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
            }
          }
        }
        const spacing = kind === "jacquard" ? 3 : kind === "cotton" ? 2 : 4;
        for (let p = 0; p < 256; p += spacing) {
          ctx.fillStyle = "rgba(255,255,255,.1)"; ctx.fillRect(p, 0, 1, 256);
          ctx.fillStyle = "rgba(50,40,25,.045)"; ctx.fillRect(0, p, 256, 1);
        }
      }
      const map = new CanvasTexture(canvas);
      map.colorSpace = SRGBColorSpace;
      map.wrapS = map.wrapT = RepeatWrapping;
      if (fabric) map.repeat.set(2, 4);
      material.map = map; material.color.set("#ffffff");
    }
  }
  return material;
}

export function disposeSurfaceMaterial(material: MeshStandardMaterial) {
  material.map?.dispose();
  material.dispose();
}
