// Protopersonas sigue deshabilitada (aviso Próximamente). Flujos ya está habilitada: sin
// flujos muestra un estado vacío con dos cards para crear un User Journey o un User Flow.
import { test, expect } from "@playwright/test";
import { crearEstudio } from "./estudio.mjs";
import { makePng } from "./png.mjs";

test("Protopersonas muestra Próximamente y Flujos su estado vacío", async ({ page }, testInfo) => {
  const estudio = `Próximamente ${testInfo.project.name} ${Date.now()}`;
  await page.goto("/");
  await crearEstudio(page, estudio);
  for (const [sec, texto] of [["Protopersonas", "crear aquí las protopersonas"]]) {
    const tab = page.locator("#psNav").getByRole("button", { name: new RegExp("^" + sec) });
    await expect(tab).toContainText("Pronto");
    await tab.click();
    await expect(page.locator(".soon-page")).toContainText("Próximamente");
    await expect(page.locator(".soon-page")).toContainText(texto);
    await expect(page.locator(".soon-page svg").first()).toBeVisible();
  }
  const flujos = page.locator("#psNav").getByRole("button", { name: /^Flujos/ });
  await expect(flujos).not.toContainText("Pronto");
  await flujos.click();
  await expect(page.locator(".flx-vacio")).toBeVisible();
  await expect(page.locator(".flx-op")).toHaveCount(2);
  await page.getByRole("button", { name: /Crear user journey/ }).click();
  await expect(page.locator(".modal-bg")).toContainText("Nuevo User Journey");
  await page.getByRole("button", { name: "Cancelar" }).click();

  // Desde el Resumen, "Crear protopersona" lleva a Protopersonas (Próximamente), no a Configuración.
  await page.locator("#psNav").getByRole("button", { name: /^Resumen/ }).click();
  await page.getByRole("button", { name: "Crear protopersona" }).click();
  await expect(page.locator(".soon-page")).toContainText("crear aquí las protopersonas");

  // Con Flujos habilitada, el formulario de Hallazgos ofrece "Paso de flujo".
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
  await expect(page.locator("#hfPasos")).toHaveCount(1); // el campo de pasos está, aunque todavía no haya flujos
  await expect(page.locator("#hfPant")).toBeVisible();
});
