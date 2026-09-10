export const materialPresets = {
  metal: { label: "Acero satinado", color: "#8b949e", metalness: .85, roughness: .3 },
  wood: { label: "Roble natural", color: "#ac7543", metalness: 0, roughness: .72 },
  plastic: { label: "Polímero marfil", color: "#eee9df", metalness: 0, roughness: .4 },
  brass: { label: "Latón cepillado", color: "#c59b53", metalness: .85, roughness: .3 },
  walnut: { label: "Nogal", color: "#67432c", metalness: 0, roughness: .65 },
  linen: { label: "Lino", color: "#eee8db", metalness: 0, roughness: .95 },
  cotton: { label: "Algodón", color: "#f2ebdf", metalness: 0, roughness: .9 },
  jacquard: { label: "Jacquard", color: "#ece9dd", metalness: 0, roughness: .8 },
} as const;

export type MaterialKind = keyof typeof materialPresets;
export const fabricPatterns = {
  stripes: { label: "Rayas terracota", color: "#b56f52" },
  grid: { label: "Cuadrícula salvia", color: "#7a896b" },
  dots: { label: "Lunares índigo", color: "#3e5169" },
} as const;
export type FabricPattern = keyof typeof fabricPatterns;
