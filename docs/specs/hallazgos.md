# Feature: Hallazgos sobre pantallas (modelo v2)  ·  id: hz

Historia de usuario: Como consultor/a UX, quiero cargar cada pantalla del producto una sola
vez y marcar sobre ella cada hallazgo con un pin, para registrar la evaluación rápido y
fundamentar el diagnóstico ante el cliente sin repetir imágenes.

Objetivo: la Pantalla pasa a ser una entidad del estudio y el hallazgo es siempre atómico
(un pin o un comentario = un hallazgo). Se registra con un clic sobre la captura, se edita
en un panel lateral y los datos v1 (imágenes dentro de cada hallazgo) se migran sin perder
nada. Sale de la exploración `explorar/modelo-pantallas`.

## Modelo de datos (v2)
- **Pantalla** `estudios/{id}/pantallas/{pid}`: `nombre`, `origen` ("imagen" | "url"),
  `url`, `orden`, `w`, `h`, `thumb` (220 px), `hash`, `createdAt`. La imagen completa va
  aparte en `estudios/{id}/pantallas/{pid}/img/full` (`{base, w, h}`). No tiene hallazgos
  propios: solo los recibe.
- **Hallazgo** `estudios/{id}/hallazgos/{hid}`: `titulo`, `descripcion`, `recomendacion`,
  `severidad` (0–4 o null), `catalogoIds` (heurísticas y sesgos, muchos a muchos con el
  catálogo global), `pantallaId` (opcional), `pin {x, y}` (relativo 0–1, solo con pantalla),
  `pasos: [{flujoId, pasoId}]` (cero, uno o varios pasos de User Flows y de User Journeys,
  ver "Formulario único y pasos"), `createdAt`, `modelo: 2`. `flujoId` + `pasoId` (+
  `interaccionId`, `interaccionTitulo`) quedan con el primer paso, por compatibilidad.
  Se conservan los campos v1 que existan (`tipo`, `categoria`, `tags`, `pantalla` como
  texto, `imgsV1`) aunque la interfaz no los edite.
- **Catálogo**: global, no depende del estudio (sin cambios).
- Reglas:
  1. El hallazgo es atómico: nunca hay hallazgos dentro de hallazgos.
  2. `pantallaId` y `pasoId` son independientes (uno, otro, ambos o ninguno).
  3. `pin` solo existe si hay pantalla; se guarda relativo para que no se rompa al cambiar
     el tamaño.
  4. Sin pantalla = observación general del estudio (no es un error).
  5. La numeración visible de los pines es por pantalla, en orden de creación.
  6. Al quitar la pantalla se borra el pin; al asignar una pantalla sin pin, el pin va al
     centro (0.5, 0.5).
  7. Un hallazgo creado desde Hallazgos, desde una interacción de flujo o desde un paso de
     journey tiene los mismos campos (`nuevoHallazgo`) y se carga con el **mismo
     formulario**. Solo cambia el contexto, que deja precargados la pantalla, el pin o el paso.
  8. La relación hallazgo ↔ paso se guarda en los dos lados: `hallazgo.pasos`,
     `node.markers` (User Flow) y `paso.hallazgos` (User Journey). Toda alta, cambio o baja
     actualiza los dos lados (`sincronizarPasos`).
- Severidad inicial de un hallazgo nuevo: **1** (`SEV_DEFAULT`).

## Criterios de aceptación

### Migración v1 → v2 (al abrir un estudio)
- Dado un estudio con `modelo` < 2, cuando se lo abre (o se abre su vista previa), entonces
  se migra una sola vez y se marca `modelo: 2`; abrirlo de nuevo no duplica nada.
- Cada imagen de un hallazgo v1 se convierte en una Pantalla. Las imágenes idénticas
  (hash exacto del archivo comprimido + comparación del contenido) se deduplican dentro
  del estudio.
- El hallazgo queda colgado de la pantalla de su **primera** imagen, con el pin en la
  posición de su primer pin (convertida a coordenadas relativas) o al centro si no tenía.
  El comentario de ese primer pin se suma a la descripción.
