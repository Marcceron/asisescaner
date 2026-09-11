import { beforeEach, describe, expect, it } from "vitest";
import { useConfiguratorStore } from "./configurator-store";

describe("accessory finish selection", () => {
  beforeEach(() => useConfiguratorStore.getState().resetProject());
  it.each(["ganchos", "varillas", "cortinero", "soportes", "remates"])("replaces the previous finish in %s without changing other categories", (category) => {
    const { toggleProduct } = useConfiguratorStore.getState();
    toggleProduct("curtain-dots-studio", "cortinas");
    toggleProduct("first-finish", category);
    toggleProduct("second-finish", category);
    expect(useConfiguratorStore.getState().selectedItems.map((item) => item.productId))
      .toEqual(["curtain-dots-studio", "second-finish"]);
  });

  it("reorders selected assets and supports undo and redo", () => {
    const store = useConfiguratorStore.getState();
    store.toggleProduct("curtain", "cortinas");
    store.toggleProduct("rod", "cortinero");
    store.toggleProduct("finial", "remates");
    useConfiguratorStore.getState().reorderSelectedItem("finial", "curtain");
    expect(useConfiguratorStore.getState().selectedItems.map((item) => item.productId)).toEqual(["finial", "curtain", "rod"]);
    useConfiguratorStore.getState().undoSelection();
    expect(useConfiguratorStore.getState().selectedItems.map((item) => item.productId)).toEqual(["curtain", "rod", "finial"]);
    useConfiguratorStore.getState().redoSelection();
    expect(useConfiguratorStore.getState().selectedItems.map((item) => item.productId)).toEqual(["finial", "curtain", "rod"]);
  });

  it("persists an asset transform until the project is reset", () => {
    const transform = {
      position: { x: 1, y: 2, z: 3 },
      rotation: { x: 0.1, y: 0.2, z: 0.3 },
      scale: { x: 1.2, y: 1.4, z: 1.1 },
    };
    useConfiguratorStore.getState().setAssetTransform("rod:tube", transform);
    expect(useConfiguratorStore.getState().assetTransforms["rod:tube"]).toEqual(transform);
    useConfiguratorStore.getState().resetProject();
    expect(useConfiguratorStore.getState().assetTransforms).toEqual({});
  });
});
