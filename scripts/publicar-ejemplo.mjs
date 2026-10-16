// Estudio de ejemplo (spec cta, fase 3): copia un estudio de la cuenta del administrador a
// ejemplo/estudios/ejemplo-{id}/…, donde todas las cuentas lo ven de solo lectura. Para
// cambiar el ejemplo, editá tu estudio en la app y volvé a correr esto: reemplaza la copia.
// Con --borrar, lo quita.
//
// Uso:
//   node scripts/publicar-ejemplo.mjs --email vos@dominio.com --estudio <id> --local|--remote
//   node scripts/publicar-ejemplo.mjs --estudio <id> --borrar --local|--remote
// En desarrollo (AUTH_MODE="none") la cuenta es "local": usá --cuenta-local en vez de --email.
// Opcional: --persist-to <carpeta> (otra base local).
// El id del estudio es el que aparece en "lupa:active" (localStorage) o en el respaldo JSON.
import { execFileSync } from "node:child_process";

const args = process.argv.slice(2);
const val = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const destino = args.includes("--remote") ? "--remote" : args.includes("--local") ? "--local" : null;
const estudio = String(val("--estudio") || "");
const borrar = args.includes("--borrar"), cuentaLocal = args.includes("--cuenta-local");
const email = String(val("--email") || "").trim().toLowerCase();
if (!destino || !/^[A-Za-z0-9_.:-]{1,120}$/.test(estudio) || (!borrar && !cuentaLocal && !email)) {
  console.error("Uso: node scripts/publicar-ejemplo.mjs --email vos@dominio.com --estudio <id> --local|--remote [--borrar]");
  process.exit(1);
}
// --remote usa la base del entorno production de wrangler.toml (o --env preview).
const extra = val("--persist-to") ? ["--persist-to", val("--persist-to")] : destino === "--remote" ? ["--env", val("--env") || "production"] : [];
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const d1 = (sql) => JSON.parse(execFileSync(npx, ["wrangler", "d1", "execute", "DB", destino, ...extra, "--json", "--command", sql], { encoding: "utf8" }))[0].results;
const q = (s) => "'" + String(s).replace(/'/g, "''") + "'";

const dst = "ejemplo/estudios/ejemplo-" + estudio.replace(/^ejemplo-/, "");
const rango = (raiz) => `(path = ${q(raiz)} OR (path >= ${q(raiz + "/")} AND path < ${q(raiz + "0")}))`; // raiz y todo lo de adentro

d1(`DELETE FROM docs WHERE ${rango(dst)}`);
if (borrar) { console.log(`✓ Ejemplo ${dst} borrado`); process.exit(0); }

let id = "local";
if (!cuentaLocal) {
  const u = d1(`SELECT id FROM usuarios WHERE email = ${q(email)}`)[0];
  if (!u) { console.error(`✗ No hay una cuenta con el email ${email}`); process.exit(1); }
  id = u.id;
}
const src = `u/${id}/estudios/${estudio}`;
const n = d1(`SELECT COUNT(*) AS n FROM docs WHERE ${rango(src)}`)[0].n;
if (!n) { console.error(`✗ No existe el estudio ${src}`); process.exit(1); }
const ahora = Date.now();
// El estudio: sin su link público (el ejemplo no se comparte).
d1(`INSERT INTO docs (path, parent, data, updated_at) SELECT ${q(dst)}, 'ejemplo/estudios', json_remove(data, '$.reporte.publico'), ${ahora} FROM docs WHERE path = ${q(src)}`);
// Pantallas, imágenes y hallazgos, con la misma estructura debajo.
d1(`INSERT INTO docs (path, parent, data, updated_at) SELECT ${q(dst)} || substr(path, ${src.length + 1}), ${q(dst)} || substr(parent, ${src.length + 1}), data, ${ahora} FROM docs WHERE path >= ${q(src + "/")} AND path < ${q(src + "0")}`);
const copiados = d1(`SELECT COUNT(*) AS n FROM docs WHERE ${rango(dst)}`)[0].n;
console.log(`${copiados === n ? "✓" : "✗"} Ejemplo publicado: ${copiados} de ${n} documentos en ${dst}`);
process.exit(copiados === n ? 0 : 1);
