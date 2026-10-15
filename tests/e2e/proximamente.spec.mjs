// Flujos y Protopersonas están deshabilitadas provisionalmente: muestran un aviso, no su editor.
import { test, expect } from "@playwright/test";
import { makePng } from "./png.mjs";

test("Flujos y Protopersonas muestran Próximamente", async ({ page }, testInfo) => {
  const estudio = `Próximamente ${testInfo.project.name} ${Date.now()}`;
  await page.goto("/");
  await page.getByRole("button", { name: /Crear estudio|Nuevo estudio/ }).first().click();
  await page.getByPlaceholder("Ej: Onboarding app de ahorro").fill(estudio);
  await page.getByRole("button", { name: "Guardar" }).click();
  for (const [sec, texto] of [["Flujos", "diagramar aquí los recorridos"], ["Protopersonas", "crear aquí las protopersonas"]]) {
    const tab = page.locator("#psNav").getByRole("button", { name: new RegExp("^" + sec) });
    await expect(tab).toContainText("Pronto");
    await tab.click();
    await expect(page.locator(".soon-page")).toContainText("Próximamente");
    await expect(page.locator(".soon-page")).toContainText(texto);
    await expect(page.locator(".soon-page svg").first()).toBeVisible();
  }
  await expect(page.getByRole("button", { name: /Crear flujo|Nuevo flujo/ })).toHaveCount(0);

  // Mientras Flujos esté en Próximamente, el formulario de Hallazgos no ofrece "Paso de flujo".
  await page.locator("#psNav").getByRole("button", { name: /^Hallazgos/ }).click();
  await page.locator("#wsUp").click();
  await page.locator("#pmFile").setInputFiles({ name: "p.png", mimeType: "image/png", buffer: makePng() });
  await page.getByRole("button", { name: "Guardar" }).click();
  const box = await page.locator("#wsImg img").boundingBox();
  await page.mouse.click(box.x + box.width * 0.4, box.y + box.height * 0.4);
  await page.locator("#qDesc").fill("Sin paso de flujo");
  await page.locator("#qSave").click();
  await page.locator("#hzPanel .hp-card", { hasText: "Sin paso de flujo" }).click();
  await expect(page.locator("#hfForm")).toBeVisible();
  await expect(page.locator("#hfPaso")).toHaveCount(0);
  await expect(page.locator("#hfPant")).toBeVisible();
});
