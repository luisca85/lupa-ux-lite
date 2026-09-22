# Feature: Versión hosteable (self-hosted)

Objetivo: que Lupa UX pueda subirse a un hosting estático (Netlify, Cloudflare
Pages, GitHub Pages) o abrirse local, funcionando sin el runtime de claude.ai.

## Criterios de aceptación
- Abre como archivo `index.html` sin errores de consola propios (las fuentes de
  Google pueden fallar sin red; hay fallback de tipografía y no bloquea).
- Los datos persisten entre recargas usando IndexedDB (base `lupaux`).
- Crear estudio, hallazgo con imagen anotada, flujo y journey: todo se guarda y
  sobrevive a recargar.
- Las descargas (texto plano, página para compartir) bajan como archivo real del
  navegador, sin depender de la capacidad `downloads` de Claude.
- La misma base de código sigue funcionando como artifact en claude.ai sin cambios
  de comportamiento (los fallbacks solo actúan cuando no hay `window.claude`).

## Cómo está implementado
- `makeIDBAdapter()`: adaptador IndexedDB con la API tipo Firestore que espera la app.
- `init()`: si no hay `window.claude`, hace `DB=makeIDBAdapter(); USE_DB=true`.
- `getDownloads()`: descarga nativa (Blob + `<a download>`) cuando no hay runtime.
- Documento HTML completo: head con charset, viewport, reset y links de fuentes.

## No tocar
- El backend es opcional y aditivo (ver `specs/backend-d1.md`): sin API, la app
  sigue funcionando con IndexedDB.
- No cambiar la API de `DB`: es el contrato que comparten los dos entornos.
- No romper el camino artifact: los fallbacks son aditivos, nunca reemplazan el
  runtime de Claude cuando existe.

## Limitaciones conocidas
- En modo IndexedDB no hay sync entre dispositivos; borrar datos del sitio borra
  los estudios. Para respaldar o migrar al servidor: Exportar / Importar datos.
- La página autónoma para compartir sigue siendo una foto del momento: hay que
  regenerarla tras editar el diagnóstico.
