// Beta privada (spec cta): con SOLO_AUTORIZADOS="1" solo crean cuenta los emails que
// autoriza scripts/autorizar.mjs; el resto queda en la lista de espera. El servidor de este
// proyecto usa su propia base local (.wrangler/e2e-privada), que el script también toca.
import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";

const unico = (n) => `${n}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@lupa.test`;
const autorizar = (...args) => execFileSync("node", ["scripts/autorizar.mjs", ...args, "--local", "--persist-to", ".wrangler/e2e-privada"], { encoding: "utf8" });

async function entrar(page, email) {
  const r = await page.request.post("/api/auth/codigo", { data: { email } });
  if (!r.ok()) return r;
  const { codigo } = await r.json();
  return page.request.post("/api/auth/verificar", { data: { email, codigo } });
}

test("privada: un email sin autorizar queda en la lista de espera y no recibe código", async ({ page }) => {
  const email = unico("sinpermiso");
  const r = await page.request.post("/api/auth/codigo", { data: { email } });
  expect(r.status()).toBe(403);
  const body = await r.json();
  expect(body.privada).toBe(true);
  expect(body.codigo).toBeUndefined();

  await page.goto("/");
  await page.getByLabel("Email").fill(unico("pantalla"));
  await page.getByRole("button", { name: "Continuar con email" }).click();
  await expect(page.getByRole("heading", { name: "Beta privada" })).toBeVisible();
  await expect(page.getByText("lista de espera")).toBeVisible();

  expect(autorizar("--listar")).toContain(email);
});

test("privada: un email autorizado crea su cuenta, sale de la espera y sigue entrando si se lo quita", async ({ page }) => {
  const email = unico("invitada");
  expect((await page.request.post("/api/auth/codigo", { data: { email } })).status()).toBe(403); // queda en espera
  expect(autorizar("--email", email)).toContain("Autorizado: " + email);

  const r = await entrar(page, email);
  expect(r.ok()).toBe(true);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Estudios" })).toBeVisible();
  expect((await page.evaluate(() => fetch("/api/me").then((x) => x.json()))).email).toBe(email);

  const listado = autorizar("--listar");
  expect(listado.split("Autorizados")[0]).not.toContain(email); // ya no está en la espera
  expect(listado.split("Autorizados")[1]).toContain(email + "  · ya creó su cuenta");

  // Quitar la autorización no borra la cuenta: quien ya entró sigue entrando.
  expect(autorizar("--quitar", email)).toContain("ya tenía cuenta");
  // (Acaba de pedir un código: puede tocarle esperar 60 s, pero no la lista de espera.)
  const otra = await page.request.post("/api/auth/codigo", { data: { email } });
  expect([200, 429]).toContain(otra.status());
  expect((await otra.json()).privada).toBeUndefined();
});

test("privada: el administrador entra sin autorización", async ({ page }) => {
  expect((await page.request.post("/api/auth/codigo", { data: { email: "admin@lupa.test" } })).ok()).toBe(true);
});
