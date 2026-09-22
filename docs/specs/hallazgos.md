# Feature: Hallazgos con evidencia anotada

Objetivo: registrar lo observado en una evaluación heurística (problemas,
oportunidades, observaciones) con evidencia visual anotada, y filtrarlo.

## Criterios de aceptación
- Cada hallazgo tiene: tipo (Problema / Oportunidad / Observación), título
  (obligatorio), pantalla o paso, etiquetas (separadas por coma), severidad Nielsen
  0–4 (opcional; default 3; se puede desmarcar), descripción, recomendación,
  heurísticas y sesgos relacionados (del catálogo).
- Evidencia: varias imágenes por hallazgo, por archivo o pegando del portapapeles.
  Cada imagen se comprime a JPEG (máx. 1280 px de ancho, ~240 KB) y se genera una
  miniatura de 220 px con las anotaciones compuestas encima.
- Anotaciones sobre la imagen: seleccionar/mover, pin numerado con comentario,
  flecha, texto, resaltador y dibujo libre; color y grosor; deshacer y limpiar.
- Lista con métricas (total, por tipo, severidad 3 y 4) y filtros por texto, tipo,
  severidad y heurística.
- Borrar un hallazgo borra sus imágenes y lo desvincula de las interacciones de
  flujos (`cleanFlowMarkers`).
- Un hallazgo creado desde una interacción de flujo guarda `flujoId`,
  `interaccionId` e `interaccionTitulo`.

## Dónde vive
`src/views/hallazgos.js` (lista, `hzModal`, borrado), `src/ui/imagenes.js`
(`processImage`, visor), `src/ui/anotaciones.js` (`mountAnnotator`, composición).
Datos: `estudios/{id}/hallazgos/{hid}` (con `imgs:[{id,thumb,w,h}]`) y la imagen
completa + anotaciones en `.../hallazgos/{hid}/imgs/{imgId}`.

## No tocar
- La miniatura se guarda en el hallazgo y la imagen completa aparte: la lista no
  debe leer las imágenes completas.
- Las anotaciones se guardan como datos (no quemadas en la imagen): la imagen
  base queda limpia para re-editar.
