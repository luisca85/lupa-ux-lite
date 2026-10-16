/* API de documentos de Lupa UX sobre Cloudflare D1.
   Replica el contrato tipo Firestore que usa la app (DB.collection/DB.doc):

   GET    /api/health                 -> {ok, db, auth}
   GET    /api/doc?path=col/doc       -> {exists, data}
   PUT    /api/doc?path=col/doc       -> guarda el body JSON como data
   DELETE /api/doc?path=col/doc
   GET    /api/collection?path=col    -> {docs:[{id, data}]}  (solo hijos directos)
   GET    /api/export                 -> {docs:[{path, data}]}  (lo de la cuenta, para respaldo)
   GET    /api/me                     -> {id, email, local, modo}

   Cuentas (spec cta): cada cuenta ve solo lo suyo. El cliente usa las rutas de siempre
   ("estudios/…") y acá se guardan en "u/{idCuenta}/…". publicos/ queda global (lo lee
   el link /r/{id}) y solo lo toca su dueño.

   Acceso: AUTH_MODE="cuentas" exige la cookie de sesión del login con código por email
   (rutas /api/auth/*, ver más abajo). AUTH_MODE="access" exige un JWT válido de Cloudflare Access
   (ACCESS_TEAM_DOMAIN + ACCESS_AUD). Si falta esa config, responde 503: falla
   cerrada para no exponer datos de clientes por un deploy mal configurado.
   AUTH_MODE="none" solo para desarrollo local. */

const MAX_DATA_BYTES = 1_900_000; // D1 limita filas a ~2 MB
const SEG_RE = /^[A-Za-z0-9_.:-]{1,128}$/;

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra },
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

/* ---------- Cuentas ----------
   La cuenta se identifica por un id opaco (tabla usuarios), no por el email. */
async function cuentaDe(env, email, local) {
  if (!env.DB) return { denied: json({ error: "Falta el binding D1 'DB'." }, 500) };
  email = String(email).trim().toLowerCase();
  const buscar = () => env.DB.prepare("SELECT id FROM usuarios WHERE email = ?").bind(email).first();
  let row = await buscar();
  if (!row) {
    await env.DB.prepare("INSERT OR IGNORE INTO usuarios (id, email, creado) VALUES (?, ?, ?)").bind(crypto.randomUUID(), email, Date.now()).run();
    row = await buscar();
  }
  return { user: { id: row.id, email, local, admin: esAdmin(env, email) } };
}

/* ---------- Límites de la beta (spec cta, fase 3) ----------
   Solo con AUTH_MODE="cuentas" y para quien no es administrador (ADMIN_EMAILS). */
