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
- Persistencia real: API + D1 hosteado; IndexedDB sin API.
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
  levantado, y `npm run test:e2e` antes de publicar.
- Módulos ES en `src/` (uno por área). Sin variables globales: lo que otro módulo
  necesita se exporta. Una variable exportada solo se reasigna en su propio módulo.
- Listar los archivos modificados al terminar.

## Zonas sensibles (tocar con cuidado)
- La capa `store` / `flowStore` / `brandStore` y los adaptadores `makeIDBAdapter`
  y `makeHTTPAdapter`, y la API en `functions/api`. Toda la validación de acceso
  vive en `authorize()`: no agregar rutas que la salteen.
  Un cambio mal hecho ahí corrompe o pierde datos del usuario.
- `src/share/boot.js` (`SR_boot`) y `generateSharePage`: generan la página HTML
  autónoma. `boot.js` se incrusta como TEXTO: no puede importar nada ni usar
  nada de fuera de la función. La lógica de render se DUPLICA respecto del
  reporte online (`reportes/cliente.js`: crPropuestas, etc. vs secProp en boot.js);
  si cambia una, hay que cambiar la otra.
- Migraciones silenciosas de datos viejos: `ensureReporte` (reportes/comun.js) y
  `jrNormalizePaso` (journey). Datos reales ya guardados dependen de ellas: no
  quitarlas; extenderlas al agregar campos.
- Relaciones entre entidades guardadas en dos lados (hallazgo ↔ interacción de
  flujo). Al borrar o renombrar, actualizar ambos (`cleanFlowMarkers`, renombre de
  interacción). Ids del catálogo base (`nn1`…`nn10`): no renumerar.

## Definición de hecho
- `npm run check` pasa, `npm run smoke` da "Todo OK" y `npm run test:e2e` pasa.
- Las tres acciones críticas siguen funcionando (ver test de regresión abajo).
- El reporte online, la página autónoma y el export de texto plano reflejan el cambio.

## Test de regresión (automatizado en `tests/e2e`, `npm run test:e2e`)
1. Crear un estudio, agregar un hallazgo con imagen y anotación, recargar: persiste.
2. Abrir "Vista previa del reporte" y navegar hallazgos / flujos / journeys.
3. "Generar página para compartir" produce un HTML que abre solo, sin cuenta.
4. Correr 1–3 en modo `server` y en modo `idb` (hosting estático sin API).
   El badge indica el modo. El test e2e cubre ambos.
