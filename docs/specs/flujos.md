# Feature: User Flows  ·  id: flujos

Historia de usuario: Como consultor/a UX, quiero diagramar el recorrido de una tarea
con sus interacciones y hallazgos, para mostrar dónde se rompe la experiencia.

Objetivo: evaluar recorridos por tarea o escenario, no pantallas sueltas: un
diagrama de interacciones conectadas, cada una con su imagen y sus hallazgos.

## Criterios de aceptación
- Dado un estudio, cuando se crea un flujo con nombre, tipo (`User Flow` o
  `User Journey`) y descripción opcional, entonces aparece en la lista y se abre
  su editor (el journey abre su propio editor, ver `journeys.md`). Sin nombre no se crea.
- Dado un flujo existente, cuando se edita, entonces el tipo se muestra fijo y no se
  puede cambiar (así no se pierden nodos ni conexiones). (Hoy NO implementado; ver
  `journeys.md`.)
- Dado un flujo abierto, cuando se agrega una interacción, entonces aparece en el
  diagrama como "Interacción N" y se guarda.
- Dado el diagrama, cuando se arrastra un nodo, el fondo o se usa la rueda / los
  botones de zoom (alejar, ajustar, acercar), entonces el nodo o la vista se mueven
  y la posición del nodo persiste al recargar.
- Dado un nodo, cuando se arrastra desde su punto hasta otro nodo, entonces se crea
  una conexión "happy path" (no se duplica si ya existe esa misma conexión).
- Dada una conexión, cuando se abre, entonces se puede cambiar a "desvío"
  (error / decisión), ponerle etiqueta o eliminarla.
- Dada una interacción, cuando se edita, entonces se guardan título (obligatorio),
  "qué ve" y "qué hace", y el título nuevo se copia a `interaccionTitulo` de sus hallazgos.
- Dada una interacción sin imagen, cuando se pega, arrastra o elige una imagen,
  entonces queda guardada y se habilita "Marcar hallazgo".
- Dada una imagen, cuando se activa "Marcar hallazgo" y se hace clic en ella,
  entonces se abre el alta de un hallazgo NUEVO ya vinculado a esa interacción y,
  al guardarlo, queda un marcador numerado en ese punto. Esc cancela el modo marcar.
- Dado un marcador, cuando se usa "Quitar del flujo", entonces el marcador desaparece
  y el hallazgo NO se borra.
- Dada una interacción, cuando se elimina, entonces se borran sus conexiones y su
  imagen, y sus hallazgos pierden `flujoId`/`interaccionId`/`interaccionTitulo`.
- Dado un hallazgo con marcador, cuando se borra desde Hallazgos, entonces su
  marcador desaparece de los flujos del estudio (`cleanFlowMarkers`).
- Dado un flujo, cuando se elimina, entonces se borran el flujo y sus imágenes.

## Alcance
Lista de flujos del estudio, alta/edición/borrado de flujos, editor de diagrama
(nodos, conexiones, zoom y paneo), detalle de interacción con imagen, marcadores y
hallazgos nuevos vinculados.

## Fuera de alcance / No tocar
- Fuera de alcance: vincular un hallazgo existente desde una interacción (hoy solo
  se crea uno nuevo; "Relacionar existente" es de journeys).
- La relación hallazgo ↔ interacción vive en DOS lados (`markers` del nodo y
  `flujoId/interaccionId` del hallazgo). Cambiar una sin la otra deja referencias
  colgadas.

## Dependencias
- `flowStore` sobre la capa `DB` (API tipo Firestore); en modo sin DB, localStorage.
- `store.saveHallazgo` / `listHallazgos` y el modal `hzModal` de Hallazgos.
- `processImage` (`ui/imagenes.js`) para imagen completa y miniatura.
- Editor de journey (`journey/journey.js`) cuando el tipo es `User Journey`.

## Estados (UI)
- Vacío: lista sin flujos ("Todavía no hay flujos" + "Crear flujo"); diagrama sin
  nodos ("Diagrama vacío" + "Agregar interacción"); interacción sin imagen (zona para
  pegar/arrastrar); sin hallazgos (texto guía para "Marcar hallazgo").
- Carga: "Cargando flujos..." al entrar a la pestaña; "Cargando..." mientras baja la imagen.
- Error: toast "No se pudo guardar el flujo" y "No se pudo procesar la imagen";
  "No se pudo cargar la imagen." en el escenario; fila "Hallazgo eliminado" si el
  marcador apunta a un hallazgo que ya no existe.

## Diseño
N/A

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan.
- Propio: si el cambio toca marcadores o vínculos, verificar los dos lados de la
  relación (nodo y hallazgo) y que el reporte online y la página compartida muestren
  el flujo.

## Dónde vive
`src/flujos/flujos.js` (`flowStore`, lista, modal), `diagrama.js` (editor),
`detalle-nodo.js` (imagen, marcadores, hallazgos). Datos:
`estudios/{id}/flujos/{fid}` con `nodes:[{id,x,y,titulo,ve,hace,imgId,imgThumb,
markers:[{id,x,y,hallazgoId}]}]` y `edges:[{id,from,to,tipo,label}]`; imágenes en
`.../flujos/{fid}/imgs/{imgId}`.

## Conocido
- Una interacción nueva aparece casi encima de la anterior en el diagrama.
- Borrar un estudio no borra sus flujos ni sus imágenes (`store.delEstudio`).
- Relación de un solo lado: "Quitar del flujo", "Quitar imagen" y borrar un flujo
  limpian solo el lado del flujo. El hallazgo conserva `flujoId`/`interaccionId` y
  sigue mostrando el chip del flujo. (El aviso de borrar flujo dice que "pierden el
  vínculo", pero no es así.)
