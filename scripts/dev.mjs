// Desarrollo: API + D1 local con wrangler (:8788) y frontend con Vite (:5173, recarga en caliente).
// Abrí http://localhost:5173
import { existsSync } from "node:fs";
import { execFileSync, spawn } from "node:child_process";

const npx = process.platform === "win32" ? "npx.cmd" : "npx";
if (!existsSync("dist/index.html")) execFileSync(npx, ["vite", "build"], { stdio: "inherit" });

const procs = [
  spawn(npx, ["wrangler", "pages", "dev", "dist", "--port", "8788", "--ip", "127.0.0.1"], { stdio: "inherit" }),
  spawn(npx, ["vite"], { stdio: "inherit" }),
];
const stop = () => { procs.forEach((p) => p.kill("SIGTERM")); process.exit(0); };
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
procs.forEach((p) => p.on("exit", stop));
