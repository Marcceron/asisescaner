import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  page.on("pageerror", (error) => console.error("PAGE_ERROR", error.message));
  page.on("console", (message) => {
    if (message.type() === "error") console.error("BROWSER_ERROR", message.text());
  });
});

test("completes the assisted configuration flow", async ({ page }, testInfo) => {
  await page.goto("/");
  if (testInfo.project.name === "chromium") {
    await expect(page.getByText("Diseña tu propia cortina").first()).toBeVisible();
  }
  await page.getByRole("button", { name: "Capturar una ventana" }).click();
  await page.getByRole("button", { name: "Usar imagen de demostración" }).click();
  await expect(page.getByText("Modo Medición")).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Personalizar" }).click();
  }
  await page.getByRole("button", { name: /Lino Arena/ }).click();
  await page.getByRole("tab", { name: "Cortinero" }).click();
  await page.getByRole("button", { name: /Negro Acero/ }).click();
  if (testInfo.project.name === "mobile") {
    await page.getByRole("button", { name: "Cerrar catálogo" }).click();
  }
  await expect(page.locator(".rod3dCanvas")).toBeVisible();
  await expect(page.getByRole("button", { name: "Mover Tubo" })).toBeVisible();
  await expect(page.getByText("$3,699.00")).toBeVisible();
  await page.getByRole("button", { name: "Cotizar" }).click();
  await expect(page.getByRole("heading", { name: "Generar cotización" })).toBeVisible();
  await page.getByLabel("Nombre del cliente").fill("Cliente de prueba");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar PDF" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^asis-cotizacion-AS-\d+\.pdf$/);
});

test("keeps the mobile playfield usable", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Responsive assertion for the mobile project");
  await page.goto("/");
  await page.getByRole("button", { name: "Capturar una ventana" }).click();
  await page.getByRole("button", { name: "Usar imagen de demostración" }).click();
  await expect(page.getByRole("button", { name: "Personalizar" })).toBeVisible();
  await page.getByRole("button", { name: "Personalizar" }).click();
  await expect(page.getByRole("heading", { name: "Selecciona las piezas de tu cortina" })).toBeVisible();
});

test("uses measurement for nodes and editing for perspective assets", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Capturar una ventana" }).click();
  await page.getByRole("button", { name: "Usar imagen de demostración" }).click();
  await expect(page.locator(".measurementNode")).toHaveCount(4);
  const firstNode = page.getByRole("button", { name: "Nodo de medición 1" });
  const before = await firstNode.evaluate((node) => (node as HTMLElement).style.left);
  await firstNode.press("ArrowRight");
  expect(await firstNode.evaluate((node) => (node as HTMLElement).style.left)).not.toBe(before);
  await page.getByRole("button", { name: "Modo Edición" }).click();
  await expect(page.locator(".measurementNode")).toHaveCount(0);
  await expect(page.locator(".perspectiveAssetLayer")).toBeVisible();
});

test("removes the selected 3D asset from its contextual menu", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Capturar una ventana" }).click();
  await page.getByRole("button", { name: "Usar imagen de demostración" }).click();
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Personalizar" }).click();
  await page.getByRole("tab", { name: "Cortinero" }).click();
  await page.getByRole("button", { name: /Negro Acero/ }).click();
  if (testInfo.project.name === "mobile") await page.getByRole("button", { name: "Cerrar catálogo" }).click();
  await expect(page.locator(".rod3dCanvas")).toBeVisible();
  await page.getByRole("button", { name: "Eliminar Negro Acero" }).click();
  await expect(page.locator(".rod3dCanvas")).toHaveCount(0);
});
