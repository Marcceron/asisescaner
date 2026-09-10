import type { FabricPattern, MaterialKind } from "@/data/materials";

export type Point = { x: number; y: number };

export type DetectionSource = "automatic" | "manual";

export type WindowDetection = {
  id: string;
  confidence: number;
  polygon: [Point, Point, Point, Point];
  boundingBox: { x: number; y: number; width: number; height: number };
  imageWidth: number;
  imageHeight: number;
  detectionSource: DetectionSource;
  timestamp: string;
};

export type ProductCategory = string;

export type Product = {
  id: string;
  category: ProductCategory;
  name: string;
  description: string;
  priceCents: number;
  currency: "MXN";
  image: string;
  compatibleWith: string[];
  active: boolean;
  order: number;
  tone?: string;
  material?: MaterialKind;
  pattern?: FabricPattern;
  renderStyle?: "wave" | "blackout" | "sheer" | "roller" | "rod" | "bracket" | "finial" | "hook" | "wand";
  /** Optional optimized GLB/glTF file for the perspective renderer. */
  modelUrl?: string;
};

export type SelectedItem = { productId: string; quantity: number; category?: ProductCategory };

export type MeasurementEdge = "width" | "height";

export type KnownMeasurement = {
  value: number;
  unit: "centimeters";
  edge: MeasurementEdge;
  source?: "user" | "standard-object";
  confidence?: number;
};

export type Measurement = {
  widthCm: number;
  heightCm: number;
  calibrated: boolean;
  calibrationReferenceCm: number | null;
  errorMarginPercent: number;
  diagonalCm: number;
  knownEdge: MeasurementEdge | null;
  perspectiveCorrected: boolean;
  geometryConfidence: number;
};

export type Customer = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};
