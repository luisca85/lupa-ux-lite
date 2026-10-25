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
    // Solo PIN y una casilla de condiciones (que incluye la mención); no se pide ningún dato.
    await expect(cli.locator("#pubEmail, #pubNombre")).toHaveCount(0);
    await expect(cli.locator(".pub-terms")).toContainText("Quien preparó el reporte puede mencionar que lo realizó");
    await expect(cli.getByRole("link", { name: "política de privacidad" })).toHaveAttribute("href", "/legal/privacidad");
    await cli.getByRole("button", { name: "Ver reporte" }).click();
    await expect(cli.locator("#pubErr")).toHaveText("Para ver el reporte tenés que aceptar las condiciones de uso.");
    // El servidor también exige la aceptación.
    const sinAceptar = await cli.evaluate(async ({ id, pin }) => (await fetch("/api/publico", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, pin }) })).status, { id: new URL(link).pathname.split("/")[2], pin });
    expect(sinAceptar).toBe(400);
    await cli.locator("#pubAcepto").check();
    await cli.getByRole("button", { name: "Ver reporte" }).click();
    // El reporte corre en un iframe con sandbox (origen opaco); la reserva la hace la página.
    const rep = cli.frameLocator("iframe.pub-frame");
    await expect(rep.getByRole("heading", { name: estudio })).toBeVisible();
    await expect(rep.getByRole("button", { name: "Contacto" })).toHaveCount(0); // se publicó sin Contacto
    await rep.getByRole("button", { name: "Trabajemos juntos" }).click();
    const mia = rep.getByRole("dialog").locator(".tj-col").last(); // la propuesta agregada va al final
    await expect(mia.getByRole("heading", { name: "Diagnóstico completo" })).toBeVisible();
    await mia.getByRole("button", { name: "Reservar ahora tu diagnóstico" }).click();
    await expect(rep.getByRole("heading", { name: "¡Gracias! Tu reserva está confirmada" })).toBeVisible();
    await expect(rep.locator(".ty-res")).toContainText("Diagnóstico completo");
    expect(cliErr).toEqual([]);
  });

  await test.step("reservas repetidas no se guardan ni mandan más correos; encabezados de seguridad", async () => {
    const id = new URL(link).pathname.split("/")[2];
    const otra = await context.newPage();
    await otra.goto(new URL(link).pathname);
    const estados = await otra.evaluate(async ({ id, pin }) => {
      const out = [];
      for (let i = 0; i < 5; i++) {
        const r = await fetch("/api/publico", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accion: "reserva", id, pin, propuesta: { id: "spam" + i, titulo: "Spam " + i } }) });
        out.push((await r.json()).limitado ? "limitado" : r.status);
      }
      return out;
    }, { id, pin });
    // Ya hubo 1 reserva en la hora: entran 2 más y el resto queda limitado (sin error para quien reserva).
    expect(estados).toEqual([200, 200, "limitado", "limitado", "limitado"]);
    const doc = await page.evaluate(async (p) => (await (await fetch("/api/doc?path=" + encodeURIComponent(p))).json()).data, "publicos/" + id);
    expect(doc.reservas.length).toBe(3);
    const r = await otra.request.get("/");
    expect(r.headers()["x-frame-options"]).toBe("DENY");
    expect(r.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(r.headers()["x-content-type-options"]).toBe("nosniff");
    await otra.close();
  });

  await test.step("la ayuda muestra la reserva y el consentimiento", async () => {
    await page.getByRole("button", { name: "Cómo funciona el link y el PIN" }).click();
    await expect(page.locator("#hpRes")).toContainText("Reservaron Diagnóstico completo");
    await expect(page.locator("#hpCons")).toContainText("Abrieron el link");
    await page.keyboard.press("Escape");
    await expect(page.locator("#rpHelpPop")).toBeHidden();
  });

  await test.step("seguridad: una foto publicada con datos maliciosos no ejecuta nada ni toca la app", async () => {
    // Quien publica puede escribir la foto a mano por la API (publicos/{id}/partes/…).
    const id = new URL(link).pathname.split("/")[2];
    const x = '"><img src=x onerror="window.__pwn=1;try{parent.__pwn=1}catch(e){}">';
    const D = {
      brand: { wordmark: "w", nombre: "n", headerImg: 'x" onerror="window.__pwn=1;try{parent.__pwn=1}catch(e){}' , sitio: 'a" onmouseover="window.__pwn=1' },
      est: { nombre: "Malicioso" }, metrics: {},
      report: { online: {}, propuestas: [{ id: x, titulo: "P", tipo: "fixed", precioModo: "adefinir", bullets: [] }], protopersonas: [], hallazgosClave: [], recomendaciones: [],
        muestra: { on: false }, pestanas: [{ id: x, nombre: "Pestaña", tipo: "texto", texto: '<p onclick="x()">Hola<img src=x onerror="window.__pwn=1"></p>' }] },
      hallazgos: [{ id: x, severidad: '1" onmouseover="x', tipo: "Problema", titulo: "H", imgs: [{ url: 'x" onerror="window.__pwn=1', pins: [] }], pasos: [] }],
      flows: [], journeys: [],
    };
    const put = await page.evaluate(async ([p, d]) => (await fetch("/api/doc?path=" + encodeURIComponent(p), { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(d) })).status, ["publicos/" + id + "/partes/000", { t: JSON.stringify(D) }]);
    expect(put).toBe(200);
    const cli = await context.newPage();
    await cli.goto(new URL(link).pathname);
    await cli.locator("#pubPin").fill(pin);
    await cli.locator("#pubAcepto").check();
    await cli.getByRole("button", { name: "Ver reporte" }).click();
    const rep = cli.frameLocator("iframe.pub-frame");
    await expect(rep.getByRole("heading", { name: "Malicioso" })).toBeVisible();
    await rep.getByRole("button", { name: "Hallazgos" }).click();
    await rep.getByRole("button", { name: "Pestaña" }).click();
    await expect(rep.locator(".cr-px-texto")).toHaveText("Hola");
    await cli.waitForTimeout(500);
    const marco = cli.frames().find((f) => f !== cli.mainFrame());
    expect(await marco.evaluate(() => window.__pwn)).toBeUndefined();   // escapado: no corre nada
    expect(await cli.evaluate(() => window.__pwn)).toBeUndefined();
    expect(await marco.evaluate(() => origin)).toBe("null");            // origen opaco: sin sesión ni API
    expect(await marco.evaluate(() => { try { return parent.document.title; } catch (e) { return "bloqueado"; } })).toBe("bloqueado");
    await cli.close();
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
