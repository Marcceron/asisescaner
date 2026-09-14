import type { Product } from "@/domain/types";
import { materialPresets, fabricPatterns } from "./materials";

const hardware = [
  { category: "cortinero", name: "Cortinero", style: "rod", description: "Tubo completo · remates integrados", price: 120000 },
  { category: "soportes", name: "Soporte", style: "bracket", description: "Soporte individual con cuna abierta", price: 42000 },
  { category: "remates", name: "Remate Esfera", style: "finial", description: "Par de terminales esféricos", price: 39000 },
  { category: "ganchos", name: "Gancho", style: "hook", description: "Argolla con gancho · pieza individual", price: 1445 },
  { category: "varillas", name: "Varilla", style: "wand", description: "Varilla con gancho superior y empuñadura", price: 34900 },
] as const;

export const expandedProducts: Product[] = [
  ...hardware.flatMap((item) => (["brass", "walnut"] as const).map((material, index): Product => ({
    id: `${item.style}-${material}-studio`,
    category: item.category,
    name: `${item.name} · ${materialPresets[material].label}`,
    description: item.description, priceCents: item.price, currency: "MXN",
    image: item.style === "rod" ? `/assets/overlays/rod-${material}.png` : `/assets/catalog/${item.style}-${material}.webp`,
    tone: materialPresets[material].color, material, renderStyle: item.style,
    active: true, order: 20 + index, compatibleWith: [],
  }))),
  ...(["stripes", "grid", "dots"] as const).map((pattern, index): Product => ({
    id: `curtain-${pattern}-studio`, category: "cortinas",
    name: fabricPatterns[pattern].label,
    description: `${["Algodón", "Jacquard", "Lino"][index]} estampado · dos paneles con pliegues`,
    material: (["cotton", "jacquard", "linen"] as const)[index],
    pattern, tone: "#f2ebdf", renderStyle: "wave",
    image: `/assets/catalog/curtain-${pattern}.webp`,
    priceCents: 249900, currency: "MXN", active: true, order: 20 + index, compatibleWith: [],
  })),
];
