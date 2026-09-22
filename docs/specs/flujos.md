# Feature: User Flows

Objetivo: evaluar recorridos por tarea o escenario, no pantallas sueltas: un
diagrama de interacciones conectadas, cada una con su imagen y sus hallazgos.

## Criterios de aceptación
- Un flujo tiene nombre, tipo (`User Flow` o `User Journey`) y descripción. El
  journey usa la misma colección con otro editor (ver `journeys.md`).
- Editor de diagrama: agregar interacciones (nodos), moverlas, zoom (alejar,
  ajustar, acercar), conectar nodos con conectores de tipo "happy path" o
  "desvío" (error/decisión), editar y borrar conectores.
- Cada interacción tiene título, "qué ve", "qué hace" y una imagen opcional.
  Sobre la imagen se ubican marcadores que apuntan a hallazgos: crear un hallazgo
  nuevo desde ahí o vincular uno existente; desvincular sin borrar el hallazgo.
- Renombrar una interacción actualiza `interaccionTitulo` en sus hallazgos.
- Borrar un flujo borra sus imágenes.

## Dónde vive
`src/flujos/flujos.js` (`flowStore`, lista, modal), `diagrama.js` (editor),
`detalle-nodo.js` (imagen, marcadores, hallazgos). Datos:
`estudios/{id}/flujos/{fid}` con `nodes:[{id,x,y,titulo,ve,hace,imgId,imgThumb,
markers:[{id,x,y,hallazgoId}]}]` y `edges:[{id,from,to,tipo}]`; imágenes en
`.../flujos/{fid}/imgs/{imgId}`.

## No tocar
- La relación hallazgo ↔ interacción vive en DOS lados (`markers` del nodo y
  `flujoId/interaccionId` del hallazgo). Cambiar una sin la otra deja referencias
  colgadas.

## Conocido
- Una interacción nueva aparece casi encima de la anterior en el diagrama.
- Borrar un estudio no borra sus flujos ni sus imágenes (`store.delEstudio`).
