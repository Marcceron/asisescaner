import { expect, test } from "@playwright/test";

test("captures the configured responsive layout", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Capturar una ventana" }).click();
  await page.getByRole("button", { name: "Usar imagen de demostración" }).click();
  await page.locator(".roomImage").evaluate((image: HTMLImageElement) => image.complete || new Promise((resolve) => image.addEventListener("load", resolve, { once: true })));
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Personalizar" }).click();
    await expect(page.locator(".sidePanel")).toHaveClass(/mobileOpen/);
    await page.waitForTimeout(300);
  }
  await expect(page.getByText("Modo Medición")).toBeVisible();
  await page.screenshot({ path: `artifacts/${testInfo.project.name}.png`, fullPage: true });
});
