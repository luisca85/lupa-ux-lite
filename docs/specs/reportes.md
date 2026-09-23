# Feature: Reportes  ·  id: rpt

Historia de usuario: Como consultor/a UX, quiero convertir el diagnóstico en un
reporte navegable, un texto plano y una página autónoma, para entregarlo al cliente
sin que necesite cuenta.

Objetivo: convertir el diagnóstico cargado en tres salidas: un reporte navegable
para el cliente, un export de texto plano, y una página HTML autónoma para compartir.

## Criterios de aceptación
- Dada la pestaña Reportes, cuando se edita un campo (título, resumen, objetivos,
  alcance, métricas, diagnóstico, muestra inicial) o un toggle de sección, entonces
  se guarda solo (~600 ms) y sobrevive a recargar.
- Dados los toggles de "Reporte para el cliente" (hallazgos, flujos, journeys,
  protopersonas, diagnóstico, propuestas, contacto), cuando se abre la vista previa o
  la página autónoma, entonces solo aparecen las secciones marcadas; flujos,
  journeys, protopersonas, diagnóstico y propuestas además se ocultan si no tienen
  contenido.
- Dado un estudio, cuando se usa "Vista previa del reporte", entonces se abre el
  reporte navegable en modo solo lectura, en tema claro, con hallazgos, flujos,
  journeys, protopersonas, diagnóstico, propuestas y contacto, y nunca notas internas.
- Dado un estudio, cuando se usa "Exportar en texto plano", entonces se abre un modal
  con todo el estudio como texto, con "Copiar todo" (con alternativa si el
  portapapeles falla) y "Descargar .txt" (`<nombre del estudio>.txt`).
- Dado un estudio, cuando se usa "Generar página para compartir", entonces se
  descarga `<nombre>-reporte.html`, un HTML autónomo con datos, estilos e imágenes
  (con anotaciones compuestas) embebidos, que abre cualquiera sin cuenta ni red.
- Dada una sección desmarcada, cuando se genera la página para compartir, entonces
  sus datos NO viajan en el HTML (no solo se ocultan). (Hoy NO implementado: se
  embeben todas las secciones.)
- Dada la app, cuando se abre con `#reporte/{id}`, entonces NO abre un reporte: la
  ruta y `reportLink()` se eliminan; la única forma de compartir es la página
  autónoma. (Hoy NO implementado: la ruta sigue activa.)

## Alcance
Pestaña Reportes (configuración, protopersonas, diagnóstico, muestra, marca, lista de
propuestas), vista previa del reporte, export de texto plano, página autónoma, la
limpieza de la ruta `#reporte/{id}` y el filtrado de datos de secciones desmarcadas.

## Fuera de alcance / No tocar
- Fuera de alcance: el contenido de las propuestas (ver `propuestas.md`); la pestaña
  "Protopersonas" del estudio (sigue en "Próximamente").
- No reintroducir el reporte/preview PDF (se removió a propósito).
- La lógica de render del reporte está duplicada entre online (`crPropuestas`,
  `crDiagnostico`, etc., en `src/reportes/cliente.js`) y autónomo (`SR_boot` en
  `src/share/boot.js`: `secProp`, `secDiag`). Cambiar una
  obliga a cambiar la otra.
- `boot.js` se incrusta como TEXTO: no puede importar nada.
- `ensureReporte` completa campos faltantes y migra datos viejos (reemplaza el
  seed viejo de 2 propuestas por las 3 actuales). No quitar esas migraciones.

## Dependencias
- `store` (estudios, hallazgos, imágenes), `flowStore`, `brandStore` (`marca/perfil`).
- Catálogo (`heurById`, `sesgoById`), journeys (`jrNormalizePaso`, `EMO`, …),
  propuestas (`propuestaCardHTML`, helpers de precio).
- `compositeDataUrl` (`ui/anotaciones.js`) para las imágenes anotadas del autónomo.
- `downloadFile` (`ui/descargas.js`) para .txt y .html.

## Estados (UI)
- Vacío: listas del panel sin ítems; en el reporte, las secciones sin contenido no
  aparecen en el menú.
- Carga: "Cargando datos del estudio..." al entrar a la pestaña; pantalla de carga al
  abrir la vista previa; "Generando..." y "Recolectando datos e imágenes..." al
  generar la página.
- Error: "No encontramos este reporte o no está disponible." en la vista previa;
  "No se pudo generar: …" al generar la página; "No se pudo descargar…" en el .txt.
  Las imágenes que no cargan se omiten sin aviso.

## Diseño
N/A

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan.
- Propio: todo cambio de contenido se verifica en las tres salidas (vista previa,
  página autónoma y texto plano); para el filtrado, abrir el HTML generado y buscar
  en el código fuente un dato de una sección desmarcada.

## Contenido que se carga en la pestaña Reportes
- Título del informe, resumen ejecutivo, objetivos, alcance, métricas y metas
  (una línea por ítem), diagnóstico (intro, hallazgos clave, recomendaciones),
  aviso de "muestra inicial", propuestas (ver `propuestas.md`).
- Protopersonas: nombre, edad, título/arquetipo, ubicación, ocupación, bio,
  objetivos, necesidades, dolores. Viven en `reporte.protopersonas`; la pestaña
  "Protopersonas" del estudio todavía es un marcador de "Próximamente".
- Marca del autor (global, `marca/perfil`): wordmark, logo, imagen de cabecera,
  nombre, rol, sitio, email, teléfono, color, servicio (nombre, descripción, URL).

## Dirección visual
Barra de acciones arriba; bloques de configuración en columnas (`.rpt-cols2`).
El reporte del cliente usa las clases `.cr-*` (mismo look en online y autónomo).

## Dónde vive
`src/reportes/panel.js` (pestaña y modales), `cliente.js` (reporte online),
`comun.js` (`ensureReporte`, `saveReporte`, `marcaActual`), `texto-plano.js`,
`src/share/compartir.js` (`collectShareData`, `generateSharePage`) y
`src/share/boot.js` (`SR_boot`). Datos en `estudios/{id}.reporte`.

## A CONFIRMAR
- Con "Flujos" marcado y "Hallazgos" desmarcado: ¿la página autónoma embebe los
  hallazgos que marcan las interacciones del flujo, o los flujos se muestran sin
  hallazgos?

## Conocido
- La página autónoma y el reporte online difieren en colores de severidad
  (`RSEV` vs `--sev*`) y la autónoma no tiene filtros de hallazgos.
- La sección Hallazgos aparece en el menú aunque el estudio no tenga hallazgos (las
  demás se ocultan si están vacías).
