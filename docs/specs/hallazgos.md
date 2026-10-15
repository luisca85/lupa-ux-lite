# Feature: Hallazgos con evidencia anotada  ·  id: hz

Historia de usuario: Como consultor/a UX, quiero registrar cada hallazgo con
evidencia anotada, para fundamentar el diagnóstico ante el cliente.

Objetivo: registrar lo observado en una evaluación heurística (problemas,
oportunidades, observaciones) con evidencia visual anotada, y revisarlo y editarlo desde
un panel con el catálogo a mano.

## Criterios de aceptación

### Sección Hallazgos: área de trabajo + panel
- Dada la sección Hallazgos, cuando se abre, entonces se divide en un área de trabajo a la
  izquierda y un panel de 480 px a la derecha (borde izquierdo `--line-input`). Juntos
  ocupan el 100% del alto disponible: la página mide lo que la ventana y el panel y el
  área de trabajo hacen scroll por dentro. Por debajo de 1000 px el panel pasa abajo y la
  página vuelve a hacer scroll normal.
- Dada el área de trabajo, cuando se ve, entonces arriba a la derecha está el botón azul
  "Agregar hallazgo" (abre la página de alta) y debajo el estado vacío "Este estudio
  todavía no tiene pantallas", con el texto guía y "Subir imagen", que también abre la
  página de alta.
- Dado el panel, cuando se ve, entonces muestra "Hallazgos" con la cantidad del estudio
  ("18 en el estudio") y arriba a la derecha el botón "Catálogo →".
- Dado el panel, cuando hay hallazgos, entonces muestra chips de filtro por tipo
  (Todas, Problemas, Oportunidades, Observaciones; el activo en `--sel`) y la lista: cada
  hallazgo con su número en un círculo, el título y la línea "Tipo · Sev. N · heurística".
  La lista tiene un alto máximo (`min(330px, 38vh)`) y scroll propio.
- Dado un hallazgo de la lista, cuando se lo toca, entonces queda seleccionado (borde y
  número en `--sel`) y debajo aparece "Editar hallazgo N" con título, descripción,
  severidad 0–4 (escala de botones; tocar la marcada la desmarca), tipo, pantalla y
  "Entradas del catálogo" (heurística principal). Al abrir la sección queda seleccionado
  el primero de la lista filtrada.
- Dada la edición rápida, cuando se toca "Guardar cambios", entonces se guarda el
  hallazgo conservando el resto de sus datos (imágenes, anotaciones, sesgos, etiquetas,
  relación con flujos), aparece "Hallazgo actualizado" y la lista se refresca. Sin título
  no se guarda. "Cancelar" descarta los cambios y "Más campos" abre el editor completo.
- Dado el panel, cuando se toca "Catálogo →", entonces el catálogo reemplaza el contenido
  del panel: botón de flecha para volver, "Catálogo", y chips Heurísticas / Sesgos y
  patrones con la lista de cada uno (nombre, descripción y origen). La flecha vuelve a la
  lista de hallazgos en el mismo panel.
- Dado un estudio sin hallazgos, cuando se abre la sección, entonces el panel muestra
  "Sin hallazgos todavía" / "Cuando agregues una pantalla, tus hallazgos aparecerán acá.".

### Alta de hallazgo como página
- Dado "Nuevo hallazgo" o "Agregar hallazgo" (sección Hallazgos o Resumen), cuando se
  toca, entonces el alta se abre como página dentro del área de trabajo, no como modal:
  "‹ Hallazgos" para volver, título "Nuevo hallazgo", el formulario en una tarjeta (datos
  a la izquierda, evidencia a la derecha, fija al hacer scroll) y una barra fija abajo con
  "Cancelar" y "Guardar hallazgo".
- Dada la página de alta, cuando se guarda, entonces se vuelve a la sección Hallazgos con
  el nuevo hallazgo. Cancelar, "‹ Hallazgos" o ir a otra sección la cierran sin guardar.
- Editar un hallazgo existente ("Más campos", Resumen) y crearlo desde un flujo o un
  journey siguen como modal, sobre el editor del diagrama.

