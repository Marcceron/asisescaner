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
});
