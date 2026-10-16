// Cuentas (spec cta, fase 2): entrar con código por email, crear la cuenta, código
// incorrecto, botón del email, link vencido, cerrar sesión y datos separados por cuenta.
// El servidor de este proyecto corre con AUTH_MODE="cuentas" y AUTH_CODIGO_EN_RESPUESTA,
// así que el código se lee de la pantalla (en producción llega por email).
import { test, expect } from "@playwright/test";
import { crearEstudio } from "./estudio.mjs";

const unico = (n) => `${n}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@lupa.test`;

async function pedirCodigo(page, email) {
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Continuar con email" }).click();
  await expect(page.getByRole("heading", { name: "Revisá tu email" })).toBeVisible();
  return (await page.locator("#entDev").textContent()).trim();
}
async function escribirCodigo(page, codigo) {
  await page.locator(".ent-d").first().click();
  await page.keyboard.type(codigo);
}

test("login: código por email, cuenta nueva, código incorrecto y cerrar sesión", async ({ page }) => {
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Entrá o creá tu cuenta" })).toBeVisible();
  await expect(page.locator("header.top")).toBeHidden();

  await page.getByLabel("Email").fill("no-es-un-email");
  await page.getByRole("button", { name: "Continuar con email" }).click();
  await expect(page.locator("#entErr")).toHaveText("Escribí un email válido.");

  const email = unico("ana");
  const codigo = await pedirCodigo(page, email);
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.locator("#entOtro")).toBeDisabled(); // 60 s antes de pedir otro

  const malo = codigo === "000000" ? "111111" : "000000";
  await escribirCodigo(page, malo);
  await expect(page.locator("#entErr")).toHaveText("Código incorrecto.");

  await escribirCodigo(page, codigo);
  await expect(page.getByRole("heading", { name: "Estudios" })).toBeVisible();
  await expect(page.locator("#userChip")).toContainText(email);

  await page.reload(); // la sesión sigue
  await expect(page.getByRole("heading", { name: "Estudios" })).toBeVisible();

  // Cada cuenta ve solo lo suyo: Ana crea un estudio, Beto no lo ve.
  const nombre = "Estudio de Ana " + Date.now();
  await crearEstudio(page, nombre);
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  await page.locator("#backHome").click();

  await page.locator("#userChip").click();
  await page.getByRole("menuitem", { name: "Cerrar sesión" }).click();
  await expect(page.getByRole("heading", { name: "Entrá o creá tu cuenta" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Entrá o creá tu cuenta" })).toBeVisible();

  await escribirCodigo(page, await pedirCodigo(page, unico("beto")));
  await expect(page.getByRole("heading", { name: "Estudios" })).toBeVisible();
  await expect(page.getByText(nombre)).toHaveCount(0);
  expect(errores).toEqual([]);
});

test("login: el botón del email entra una sola vez", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Entrá o creá tu cuenta" })).toBeVisible();
  const r = await page.request.post("/api/auth/codigo", { data: { email: unico("caro") } });
  const { link } = await r.json();
  expect(link).toContain("/api/auth/verificar?t=");

  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Estudios" })).toBeVisible();

  await page.context().clearCookies();
  await page.goto(link); // ya usado
  await expect(page.locator("#entErr")).toHaveText("El botón del email venció o ya se usó. Pedí un código nuevo.");
  await expect(page).toHaveURL(/\/$/);
});

test("login: sin sesión la API responde 401 y no entrega datos", async ({ request }) => {
  const r = await request.get("/api/collection?path=estudios");
  expect(r.status()).toBe(401);
  expect((await r.json()).login).toBe(true);
  const salir = await request.post("/api/auth/salir");
  expect(salir.ok()).toBe(true);
});
