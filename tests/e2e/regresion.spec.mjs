// Test de regresión de la constitución (docs/AGENTS.md), automatizado.
// Corre en dos proyectos: "servidor" (API + D1) e "indexeddb" (hosting estático).
import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import { makePng } from "./png.mjs";

const PIN_COMMENT = "Comentario del pin de prueba";

test("regresión: hallazgo con imagen, flujos, reporte y página para compartir", async ({ page, context }, testInfo) => {
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));

  const estudio = `E2E ${testInfo.project.name} ${Date.now()}`;
  const hallazgo = "CTA principal poco visible";
  const modo = testInfo.project.name === "servidor" ? "servidor" : "modo local";

  await test.step("arranca en el modo esperado", async () => {
    await page.goto("/");
    await expect(page.locator("#localBadge")).toHaveText(modo);
  });

  await test.step("1a. crear estudio", async () => {
    await page.getByRole("button", { name: /Crear estudio|Nuevo estudio/ }).first().click();
    await page.getByPlaceholder("Ej: Onboarding app de ahorro").fill(estudio);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("heading", { name: estudio })).toBeVisible();
  });

  await test.step("1b. hallazgo con imagen y pin anotado", async () => {
    await page.getByRole("button", { name: "Nuevo hallazgo" }).first().click();
    await page.getByPlaceholder("Resumen del hallazgo en una línea").fill(hallazgo);
    await page.locator("#pasteFile").setInputFiles({ name: "pantalla.png", mimeType: "image/png", buffer: makePng() });
    const stage = page.locator("#annStage");
    await stage.scrollIntoViewIfNeeded();
    await expect(page.locator("#annCv")).toBeVisible();
    const box = await stage.boundingBox();
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6); // herramienta pin por defecto
    await page.getByPlaceholder("Comentario del punto 1...").fill(PIN_COMMENT);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Hallazgo registrado")).toBeVisible();
  });

  await test.step("1c. crear un flujo y un journey", async () => {
    await page.getByRole("button", { name: "Flujos", exact: true }).click();
    await page.getByRole("button", { name: /Crear flujo|Nuevo flujo/ }).first().click();
    await page.getByPlaceholder("Ej: Alta de cuenta y primer depósito").fill("Checkout");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Flujo creado")).toBeVisible();
    await page.getByRole("button", { name: "Agregar interacción" }).click();

    await page.getByRole("button", { name: "Flujos", exact: true }).first().click();
    await page.getByRole("button", { name: /Crear flujo|Nuevo flujo/ }).first().click();
    await page.getByPlaceholder("Ej: Alta de cuenta y primer depósito").fill("Journey de compra");
    await page.getByRole("combobox").last().selectOption("User Journey");
    await page.getByRole("button", { name: "Guardar" }).click();
    await page.getByRole("button", { name: "Agregar paso" }).click();
  });

  await test.step("1d. recargar: todo persiste", async () => {
    await page.reload();
    await page.getByRole("heading", { name: estudio }).click();
    await expect(page.getByText(hallazgo)).toBeVisible();
  });

  await test.step("2. vista previa del reporte: hallazgos, flujos y journeys", async () => {
    await page.getByRole("button", { name: "Reportes", exact: true }).click();
    await page.getByRole("button", { name: "Vista previa del reporte" }).click();
    await expect(page.getByRole("button", { name: "Cerrar vista previa" })).toBeVisible();

    await page.getByRole("button", { name: "Hallazgos" }).click();
    await page.getByRole("button", { name: new RegExp(hallazgo) }).click();
    await expect(page.locator('img[src^="data:image"]').first()).toBeVisible();
    await expect(page.getByText(PIN_COMMENT)).toBeVisible();

    await page.getByRole("button", { name: "Flujos" }).click();
    await expect(page.getByText("Checkout")).toBeVisible();
    await page.getByRole("button", { name: "User Journeys" }).click();
    await expect(page.getByText("Journey de compra")).toBeVisible();
    await page.getByRole("button", { name: "Cerrar vista previa" }).click();
  });

  await test.step("3. página para compartir: abre sola, sin cuenta ni servidor", async () => {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Generar página para compartir" }).click(),
    ]);
    const file = testInfo.outputPath("compartir.html");
    await download.saveAs(file);

    const share = await context.newPage();
    const shareErr = [];
    share.on("pageerror", (e) => shareErr.push(e.message));
    await share.goto(pathToFileURL(file).href);
    await expect(share.getByText(estudio).first()).toBeVisible();
    await share.getByRole("button", { name: "Hallazgos" }).click();
    await share.getByRole("button", { name: new RegExp(hallazgo) }).click();
    await expect(share.locator('img[src^="data:image"]').first()).toBeVisible();
    await expect(share.getByText(PIN_COMMENT)).toBeVisible();
    await share.getByRole("button", { name: "Flujos" }).click();
    await expect(share.getByText("Checkout")).toBeVisible();
    expect(shareErr, "errores en la página autónoma").toEqual([]);
  });

  expect(errores, "errores de JS en la app").toEqual([]);
});
