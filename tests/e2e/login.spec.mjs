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

  // Términos y privacidad se leen antes de tener cuenta.
  await page.getByRole("button", { name: "política de privacidad" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeVisible();
  await expect(page.locator(".legal-doc")).toContainText("código para entrar");
  await page.getByRole("button", { name: "← Volver" }).click();

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
  await expect(page.locator("#userChip")).not.toContainText("Luis Carlos"); // no hereda la marca de uxuaria

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

// ---------- Fase 3: límites de la beta y estudio de ejemplo ----------
// Pedidos con la sesión del navegador (la cookie es Secure: page.request no la manda por http).
const api = (page, method, path, data) => page.evaluate(async ([m, p, d]) => {
  const r = await fetch("/api/doc?path=" + encodeURIComponent(p), { method: m, headers: { "content-type": "application/json" }, body: d ? JSON.stringify(d) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}, [method, path, data]);
async function entrarCon(page, email) {
  await page.goto("/");
  await escribirCodigo(page, await pedirCodigo(page, email));
  await expect(page.getByRole("heading", { name: "Estudios" })).toBeVisible();
}

test("beta: estudio de ejemplo primero y de solo lectura", async ({ page }) => {
  const errores = [];
  page.on("pageerror", (e) => errores.push(e.message));
  await entrarCon(page, unico("eva"));
  const primera = page.locator(".hp-grid [data-study]").first();
  await expect(primera).toHaveAttribute("data-study", "ejemplo-demo");
  await expect(primera.locator(".chip.ej")).toHaveText("Ejemplo");
  await expect(primera.locator(".edit")).toHaveCount(0);

  await primera.locator(".open-area").click();
  await expect(page.locator(".ej-aviso")).toContainText("Estudio de ejemplo");
  await expect(page.locator("#editStudy")).toHaveCount(0);
  await page.locator('#psNav [data-t="hallazgos"]').click();
  await expect(page.locator("#wsAdd")).toBeHidden();

  expect((await api(page, "PUT", "estudios/ejemplo-demo", { nombre: "pisado" })).status).toBe(403);
  expect((await api(page, "DELETE", "estudios/ejemplo-demo/hallazgos/h1")).status).toBe(403);
  expect((await api(page, "GET", "ejemplo/estudios/x")).status).toBe(400);
  await page.locator("#backHome").click();
  await expect(page.locator("body")).not.toHaveClass(/solo-lectura/);
  expect(errores).toEqual([]);
});

test("beta: 1 estudio a la vez y 15 pantallas por estudio", async ({ page }) => {
  await entrarCon(page, unico("fede"));
  const me = await page.evaluate(() => fetch("/api/me").then((r) => r.json()));
  expect(me.limites).toMatchObject({ estudios: 1, pantallas: 15 });

  const nombre = "Mi único estudio " + Date.now();
  await crearEstudio(page, nombre);
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  const estId = await page.evaluate(() => JSON.parse(localStorage.getItem("lupa:active")));
  // Una cuenta de la beta entrega el reporte solo por el link: no ve Exportar.
  await page.locator('#psNav [data-t="reportes"]').click();
  await expect(page.locator("#rptShareCard")).toBeVisible();
  await expect(page.locator("#rpExpTxt")).toHaveCount(0);
  // Una cuenta de la beta arranca sin la marca ni las propuestas de uxuaria.
  await page.locator('#psNav [data-t="proyecto"]').click();
  await page.locator(".cf-item", { hasText: "Marca" }).click();
  await expect(page.locator("#br_n")).toHaveValue("");
  await expect(page.locator("#br_wm")).toHaveValue("");
  const props = await page.evaluate(async (id) => (await (await fetch("/api/doc?path=" + encodeURIComponent("estudios/" + id))).json()).data.reporte?.propuestas || [], estId);
  expect(props.some((p) => /Plan Mensual|Diagnóstico completo/.test(p.titulo || ""))).toBe(false);
  await page.locator("#backHome").click();
  await expect(page.locator("#newStudy")).toBeDisabled();
  await expect(page.locator("#newStudy")).toContainText("En la beta podés tener 1 estudio");

  const otro = await api(page, "PUT", "estudios/otro-" + Date.now(), { nombre: "Segundo" });
  expect(otro.status).toBe(403);
  expect(otro.body.limite).toBe("estudios");
  const editar = await api(page, "PUT", "estudios/" + estId, { nombre: nombre + " (editado)", createdAt: Date.now() });
  expect(editar.status).toBe(200); // editar el propio sigue funcionando

  const pant = (i) => api(page, "PUT", `estudios/${estId}/pantallas/p${i}`, { nombre: "P" + i, orden: i });
  for (let i = 1; i <= 15; i++) expect((await pant(i)).status).toBe(200);
  const p16 = await pant(16);
  expect(p16.status).toBe(403);
  expect(p16.body.limite).toBe("pantallas");
  expect((await pant(3)).status).toBe(200); // actualizar una existente sí

  // Borrar el estudio libera el cupo (el límite es "a la vez").
  await page.reload();
  await expect(page.locator(".hp-grid [data-study]").first()).toBeVisible();
  await page.locator("#topSearch").fill(nombre); // con el paginador puede no estar en la primera página
  await page.locator(`[data-study="${estId}"] .del`).click();
  await page.locator("#cYes").click();
  await expect(page.locator("#newStudy")).toBeEnabled();
});

test("beta: con los cupos completos, un email nuevo queda en la lista de espera", async ({ page }) => {
  // MAX_CUENTAS=8 en este servidor; el administrador no cuenta.
  let r = null;
  for (let i = 0; i < 10; i++) {
    const email = unico("lleno" + i);
    r = await page.request.post("/api/auth/codigo", { data: { email } });
    if (r.status() === 403) break;
    const { codigo } = await r.json();
    expect((await page.request.post("/api/auth/verificar", { data: { email, codigo } })).ok()).toBe(true);
  }
  expect(r.status()).toBe(403);
  expect((await r.json()).cupos).toBe(true);

  await page.context().clearCookies();
  await page.goto("/");
  await page.getByLabel("Email").fill(unico("tarde"));
  await page.getByRole("button", { name: "Continuar con email" }).click();
  await expect(page.getByRole("heading", { name: "Cupos completos" })).toBeVisible();

  const admin = await page.request.post("/api/auth/codigo", { data: { email: "admin@lupa.test" } });
  expect(admin.ok()).toBe(true); // el administrador entra igual
});

// ---------- Legales públicos y condiciones del link público ----------
test("legales: /legal/{id} se lee sin cuenta", async ({ page }) => {
  await page.goto("/legal/privacidad");
  await expect(page.getByRole("heading", { level: 1, name: "Política de privacidad" })).toBeVisible();
  await expect(page.locator(".legal-doc")).toContainText("Luis Carlos Romero León");
  await expect(page.locator(".legal-doc")).toContainText("Ley 25.326");
  await expect(page.getByRole("heading", { name: "Entrá o creá tu cuenta" })).toHaveCount(0);
  await page.getByRole("link", { name: "Reportes compartidos" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Reportes compartidos" })).toBeVisible();
});
