// Verifica la sintaxis del <script> principal de public/index.html y de la API.
// Uso: npm run check
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const html = readFileSync("public/index.html", "utf8");
const start = html.indexOf("<script>");
const end = html.lastIndexOf("</script>");
if (start < 0 || end < 0) throw new Error("No se encontró el <script> principal");
const dir = mkdtempSync(join(tmpdir(), "lupa-check-"));
const appJs = join(dir, "app.js");
writeFileSync(appJs, html.slice(start + "<script>".length, end));

for (const f of [appJs, "functions/api/[[path]].js"]) {
  execFileSync(process.execPath, ["--check", f], { stdio: "inherit" });
}
console.log("Sintaxis OK: public/index.html y functions/api");
