import { CanvasTexture, DoubleSide, FrontSide, MeshPhysicalMaterial, MeshStandardMaterial, RepeatWrapping, SRGBColorSpace } from "three";
import type { Product } from "@/domain/types";
import { fabricPatterns, materialPresets, type MaterialKind } from "@/data/materials";

/** Small deterministic textures keep the material finish lightweight and reproducible. */
export function createSurfaceMaterial(product?: Product, fabric = false) {
  const kind: MaterialKind = product?.material ?? (fabric ? "linen" : product?.id === "rod-wood" ? "wood" : "metal");
  const preset = materialPresets[kind];
  const color = product?.tone ?? (product?.id === "rod-white" ? "#eeeeea" : product?.id === "rod-black" ? "#17191c" : preset.color);
  const wood = kind === "wood" || kind === "walnut";
  const pattern = fabric ? product?.pattern : undefined;
  const sheer = fabric && product?.renderStyle === "sheer";
  const metal = kind === "metal" || kind === "brass";
  const plastic = kind === "plastic";
  const material: MeshStandardMaterial = fabric
    ? new MeshPhysicalMaterial({
      color, metalness: 0, roughness: preset.roughness, side: DoubleSide,
      transparent: sheer, opacity: sheer ? .52 : 1, depthWrite: !sheer,
      sheen: .32, sheenColor: color, sheenRoughness: .82, envMapIntensity: .3,
    })
    : new MeshPhysicalMaterial({
      color, metalness: preset.metalness, roughness: preset.roughness, side: FrontSide,
      envMapIntensity: metal ? 1.15 : .65,
      clearcoat: plastic ? .38 : wood ? .12 : metal ? .16 : .08,
      clearcoatRoughness: plastic ? .34 : wood ? .55 : .28,
      anisotropy: metal ? .32 : 0,
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
      if (wood) {
        material.bumpMap = map; material.bumpScale = .004;
        material.roughnessMap = map;
      }
    }
  }
  if (fabric) {
    const weaveCanvas = document.createElement("canvas");
    weaveCanvas.width = weaveCanvas.height = 128;
    const weave = weaveCanvas.getContext("2d");
    if (weave) {
      weave.fillStyle = "#808080"; weave.fillRect(0, 0, 128, 128);
      for (let p = 0; p < 128; p += 4) {
        weave.fillStyle = p % 8 ? "#929292" : "#a2a2a2"; weave.fillRect(p, 0, 1, 128);
        weave.fillStyle = p % 8 ? "#707070" : "#646464"; weave.fillRect(0, p + 1, 128, 1);
      }
      const weaveMap = new CanvasTexture(weaveCanvas);
      weaveMap.wrapS = weaveMap.wrapT = RepeatWrapping;
      weaveMap.repeat.set(8, 14);
      material.bumpMap = weaveMap;
      material.bumpScale = product?.renderStyle === "blackout" ? .003 : .006;
      material.roughnessMap = weaveMap;
    }
  }
  if (metal || plastic) {
    const finishCanvas = document.createElement("canvas"); finishCanvas.width = finishCanvas.height = 128;
    const finish = finishCanvas.getContext("2d");
    if (finish) {
      finish.fillStyle = plastic ? "#969696" : "#888888"; finish.fillRect(0, 0, 128, 128);
      const lines = plastic ? 18 : 64;
      for (let line = 0; line < lines; line += 1) {
        const y = (line * 37) % 128;
        finish.fillStyle = plastic ? "rgba(255,255,255,.055)" : `rgba(255,255,255,${.025 + (line % 5) * .008})`;
        finish.fillRect(0, y, 128, 1);
      }
      const finishMap = new CanvasTexture(finishCanvas); finishMap.wrapS = finishMap.wrapT = RepeatWrapping;
      finishMap.repeat.set(metal ? 2 : 4, metal ? 12 : 6);
      material.bumpMap = finishMap; material.bumpScale = metal ? .0012 : .002;
      material.roughnessMap = finishMap;
    }
  }
  return material;
}

export function disposeSurfaceMaterial(material: MeshStandardMaterial) {
  new Set([material.map, material.bumpMap, material.roughnessMap]).forEach((texture) => texture?.dispose());
  material.dispose();
}