- Cada imagen extra de un hallazgo crea otra pantalla con una **copia** del hallazgo anclada
  ahí (`copiaDe`). Cada pin extra con comentario se convierte en un hallazgo nuevo de tipo
  Observación, con el comentario como texto (`migradoDe`).
- Las anotaciones que no son pines (flecha, texto, resaltador, lápiz) quedan quemadas en la
  imagen de la pantalla: en v2 solo hay pines.
- `heuristicas` + `sesgos` se unen en `catalogoIds`; `interaccionId` pasa a `pasoId`.
- No se borra nada: los documentos `…/hallazgos/{hid}/imgs/{imgId}` quedan como respaldo
  (`imgsV1` en el hallazgo). Si la migración falla, se avisa y el estudio se abre igual.
- Toast al terminar: "Estudio actualizado: N pantallas creadas a partir de la evidencia".

### Sección Hallazgos
- Dada la sección, cuando se abre, entonces hay un área de trabajo a la izquierda y un panel
  de 480 px a la derecha; juntos ocupan el 100% del alto disponible (la página mide lo que la
  ventana). Por debajo de 1000 px el panel pasa abajo.
- **Pestañas de pantallas** (Button Group): una por pantalla, unidas, radio 10 en las puntas,
  14 px medium; la activa en negro con texto blanco (en tema oscuro, invertida). Las de
  origen URL llevan la marca "URL". A la derecha, el botón azul "Nueva pantalla +" (28 px,
  radio 4) abre el alta: subir imagen o pegar URL, más el nombre. Al crearla queda activa.
