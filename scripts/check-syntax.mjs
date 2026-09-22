// Verifica la sintaxis de los módulos de src/ y de la API (node --check).
// Uso: npm run check
import { readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const walk = (d) => readdirSync(d).flatMap((f) => {
  const p = join(d, f);
  return statSync(p).isDirectory() ? walk(p) : p.endsWith(".js") ? [p] : [];
});
const files = [...walk("src"), ...walk("functions")];
for (const f of files) execFileSync(process.execPath, ["--check", f], { stdio: "inherit" });
console.log(`Sintaxis OK: ${files.length} archivos (src/ y functions/)`);
