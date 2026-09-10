"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Measurement, Point, ProductCategory, SelectedItem } from "@/domain/types";

const initialPolygon: [Point, Point, Point, Point] = [
  { x: 0.22, y: 0.2 },
  { x: 0.78, y: 0.18 },
  { x: 0.79, y: 0.8 },
  { x: 0.23, y: 0.79 },
];

type ConfiguratorState = {
  imageData: string | null;
  imageSize: { width: number; height: number };
  polygon: [Point, Point, Point, Point];
  measurement: Measurement;
  activeCategory: ProductCategory;
  selectedItems: SelectedItem[];
  setImage: (imageData: string | null, size?: { width: number; height: number }) => void;
  setPolygon: (polygon: [Point, Point, Point, Point]) => void;
  setPolygonPoint: (index: number, point: Point) => void;
  setMeasurement: (measurement: Measurement) => void;
  patchMeasurement: (value: Partial<Measurement>) => void;
  setActiveCategory: (category: ProductCategory) => void;
  toggleProduct: (productId: string, category: ProductCategory) => void;
  removeProduct: (productId: string) => void;
  resetProject: () => void;
};

const emptyMeasurement: Measurement = {
  widthCm: 0,
  heightCm: 0,
  calibrated: false,
  calibrationReferenceCm: null,
  errorMarginPercent: 0,
  diagonalCm: 0,
  knownEdge: null,
  perspectiveCorrected: false,
  geometryConfidence: 0,
};

export const useConfiguratorStore = create<ConfiguratorState>()(
  persist(
    (set) => ({
      imageData: null,
      imageSize: { width: 1512, height: 982 },
      polygon: initialPolygon,
      measurement: emptyMeasurement,
      activeCategory: "cortinas",
      selectedItems: [],
      setImage: (imageData, size) =>
        set({
          imageData,
          imageSize: size ?? { width: 1512, height: 982 },
          polygon: initialPolygon,
          measurement: emptyMeasurement,
        }),
      setPolygon: (polygon) => set({ polygon }),
      setPolygonPoint: (index, point) =>
        set((state) => {
          const polygon = [...state.polygon] as [Point, Point, Point, Point];
          polygon[index] = {
            x: Math.max(0.02, Math.min(0.98, point.x)),
            y: Math.max(0.02, Math.min(0.98, point.y)),
          };
          return { polygon };
        }),
      setMeasurement: (measurement) => set({ measurement }),
      patchMeasurement: (value) =>
        set((state) => ({ measurement: { ...state.measurement, ...value } })),
      setActiveCategory: (activeCategory) => set({ activeCategory }),
      toggleProduct: (productId, category) =>
        set((state) => {
          const existing = state.selectedItems.find((item) => item.productId === productId);
          if (existing) {
            return { selectedItems: state.selectedItems.filter((item) => item.productId !== productId) };
          }
          const next = state.selectedItems.filter((item) => category === "ganchos" || category === "varillas" || item.category !== category);
          return { selectedItems: [...next, { productId, quantity: 1, category }] };
        }),
      removeProduct: (productId) =>
        set((state) => ({ selectedItems: state.selectedItems.filter((item) => item.productId !== productId) })),
      resetProject: () =>
        set({
          imageData: null,
          imageSize: { width: 1512, height: 982 },
          polygon: initialPolygon,
          measurement: emptyMeasurement,
          selectedItems: [],
          activeCategory: "cortinas",
        }),
    }),
    { name: "asis-escaner-project-v1" },
  ),
);
