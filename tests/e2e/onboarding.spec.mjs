// Onboarding: aparece la primera vez, se navega hacia adelante y atrás (botones, puntos y
// teclado), se puede saltar y no vuelve a aparecer solo; "Ver introducción" lo reabre.
// En el resto de las pruebas no aparece (navigator.webdriver); acá se fuerza.
import { test, expect } from "@playwright/test";

test("onboarding: 5 pasos, ir y volver, saltar y volver a verlo", async ({ page }, testInfo) => {
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.addInitScript(() => localStorage.setItem("lupa:onboarding:forzar", "true"));
  await page.goto("/");

  const modal = page.getByRole("dialog");
  const paso = page.locator("#onbN");
  await expect(modal).toBeVisible();
  await expect(paso).toHaveText("Paso 1 de 5");
  await expect(page.locator("#onbT")).toHaveText("El criterio humano es irreemplazable");
  await expect(page.locator("#onbPrev")).toBeDisabled();
  await expect(page.locator(".onb-media img.on")).toHaveAttribute("data-i", "0");

  await page.getByRole("button", { name: "Siguiente →" }).click();
  await expect(paso).toHaveText("Paso 2 de 5");
  await expect(page.locator(".onb-tag")).toContainText("Hallazgos");
  await page.keyboard.press("ArrowRight");
  await expect(paso).toHaveText("Paso 3 de 5");
  await expect(page.locator(".onb-tag")).toContainText("Flujos");
  await expect(page.locator(".onb-pronto")).toHaveCount(0); // Flujos ya está habilitada
  await page.getByRole("button", { name: "← Atrás" }).click();
  await expect(paso).toHaveText("Paso 2 de 5");
  await page.getByRole("tab", { name: /Paso 5/ }).click();
  await expect(paso).toHaveText("Paso 5 de 5");
  await expect(page.locator(".onb-pronto")).toHaveCount(0);
  await page.keyboard.press("ArrowLeft");
  await expect(page.locator(".onb-tag")).toContainText("Personas");
  await expect(page.locator(".onb-pronto")).toHaveText("Pronto");

  await page.getByRole("button", { name: "Saltar" }).click();
  await expect(modal).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Estudios" })).toBeVisible();
  await expect(page.locator("#onboarding")).toHaveCount(0);

  // Al terminar, la home muestra el panel de Recursos: un destacado que rota y 4 enlaces más.
  const rec = page.getByRole("complementary", { name: "Recursos" });
  await expect(rec.locator("#recDest a")).toHaveAttribute("target", "_blank");
  await expect(rec.locator("#recList li")).toHaveCount(4);
  const primero = await rec.locator("#recDest b").textContent();
  await rec.getByRole("button", { name: "Recurso siguiente" }).click();
  await expect(rec.locator("#recDest b")).not.toHaveText(primero);
  await expect(rec.locator(".rec-dot")).toHaveCount(8);

  if (testInfo.project.name === "servidor") {
    await page.locator("#userChip").click();
    await page.getByRole("menuitem", { name: "Ver introducción" }).click();
    await expect(paso).toHaveText("Paso 1 de 5");
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Siguiente →" }).click();
    await page.getByRole("button", { name: "Empezar" }).click();
    await expect(page.locator("#onboarding")).toHaveCount(0);
  }
  expect(errores).toEqual([]);
});
