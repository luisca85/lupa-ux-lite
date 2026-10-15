// Home (Figma 55:1522): paginador cuando los estudios no entran en la pantalla, pie de
// página con los datos de uxuaria y páginas legales.
import { test, expect } from "@playwright/test";

test("home: paginador, pie de página y páginas legales", async ({ page }, testInfo) => {
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto("/");
  const marca = `Pag ${testInfo.project.name} ${Date.now()}`;
  for (let i = 1; i <= 6; i++) {
    await page.getByRole("button", { name: /Crear estudio|Nuevo estudio/ }).first().click();
    await page.getByPlaceholder("Ej: Onboarding app de ahorro").fill(`${marca} ${i}`);
    await page.getByRole("button", { name: "Guardar" }).click();
    await expect(page.getByRole("heading", { name: `${marca} ${i}` })).toBeVisible();
    await page.locator("#backHome").click();
  }

  await test.step("los estudios se reparten en páginas que entran en la pantalla", async () => {
    await page.locator("#topSearch").fill(marca);
    const pg = page.getByRole("navigation", { name: "Páginas de estudios" });
    await expect(pg).toBeVisible();
    await expect(pg.locator(".pg-info")).toHaveText(/^Mostrando 1–\d+ de 6$/);
    const enPrimera = await page.locator(".hp-grid [data-study]").count();
    expect(enPrimera).toBeLessThan(6);
    await expect(pg.getByRole("button", { name: "‹ Anterior" })).toBeDisabled();
    await pg.getByRole("button", { name: "Siguiente ›" }).click();
    await expect(pg.locator(".pg-info")).toHaveText(new RegExp(`^Mostrando ${enPrimera + 1}–`));
    await expect(pg.getByRole("button", { name: "Página 2" })).toHaveAttribute("aria-current", "page");
    await pg.getByRole("button", { name: "Página 1" }).click();
    await expect(pg.locator(".pg-info")).toHaveText(/^Mostrando 1–/);
    // La tarjeta "Nuevo estudio" está en todas las páginas.
    await expect(page.locator("#newStudy")).toBeVisible();
  });

  await test.step("pie de página con contacto y legales", async () => {
    const pie = page.locator("#sitePie");
    await expect(pie.getByRole("link", { name: "info@uxuaria.com" })).toHaveAttribute("href", "mailto:info@uxuaria.com");
    await expect(pie.getByRole("link", { name: "uxuaria.com", exact: true })).toHaveAttribute("href", "https://uxuaria.com");
    await pie.getByRole("button", { name: "Política de privacidad" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeVisible();
    await page.getByRole("navigation", { name: "Información legal" }).getByRole("button", { name: "Términos de uso" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Términos de uso" })).toBeVisible();
    await page.getByRole("navigation", { name: "Información legal" }).getByRole("button", { name: "Cookies y almacenamiento" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Cookies y almacenamiento" })).toBeVisible();
    await page.getByRole("button", { name: "Volver a estudios" }).click();
    await expect(page.getByRole("heading", { name: "Estudios" })).toBeVisible();
  });

  await test.step("dentro de un estudio no hay pie de página", async () => {
    await page.locator(".hp-grid [data-study] .open-area").first().click();
    await expect(page.locator("#sitePie")).toBeHidden();
  });
  expect(errores).toEqual([]);
});
