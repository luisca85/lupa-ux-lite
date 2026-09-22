/* API de documentos de Lupa UX sobre Cloudflare D1.
   Replica el contrato tipo Firestore que usa la app (DB.collection/DB.doc):

   GET    /api/health                 -> {ok, db, auth}
   GET    /api/doc?path=col/doc       -> {exists, data}
   PUT    /api/doc?path=col/doc       -> guarda el body JSON como data
   DELETE /api/doc?path=col/doc
   GET    /api/collection?path=col    -> {docs:[{id, data}]}  (solo hijos directos)
   GET    /api/export                 -> {docs:[{path, data}]}  (todo, para respaldo)

   Acceso: AUTH_MODE="access" exige un JWT válido de Cloudflare Access
   (ACCESS_TEAM_DOMAIN + ACCESS_AUD). Si falta esa config, responde 503: falla
   cerrada para no exponer datos de clientes por un deploy mal configurado.
   AUTH_MODE="none" solo para desarrollo local. */

const MAX_DATA_BYTES = 1_900_000; // D1 limita filas a ~2 MB
const SEG_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

// Valida la ruta y exige cantidad par (doc) o impar (colección) de segmentos.
function parsePath(raw, kind) {
  if (!raw) return null;
  const segs = raw.split("/");
  if (!segs.every((s) => SEG_RE.test(s) && s !== "." && s !== "..")) return null;
  const even = segs.length % 2 === 0;
  if (kind === "doc" ? !even : even) return null;
  return segs.join("/");
}
const parentOf = (path) => path.slice(0, path.lastIndexOf("/"));
const lastSeg = (path) => path.slice(path.lastIndexOf("/") + 1);

/* ---------- Cloudflare Access ---------- */
let certCache = { at: 0, keys: null };

function b64urlToBytes(s) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function accessKeys(teamDomain) {
  if (certCache.keys && Date.now() - certCache.at < 10 * 60 * 1000) return certCache.keys;
  const r = await fetch(teamDomain + "/cdn-cgi/access/certs");
  if (!r.ok) throw new Error("No se pudieron obtener los certificados de Access");
  const { keys } = await r.json();
  certCache = { at: Date.now(), keys };
  return keys;
}

async function verifyAccess(request, env) {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return false;
  const [h, p, sig] = token.split(".");
  if (!h || !p || !sig) return false;
  let header, payload, sigBytes;
  try {
    header = JSON.parse(new TextDecoder().decode(b64urlToBytes(h)));
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(p)));
    sigBytes = b64urlToBytes(sig);
  } catch {
    return false; // token mal formado: no autorizado
  }
  const team = env.ACCESS_TEAM_DOMAIN.replace(/\/$/, "");
  const jwk = (await accessKeys(team)).find((k) => k.kid === header.kid);
  if (!jwk || header.alg !== "RS256") return false;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sigBytes, new TextEncoder().encode(h + "." + p));
  if (!ok) return false;
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  const now = Math.floor(Date.now() / 1000);
  return payload.iss === team && aud.includes(env.ACCESS_AUD) && payload.exp > now;
}

// Devuelve una Response de error si el pedido no está autorizado, o null si pasa.
async function authorize(request, env) {
  const mode = env.AUTH_MODE || "access";
  if (mode === "none") return null;
  if (mode !== "access" || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD)
    return json({ error: "Acceso no configurado: definí ACCESS_TEAM_DOMAIN y ACCESS_AUD." }, 503);
  try {
    if (await verifyAccess(request, env)) return null;
  } catch (e) {
    return json({ error: "Error validando Access: " + e.message }, 503);
  }
  return json({ error: "No autorizado" }, 401);
}

/* ---------- Handler ---------- */
export async function onRequest({ request, env, params }) {
  const route = (params.path || []).join("/");
  const url = new URL(request.url);
  const method = request.method;

  const denied = await authorize(request, env);
  if (denied) return denied;
  if (!env.DB) return json({ error: "Falta el binding D1 'DB'." }, 500);

  try {
    if (route === "health" && method === "GET") {
      await env.DB.prepare("SELECT 1").first();
      return json({ ok: true, db: "d1", auth: env.AUTH_MODE || "access" });
    }

    if (route === "doc") {
      const path = parsePath(url.searchParams.get("path"), "doc");
      if (!path) return json({ error: "Ruta de documento inválida" }, 400);

      if (method === "GET") {
        const row = await env.DB.prepare("SELECT data FROM docs WHERE path = ?").bind(path).first();
        return json(row ? { exists: true, data: JSON.parse(row.data) } : { exists: false, data: {} });
      }
      if (method === "PUT") {
        const text = await request.text();
        if (text.length > MAX_DATA_BYTES)
          return json({ error: "El documento supera el límite de ~2 MB (probá con una imagen más liviana)." }, 413);
        let data;
        try { data = JSON.parse(text || "{}"); } catch { return json({ error: "JSON inválido" }, 400); }
        if (data === null || typeof data !== "object" || Array.isArray(data))
          return json({ error: "El documento debe ser un objeto" }, 400);
        await env.DB.prepare(
          "INSERT INTO docs (path, parent, data, updated_at) VALUES (?1, ?2, ?3, ?4) " +
          "ON CONFLICT(path) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at"
        ).bind(path, parentOf(path), JSON.stringify(data), Date.now()).run();
        return json({ ok: true });
      }
      if (method === "DELETE") {
        await env.DB.prepare("DELETE FROM docs WHERE path = ?").bind(path).run();
        return json({ ok: true });
      }
      return json({ error: "Método no permitido" }, 405);
    }

    if (route === "collection" && method === "GET") {
      const path = parsePath(url.searchParams.get("path"), "collection");
      if (!path) return json({ error: "Ruta de colección inválida" }, 400);
      const { results } = await env.DB.prepare("SELECT path, data FROM docs WHERE parent = ? ORDER BY path").bind(path).all();
      return json({ docs: results.map((r) => ({ id: lastSeg(r.path), data: JSON.parse(r.data) })) });
    }

    if (route === "export" && method === "GET") {
      const { results } = await env.DB.prepare("SELECT path, data FROM docs ORDER BY path").all();
      return json({ docs: results.map((r) => ({ path: r.path, data: JSON.parse(r.data) })) });
    }

    return json({ error: "No encontrado" }, 404);
  } catch (e) {
    return json({ error: "Error del servidor: " + e.message }, 500);
  }
}
