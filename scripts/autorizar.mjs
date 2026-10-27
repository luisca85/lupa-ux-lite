// Beta privada (spec cta): autoriza emails a crear cuenta y muestra la lista de espera.
// Con SOLO_AUTORIZADOS="1", un email nuevo solo recibe código si está en `autorizados`;
// el resto queda en `espera`. Autorizar a alguien lo saca de la espera. No le manda
// ningún email: avisale vos que ya puede entrar.
//
// Uso:
//   node scripts/autorizar.mjs --listar --local|--remote                  (espera y autorizados)
//   node scripts/autorizar.mjs --email ana@x.com,beto@y.com --local|--remote
//   node scripts/autorizar.mjs --quitar ana@x.com --local|--remote        (no borra su cuenta)
// Opcional: --persist-to <carpeta> (otra base local) o --env preview.
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const val = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const destino = args.includes("--remote") ? "--remote" : args.includes("--local") ? "--local" : null;
const lista = (s) => String(s || "").split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
const agregar = lista(val("--email")), quitar = lista(val("--quitar")), listar = args.includes("--listar");
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const malos = [...agregar, ...quitar].filter((e) => !EMAIL_RE.test(e) || e.length > 254);
if (!destino || (!agregar.length && !quitar.length && !listar) || malos.length) {
  if (malos.length) console.error("Emails no válidos: " + malos.join(", "));
  console.error("Uso: node scripts/autorizar.mjs --email a@x.com[,b@y.com] | --quitar a@x.com | --listar  --local|--remote");
  process.exit(1);
}
// --remote usa la base del entorno production de wrangler.toml (o --env preview).
const extra = val("--persist-to") ? ["--persist-to", val("--persist-to")] : destino === "--remote" ? ["--env", val("--env") || "production"] : [];
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const d1 = (sql) => JSON.parse(execFileSync(npx, ["wrangler", "d1", "execute", "DB", destino, ...extra, "--json", "--command", sql], { encoding: "utf8" }))[0].results;
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";
const fecha = (ms) => new Date(ms).toISOString().slice(0, 16).replace("T", " ");

const now = Date.now();
for (const e of agregar) {
  d1(`INSERT OR IGNORE INTO autorizados (email, creado) VALUES (${q(e)}, ${now})`);
  d1(`DELETE FROM espera WHERE email = ${q(e)}`);
  console.log("✓ Autorizado: " + e);
}
for (const e of quitar) {
  d1(`DELETE FROM autorizados WHERE email = ${q(e)}`);
  console.log("✓ Quitado: " + e + (d1(`SELECT 1 FROM usuarios WHERE email = ${q(e)}`).length ? " (ya tenía cuenta: sigue entrando)" : ""));
}
if (listar) {
  const espera = d1("SELECT email, creado FROM espera ORDER BY creado");
  const autorizados = d1("SELECT a.email, a.creado, u.id IS NOT NULL AS cuenta FROM autorizados a LEFT JOIN usuarios u ON u.email = a.email ORDER BY a.creado");
  console.log(`\nLista de espera (${espera.length}):`);
  espera.forEach((r) => console.log(`  ${fecha(r.creado)}  ${r.email}`));
  console.log(`\nAutorizados (${autorizados.length}):`);
  autorizados.forEach((r) => console.log(`  ${fecha(r.creado)}  ${r.email}${r.cuenta ? "  · ya creó su cuenta" : ""}`));
}