- Cuando las pestañas no entran: flechas ‹ › a los costados (desplazan un bloque y se
  desactivan en las puntas) y desvanecido en el borde donde hay más. El botón "Todas (N)"
  está **siempre visible**: su menú tiene arriba "Todos los hallazgos" y "Sin pantalla"
  (con sus cantidades) y, bajo "Pantallas", la lista de pantallas (número, nombre, marca URL
  y cantidad de hallazgos) para saltar directo (ver "Vistas Todos los hallazgos y Sin
  pantalla"). Con teclado: ←/→ cambian de pantalla, Inicio/Fin van a la primera/última; en la
  lista, ↑/↓, Enter y Esc. La pestaña activa siempre queda a la vista.
- **Lienzo**: muestra la captura de la pantalla activa con sus pines numerados, sobre fondo
  gris punteado (radio 14). Arriba a la derecha: "Cambiar pantalla" (nombre, URL o reemplazar
  la imagen; los pines se mantienen) y "Eliminar pantalla" (confirma; sus hallazgos no se
  borran: quedan sin pantalla).
- El lienzo **no tiene scroll**: la imagen se ajusta para verse completa; la rueda o el
  trackpad hacen zoom hacia el cursor (5%–600%), arrastrar mueve la vista y los controles
  − / % / + / Ajustar (abajo a la derecha) cambian el zoom. Los pines y el popover no escalan.
  El zoom y la posición se recuerdan por pantalla mientras se trabaja en el estudio.
- **Carga rápida**: un clic sin arrastrar en cualquier punto de la captura crea un hallazgo
  ahí y abre el popover junto al pin (hacia el lado con más espacio) con Descripción,
  Severidad 0–4, "Guardar" y "Eliminar". Guardar lo registra, cierra el popover y deja listo
  para el siguiente clic. En un hallazgo recién creado, "Eliminar" lo descarta.
- Tocar un pin existente abre el mismo popover para editarlo; "Eliminar" lo borra con
  confirmación. Esc o un clic afuera lo cierran.
- **Panel**: "Hallazgos", el nombre de la pantalla en mayúsculas y "N en esta pantalla", con
  el botón "Catálogo →". Filtros por severidad (Todas, No es problema, Cosmético, Menor,
  Mayor, Catástrofe), cada uno con el borde de su color. Lista de la pantalla activa: número
  en el color de su severidad, título y "Sev. N · etiqueta · heurística". La tarjeta
  seleccionada toma el borde de su severidad.
- Tocar una tarjeta abre en el panel "Editar hallazgo N" (el formulario único, ver abajo):
  Severidad, Descripción, Recomendación, Heurística relacionada, Pantalla y Pasos de flujos y
  journeys, con "Guardar cambios", "Cancelar" y la papelera. Al guardar se conservan los demás datos (tipo, categoría,
  etiquetas, otras entradas del catálogo, respaldo v1).
- Si el título no se escribió a mano, se arma con la primera línea de la descripción.
- Los pasos se eligen en "Pasos de flujos y journeys" (ver "Formulario único y pasos").

### Formulario único y pasos (integración con flujos, 2026-10-20)
- Dado un hallazgo nuevo o existente, cuando se abre desde Hallazgos (panel derecho), desde
  una interacción de User Flow ("Marcar hallazgo" o un hallazgo de su lista) o desde un paso
  de User Journey ("Crear nuevo" o "Editar hallazgo" en su panel), entonces se ve **el mismo
  formulario** (`formularioHallazgo`), con los mismos campos.
- Dado el campo "Pasos de flujos y journeys", cuando se usa, entonces:
  - muestra los pasos del hallazgo como chips ("Nombre del flujo · N. paso · etapa"),
    cada uno con ×;
  - "+ Agregar a un paso…" lista las interacciones de los User Flows y los pasos de los
    User Journeys, agrupados por flujo;
  - un hallazgo puede estar en varios pasos.
- Dado el formulario abierto desde una interacción o un paso, cuando aparece, entonces ese
  paso ya está agregado. Desde una interacción que usa una pantalla del estudio, también
  vienen la pantalla y el pin del clic.
- Dado un hallazgo guardado, cuando se miran sus pasos, entonces:
  - cada interacción tiene su marca (`node.markers`). Si usa la misma pantalla que el
    hallazgo, la marca va donde está su pin; si no, al centro;
  - cada paso de journey lo lista en `paso.hallazgos`.

  Se ve igual en Hallazgos (la tarjeta muestra el primer paso y "+N"), en la interacción
  y en el panel del paso.
- Dado "Quitar del flujo" en una interacción, o la × en el panel del paso del journey,
  cuando se usa, entonces el hallazgo también deja de tener ese paso. Si se relacionan
  hallazgos existentes desde el journey, también se suman a sus pasos.
- Dado un hallazgo borrado, cuando se borra, entonces sale de las marcas de los flows y de
  los `paso.hallazgos` de los journeys.
- Dado un hallazgo con datos de antes (solo `flujoId`, o solo listado en un journey o en
  una marca), cuando se abre el formulario, entonces sus pasos se arman con todo lo que
  registran los dos lados (`pasosDe`). Al guardar quedan emparejados.

### Pantalla del hallazgo y "Agregar pantalla"
- Dado el campo Pantalla, cuando se ve, entonces muestra:
  - sin pantalla: "Sin pantalla" y **"+ Agregar pantalla"**;
  - con pantalla: miniatura con el pin numerado, el nombre, "Cambiar" y "Quitar pantalla".

  Así se decide si el hallazgo va con pantalla o sin ella.
- Dado "+ Agregar pantalla" o "Cambiar", cuando se toca, entonces el mismo panel pasa a la
  sección **Agregar pantalla**, con "← Volver al formulario del hallazgo". Lo ya escrito en
  el formulario se conserva. La sección tiene dos pestañas:
  - **Pantallas del estudio** (primera, si hay): grilla con miniatura, nombre y cantidad de
    hallazgos, y un buscador con más de 8 pantallas. Usar una que ya existe no duplica la
    imagen;
  - **Subir nueva**: archivo, arrastrar, Ctrl/Cmd + V o "Pegar del portapapeles". Una
    imagen idéntica a una ya cargada usa esa misma pantalla.
- Dada una imagen elegida, cuando se ve, entonces:
  - aparece "Nombre de la pantalla". Una imagen pegada no se llama "image": el campo queda
    vacío, con el foco y la sugerencia "Pantalla N";
  - aparece la imagen con los pines numerados de los otros hallazgos de esa pantalla. Un
    clic coloca el pin del hallazgo con su número, y otro clic lo mueve;
  - "Guardar pantalla y pin" se habilita con el pin puesto y vuelve al formulario. El
    hallazgo completo se guarda con su botón.
- Dada una pantalla nueva, cuando se guarda el hallazgo, entonces recién ahí se crea la
  pantalla, así que si se cancela no queda una pantalla suelta. Cambiar el nombre de una
  pantalla existente lo cambia también en las interacciones que la usan y seguían con el
  nombre anterior (o con "Interacción N").
- **Catálogo en el panel**: "Catálogo →" reemplaza el contenido del panel por heurísticas y
  sesgos (con su descripción y origen) y una flecha para volver a la lista.
- Pegar una imagen (Ctrl/Cmd + V) en la sección crea una pantalla nueva, o completa la
  captura de una pantalla de URL que todavía no la tiene.
- Una pantalla de origen URL sin captura muestra la zona para pegarla o subirla (la captura
  automática de la URL no existe todavía).
- Los hallazgos sin pantalla (generales, o de una pantalla eliminada) se ven en la vista
  "Sin pantalla" del menú "Todas" (ver abajo); siguen también en el Resumen y en el reporte.

### Vistas "Todos los hallazgos" y "Sin pantalla" (2026-10-21)
Sale de la exploración `explorar/hallazgos-todas-las-pantallas`.
- Dado el menú "Todas", cuando se elige "Todos los hallazgos" o "Sin pantalla", entonces
  ninguna pestaña de pantalla queda activa y el botón pasa a negro (invertido en tema
  oscuro) con el nombre de la vista y su cantidad ("Todos los hallazgos 20", "Sin pantalla
  4"). Elegir una pestaña o una pantalla del menú vuelve al lienzo de esa pantalla.
- **Todos los hallazgos** (área de trabajo): encabezado "Todos los hallazgos" con "N en M
  pantallas y K sin pantalla. Clic en una pantalla para trabajar en ella." y una grilla de
  tarjetas, una por pantalla en el orden de las pestañas: la captura completa en miniatura
  (sin recortar, 220 px de alto como máximo) con sus pines numerados chicos en el color de
  su severidad, y abajo el nombre y la cantidad de hallazgos. Al final, si hay hallazgos sin
  pantalla, una tarjeta punteada "N hallazgos sin pantalla" que lleva a esa vista.
  - Clic (o Enter / Espacio) en una miniatura: va a esa pantalla. Clic en un pin: abre ese
    hallazgo en el formulario del panel, sin salir de la vista.
  - Una pantalla de URL sin captura se muestra como un recuadro vacío.
- **Todos los hallazgos** (panel): "Hallazgos", "TODAS LAS PANTALLAS" y "N en total", con los
  mismos filtros por severidad. La lista va agrupada por pantalla (nombre y cantidad del
  grupo, en el orden de las pestañas) y al final el grupo "Sin pantalla"; los grupos sin
  hallazgos (o sin resultados para el filtro) no aparecen.
- **Sin pantalla** (área de trabajo): encabezado "Hallazgos sin pantalla" con "N hallazgos
  no están ubicados en ninguna pantalla. Abrí uno para agregarle una pantalla y un pin." y
  el botón "Nuevo hallazgo sin pantalla +", que abre el formulario único vacío en el panel.
  Debajo, una tarjeta por hallazgo con título, descripción (hasta 3 líneas) y "Sev. N ·
  etiqueta · heurística", con un borde izquierdo del color de su severidad.
- **Sin pantalla** (panel): "Hallazgos", "SIN PANTALLA" y "N sin pantalla", con filtros y la
  lista de esos hallazgos (sin número de pin: "·").
- Un hallazgo cuenta como "sin pantalla" si no tiene `pantallaId` o si su pantalla ya no
  existe en el estudio.
- Tocar una tarjeta (del área o del panel) abre el formulario único y la marca como
  seleccionada. Al guardar se queda en la vista: si se le agregó una pantalla a un hallazgo
  de "Sin pantalla", sale de esa lista y pasa al grupo de su pantalla.
- Pegar una imagen (Ctrl/Cmd + V) estando en una de estas vistas crea una pantalla nueva y
  la deja activa.

### Editor completo (Resumen "Nuevo hallazgo" y "Más campos")
- La página de alta y el modal usan el mismo editor (`hzEditor`): título, ubicación o paso
  (texto), etiquetas, severidad, descripción, recomendación, heurísticas y sesgos, y la
  evidencia: elegir una pantalla del estudio o subir una imagen nueva (deduplicada) y ubicar
  el pin con un clic. No muestra tipo ni categoría.
- Si guardar falla, el editor queda abierto con lo cargado para reintentar.
- Al eliminar un hallazgo se borran sus marcadores en las interacciones de flujos
  (`cleanFlowMarkers`); la pantalla no se borra.

### Otros módulos que no se rompen
- Reporte del cliente (vista previa, link público y página autónoma): la evidencia de cada
  hallazgo es su pantalla con su pin compuesto encima; `SR_boot` recibe el mismo formato.
- Texto plano y relaciones de journey usan `catalogoIds` y la pantalla del hallazgo.
- Borrar un estudio borra también sus pantallas.

## Alcance
`src/data/pantallas.js` (modelo, store de pantallas, reglas, migración), `src/views/hallazgos-ws.js`
(área de trabajo, popover, panel, alta de pantallas), `src/views/hallazgos.js` (editor,
borrado), lectores adaptados (`share/compartir.js`, `reportes/texto-plano.js`,
`journey/relaciones.js`, `ui/imagenes.js`, `flujos/*`, `data/store.js`) y `base.css`.

## Fuera de alcance / No tocar
- Fuera de alcance: captura
  automática de URLs (requiere Cloudflare Browser Rendering); herramientas de anotación
  sobre la pantalla además de los pines; borrar los respaldos v1.
- No tocar: el render de `SR_boot` (solo su paleta de severidad se alineó, spec `ds`);
  las imágenes de las interacciones de flujo (siguen en `flujos/{fid}/imgs`).

## Dependencias
- Capa `DB` (`store`, `pantallaStore`, `flowStore`), `processImage`, `compositeDataUrl`.
- Catálogo (`allHeur`, `allSesgos`, `heurById`, `catalogoIdsDe`, `heurDe`, `sesgosDe`).
- `proximamente()` de `views/estudio.js` para ocultar el paso de flujo.

## Estados (UI)
- Vacío: estudio sin pantallas ("Este estudio todavía no tiene pantallas" con "Subir
  imagen"; el panel muestra el aviso "Cuando cargues una pantalla y ubiques un pin, el
  hallazgo aparece en esta lista. Desde acá lo filtrás por severidad y lo editás.");
  pantalla sin hallazgos; filtro sin resultados ("Ningún hallazgo con esta severidad.");
  pantalla de URL sin captura; "Todos los hallazgos" sin hallazgos ("El estudio todavía no
  tiene hallazgos."); "Sin pantalla" vacío ("Todos los hallazgos están ubicados en una
  pantalla." en el área y "No hay hallazgos sin pantalla." en el panel).
- Carga: el lienzo se arma cuando llega la imagen de la pantalla (si mientras tanto se
  cambió de pantalla o de vista, no se dibuja); en "Todos los hallazgos" cada miniatura
  aparece cuando llega su imagen.
- Error: "No se pudo guardar. Probá de nuevo." (el botón vuelve a habilitarse); "No se pudo
  procesar la imagen"; migración fallida: aviso con el error y el estudio abre igual.

## Diseño
Figma "Ux-Diagnostic-tool": "Lupa UX · Proyecto · empty state"
https://www.figma.com/design/TgoGlLsjt4rs2dH04TQnFL/Ux-Diagnostic-tool?node-id=29-3102,
"Lupa UX · Proyecto · nuevo hallazgo" (node 29:3575) y "Lupa UX · Proyecto · editar
hallazgo" (node 37:5809). Desvíos acordados: flechas y menú "Todas" para pestañas que no
entran, con las vistas "Todos los hallazgos" y "Sin pantalla" (sin diseño en Figma); zoom
en lienzo; tipografía Geist (el Figma usa IBM Plex Sans en el panel).

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan (con Node 20,
  ver `.nvmrc`).
- Propio: abrir un estudio v1 real y verificar pantallas, copias y respaldo; crear dos
  hallazgos seguidos con clic + Guardar; zoom y arrastre sin crear hallazgos; pestañas que
  no entran (flechas, "Todas", teclado); "Todos los hallazgos" (miniaturas con pines, ir a
  una pantalla, abrir un pin, panel agrupado) y "Sin pantalla" (tarjetas, nuevo hallazgo
  sin pantalla); vista previa del reporte con la evidencia.

## Dónde vive
- `src/data/pantallas.js`: `pantallaStore`, `pantallaDesdeImagen`, `hashStr`, `normalizarPin`,
  `pinNumero`, `nuevoHallazgo`, `migrarEstudio`, `prepararEstudio`, `MODELO`, `SEV_DEFAULT`.
- `src/views/hallazgos-ws.js`: `renderWorkspace`, `renderStage`, `bindTabsOverflow`,
  `renderVista` (vistas `TODOS` y `SIN`, con `esVista` y `sinPantalla`), `renderCanvas` (zoom), `quickBox`/`bindQuick`, `renderPanel`, `renderForm` (usa `formularioHallazgo`),
  `pantallaModal`, `eliminarPantalla`, `renderPanelCatalogo`.
- `src/views/hallazgos.js`: `hzEditor`, `hzModal`, `openHzPage`/`renderHzPage`,
  `confirmDelHz`, `cleanFlowMarkers` (también limpia `paso.hallazgos` de los journeys).
- `src/views/hallazgo-form.js`: `formularioHallazgo` (formulario y sección Agregar pantalla),
  `pasosDe`, `opcionesPasos`, `etiquetaPaso`, `sincronizarPasos`, `renombrarPantalla`,
  `guardarHallazgo`, `autoTitulo`, `sevScale`, `bindSev`. Lo usan `hallazgos-ws.js`
  (`renderForm`), `flujos/detalle-nodo.js` y `journey/relaciones.js`.
- Estilos: `base.css` (`.ws-all.on`, `.ws-all-sep`, `.ws-ov-*`, `.ws-pin.mini`, `.hp-grp*`).
- `src/core/state.js`: `pantallas`, `hzGroup` (id de pantalla, `"__todos"` o `"__sin"`), `hzQuick`, `hzForm`, `hzSevF`, `hzVP`,
  `catalogoIdsDe`, `heurDe`, `sesgosDe`.
- Pruebas: `tests/e2e/migracion.spec.mjs`, `tests/e2e/pantallas.spec.mjs`.

## Conocido
- Resuelto el 2026-10-20: borrar un hallazgo lo quita también de los pasos de journey.
- El Resumen todavía abre el editor viejo (`hzModal`) al tocar un hallazgo: falta
  llevarlo al formulario único.
- "Pegar del portapapeles" usa `navigator.clipboard.read()`, que pide permiso al navegador:
  no se probó de forma automática. Ctrl/Cmd + V sí se prueba.
- Las vistas "Todos los hallazgos" y "Sin pantalla" no tienen prueba e2e propia (se
  verificaron en el navegador con un estudio real).
- Las métricas de Sev 3 y Sev 4 cuentan solo problemas, no oportunidades ni observaciones.
- Los hallazgos nuevos se guardan con tipo "Problema" (la interfaz ya no edita el tipo),
  así que el Resumen y el reporte que agrupan por tipo los cuentan como problemas.
- Las copias que crea la migración aparecen en el reporte como hallazgos separados.
- Con el formulario único, una pantalla nueva se crea al guardar el hallazgo (si se
  cancela, no queda). El editor viejo (`hzEditor`, que usa el Resumen) todavía la crea al
  subirla.
- El desplazamiento animado de las pestañas se reemplazó por uno instantáneo (el animado no
  se movía en el navegador integrado).
