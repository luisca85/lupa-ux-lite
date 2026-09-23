# Feature: Hallazgos con evidencia anotada  ·  id: hz

Historia de usuario: Como consultor/a UX, quiero registrar cada hallazgo con
evidencia anotada, para fundamentar el diagnóstico ante el cliente.

Objetivo: registrar lo observado en una evaluación heurística (problemas,
oportunidades, observaciones) con evidencia visual anotada, y filtrarlo.

## Criterios de aceptación
- Dado el modal "Nuevo hallazgo", cuando se guarda con título, entonces queda con
  tipo (Problema / Oportunidad / Observación, default Problema), pantalla o paso,
  etiquetas (separadas por coma), severidad Nielsen 0–4 (default 3; tocar la marcada
  la desmarca y queda sin severidad), descripción, recomendación, y heurísticas y
  sesgos del catálogo. Sin título no se guarda y el foco vuelve al título.
- Dado el modal, cuando se agrega una imagen por archivo, arrastrándola o pegando del
  portapapeles, entonces se comprime a JPEG (máx. 1280 px de ancho, ~240 KB) y se
  genera una miniatura de 220 px.
- Dado un hallazgo con 8 imágenes, cuando se intenta agregar otra, entonces avisa
  "Máximo 8 imágenes por hallazgo" y no la agrega.
- Dada una imagen abierta, cuando se anota, entonces se puede seleccionar/mover, poner
  pin numerado con comentario, flecha, texto, resaltador y dibujo libre, elegir color
  y grosor, deshacer y limpiar; la miniatura se regenera con las anotaciones encima.
- Dado un hallazgo guardado con anotaciones, cuando se vuelve a abrir, entonces la
  imagen base está limpia y las anotaciones siguen siendo editables.
- Dado un hallazgo, cuando se quita una imagen y se guarda, entonces se borra su
  imagen completa.
- Dada la lista, cuando se abre, entonces muestra métricas (total, problemas,
  oportunidades, observaciones y problemas con Sev 3 y Sev 4) y los hallazgos
  ordenados por tipo y, dentro de cada tipo, por severidad descendente.
- Dada la lista, cuando se busca texto o se filtra por tipo, severidad o heurística,
  entonces solo quedan los que coinciden (el texto busca en título, descripción,
  pantalla y etiquetas).
- Dada una miniatura en la lista, cuando se hace clic, entonces se abre el visor de
  imágenes del hallazgo.
- Dado un hallazgo, cuando se elimina, entonces se borran sus imágenes y sus
  marcadores en las interacciones de flujos (`cleanFlowMarkers`).
- Dado un hallazgo creado desde una interacción de flujo, cuando se guarda o se
  edita, entonces conserva `flujoId`, `interaccionId` e `interaccionTitulo` y la
  lista muestra el chip de la interacción.

## Alcance
Pestaña Hallazgos del estudio: métricas, filtros, lista, alta/edición/borrado, panel
de evidencia con varias imágenes, anotador y visor.

## Fuera de alcance / No tocar
- La relación con flujos se crea desde el flujo (ver `flujos.md`); con journeys,
  desde el paso (ver `journeys.md`).
- La miniatura se guarda en el hallazgo y la imagen completa aparte: la lista no
  debe leer las imágenes completas.
- Las anotaciones se guardan como datos (no quemadas en la imagen): la imagen
  base queda limpia para re-editar.

## Dependencias
- `store` (`listHallazgos`, `saveHallazgo`, `delHallazgo`, `getImg`, `putFull`,
  `delFull`) sobre la capa `DB`.
- Catálogo (`allHeur`, `allSesgos`, `heurById`, `sesgoById`).
- `ui/imagenes.js` (`processImage`, visor), `ui/anotaciones.js` (`mountAnnotator`,
  `compositeThumb`).
- `flowStore` para limpiar marcadores al borrar.

## Estados (UI)
- Vacío: estudio sin hallazgos ("Sin hallazgos todavía" + "Nuevo hallazgo"); filtros
  sin resultados ("Ningún hallazgo coincide con los filtros."); hallazgo sin imágenes
  ("Sin imágenes" y zona para pegar/arrastrar).
- Carga: "Cargando imagen..." mientras baja la imagen completa en el modal.
- Error: toast "No se pudo procesar la imagen"; "No se pudo abrir la imagen." en el
  panel de evidencia; en modo `server`, toast global con el error del servidor (por
  ejemplo, 413 si la imagen supera el límite).

## Diseño
N/A

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan.
- Propio: si el cambio toca imágenes o anotaciones, verificar que la miniatura, el
  reporte online y la página compartida muestren las anotaciones, y que reabrir el
  hallazgo las deje editables.

## Dónde vive
`src/views/hallazgos.js` (lista, `hzModal`, borrado), `src/ui/imagenes.js`
(`processImage`, visor), `src/ui/anotaciones.js` (`mountAnnotator`, composición).
Datos: `estudios/{id}/hallazgos/{hid}` (con `imgs:[{id,thumb,w,h}]`) y la imagen
completa + anotaciones en `.../hallazgos/{hid}/imgs/{imgId}`.

## Conocido
- Borrar un hallazgo no lo quita de los pasos de journey (`paso.hallazgos:[ids]`):
  el contador del paso lo sigue contando aunque no se muestre.
- Las métricas de Sev 3 y Sev 4 cuentan solo problemas, no oportunidades ni observaciones.
- Si guardar falla (por ejemplo, 413 en modo `server`), aparece el toast pero el botón
  "Guardar" del modal queda deshabilitado (`openModal` no captura el error): hay que
  cerrar el modal y se pierden los cambios.