const LIMITE_ESTUDIOS = 1, LIMITE_PANTALLAS = 15;
const admins = (env) => String(env.ADMIN_EMAILS || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
const esAdmin = (env, email) => !!email && admins(env).includes(String(email).toLowerCase());
const conLimites = (env, user) => env.AUTH_MODE === "cuentas" && !user.admin;
const maxCuentas = (env) => Math.max(0, Number(env.MAX_CUENTAS) || 100);
const contar = async (env, parent) => (await env.DB.prepare("SELECT COUNT(*) AS n FROM docs WHERE parent = ?").bind(parent).first()).n;

// Alta de un documento nuevo que choca con un límite: devuelve la Response 403, o null.
async function chocaLimite(env, pedida, path, user) {
  if (!conLimites(env, user)) return null;
  const segs = pedida.split("/");
  const esNuevo = async () => !(await env.DB.prepare("SELECT 1 FROM docs WHERE path = ?").bind(path).first());
  if (segs.length === 2 && segs[0] === "estudios" && (await esNuevo()) && (await contar(env, parentOf(path))) >= LIMITE_ESTUDIOS)
    return json({ error: "En la beta podés tener 1 estudio.", limite: "estudios" }, 403);
  if (segs.length === 4 && segs[0] === "estudios" && segs[2] === "pantallas" && (await esNuevo()) && (await contar(env, parentOf(path))) >= LIMITE_PANTALLAS)
    return json({ error: `En la beta cada estudio puede tener hasta ${LIMITE_PANTALLAS} pantallas.`, limite: "pantallas" }, 403);
  return null;
}

// Devuelve { denied } con una Response de error si el pedido no está autorizado,
// o { user } con quién entró si pasa.
async function authorize(request, env) {
  const mode = env.AUTH_MODE || "access";
  if (mode === "cuentas") {
    if (!env.DB) return { denied: json({ error: "Falta el binding D1 'DB'." }, 500) };
    const user = await usuarioDeSesion(request, env);
    // login: la app muestra la pantalla de entrada; turnstile: clave pública del widget.
    return user ? { user } : { denied: json({ error: "Entrá con tu email para seguir.", login: true, turnstile: env.TURNSTILE_SITE_KEY || null }, 401) };
  }
  if (mode === "none") {
    // Solo desarrollo: el encabezado x-lupa-dev-user simula otra cuenta (pruebas de aislamiento).
    const dev = (request.headers.get("x-lupa-dev-user") || "").trim();
    return dev ? cuentaDe(env, dev, true) : { user: { id: "local", email: null, local: true } };
  }
  if (mode !== "access" || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD)
    return { denied: json({ error: "Acceso no configurado: definí ACCESS_TEAM_DOMAIN y ACCESS_AUD." }, 503) };
  try {
    const payload = await verifyAccess(request, env);
    if (payload) {
      if (!payload.email) return { denied: json({ error: "El acceso no trae un email." }, 403) };
      return await cuentaDe(env, payload.email, false);
    }
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

  // Reserva desde "Trabajemos juntos": exige el mismo PIN, la registra y avisa por correo.
  if (body.accion === "reserva") return reservar(body, meta, guardar, env, now);

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

/* ---------- Reservas ("Reservar ahora tu diagnóstico" en el reporte del cliente) ----------
   Se guardan en la foto (últimas 20, se conservan al actualizar la publicación) y se avisa
   por correo con Resend si está configurado: RESEND_API_KEY (secreto), RESERVA_TO (por
   defecto info@uxuaria.com), RESERVA_CC (opcional) y RESERVA_FROM (remitente de un dominio
   verificado en Resend). Si el correo falla, la reserva igual queda registrada. */
const PUB_MAX_RESERVAS = 20;
const txt = (v, n) => String(v == null ? "" : v).replace(/\s+/g, " ").trim().slice(0, n);

async function reservar(body, meta, guardar, env, now) {
  const nombre = txt(body.nombre, 80), p = body.propuesta || {};
  const propuesta = { id: txt(p.id, 64), titulo: txt(p.titulo, 140), precio: txt(p.precio, 60) };
  if (!nombre || !propuesta.titulo) { await guardar(meta); return json({ error: "Faltan datos de la reserva." }, 400); }
  const reserva = { nombre, propuesta, fecha: now };
  meta.reservas = [...(Array.isArray(meta.reservas) ? meta.reservas : []), reserva].slice(-PUB_MAX_RESERVAS);
  await guardar(meta);
  let enviado = false;
  try { enviado = await avisarReserva(env, meta, reserva); } catch (e) { enviado = false; }
  return json({ ok: true, enviado });
}

async function avisarReserva(env, meta, r) {
  if (!env.RESEND_API_KEY) return false;
  let to = (env.RESERVA_TO || "info@uxuaria.com").split(",").map((x) => x.trim()).filter(Boolean);
  let cc = (env.RESERVA_CC || "").split(",").map((x) => x.trim()).filter(Boolean);
  // Con cuentas (spec cta), el aviso va al dueño del estudio, no a uxuaria (salvo que el
  // dueño sea administrador).
  if (env.AUTH_MODE === "cuentas" && meta["dueño"]) {
    const u = await env.DB.prepare("SELECT email FROM usuarios WHERE id = ?").bind(meta["dueño"]).first();
    if (u && !esAdmin(env, u.email)) { to = [u.email]; cc = []; }
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const estudio = meta.estNombre || "un estudio", cliente = meta.estCliente ? " (" + meta.estCliente + ")" : "";
  const fecha = new Date(r.fecha).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires", dateStyle: "long", timeStyle: "short" });
  const asunto = "Nueva reserva: " + r.propuesta.titulo + " · " + r.nombre;
  const html = "<h2>Nueva reserva desde el reporte</h2>"
    + "<p><b>" + esc(r.nombre) + "</b> reservó <b>" + esc(r.propuesta.titulo) + "</b>" + (r.propuesta.precio ? " (" + esc(r.propuesta.precio) + ")" : "") + ".</p>"
    + "<p>Estudio: " + esc(estudio + cliente) + "<br>Fecha: " + esc(fecha) + "</p>"
    + "<p>Le prometimos que le escribís pronto.</p>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({ from: env.RESERVA_FROM || "Lupa UX <reservas@uxuaria.com>", to, cc: cc.length ? cc : undefined, subject: asunto, html }),
  });
  return res.ok;
}

/* ---------- Login con código por email (AUTH_MODE="cuentas", spec cta) ----------
   Junto con /api/publico, son las únicas rutas fuera de authorize() (todavía no hay sesión):
   POST /api/auth/codigo    {email, turnstile} -> manda el email con botón y código
   POST /api/auth/verificar {email, codigo}    -> crea la cuenta si no existe y la sesión
   GET  /api/auth/verificar?t=token            -> lo mismo desde el botón del email
   POST /api/auth/salir                        -> borra la sesión
   El código y el token valen 10 minutos y una sola vez; 5 intentos por código; 60 s entre
   pedidos y 5 por hora para cada email. Solo se guardan hashes. Sin RESEND_API_KEY no se
   manda nada; AUTH_CODIGO_EN_RESPUESTA="1" (solo desarrollo y tests) devuelve el código. */
const COOKIE = "lupa_sesion";
const CODIGO_MS = 10 * 60 * 1000, CODIGO_MAX_INTENTOS = 5, CODIGO_ESPERA_MS = 60 * 1000, CODIGOS_POR_HORA = 5;
const EMAIL_RE = /^[^@\s]{1,64}@[^@\s]{1,190}\.[^@\s]{2,}$/;
const TOKEN_RE = /^[0-9a-f]{64}$/;

const azarHex = (bytes) => [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
const codigoAzar = () => String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
const devCodigo = (env) => env.AUTH_CODIGO_EN_RESPUESTA === "1";
const sesionMs = (env) => Math.max(1, Number(env.SESION_DIAS) || 30) * 86400000;
const cookieSesion = (token, segundos) => `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${segundos}`;

function leerCookie(request, nombre) {
  for (const parte of (request.headers.get("cookie") || "").split(";")) {
    const i = parte.indexOf("=");
    if (i > 0 && parte.slice(0, i).trim() === nombre) return parte.slice(i + 1).trim();
  }
  return null;
}

async function usuarioDeSesion(request, env) {
  const token = leerCookie(request, COOKIE);
  if (!token || !TOKEN_RE.test(token)) return null;
  const row = await env.DB.prepare(
    "SELECT u.id, u.email FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id WHERE s.token_hash = ? AND s.expira > ?"
  ).bind(await sha256hex(token), Date.now()).first();
  return row ? { id: row.id, email: row.email, local: false, admin: esAdmin(env, row.email) } : null;
}

// Crea la cuenta si es la primera vez y abre la sesión. Devuelve el encabezado Set-Cookie.
async function entrar(env, email) {
  const { user, denied } = await cuentaDe(env, email, false);
  if (denied) throw new Error("Sin base de datos");
  const token = azarHex(32), now = Date.now(), ms = sesionMs(env);
  await env.DB.prepare("INSERT INTO sesiones (token_hash, usuario_id, expira, creado) VALUES (?, ?, ?, ?)")
    .bind(await sha256hex(token), user.id, now + ms, now).run();
  return cookieSesion(token, Math.floor(ms / 1000));
}

async function verificarTurnstile(env, token, ip) {
  if (!env.TURNSTILE_SECRET) return devCodigo(env); // sin secreto, solo pasa en desarrollo y tests
  const form = new FormData();
  form.append("secret", env.TURNSTILE_SECRET);
  form.append("response", String(token || ""));
  if (ip) form.append("remoteip", ip);
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  const j = await r.json().catch(() => ({}));
  return j.success === true;
}

async function mandarCodigo(env, email, codigo, link) {
  if (!env.RESEND_API_KEY) return false;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:440px;margin:0 auto;padding:24px;color:#0a0a0a">
    <h2 style="margin:0 0 12px;font-size:20px">Entrá a Lupa UX</h2>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.5">Tocá el botón para entrar en este dispositivo, o escribí el código en la pantalla donde lo pediste.</p>
    <p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#0a0a0a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600">Entrar a Lupa UX</a></p>
    <p style="margin:0 0 6px;font-size:13px;color:#555">Tu código</p>
    <p style="margin:0 0 24px;font-size:28px;letter-spacing:6px;font-weight:700;font-family:ui-monospace,monospace">${codigo}</p>
    <p style="margin:0;font-size:12.5px;color:#777;line-height:1.5">Vale 10 minutos y sirve una sola vez. Si no lo pediste, ignorá este email: nadie puede entrar sin él.</p>
  </div>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: "Bearer " + env.RESEND_API_KEY, "content-type": "application/json" },
    body: JSON.stringify({ from: env.AUTH_FROM || "Lupa UX <acceso@uxuaria.com>", to: [email], subject: `Tu código para entrar a Lupa UX: ${codigo}`, html }),
  });
  return res.ok;
}