### Editor (modal y página)
- Dado el editor de hallazgo, cuando se guarda con título, entonces queda con
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
- Dado el modal con datos cargados, cuando guardar falla (por ejemplo, 413 en modo
  `server`), entonces aparece un aviso con el error, el modal sigue abierto con lo
  cargado y "Guardar" se puede volver a usar (vale para todo `openModal`).
- Dado un hallazgo, cuando se elimina, entonces se borran sus imágenes y sus
  marcadores en las interacciones de flujos (`cleanFlowMarkers`).
- Dado un hallazgo creado desde una interacción de flujo, cuando se guarda o se
  edita, entonces conserva `flujoId`, `interaccionId` e `interaccionTitulo` y la
  lista muestra el chip de la interacción.

## Alcance
Sección Hallazgos del estudio: área de trabajo, panel derecho (lista, filtros por tipo,
edición rápida, catálogo), página de alta, editor modal, panel de evidencia con varias
imágenes y anotador.

## Fuera de alcance / No tocar
- Fuera de alcance: "pantallas" del estudio con pines sobre la imagen (Figma, vistas A, B
  y C de Hallazgos): requiere un modelo de datos nuevo y va en una exploración aparte.
  Hasta entonces el área de trabajo muestra el estado vacío. Categorías de hallazgo
  (Interfaz, Comportamiento, Investigación): el dato no existe; el panel filtra por tipo.
  Las métricas, la búsqueda y los filtros por severidad o heurística de la lista anterior
  se reemplazan por el Resumen (spec `proy`) y el panel.
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
- Vacío: área de trabajo sin pantallas ("Este estudio todavía no tiene pantallas");
  panel sin hallazgos ("Sin hallazgos todavía"); filtro sin resultados ("Ningún hallazgo
  de este tipo."); hallazgo sin imágenes ("Sin imágenes" y zona para pegar/arrastrar).
- Carga: "Cargando imagen..." mientras baja la imagen completa en el modal.
- Error: si falla "Guardar cambios" del panel, toast "No se pudo guardar. Probá de nuevo."
  y el botón vuelve a habilitarse; toast "No se pudo procesar la imagen"; "No se pudo abrir la imagen." en el
  panel de evidencia; si guardar falla, toast con el error (por ejemplo, 413 si la
  imagen supera el límite) y el modal queda abierto para reintentar.

## Diseño
Figma "Ux-Diagnostic-tool", frames "Lupa UX · Proyecto · Resumen" (panel de hallazgos):
https://www.figma.com/design/TgoGlLsjt4rs2dH04TQnFL/Ux-Diagnostic-tool?node-id=29-3575 y
https://www.figma.com/design/TgoGlLsjt4rs2dH04TQnFL/Ux-Diagnostic-tool?node-id=29-3102.
Desvíos acordados: Catálogo arriba a la derecha del panel; filtros por tipo en vez de
categoría; tipografía Geist (el Figma usa IBM Plex Sans en el panel). La página de alta se
definió en la exploración `explorar/hallazgo-como-pagina`.

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan.
- Propio: editar desde el panel y verificar que no se pierdan imágenes ni relaciones;
  abrir y cerrar el catálogo en el panel; comprobar que el panel llegue al borde inferior
  en 1440 × 900. Si el cambio toca imágenes o anotaciones, verificar que la miniatura, el
  reporte online y la página compartida muestren las anotaciones, y que reabrir el
  hallazgo las deje editables.

## Dónde vive
`src/views/hallazgos.js` (`renderHallazgosInto`, `renderHzPanel`, `renderPanelCatalogo`,
`hzEditor`, `hzModal`, `openHzPage` / `renderHzPage`, borrado), `src/core/state.js`
(`hzPage`, `hzSel`, `hzPanel`, `hzCatTab`), `src/ui/imagenes.js`
(`processImage`, visor), `src/ui/anotaciones.js` (`mountAnnotator`, composición).
Datos: `estudios/{id}/hallazgos/{hid}` (con `imgs:[{id,thumb,w,h}]`) y la imagen
completa + anotaciones en `.../hallazgos/{hid}/imgs/{imgId}`.

## Conocido
- Borrar un hallazgo no lo quita de los pasos de journey (`paso.hallazgos:[ids]`):
  el contador del paso lo sigue contando aunque no se muestre.
- Las métricas de Sev 3 y Sev 4 cuentan solo problemas, no oportunidades ni observaciones.
