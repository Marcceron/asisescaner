"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Measurement, Point, ProductCategory, SelectedItem } from "@/domain/types";

export type AssetTransform = {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
};

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
  assetTransforms: Record<string, AssetTransform>;
  selectionPast: SelectedItem[][];
  selectionFuture: SelectedItem[][];
  setImage: (imageData: string | null, size?: { width: number; height: number }) => void;
  setPolygon: (polygon: [Point, Point, Point, Point]) => void;
  setPolygonPoint: (index: number, point: Point) => void;
  setMeasurement: (measurement: Measurement) => void;
  patchMeasurement: (value: Partial<Measurement>) => void;
  setActiveCategory: (category: ProductCategory) => void;
  toggleProduct: (productId: string, category: ProductCategory) => void;
  removeProduct: (productId: string) => void;
  reorderSelectedItem: (productId: string, targetProductId: string) => void;
  setAssetTransform: (key: string, transform: AssetTransform) => void;
  undoSelection: () => void;
  redoSelection: () => void;
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
      assetTransforms: {},
      selectionPast: [],
      selectionFuture: [],
      setImage: (imageData, size) =>
        set({
          imageData,
          imageSize: size ?? { width: 1512, height: 982 },
          polygon: initialPolygon,
          measurement: emptyMeasurement,
          assetTransforms: {},
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
            return {
              selectedItems: state.selectedItems.filter((item) => item.productId !== productId),
              selectionPast: [...state.selectionPast, state.selectedItems].slice(-40), selectionFuture: [],
            };
          }
          // The editor renders one design per category; switching finish must replace it.
          const next = state.selectedItems.filter((item) => item.category !== category);
          return {
            selectedItems: [...next, { productId, quantity: 1, category }],
            selectionPast: [...state.selectionPast, state.selectedItems].slice(-40), selectionFuture: [],
          };
        }),
      removeProduct: (productId) =>
        set((state) => ({
          selectedItems: state.selectedItems.filter((item) => item.productId !== productId),
          selectionPast: [...state.selectionPast, state.selectedItems].slice(-40), selectionFuture: [],
        })),
      reorderSelectedItem: (productId, targetProductId) =>
        set((state) => {
          const from = state.selectedItems.findIndex((item) => item.productId === productId);
          const to = state.selectedItems.findIndex((item) => item.productId === targetProductId);
          if (from < 0 || to < 0 || from === to) return state;
          const selectedItems = [...state.selectedItems];
          const [moved] = selectedItems.splice(from, 1); selectedItems.splice(to, 0, moved);
          return { selectedItems, selectionPast: [...state.selectionPast, state.selectedItems].slice(-40), selectionFuture: [] };
        }),
      setAssetTransform: (key, transform) =>
        set((state) => ({ assetTransforms: { ...state.assetTransforms, [key]: transform } })),
      undoSelection: () =>
        set((state) => {
          const previous = state.selectionPast.at(-1); if (!previous) return state;
          return {
            selectedItems: previous, selectionPast: state.selectionPast.slice(0, -1),
            selectionFuture: [state.selectedItems, ...state.selectionFuture].slice(0, 40),
          };
        }),
      redoSelection: () =>
        set((state) => {
          const next = state.selectionFuture[0]; if (!next) return state;
          return {
            selectedItems: next, selectionPast: [...state.selectionPast, state.selectedItems].slice(-40),
            selectionFuture: state.selectionFuture.slice(1),
          };
        }),
      resetProject: () =>
        set({
          imageData: null,
          imageSize: { width: 1512, height: 982 },
          polygon: initialPolygon,
          measurement: emptyMeasurement,
          selectedItems: [],
          assetTransforms: {},
          selectionPast: [],
          selectionFuture: [],
          activeCategory: "cortinas",
        }),
    }),
    { name: "asis-escaner-project-v1" },
  ),
);
