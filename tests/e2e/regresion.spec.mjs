// Test de regresión de la constitución (docs/AGENTS.md), automatizado.
// Corre en dos proyectos: "servidor" (API + D1) e "indexeddb" (hosting estático).
import { test, expect } from "@playwright/test";
import { crearEstudio } from "./estudio.mjs";
import { makePng } from "./png.mjs";

const PIN_COMMENT = "Comentario del pin de prueba";

test("regresión: hallazgo con imagen, flujos y vista previa del reporte", async ({ page }, testInfo) => {
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));

  const estudio = `E2E ${testInfo.project.name} ${Date.now()}`;
  const hallazgo = "CTA principal poco visible";
  const modo = testInfo.project.name === "servidor" ? "servidor" : "modo local";

  await test.step("arranca en el modo esperado", async () => {
    // Flujos y Protopersonas están en "Próximamente": las pruebas las habilitan para cubrir su lógica.
    await page.addInitScript(() => localStorage.setItem("lupa:habilitar", JSON.stringify(["flujos", "protopersonas"])));
    await page.goto("/");
    await expect(page.locator("#localBadge")).toHaveText(modo);
  });

  await test.step("1a. crear estudio", async () => {
    await crearEstudio(page, estudio);
    await expect(page.getByRole("heading", { name: estudio })).toBeVisible();
  });

  await test.step("1b. hallazgo con pantalla y pin", async () => {
    await page.getByRole("button", { name: "Nuevo hallazgo" }).first().click();
    await page.getByPlaceholder("Resumen del hallazgo en una línea").fill(hallazgo);
    await page.getByPlaceholder("Qué se observó y por qué es relevante...").fill(PIN_COMMENT);
    await page.locator("#pasteFile").setInputFiles({ name: "pantalla.png", mimeType: "image/png", buffer: makePng() });
    await expect(page.getByText("Pantalla agregada al estudio")).toBeVisible();
    const stage = page.locator("#pinStage");
    await stage.scrollIntoViewIfNeeded();
    const box = await stage.boundingBox();
    await page.mouse.click(box.x + box.width * 0.3, box.y + box.height * 0.6); // ubica el pin
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Hallazgo registrado")).toBeVisible();
  });

  await test.step("1c. crear un flujo y un journey", async () => {
    await page.getByRole("button", { name: "Flujos", exact: true }).click();
    // Sin flujos, Flujos muestra dos cards: el primero se crea desde "Crear user flow".
    await page.getByRole("button", { name: /Crear user flow/ }).click();
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
    await page.locator("#topSearch").fill(estudio); // con muchos estudios puede no estar en la primera página
    await page.getByRole("heading", { name: estudio }).click();
    // El estudio abre en Resumen; el hallazgo se verifica en su sección.
    await expect(page.getByRole("heading", { name: "Resumen de problemas" })).toBeVisible();
    await page.locator("#psNav").getByRole("button", { name: /^Hallazgos/ }).click();
    await expect(page.locator("#hzPanel").getByText(hallazgo)).toBeVisible();
  });

  await test.step("2. vista previa en vivo del reporte: hallazgos en grilla; flujos y journeys en Pronto", async () => {
    await page.getByRole("button", { name: "Reportes", exact: true }).click();
    await expect(page.locator("#rpEstado")).toHaveText("Al día");
    const prev = page.frameLocator("#rpFrame");
    await prev.getByRole("button", { name: "Hallazgos" }).click();
    await prev.locator(".hz-gcard", { hasText: hallazgo }).click();
    await expect(prev.locator('img[src^="data:image"]').first()).toBeVisible();
    await expect(prev.getByText(PIN_COMMENT)).toBeVisible();
    await expect(prev.locator(".sb-btn.is-pronto", { hasText: "Flujos" })).toBeDisabled();
    await expect(prev.locator(".sb-btn.is-pronto", { hasText: "User Journeys" })).toBeDisabled();

    // Lo que se oculta en el panel desaparece de la vista previa, que conserva la sección abierta.
    await page.locator('#rptSel input[data-sec="contacto"]').uncheck();
    await expect(prev.getByRole("button", { name: "Contacto" })).toHaveCount(0);
    await expect(prev.getByText(PIN_COMMENT)).toBeVisible();
    await page.locator('#rptSel input[data-sec="contacto"]').check();
    await expect(prev.getByRole("button", { name: "Contacto" })).toBeVisible();

    await page.getByRole("button", { name: "Pantalla completa" }).click();
    await expect(page.getByRole("button", { name: "Cerrar vista previa" })).toBeVisible();
    await page.getByRole("button", { name: "Cerrar vista previa" }).click();
  });

  expect(errores, "errores de JS en la app").toEqual([]);
});
