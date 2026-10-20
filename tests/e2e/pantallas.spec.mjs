// Módulo Hallazgos v2: pantallas como entidad, un clic en la captura crea un hallazgo (popover),
// filtro por severidad, edición en el panel y anclaje a un paso de flujo. Servidor e IndexedDB.
import { test, expect } from "@playwright/test";
import { crearEstudio } from "./estudio.mjs";
import { makePng } from "./png.mjs";

test("hallazgos v2: una pantalla, varios pines, severidad y paso de flujo", async ({ page }, testInfo) => {
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  const estudio = `Pantallas ${testInfo.project.name} ${Date.now()}`;

  await page.addInitScript(() => localStorage.setItem("lupa:habilitar", JSON.stringify(["flujos", "protopersonas"])));
  await page.goto("/");
  await crearEstudio(page, estudio);
  await expect(page.getByRole("heading", { name: estudio })).toBeVisible();

  await test.step("estado vacío y alta de pantalla", async () => {
    await page.locator("#psNav").getByRole("button", { name: /^Hallazgos/ }).click();
    await expect(page.getByText("Este estudio todavía no tiene pantallas")).toBeVisible();
    await page.getByRole("button", { name: "Subir imagen" }).click();
    await page.locator("#pmFile").setInputFiles({ name: "landing.png", mimeType: "image/png", buffer: makePng() });
    await page.locator("#pmNom").fill("Landing");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.locator(".ws-gbtn.on")).toContainText("Landing");
    await expect(page.locator("#wsImg img")).toBeVisible();
  });

  await test.step("un clic en la captura, escribir y Guardar (dos veces, sin volver a subir la imagen)", async () => {
    for (const [fx, fy, txt, sev] of [[0.3, 0.4, "El CTA no se ve", "3"], [0.7, 0.2, "El menú no indica dónde estoy", "1"]]) {
      const box = await page.locator("#wsImg img").boundingBox();
      await page.mouse.click(box.x + box.width * fx, box.y + box.height * fy);
      await expect(page.locator("#wsQuick")).toBeVisible();
      await page.locator("#qDesc").fill(txt);
      await page.locator(`#qSev button[data-s="${sev}"]`).click();
      await page.locator("#qSave").click();
      await expect(page.getByText("Hallazgo registrado")).toBeVisible();
      await expect(page.locator("#wsQuick")).toHaveCount(0);
    }
    await expect(page.locator(".ws-pin")).toHaveCount(2);
    await expect(page.locator("#hzPanel")).toContainText("2 en esta pantalla");
  });

  await test.step("un pin recién creado se descarta con Eliminar", async () => {
    const box = await page.locator("#wsImg img").boundingBox();
    await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.8);
    await expect(page.locator("#wsQuick")).toBeVisible();
    await page.locator("#qDel").click();
    await expect(page.locator("#wsQuick")).toHaveCount(0);
    await expect(page.locator(".ws-pin")).toHaveCount(2);
  });

  await test.step("tocar un pin abre el popover para editarlo", async () => {
    await page.locator(".ws-pin", { hasText: "1" }).click();
    await expect(page.locator("#qDesc")).toHaveValue("El CTA no se ve");
    await expect(page.locator('#qSev button[data-s="3"]')).toHaveClass(/on/);
    await page.keyboard.press("Escape");
    await expect(page.locator("#wsQuick")).toHaveCount(0);
  });

  await test.step("zoom sin scroll: acercar, mover y ajustar; el clic crea el pin donde se hace", async () => {
    const sc = page.locator("#wsScroll");
    expect(await sc.evaluate((el) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
    const pct0 = await page.locator("#zPct").textContent();
    await page.locator("#zIn").click();
    await expect(page.locator("#zPct")).not.toHaveText(pct0);
    const box = await sc.boundingBox();
    await page.mouse.move(box.x + 200, box.y + 200); await page.mouse.down(); await page.mouse.move(box.x + 120, box.y + 150, { steps: 5 }); await page.mouse.up();
    await expect(page.locator("#wsQuick")).toHaveCount(0); // arrastrar no crea hallazgos
    const img = await page.locator("#wsImg").boundingBox();
    const cx = img.x + img.width * 0.5, cy = img.y + img.height * 0.5;
    if (cx > box.x && cx < box.x + box.width && cy > box.y && cy < box.y + box.height) {
      await page.mouse.click(cx, cy);
      const pin = await page.locator(".ws-pin.draft").boundingBox();
      expect(Math.abs(pin.x + pin.width / 2 - cx)).toBeLessThan(3);
      await page.locator("#qDel").click();
    }
    await page.locator("#zFit").click();
    await expect(page.locator("#zPct")).toHaveText(pct0);
  });

  await test.step("filtro por severidad en el panel", async () => {
    await page.locator(".chip-f[data-f='3']").click();
    await expect(page.locator("#hzPanel .hp-card")).toHaveCount(1);
    await expect(page.locator("#hzPanel .hp-card")).toContainText("El CTA no se ve");
    await page.locator(".chip-f[data-f='todas']").click();
    await expect(page.locator("#hzPanel .hp-card")).toHaveCount(2);
  });

  await test.step("anclado a un paso de flujo, sigue apareciendo en Flujos", async () => {
    await page.locator("#psNav").getByRole("button", { name: "Flujos", exact: true }).click();
    // Sin flujos, Flujos muestra dos cards: el primero se crea desde "Crear user flow".
    await page.getByRole("button", { name: /Crear user flow/ }).click();
    await page.getByPlaceholder("Ej: Alta de cuenta y primer depósito").fill("Registro");
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByText("Flujo creado")).toBeVisible();
    await page.getByRole("button", { name: "Agregar interacción" }).click();
    await page.locator("#psNav").getByRole("button", { name: /^Hallazgos/ }).click();
    await page.locator(".ws-gbtn", { hasText: "Landing" }).click();
    await page.locator("#hzPanel .hp-card", { hasText: "El CTA no se ve" }).click();
    // Un hallazgo puede estar en varios pasos: se suman desde "+ Agregar a un paso…".
    await page.locator("#hfPasoAdd").selectOption({ label: "1. Interacción 1" });
    await expect(page.locator("#hfPasos .hf-paso")).toContainText("Registro");
    await page.getByRole("button", { name: "Guardar cambios" }).click();
    await expect(page.getByText("Hallazgo actualizado")).toBeVisible();
    await expect(page.locator("#hzPanel .hp-card", { hasText: "El CTA no se ve" })).toContainText("Interacción 1");
    await page.locator("#psNav").getByRole("button", { name: "Flujos", exact: true }).click();
    await expect(page.locator("[data-flow]", { hasText: "Registro" })).toContainText("1 hallazgos");
  });

  await test.step("recargar: todo persiste", async () => {
    await page.reload();
    await page.locator("#topSearch").fill(estudio); // con muchos estudios puede no estar en la primera página
    await page.getByRole("heading", { name: estudio }).click();
    await page.locator("#psNav").getByRole("button", { name: /^Hallazgos/ }).click();
    await expect(page.locator(".ws-gbtn.on")).toContainText("Landing");
    await expect(page.locator(".ws-pin")).toHaveCount(2);
  });

  expect(errores).toEqual([]);
});

