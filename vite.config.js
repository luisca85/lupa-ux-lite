import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// El build sale como UN solo HTML (JS y CSS inline): se puede abrir con doble
// clic (modo IndexedDB) y lo publica Cloudflare Pages desde dist/.
export default defineConfig({
  plugins: [viteSingleFile()],
  publicDir: false,
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Sin minificar: la página para compartir serializa SR_boot con toString()
    // y el código queda legible para depurar. El peso extra es chico.
    minify: false,
  },
  server: {
    port: 5173,
    // En desarrollo la API la sirve wrangler (npm run dev la levanta en :8788).
    proxy: { "/api": "http://127.0.0.1:8788" },
  },
});
