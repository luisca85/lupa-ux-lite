// Levanta la app con API + D1 local sobre una base LIMPIA (.wrangler/e2e) para los tests.
// Uso: node scripts/e2e-server.mjs <carpeta-de-la-app> <puerto>
import { rmSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";

const dir = process.argv[2] || "public";
const port = process.argv[3] || "8790";
const persist = ".wrangler/e2e";
const wrangler = process.platform === "win32" ? "npx.cmd" : "npx";

rmSync(persist, { recursive: true, force: true });
execFileSync(wrangler, ["wrangler", "d1", "migrations", "apply", "lupaux", "--local", "--persist-to", persist], { stdio: "inherit" });
const child = spawn(wrangler, ["wrangler", "pages", "dev", dir, "--port", port, "--ip", "127.0.0.1", "--persist-to", persist], { stdio: "inherit" });
for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, () => { child.kill(sig); process.exit(0); });
child.on("exit", (code) => process.exit(code ?? 0));
