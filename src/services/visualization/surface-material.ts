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
      color, metalness: preset.metalness, roughness: wood ? .91 : plastic ? .46 : preset.roughness, side: FrontSide,
      envMapIntensity: metal ? 1.05 : wood ? .28 : plastic ? .48 : .65,
      clearcoat: plastic ? .22 : wood ? 0 : metal ? .04 : .08,
      clearcoatRoughness: plastic ? .48 : wood ? .86 : metal ? .45 : .28,
      specularIntensity: wood ? .2 : plastic ? .62 : 1,
      ior: wood ? 1.35 : plastic ? 1.46 : 1.5,
      anisotropy: metal ? .58 : 0,
      anisotropyRotation: metal ? Math.PI / 2 : 0,
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
          ctx.strokeStyle = `rgba(25,12,5,${.08 + .13 * (1 + Math.sin(x * 1.71)) / 2})`;
          ctx.lineWidth = 1 + (x % 3);
          ctx.beginPath();
          for (let y = 0; y <= 256; y += 4) {
            const px = x + 2 * Math.sin(y * Math.PI * 2 / 256 + x * .13);
            if (y === 0) ctx.moveTo(px, y); else ctx.lineTo(px, y);
          }
          ctx.stroke();
        }
        for (let knot = 0; knot < 5; knot += 1) {
          const x = 28 + knot * 47; const y = 38 + (knot * 61) % 170;
          ctx.strokeStyle = "rgba(42,20,8,.18)"; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.ellipse(x, y, 8 + knot % 3, 18 + knot % 2 * 5, 0, 0, Math.PI * 2); ctx.stroke();
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
        material.bumpMap = map; material.bumpScale = .009;
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
    const colorCanvas = document.createElement("canvas"); colorCanvas.width = colorCanvas.height = 256;
    const detailCanvas = document.createElement("canvas"); detailCanvas.width = detailCanvas.height = 256;
    const colorContext = colorCanvas.getContext("2d"); const detailContext = detailCanvas.getContext("2d");
    if (colorContext && detailContext) {
      colorContext.fillStyle = plastic ? "#f7f7f7" : "#ededed"; colorContext.fillRect(0, 0, 256, 256);
      detailContext.fillStyle = plastic ? "#dddddd" : "#d0d0d0"; detailContext.fillRect(0, 0, 256, 256);
      if (metal) {
        // Longitudinal hairlines follow the UV axis of tubes and subtly break reflections.
        for (let x = 0; x < 256; x += 1) {
          const noise = ((x * 73) % 29) / 29;
          colorContext.fillStyle = `rgba(${noise > .54 ? 255 : 28},${noise > .54 ? 255 : 28},${noise > .54 ? 255 : 28},${.012 + noise * .026})`;
          colorContext.fillRect(x, 0, 1, 256);
          const roughness = Math.round(184 + noise * 62);
          detailContext.fillStyle = `rgb(${roughness},${roughness},${roughness})`;
          detailContext.fillRect(x, 0, 1, 256);
        }
        for (let scratch = 0; scratch < 14; scratch += 1) {
          const x = (scratch * 83) % 250; const y = (scratch * 47) % 240;
          colorContext.strokeStyle = "rgba(255,255,255,.09)"; colorContext.lineWidth = .6;
          colorContext.beginPath(); colorContext.moveTo(x, y); colorContext.lineTo(x + 3 + scratch % 8, y + 20 + scratch % 19); colorContext.stroke();
        }
      } else {
        // Fine deterministic orange-peel variation resembles injection-moulded plastic.
        for (let y = 0; y < 256; y += 2) for (let x = 0; x < 256; x += 2) {
          const noise = ((x * 17 + y * 31 + x * y * 3) % 37) / 37;
          const shade = Math.round(202 + noise * 46);
          detailContext.fillStyle = `rgb(${shade},${shade},${shade})`; detailContext.fillRect(x, y, 2, 2);
          colorContext.fillStyle = `rgba(${noise > .5 ? 255 : 80},${noise > .5 ? 255 : 80},${noise > .5 ? 255 : 80},.018)`;
          colorContext.fillRect(x, y, 1, 1);
        }
      }
      const colorMap = new CanvasTexture(colorCanvas); colorMap.colorSpace = SRGBColorSpace;
      const detailMap = new CanvasTexture(detailCanvas);
      for (const texture of [colorMap, detailMap]) {
        texture.wrapS = texture.wrapT = RepeatWrapping;
        texture.repeat.set(metal ? 3 : 7, metal ? 1 : 7);
      }
      material.map = colorMap;
      material.bumpMap = detailMap; material.bumpScale = metal ? .0018 : .0011;
      material.roughnessMap = detailMap;
    }
  }
  return material;
}

export function disposeSurfaceMaterial(material: MeshStandardMaterial) {
  new Set([material.map, material.bumpMap, material.roughnessMap]).forEach((texture) => texture?.dispose());
  material.dispose();
}
