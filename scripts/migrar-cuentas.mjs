// Fase 1 de cuentas (spec cta): pasa los documentos que hoy no tienen dueño a la cuenta
// del administrador (u/{id}/…) y marca sus links públicos con "dueño". Corre una sola vez;
// si se repite no hace nada (solo toca rutas que no empiezan con u/ ni publicos/).
//
// Uso:
//   node scripts/migrar-cuentas.mjs --email vos@dominio.com --local     (D1 de desarrollo)
//   node scripts/migrar-cuentas.mjs --email vos@dominio.com --remote    (producción)
// Antes de --remote: probalo con --local sobre una copia y exportá un respaldo.
// Opcional: --persist-to <carpeta> (otra base local, por ejemplo una copia).
// En desarrollo (AUTH_MODE="none") la cuenta es "local": usá --cuenta-local en vez de --email.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const val = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const cuentaLocal = args.includes("--cuenta-local");
const email = cuentaLocal ? "" : String(val("--email") || "").trim().toLowerCase();
const destino = args.includes("--remote") ? "--remote" : args.includes("--local") ? "--local" : null;
if ((!cuentaLocal && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) || !destino) {
  console.error("Uso: node scripts/migrar-cuentas.mjs --email vos@dominio.com --local|--remote");
  process.exit(1);
}
// --remote usa la base del entorno production de wrangler.toml (o --env preview).
const extra = val("--persist-to") ? ["--persist-to", val("--persist-to")] : destino === "--remote" ? ["--env", val("--env") || "production"] : [];
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const d1 = (sql) => JSON.parse(execFileSync(npx, ["wrangler", "d1", "execute", "DB", destino, ...extra, "--json", "--command", sql], { encoding: "utf8" }))[0].results;
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

execFileSync(npx, ["wrangler", "d1", "migrations", "apply", "DB", destino, ...extra], { stdio: "inherit" });

const contar = () => d1("SELECT COUNT(*) AS n FROM docs")[0].n;
const sinDuenio = () => d1("SELECT COUNT(*) AS n FROM docs WHERE path NOT LIKE 'u/%' AND path NOT LIKE 'publicos/%'")[0].n;
const antes = contar(), pendientes = sinDuenio();
console.log(`Documentos: ${antes} · sin dueño: ${pendientes}`);

let id = "local";
if (!cuentaLocal) {
  d1(`INSERT OR IGNORE INTO usuarios (id, email, creado) VALUES (${q(randomUUID())}, ${q(email)}, ${Date.now()})`);
  id = d1(`SELECT id FROM usuarios WHERE email = ${q(email)}`)[0].id;
}
const pre = q("u/" + id + "/");
d1(`UPDATE docs SET path = ${pre} || path, parent = ${pre} || parent WHERE path NOT LIKE 'u/%' AND path NOT LIKE 'publicos/%'`);
d1(`UPDATE docs SET data = json_set(data, '$."dueño"', ${q(id)}) WHERE parent = 'publicos' AND json_extract(data, '$."dueño"') IS NULL`);

const despues = contar();
console.log(`Cuenta ${email || "local"} → id ${id}`);
console.log(`Documentos después: ${despues} · sin dueño: ${sinDuenio()} · movidos a u/${id}/: ${pendientes}`);
if (despues !== antes) { console.error("✗ Cambió la cantidad de documentos: revisá antes de seguir."); process.exit(1); }
console.log("✓ Migración lista");
