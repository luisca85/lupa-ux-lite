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
  // Devuelve el payload verificado (trae el email de quien entró) o null.
  return payload.iss === team && aud.includes(env.ACCESS_AUD) && payload.exp > now ? payload : null;
}

// Devuelve { denied } con una Response de error si el pedido no está autorizado,
// o { user } con quién entró si pasa.
async function authorize(request, env) {
  const mode = env.AUTH_MODE || "access";
  if (mode === "none") return { user: { email: null, local: true } };
  if (mode !== "access" || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD)
    return { denied: json({ error: "Acceso no configurado: definí ACCESS_TEAM_DOMAIN y ACCESS_AUD." }, 503) };
  try {
    const payload = await verifyAccess(request, env);
    if (payload) return { user: { email: payload.email || null, local: false } };
  } catch (e) {
    return { denied: json({ error: "Error validando Access: " + e.message }, 503) };
  }
  return { denied: json({ error: "No autorizado" }, 401) };
}

/* ---------- Link público del reporte ----------
   ÚNICA ruta que no pasa por authorize(): en Cloudflare Access, /api/publico tiene
   una política Bypass. Solo lee documentos publicos/{id} (la "foto" que publicó el
   dueño) y exige el PIN de 6 dígitos; con 5 fallos bloquea el link 15 minutos.
   Mismo error para link inexistente o PIN incorrecto (no revela qué links existen).
   Con el PIN correcto, exige además el consentimiento (nombre + acepto): lo registra
   en la foto (nombre y fecha, últimos 10) y recién ahí entrega el reporte. */
const PUB_ID = /^[A-Za-z0-9-]{16,64}$/;
const PUB_MAX_FALLOS = 5, PUB_BLOQUEO_MS = 15 * 60 * 1000, PUB_MAX_CONSENT = 10;

async function sha256hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function mismoHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function publico(request, env) {
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);
  if (!env.DB) return json({ error: "Falta el binding D1 'DB'." }, 500);
  let body;
  try { body = await request.json(); } catch { return json({ error: "Pedido inválido" }, 400); }
  const id = String((body && body.id) || ""), pin = String((body && body.pin) || "");
  const noValido = () => json({ error: "Link o PIN incorrecto." }, 401);
  if (!PUB_ID.test(id) || !/^\d{6}$/.test(pin)) return noValido();

  const path = "publicos/" + id;
  const row = await env.DB.prepare("SELECT data FROM docs WHERE path = ?").bind(path).first();
  if (!row) return noValido();
  const meta = JSON.parse(row.data), now = Date.now();
  const bloqueado = () => json({ error: "Demasiados intentos. Probá de nuevo en unos minutos." }, 429);
  if (meta.bloqueadoHasta && meta.bloqueadoHasta > now) return bloqueado();

  const guardar = (m) => env.DB.prepare("UPDATE docs SET data = ?, updated_at = ? WHERE path = ?").bind(JSON.stringify(m), now, path).run();
  if (!mismoHex(await sha256hex(meta.salt + ":" + pin), meta.pinHash)) {
    meta.fallos = (meta.fallos || 0) + 1;
    if (meta.fallos >= PUB_MAX_FALLOS) { meta.fallos = 0; meta.bloqueadoHasta = now + PUB_BLOQUEO_MS; }
    await guardar(meta);
    return meta.bloqueadoHasta > now ? bloqueado() : noValido();
  }
  meta.fallos = 0; meta.bloqueadoHasta = 0;

  // Consentimiento obligatorio: sin nombre y aceptación, no se entrega el reporte.
  const nombre = String((body && body.nombre) || "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!nombre || body.acepto !== true) {
    await guardar(meta);
    return json({ error: "Para ver el reporte, escribí tu nombre y aceptá las condiciones de uso.", consentimiento: true }, 400);
  }
  meta.consentimientos = [...(Array.isArray(meta.consentimientos) ? meta.consentimientos : []), { nombre, fecha: now }].slice(-PUB_MAX_CONSENT);
  await guardar(meta);

  const { results } = await env.DB.prepare("SELECT data FROM docs WHERE parent = ? ORDER BY path").bind(path + "/partes").all();
  const texto = results.map((r) => JSON.parse(r.data).t || "").join("");
  return new Response(texto, {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex" },
  });
}

/* ---------- Handler ---------- */
export async function onRequest({ request, env, params }) {
  const route = (params.path || []).join("/");
  const url = new URL(request.url);
  const method = request.method;

  // Link público: se atiende ANTES de authorize() a propósito (ver publico()).
  if (route === "publico") {
    try { return await publico(request, env); }
    catch (e) { return json({ error: "Error del servidor" }, 500); }
  }

  const { denied, user } = await authorize(request, env);
  if (denied) return denied;

  // Quién está usando la app (sale del token de Access ya verificado).
  if (route === "me" && method === "GET") return json(user);

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
