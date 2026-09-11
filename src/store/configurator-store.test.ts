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
});
