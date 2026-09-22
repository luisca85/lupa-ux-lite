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

console.log(failed ? `\n${failed} chequeo(s) fallaron` : "\nTodo OK");
process.exit(failed ? 1 : 0);
