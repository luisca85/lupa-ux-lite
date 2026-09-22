import { defineConfig } from "@playwright/test";

// Carpeta que se sirve: hoy "public"; con el build de Vite, "dist".
const APP_DIR = process.env.APP_DIR || "public";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  workers: 1,
  reporter: [["list"]],
  use: { viewport: { width: 1280, height: 900 }, acceptDownloads: true },
  projects: [
    { name: "servidor", use: { baseURL: "http://127.0.0.1:8790" } },
    { name: "indexeddb", use: { baseURL: "http://127.0.0.1:8791" } },
  ],
  webServer: [
    { command: `node scripts/e2e-server.mjs ${APP_DIR} 8790`, url: "http://127.0.0.1:8790/api/health", timeout: 120_000, reuseExistingServer: false },
    { command: `node scripts/static-server.mjs ${APP_DIR} 8791`, url: "http://127.0.0.1:8791/", reuseExistingServer: false },
  ],
});
