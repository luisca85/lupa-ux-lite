# Feature: User Journeys  ·  id: jr

Historia de usuario: Como consultor/a UX, quiero mapear la experiencia por etapas con
su curva emocional, para mostrar al cliente dónde sufre la persona usuaria.

Objetivo: mapear la experiencia por etapas y pasos, con carriles de análisis y
una curva emocional, vinculando cada paso con hallazgos y user flows.

## Criterios de aceptación
- Dado el alta de un flujo, cuando se elige tipo "User Journey", entonces se guarda
  en la misma colección que los flows (`tipo:"User Journey"`) con `etapas`, `pasos`
  y `carriles` por defecto, y se abre el editor de journey.
- Dado un journey existente, cuando se edita desde el lápiz, entonces el tipo se
  muestra fijo y no se puede cambiar (así no se pierden etapas, pasos ni carriles).
- Dado un journey sin pasos, cuando se abre, entonces muestra "Journey vacío" con
  "Agregar paso"; al agregar, el paso nuevo hereda la etapa del último (o la primera
  etapa) y emoción Neutral.
- Dado un journey con pasos, cuando se abre, entonces se ve la matriz: fila de etapas
  (bandas por grupos contiguos de pasos de la misma etapa; "sin etapa" si no tiene),
  pasos en columnas y los carriles visibles en filas.
- Dado el modal "Carriles", cuando se desmarca o marca un carril (Touchpoint,
  Emocionalidad, Acciones, Expectativas / pensamiento, Pain points, Oportunidades) y
  se guarda, entonces esa fila se oculta o se muestra y persiste.
- Dado un carril de lista (acciones, expectativas, pain points, oportunidades o las
  pills del touchpoint), cuando se escribe y se da Enter, entonces se agrega una
  etiqueta (máx. 140 caracteres); la X o Backspace con el campo vacío la quitan, y se
  guarda en el momento.
- Dada la descripción del touchpoint, cuando se escribe, entonces se guarda sola a
  los ~500 ms (`jrSave`).
- Dado un paso, cuando se elige una emoción (0–4, Muy negativo → Muy positivo, con
  emoji), entonces se guarda y la curva emocional se redibuja con esos valores.
- Dado el modal "Editar paso", cuando se cambia nombre o etapa, se mueve a izquierda
  o derecha, o se elimina (con confirmación), entonces el cambio persiste.
- Dado el modal "Etapas", cuando se agrega, renombra, cambia de color o borra una
  etapa y se guarda, entonces persiste; borrar una etapa deja sus pasos "sin etapa".
- Dado el contador de hallazgos o de user flows de un paso, cuando se abre, entonces
  el panel lateral lista los relacionados y permite: ver el detalle, "Relacionar
  existente" (uno o varios), "Crear nuevo" ya vinculado al paso, y quitar la relación
  sin borrar el hallazgo o el flujo.
- Dado un journey guardado en un formato viejo (campos de texto, `flujoId`), cuando se
  abre en el editor, el reporte o la página compartida, entonces se ve con el formato
  actual (`jrNormalizePaso`).

## Alcance
Editor de journey: matriz, etapas, pasos, carriles, curva emocional, panel de
relaciones por paso, y el tipo fijo al editar (`flowModal`).

## Fuera de alcance / No tocar
- Fuera de alcance: los user flows en sí (ver `flujos.md`) y el alta de hallazgos
  (ver `hallazgos.md`); el journey solo guarda sus ids.
- `jrNormalizePaso` migra formatos viejos (campos en texto → listas,
  `flujoId` → `flujos`). Mantenerla al agregar campos.
- El render del journey está duplicado en el reporte online (`crJourneyMatrix`)
  y en la página autónoma (`boot.js`).

## Dependencias
- `flowStore` / `saveActiveFlow` / `flowModal` (`flujos/flujos.js`): el journey es un
  documento de la colección de flujos.
- `hzModal`, `hzThumbs`, `openHzLightbox` y el catálogo, para el panel de hallazgos.
- Reporte online (`reportes/cliente.js`) y página compartida (`share/compartir.js`,
  `share/boot.js`), que usan `EMO`, `JR_CARRILES`, `emoTop` y `jrNormalizePaso`.

## Estados (UI)
- Vacío: "Journey vacío" + "Agregar paso"; panel sin relaciones ("Sin hallazgos / user
  flows relacionados todavía."); "Relacionar existente" sin candidatos (texto que
  sugiere "Crear nuevo"); flujo sin interacciones en el detalle del panel.
- Carga: "Cargando flujos..." al entrar a la pestaña (compartido con flujos).
- Error: toast "No se pudo guardar el flujo" si falla un guardado (`saveActiveFlow`).

## Diseño
N/A

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan.
- Propio: si el cambio toca el render del journey, verificarlo en el editor, en el
  reporte online y en la página compartida; si agrega campos al paso, extender
  `jrNormalizePaso`.

## Dónde vive
`src/journey/journey.js` (editor, `jrNormalizePaso`, etapas, carriles) y
`src/journey/relaciones.js` (sidebar). Datos en `estudios/{id}/flujos/{fid}`:
`etapas`, `carriles`, `pasos:[{..., emocion, touchpoint, tpPills, acciones,
expectativas, pain, oportunidades, hallazgos:[ids], flujos:[ids]}]`.

## Conocido
- En el modal "Etapas", agregar, borrar o cambiar color se aplica al journey al
  instante: "Cancelar" no lo deshace y queda guardado en el próximo guardado.
- Relaciones colgadas: borrar un hallazgo o un flujo no lo quita de
  `paso.hallazgos` / `paso.flujos`; el contador del paso lo sigue contando.
- "Crear nuevo" en user flows permite elegir tipo "User Journey": el id se agrega al
  paso, pero el panel filtra los journeys, así que cuenta pero no se muestra.
