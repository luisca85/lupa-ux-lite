// Compartir el reporte: el botón publica o actualiza solo, el estado avisa los cambios sin
// publicar, y el cliente abre el link con el PIN, filtra hallazgos y reserva una propuesta.
// Solo en "servidor": el link público necesita la API.
import { test, expect } from "@playwright/test";
import { crearEstudio } from "./estudio.mjs";

test("compartir: link con PIN, estado de la publicación y reserva desde Trabajemos juntos", async ({ page, context }, testInfo) => {
  test.skip(testInfo.project.name !== "servidor", "el link público necesita la API");
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  const estudio = `Compartir ${Date.now()}`;

  await page.goto("/");
  await crearEstudio(page, estudio);
  await expect(page.getByRole("heading", { name: estudio })).toBeVisible();

  await test.step("Configuración: menú lateral, edición en el panel con Atrás, sin Métricas ni Protopersonas", async () => {
    await expect(page.locator("#psNav").getByRole("button", { name: "Métricas" })).toHaveCount(0);
    await page.locator("#psNav").getByRole("button", { name: "Configuración" }).click();
    const menu = page.getByRole("navigation", { name: "Configuración" });
    await expect(menu.getByRole("button")).toHaveText([/Datos del proyecto/, /Marca/, /Propuestas de trabajo/]);
    await expect(page.locator(".cf-card h3")).toHaveText(["Muestra inicial", "Resumen ejecutivo", "Diagnóstico estratégico"]);
    await expect(page.locator("#studyContent").getByText("Protopersonas")).toHaveCount(0);

    // Un hallazgo clave se carga en el mismo panel y Atrás vuelve a Datos del proyecto.
    await page.locator('[data-add="hallazgosClave"]').click();
    await page.locator("#db_t").fill("El registro frena la conversión");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.locator(".cf-li")).toHaveText(["El registro frena la conversión"]);
    await page.locator(".cf-li").click();
    await page.getByRole("button", { name: "Datos del proyecto" }).first().click();
    await expect(page.locator(".cf-card h3").first()).toHaveText("Muestra inicial");

    await menu.getByRole("button", { name: /Marca/ }).click();
    await expect(page.locator("#rptMarca [data-k=wordmark]")).toBeVisible();

    await menu.getByRole("button", { name: /Propuestas de trabajo/ }).click();
    const antes = await page.locator(".cf-prop").count();
    await page.locator("#rptAddProp").click();
    await page.locator("#pr_t").fill("Diagnóstico completo");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.locator(".cf-prop")).toHaveCount(antes + 1);
    await expect(page.locator(".cf-prop").last()).toContainText("Diagnóstico completo");
    // Editar y volver con Atrás sin guardar no cambia nada.
    await page.locator(".cf-prop-open").last().click();
    await page.locator("#pr_t").fill("Otro título");
    await page.locator("#cfBack").click();
    await expect(page.locator(".cf-prop").last()).toContainText("Diagnóstico completo");
  });

  let link, pin;
  await test.step("Compartir publica y abre el modal con link y PIN", async () => {
    await page.getByRole("button", { name: "Reportes", exact: true }).click();
    await expect(page.locator("#rpEstado")).toHaveText("Al día");
    await expect(page.locator("#rpTag")).toHaveText("Sin publicar");
    await expect(page.getByRole("button", { name: /Descargar página HTML|Exportar en texto plano/ })).toHaveCount(0);
    await page.getByRole("button", { name: "Compartir" }).click();
    const modal = page.getByRole("dialog", { name: "Compartir reporte" });
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("button", { name: "Generar PIN nuevo" })).toBeVisible();
    await expect(modal.getByRole("button", { name: "Despublicar" })).toBeVisible();
    await expect(modal.getByRole("button", { name: "Actualizar publicación" })).toHaveCount(0);
    link = await page.locator("#shLink").textContent();
    pin = await page.locator("#shPin").textContent();
    expect(pin).toMatch(/^\d{6}$/);
    await modal.getByRole("button", { name: "Listo" }).click();
    await expect(page.locator("#rpTag")).toHaveText("Publicado");
  });

  await test.step("un cambio deja la publicación desactualizada y Compartir la actualiza sola", async () => {
    await page.locator('#rptSel input[data-sec="contacto"]').uncheck();
    await expect(page.locator("#rpTag")).toHaveText("Cambios sin publicar");
    await page.locator('#rptSel input[data-sec="contacto"]').check();
    await expect(page.locator("#rpTag")).toHaveText("Publicado");
    await page.locator('#rptSel input[data-sec="contacto"]').uncheck();
    await expect(page.locator("#rpTag")).toHaveText("Cambios sin publicar");
    await page.getByRole("button", { name: "Compartir" }).click();
    await expect(page.getByRole("dialog", { name: "Compartir reporte" })).toBeVisible();
    expect(await page.locator("#shLink").textContent()).toBe(link); // mismo link
    expect(await page.locator("#shPin").textContent()).toBe(pin);  // mismo PIN
    await page.keyboard.press("Escape");
    await expect(page.locator("#rpTag")).toHaveText("Publicado");
  });

  await test.step("el cliente abre el link, reserva y ve la página de gracias", async () => {
    const cli = await context.newPage();
    const cliErr = [];
    cli.on("pageerror", (e) => cliErr.push(e.message));
    await cli.goto(new URL(link).pathname);
    await cli.locator("#pubPin").fill(pin);
    await cli.locator("#pubNombre").fill("Ana Cliente");
    await cli.locator("#pubAcepto").check();
    await cli.getByRole("button", { name: "Ver reporte" }).click();
    await expect(cli.getByRole("heading", { name: estudio })).toBeVisible();
    await expect(cli.getByRole("button", { name: "Contacto" })).toHaveCount(0); // se publicó sin Contacto
    await cli.getByRole("button", { name: "Trabajemos juntos" }).click();
    const mia = cli.getByRole("dialog").locator(".tj-col").last(); // la propuesta agregada va al final
    await expect(mia.getByRole("heading", { name: "Diagnóstico completo" })).toBeVisible();
    await mia.getByRole("button", { name: "Reservar ahora tu diagnóstico" }).click();
    await expect(cli.getByRole("heading", { name: /Gracias, Ana/ })).toBeVisible();
    await expect(cli.locator(".ty-res")).toContainText("Diagnóstico completo");
    expect(cliErr).toEqual([]);
  });

  await test.step("la ayuda muestra la reserva y el consentimiento", async () => {
    await page.getByRole("button", { name: "Cómo funciona el link y el PIN" }).click();
    await expect(page.locator("#hpRes")).toContainText("Ana Cliente reservó Diagnóstico completo");
    await expect(page.locator("#hpCons")).toContainText("Ana Cliente");
    await page.keyboard.press("Escape");
    await expect(page.locator("#rpHelpPop")).toBeHidden();
  });

  await test.step("despublicar desde el modal", async () => {
    await page.getByRole("button", { name: "Compartir" }).click();
    const modal = page.getByRole("dialog", { name: "Compartir reporte" });
    await modal.getByRole("button", { name: "Despublicar" }).click();
    await modal.locator("#cfSi").click();
    await expect(page.locator("#rpTag")).toHaveText("Sin publicar");
  });

  expect(errores).toEqual([]);
});
