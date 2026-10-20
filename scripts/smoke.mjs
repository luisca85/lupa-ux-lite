// Smoke test de la API contra un servidor corriendo (por defecto `npm run dev`).
// Uso: npm run smoke            -> http://localhost:8788
//      BASE=https://... npm run smoke  (con Access activo va a dar 401: es lo esperado)
const BASE = (process.env.BASE || "http://localhost:8788").replace(/\/$/, "");
const id = "smoke-" + Date.now();
const doc = `estudios/${id}`;
let failed = 0;

async function req(method, route, path, body) {
  const url = `${BASE}/api/${route}${path ? "?path=" + encodeURIComponent(path) : ""}`;
  const r = await fetch(url, {
    method,
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: r.status, body: await r.json().catch(() => null) };
}
function check(name, cond, detail) {
  console.log(`${cond ? "✓" : "✗"} ${name}${cond ? "" : "  -> " + JSON.stringify(detail)}`);
  if (!cond) failed++;
}

const h = await req("GET", "health");
check("health", h.status === 200 && h.body.ok, h);

const put = await req("PUT", "doc", doc, { nombre: "Smoke", n: 1 });
check("PUT doc", put.status === 200, put);

const get = await req("GET", "doc", doc);
check("GET doc", get.body?.exists && get.body.data.nombre === "Smoke", get);

await req("PUT", "doc", `${doc}/hallazgos/h1`, { titulo: "hijo" });
await req("PUT", "doc", `${doc}/hallazgos/h1/imgs/i1`, { full: "data:," });
const col = await req("GET", "collection", `${doc}/hallazgos`);
check("collection solo hijos directos", col.body?.docs?.length === 1 && col.body.docs[0].id === "h1", col);

const bad = await req("GET", "doc", "estudios");
check("rechaza ruta de colección como doc", bad.status === 400, bad);
const trav = await req("GET", "doc", "estudios/../x");
check("rechaza '..' en la ruta", trav.status === 400, trav);

const big = await req("PUT", "doc", `${doc}/hallazgos/big`, { full: "x".repeat(2_000_000) });
check("rechaza documentos > 2 MB", big.status === 413, big.status);

for (const p of [`${doc}/hallazgos/h1/imgs/i1`, `${doc}/hallazgos/h1`, doc]) await req("DELETE", "doc", p);
const gone = await req("GET", "doc", doc);
check("DELETE doc", gone.body?.exists === false, gone);


// ---------- Cuentas: cada cuenta ve solo lo suyo (spec cta, fase 1) ----------
// Con AUTH_MODE="none", el encabezado x-lupa-dev-user simula cuentas distintas.
async function como(email, method, route, path, body) {
  const url = `${BASE}/api/${route}${path ? "?path=" + encodeURIComponent(path) : ""}`;
  const headers = { "x-lupa-dev-user": email, ...(body ? { "content-type": "application/json" } : {}) };
  const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
}
const A = `a-${id}@smoke.test`, B = `b-${id}@smoke.test`, est = `estudios/${id}-a`;
const meA = await como(A, "GET", "me"), meB = await como(B, "GET", "me");
check("cada cuenta tiene su id", meA.body?.id && meB.body?.id && meA.body.id !== meB.body.id, [meA, meB]);
await como(A, "PUT", "doc", est, { nombre: "De A" });
await como(A, "PUT", "doc", `${est}/hallazgos/h1`, { titulo: "hallazgo de A" });
check("A lee lo suyo", (await como(A, "GET", "doc", est)).body?.data?.nombre === "De A");
check("B no lee lo de A", (await como(B, "GET", "doc", est)).body?.exists === false);
check("B no lista lo de A", !(await como(B, "GET", "collection", "estudios")).body?.docs?.some((d) => d.id === `${id}-a`));
check("B no ve hallazgos de A", (await como(B, "GET", "collection", `${est}/hallazgos`)).body?.docs?.length === 0);
await como(B, "DELETE", "doc", est);
check("B no borra lo de A", (await como(A, "GET", "doc", est)).body?.exists === true);
const rutaAjena = await como(B, "GET", "doc", `u/${meA.body.id}/${est}`);
check("rechaza rutas u/ (prefijo de otra cuenta)", rutaAjena.status === 400, rutaAjena);
const expB = await como(B, "GET", "export");
check("export de B no trae nada de A", expB.status === 200 && !JSON.stringify(expB.body).includes("De A"), expB.status);
const expA = await como(A, "GET", "export");
check("export de A trae lo suyo con rutas de cliente", expA.body?.docs?.some((d) => d.path === est), expA.status);

const pub = `publicos/smoke${id}`;
await como(A, "PUT", "doc", pub, { estNombre: "Pub de A" });
check("publicos guarda el dueño", (await como(A, "GET", "doc", pub)).body?.data?.["dueño"] === meA.body.id);
check("B no lee el público de A", (await como(B, "GET", "doc", pub)).status === 404);
check("B no pisa el público de A", (await como(B, "PUT", "doc", pub, { estNombre: "de B" })).status === 404);
check("B no borra el público de A", (await como(B, "DELETE", "doc", pub)).status === 404);
check("no se puede listar publicos/", (await como(B, "GET", "collection", "publicos")).status === 404);
await como(A, "DELETE", "doc", pub);
await como(A, "DELETE", "doc", `${est}/hallazgos/h1`);
await como(A, "DELETE", "doc", est);

const authNo = await req("POST", "auth/codigo", null, { email: "x@y.zz" });
check("/api/auth/* no existe sin AUTH_MODE=cuentas", authNo.status === 404, authNo);

console.log(failed ? `\n${failed} chequeo(s) fallaron` : "\nTodo OK");
process.exit(failed ? 1 : 0);
