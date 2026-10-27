import { defineConfig } from "@playwright/test";

// Carpeta que se sirve: el build de Vite (npm run test:e2e compila antes).
const APP_DIR = process.env.APP_DIR || "dist";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  workers: 1,
  reporter: [["list"]],
  use: { viewport: { width: 1280, height: 900 }, acceptDownloads: true },
  projects: [
    { name: "servidor", use: { baseURL: "http://127.0.0.1:8790" }, testIgnore: /(login|privada)\.spec/ },
    { name: "indexeddb", use: { baseURL: "http://127.0.0.1:8791" }, testIgnore: /(login|privada)\.spec/ },
    // Cuentas (spec cta): login con código por email; el código viene en la respuesta.
    { name: "cuentas", use: { baseURL: "http://127.0.0.1:8792" }, testMatch: /login\.spec/ },
    // Beta privada: solo crean cuenta los emails autorizados (SOLO_AUTORIZADOS="1").
    { name: "privada", use: { baseURL: "http://127.0.0.1:8793" }, testMatch: /privada\.spec/ },
  ],
  webServer: [
    { command: `node scripts/e2e-server.mjs ${APP_DIR} 8790`, url: "http://127.0.0.1:8790/api/health", timeout: 120_000, reuseExistingServer: false },
    { command: `node scripts/static-server.mjs ${APP_DIR} 8791`, url: "http://127.0.0.1:8791/", reuseExistingServer: false },
    { command: `node scripts/e2e-server.mjs ${APP_DIR} 8792 cuentas`, url: "http://127.0.0.1:8792/", timeout: 120_000, reuseExistingServer: false },
    { command: `node scripts/e2e-server.mjs ${APP_DIR} 8793 privada`, url: "http://127.0.0.1:8793/", timeout: 120_000, reuseExistingServer: false },
  ],
});
