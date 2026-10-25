// Levanta la app con API + D1 local sobre una base LIMPIA (.wrangler/e2e) para los tests.
// Uso: node scripts/e2e-server.mjs <carpeta-de-la-app> <puerto> [cuentas]
// Con "cuentas": AUTH_MODE="cuentas" y el código de entrada en la respuesta (sin email).
import { rmSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";

const dir = process.argv[2] || "public";
const port = process.argv[3] || "8790";
const cuentas = process.argv[4] === "cuentas";
const persist = cuentas ? ".wrangler/e2e-cuentas" : ".wrangler/e2e";
const vars = cuentas
  ? ["--binding", "AUTH_MODE=cuentas", "--binding", "AUTH_CODIGO_EN_RESPUESTA=1", "--binding", "ADMIN_EMAILS=admin@lupa.test", "--binding", "MAX_CUENTAS=8", "--binding", "MAX_MB_CUENTA=3"]
  : [];
const wrangler = process.platform === "win32" ? "npx.cmd" : "npx";

rmSync(persist, { recursive: true, force: true });
execFileSync(wrangler, ["wrangler", "d1", "migrations", "apply", "lupaux", "--local", "--persist-to", persist], { stdio: "inherit" });
// Con cuentas: un estudio de ejemplo mínimo (spec cta), como el que deja publicar-ejemplo.mjs.
if (cuentas) {
  const ej = "ejemplo/estudios/ejemplo-demo", t = Date.now();
  const fila = (path, parent, data) => `('${path}', '${parent}', '${JSON.stringify(data).replace(/'/g, "''")}', ${t})`;
  const sql = "INSERT INTO docs (path, parent, data, updated_at) VALUES " + [
    fila(ej, "ejemplo/estudios", { nombre: "Ejemplo: app de turnos", cliente: "Clínica ficticia", plataforma: "Web", estado: "Terminado", createdAt: 1, modelo: 2 }),
    fila(ej + "/pantallas/p1", ej + "/pantallas", { nombre: "Inicio", origen: "url", url: "https://turnos.ejemplo", orden: 0 }),
    fila(ej + "/hallazgos/h1", ej + "/hallazgos", { titulo: "El botón de reservar no se ve", pantallaId: "p1", pin: { x: 0.5, y: 0.4 }, severidad: 3, modelo: 2 }),
  ].join(", ");
  execFileSync(wrangler, ["wrangler", "d1", "execute", "lupaux", "--local", "--persist-to", persist, "--command", sql], { stdio: "inherit" });
}
const child = spawn(wrangler, ["wrangler", "pages", "dev", dir, "--port", port, "--ip", "127.0.0.1", "--persist-to", persist, ...vars], { stdio: "inherit" });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { child.kill(sig); process.exit(0); });
child.on("exit", (code) => process.exit(code ?? 0));