async function auth(route, request, env) {
  if (!env.DB) return json({ error: "Falta el binding D1 'DB'." }, 500);
  const url = new URL(request.url), now = Date.now();

  // Botón del email: entra en este navegador y vuelve a la app.
  if (route === "auth/verificar" && request.method === "GET") {
    const t = url.searchParams.get("t") || "";
    const row = TOKEN_RE.test(t) && await env.DB.prepare("SELECT id, email FROM codigos WHERE token_hash = ? AND usado = 0 AND expira > ?")
      .bind(await sha256hex(t), now).first();
    if (!row) return new Response(null, { status: 302, headers: { location: url.origin + "/?entrar=vencido", "cache-control": "no-store" } });
    await env.DB.prepare("UPDATE codigos SET usado = 1 WHERE id = ?").bind(row.id).run();
    return new Response(null, { status: 302, headers: { location: url.origin + "/", "set-cookie": await entrar(env, row.email), "cache-control": "no-store" } });
  }
  if (request.method !== "POST") return json({ error: "Método no permitido" }, 405);
  let body;
  try { body = await request.json(); } catch { body = {}; }

  if (route === "auth/salir") {
    const token = leerCookie(request, COOKIE);
    if (token && TOKEN_RE.test(token)) await env.DB.prepare("DELETE FROM sesiones WHERE token_hash = ?").bind(await sha256hex(token)).run();
    return json({ ok: true }, 200, { "set-cookie": cookieSesion("", 0) });
  }

  const email = String((body && body.email) || "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return json({ error: "Escribí un email válido." }, 400);

  if (route === "auth/codigo") {
    const { results: recientes } = await env.DB.prepare("SELECT creado FROM codigos WHERE email = ? AND creado > ? ORDER BY creado DESC")
      .bind(email, now - 3600000).all();
    if (recientes.length && now - recientes[0].creado < CODIGO_ESPERA_MS) {
      const espera = Math.ceil((CODIGO_ESPERA_MS - (now - recientes[0].creado)) / 1000);
      return json({ error: `Podés pedir otro en ${espera} s.`, espera }, 429);
    }
    if (recientes.length >= CODIGOS_POR_HORA) return json({ error: "Pediste muchos códigos. Probá en una hora." }, 429);
    if (!(await verificarTurnstile(env, body.turnstile, request.headers.get("cf-connecting-ip"))))
      return json({ error: "No pudimos verificar que no seas un robot. Probá de nuevo.", turnstile: true }, 400);

    // Cupos de la beta: un email nuevo con los cupos completos queda en la lista de espera.
    if (!esAdmin(env, email) && !(await env.DB.prepare("SELECT 1 FROM usuarios WHERE email = ?").bind(email).first())) {
      const total = (await env.DB.prepare("SELECT COUNT(*) AS n FROM usuarios").first()).n;
      const lista = admins(env), ph = lista.map(() => "?").join(",");
      const deAdmins = lista.length ? (await env.DB.prepare(`SELECT COUNT(*) AS n FROM usuarios WHERE email IN (${ph})`).bind(...lista).first()).n : 0;
      if (total - deAdmins >= maxCuentas(env)) {
        await env.DB.prepare("INSERT OR IGNORE INTO espera (email, creado) VALUES (?, ?)").bind(email, now).run();
        return json({ error: "Los cupos de la beta están completos. Te avisamos cuando haya lugar.", cupos: true }, 403);
      }
    }

    const id = crypto.randomUUID(), codigo = codigoAzar(), token = azarHex(32);
    await env.DB.prepare("UPDATE codigos SET usado = 1 WHERE email = ? AND usado = 0").bind(email).run(); // el anterior deja de valer
    await env.DB.prepare("DELETE FROM codigos WHERE creado < ?").bind(now - 86400000).run(); // limpieza
    await env.DB.prepare("INSERT INTO codigos (id, email, codigo_hash, token_hash, expira, creado) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(id, email, await sha256hex(id + ":" + codigo), await sha256hex(token), now + CODIGO_MS, now).run();
    const link = url.origin + "/api/auth/verificar?t=" + token;
    if (devCodigo(env)) return json({ ok: true, codigo, link });
    let enviado = false;
    try { enviado = await mandarCodigo(env, email, codigo, link); } catch { enviado = false; }
    if (!enviado) {
      await env.DB.prepare("UPDATE codigos SET usado = 1 WHERE id = ?").bind(id).run();
      return json({ error: "No pudimos mandar el email. Probá en unos minutos." }, 502);
    }
    return json({ ok: true });
  }

  if (route === "auth/verificar") {
    const vencido = () => json({ error: "El código venció. Pedí uno nuevo.", vencido: true }, 400);
    const row = await env.DB.prepare("SELECT id, codigo_hash, intentos FROM codigos WHERE email = ? AND usado = 0 AND expira > ? ORDER BY creado DESC LIMIT 1")
      .bind(email, now).first();
    if (!row) return vencido();
    const codigo = String((body && body.codigo) || "").replace(/\D/g, "");
    if (codigo.length !== 6 || !mismoHex(await sha256hex(row.id + ":" + codigo), row.codigo_hash)) {
      const intentos = row.intentos + 1, agotado = intentos >= CODIGO_MAX_INTENTOS;
      await env.DB.prepare("UPDATE codigos SET intentos = ?, usado = ? WHERE id = ?").bind(intentos, agotado ? 1 : 0, row.id).run();
      return agotado ? vencido() : json({ error: "Código incorrecto.", restantes: CODIGO_MAX_INTENTOS - intentos }, 400);
    }
    await env.DB.prepare("UPDATE codigos SET usado = 1 WHERE id = ?").bind(row.id).run();
    return json({ ok: true }, 200, { "set-cookie": await entrar(env, email) });
  }
  return json({ error: "No encontrado" }, 404);
}

/* ---------- Rutas por cuenta ---------- */
const enCuenta = (path, user) => "u/" + user.id + "/" + path;
const esPublico = (path) => path.split("/")[0] === "publicos";
const finCuenta = (user) => ["u/" + user.id + "/", "u/" + user.id + "0"]; // rango de paths de la cuenta ("/" < "0")

// publicos/{id}[/…]: lo toca solo su dueño. Si todavía no existe, lo crea quien escribe
// (los ids son aleatorios). La lista de publicos/ no se expone.
async function esDuenioPublico(env, path, user) {
  const segs = path.split("/");
  if (segs.length < 2) return false;
  const row = await env.DB.prepare("SELECT data FROM docs WHERE path = ?").bind("publicos/" + segs[1]).first();
  return !row || JSON.parse(row.data)["dueño"] === user.id;
}

/* Estudio de ejemplo (spec cta, fase 3): vive en ejemplo/estudios/ejemplo-{id}/… (global)
   y todas las cuentas lo ven como "estudios/ejemplo-{id}/…", de solo lectura. Se publica
   desde un estudio del administrador con scripts/publicar-ejemplo.mjs. */
const esEjemplo = (path) => { const s = path.split("/"); return s[0] === "estudios" && s.length >= 2 && s[1].startsWith("ejemplo-"); };
const soloLectura = () => json({ error: "El estudio de ejemplo es de solo lectura.", soloLectura: true }, 403);

// Traduce la ruta del cliente a la de D1, o devuelve una Response de error.
async function rutaReal(env, path, user, escribe) {
  const raiz = path.split("/")[0];
  if (raiz === "u" || raiz === "ejemplo") return { error: json({ error: "Ruta reservada" }, 400) };
  if (esEjemplo(path)) return escribe ? { error: soloLectura() } : { path: "ejemplo/" + path };
  if (!esPublico(path)) return { path: enCuenta(path, user) };
  if (!(await esDuenioPublico(env, path, user))) return { error: json({ error: "No encontrado" }, 404) };
  return { path };
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

  // Login: también antes de authorize() (todavía no hay sesión). Solo con AUTH_MODE="cuentas".
  if (route.startsWith("auth/")) {
    if (env.AUTH_MODE !== "cuentas") return json({ error: "No encontrado" }, 404);
    try { return await auth(route, request, env); }
    catch (e) { return json({ error: "Error del servidor" }, 500); }
  }

  const { denied, user } = await authorize(request, env);
  if (denied) return denied;

  // Quién está usando la app (sale del token de Access ya verificado).
  if (route === "me" && method === "GET") {
    const yo = { id: user.id, email: user.email, local: user.local, modo: env.AUTH_MODE || "access", admin: !!user.admin, limites: null };
    if (env.DB && conLimites(env, user))
      yo.limites = { estudios: LIMITE_ESTUDIOS, pantallas: LIMITE_PANTALLAS, uso: { estudios: await contar(env, enCuenta("estudios", user)) } };
    return json(yo);
  }

  if (!env.DB) return json({ error: "Falta el binding D1 'DB'." }, 500);

  try {
    if (route === "health" && method === "GET") {
      await env.DB.prepare("SELECT 1").first();
      return json({ ok: true, db: "d1", auth: env.AUTH_MODE || "access" });
    }

    if (route === "doc") {
      const pedida = parsePath(url.searchParams.get("path"), "doc");
      if (!pedida) return json({ error: "Ruta de documento inválida" }, 400);
      const { path, error } = await rutaReal(env, pedida, user, method !== "GET");
      if (error) return error;

      if (method === "GET") {
        const row = await env.DB.prepare("SELECT data FROM docs WHERE path = ?").bind(path).first();
        if (!row) return json({ exists: false, data: {} });
        const data = JSON.parse(row.data);
        if (esEjemplo(pedida) && pedida.split("/").length === 2) data.ejemplo = true;
        return json({ exists: true, data });
      }
      if (method === "PUT") {
        const text = await request.text();
        if (text.length > MAX_DATA_BYTES)
          return json({ error: "El documento supera el límite de ~2 MB (probá con una imagen más liviana)." }, 413);
        let data;
        try { data = JSON.parse(text || "{}"); } catch { return json({ error: "JSON inválido" }, 400); }
        if (data === null || typeof data !== "object" || Array.isArray(data))
          return json({ error: "El documento debe ser un objeto" }, 400);
        if (esPublico(path) && path.split("/").length === 2) data["dueño"] = user.id;
        const limite = await chocaLimite(env, pedida, path, user);
        if (limite) return limite;
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
      const pedida = parsePath(url.searchParams.get("path"), "collection");
      if (!pedida) return json({ error: "Ruta de colección inválida" }, 400);
      const { path, error } = await rutaReal(env, pedida, user, false);
      if (error) return error;
      const { results } = await env.DB.prepare("SELECT path, data FROM docs WHERE parent = ? ORDER BY path").bind(path).all();
      const docs = results.map((r) => ({ id: lastSeg(r.path), data: JSON.parse(r.data) }));
      // La lista de estudios suma los de ejemplo, marcados (la app los muestra primero).
      if (pedida === "estudios") {
        const { results: ej } = await env.DB.prepare("SELECT path, data FROM docs WHERE parent = 'ejemplo/estudios' ORDER BY path").all();
        ej.forEach((r) => docs.push({ id: lastSeg(r.path), data: { ...JSON.parse(r.data), ejemplo: true } }));
      }
      return json({ docs });
    }

    if (route === "export" && method === "GET") {
      // Solo lo de la cuenta (con las rutas que usa el cliente) y sus links públicos.
      const [desde, hasta] = finCuenta(user);
      const { results } = await env.DB.prepare("SELECT path, data FROM docs WHERE path >= ? AND path < ? ORDER BY path").bind(desde, hasta).all();
      const docs = results.map((r) => ({ path: r.path.slice(desde.length), data: JSON.parse(r.data) }));
      const pubs = await env.DB.prepare("SELECT path FROM docs WHERE parent = 'publicos' AND json_extract(data, '$.\"dueño\"') = ?").bind(user.id).all();
      for (const { path } of pubs.results) {
        const { results: rs } = await env.DB.prepare("SELECT path, data FROM docs WHERE path = ? OR parent = ? ORDER BY path").bind(path, path + "/partes").all();
        rs.forEach((r) => docs.push({ path: r.path, data: JSON.parse(r.data) }));
      }
      return json({ docs });
    }

    return json({ error: "No encontrado" }, 404);
  } catch (e) {
    return json({ error: "Error del servidor: " + e.message }, 500);
  }
}