test("pantallas que no entran: flechas, menú Todas y teclado", async ({ page }, testInfo) => {
  const estudio = `Muchas pantallas ${testInfo.project.name} ${Date.now()}`;
  await page.addInitScript(() => localStorage.setItem("lupa:habilitar", JSON.stringify(["flujos", "protopersonas"])));
  await page.goto("/");
  await crearEstudio(page, estudio);
  await page.locator("#psNav").getByRole("button", { name: /^Hallazgos/ }).click();
  const nombres = ["Inicio y propuesta de valor", "Registro con correo electrónico", "Verificación del teléfono", "Elección del plan de ahorro", "Resumen y confirmación final", "Pantalla de éxito"];
  for (let i = 0; i < nombres.length; i++) {
    await page.locator(i === 0 ? "#wsUp" : "#wsAdd").click();
    await page.locator("#pmFile").setInputFiles({ name: `p${i}.png`, mimeType: "image/png", buffer: makePng(400 + i * 10, 300) }); // imágenes distintas
    await page.locator("#pmNom").fill(nombres[i]);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.locator(".ws-gbtn.on")).toContainText(nombres[i]);
  }
  await expect(page.locator("#wsAll")).toBeVisible();
  await expect(page.locator("#wsNext")).toBeVisible();
  const g = page.locator("#wsGroup");
  const visible = async () => page.locator(".ws-gbtn.on").evaluate((b) => { const r = b.getBoundingClientRect(), p = b.parentElement.getBoundingClientRect(); return r.left >= p.left - 1 && r.right <= p.right + 1; });
  expect(await visible()).toBe(true);                       // la recién creada (última) queda a la vista
  await expect(page.locator("#wsNext")).toBeDisabled();
  await page.locator("#wsPrev").click();
  expect(await g.evaluate((el) => el.scrollLeft < el.scrollWidth - el.clientWidth - 1)).toBe(true);
  await page.locator("#wsAll").click();
  await page.locator("#wsAllMenu button", { hasText: nombres[0] }).click();
  await expect(page.locator(".ws-gbtn.on")).toContainText(nombres[0]);
  expect(await visible()).toBe(true);
  await expect(page.locator("#wsPrev")).toBeDisabled();
  await page.locator(".ws-gbtn.on").press("End");
  await expect(page.locator(".ws-gbtn.on")).toContainText(nombres[nombres.length - 1]);
  await page.locator(".ws-gbtn.on").press("ArrowLeft");
  await expect(page.locator(".ws-gbtn.on")).toContainText(nombres[nombres.length - 2]);
  expect(await visible()).toBe(true);
});
