# Constitución de Lupa UX

Propósito: herramienta  de diagnóstico y evaluación heurística de UX.
Permite cargar estudios, registrar hallazgos con evidencia anotada, armar user
flows y user journeys, protopersonas, métricas, y generar un reporte navegable
para el cliente (online y como página HTML autónoma para compartir).

## Principios
- Local-first con backend opcional: sin API, los datos viven en el navegador
  (IndexedDB). Hosteado en Cloudflare, en D1 detrás de Cloudflare Access.
- Sin dependencias externas en runtime: nada de CDNs para funcionar (solo fuentes
  de Google con fallback). La app tiene que abrir y operar offline.
- Persistencia real: runtime de Claude (`db`) en claude.ai; API + D1 hosteado;
  IndexedDB sin API.
- Datos del cliente: el reporte para el cliente muestra SOLO contenido pensado
  para él. Nunca notas internas.
- Responsivo: tiene que funcionar en pantallas chicas.

## Comportamiento del agente
- Planificar antes de codear. Cambios acotados, uno por vez.
- No inventar datos, precios, ni endpoints. Ante duda, preguntar o marcar A CONFIRMAR.
- Mantener la doble capa de persistencia: cualquier cambio de datos pasa por la
  API tipo Firestore (`DB.collection().get()`, `DB.doc().get()/set()/delete()`),
  nunca por acceso directo a IndexedDB o localStorage desde la lógica de features.
- Verificar sintaxis (`npm run check`), correr `npm run smoke` con `npm run dev`
  levantado, y el test de regresión antes de publicar.
- Listar los archivos modificados al terminar.

## Zonas sensibles (tocar con cuidado)
- La capa `store` / `flowStore` / `brandStore` y los adaptadores `makeIDBAdapter`
  y `makeHTTPAdapter`, y la API en `functions/api`. Toda la validación de acceso
  vive en `authorize()`: no agregar rutas que la salteen.
  Un cambio mal hecho ahí corrompe o pierde datos del usuario.
- `SR_boot` y `generateSharePage`: generan la página HTML autónoma. La lógica de
  render se DUPLICA respecto del reporte online (crPropuestas, secProp, etc.);
  si cambia una, hay que cambiar la otra.
- Descargas: `getDownloads()` decide entre runtime de Claude y descarga nativa.

## Definición de hecho
- `npm run check` pasa y `npm run smoke` da "Todo OK".
- Las tres acciones críticas siguen funcionando (ver test de regresión abajo).
- El reporte online, la página autónoma y el export de texto plano reflejan el cambio.

## Test de regresión (probar a mano)
1. Crear un estudio, agregar un hallazgo con imagen y anotación, recargar: persiste.
2. Abrir "Vista previa del reporte" y navegar hallazgos / flujos / journeys.
3. "Generar página para compartir" produce un HTML que abre solo, sin cuenta.
4. Correr 1–3 en modo `server` (`npm run dev`) y en modo `idb` (abrir
   `public/index.html` directo). El badge indica el modo.
