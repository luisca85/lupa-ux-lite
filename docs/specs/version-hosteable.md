# Feature: Versión hosteable (self-hosted)

Objetivo: que Lupa UX pueda subirse a un hosting estático (Netlify, Cloudflare
Pages, GitHub Pages) o abrirse local.

## Criterios de aceptación
- `dist/index.html` (salida de `npm run build`) abre con doble clic sin errores de consola propios (las fuentes de
  Google pueden fallar sin red; hay fallback de tipografía y no bloquea).
- Los datos persisten entre recargas usando IndexedDB (base `lupaux`).
- Crear estudio, hallazgo con imagen anotada, flujo y journey: todo se guarda y
  sobrevive a recargar.
- Las descargas (texto plano, página para compartir) bajan como archivo real del
  navegador, sin depender de la capacidad `downloads` de Claude.
- El build es un único HTML autónomo (JS y CSS inline) que sirve igual para
  Cloudflare Pages, cualquier hosting estático o doble clic.

## Cómo está implementado
- `makeIDBAdapter()`: adaptador IndexedDB con la API tipo Firestore que espera la app.
- `initBackend()` (`src/data/backend.js`): API si existe, si no `makeIDBAdapter()`.
- `downloadFile()` (`src/ui/descargas.js`): descarga nativa (Blob + `<a download>`).
- Documento HTML completo: head con charset, viewport, reset y links de fuentes.

## No tocar
- El backend es opcional y aditivo (ver `specs/backend-d1.md`): sin API, la app
  sigue funcionando con IndexedDB.
- No cambiar la API de `DB`: es el contrato que comparten los dos entornos.
- No separar el build en varios archivos: el doble clic y la página autónoma
  dependen de que salga un solo HTML.

## Limitaciones conocidas
- En modo IndexedDB no hay sync entre dispositivos; borrar datos del sitio borra
  los estudios. Para respaldar o migrar al servidor: Exportar / Importar datos.
- La página autónoma para compartir sigue siendo una foto del momento: hay que
  regenerarla tras editar el diagnóstico.
