import { describe, expect, it } from "vitest";
import { sumMoney } from "./money";

describe("sumMoney", () => {
  it("uses integer cents for totals", () => {
    expect(sumMoney([{ priceCents: 120000, quantity: 2 }, { priceCents: 28900, quantity: 1 }])).toBe(268900);
  });
});
