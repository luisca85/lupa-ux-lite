# Feature: Propuestas de trabajo  ·  id: prop

Historia de usuario: Como consultor/a UX, quiero mostrar propuestas de trabajo con
precio dentro del reporte, para convertir el diagnóstico en un servicio contratado.

Objetivo: cargar y ordenar propuestas comerciales que se muestran al cliente en
el reporte, con precio, qué incluye, descuentos y precio de lanzamiento.

## Criterios de aceptación
- Dado el editor de propuesta (Configuración → Propuestas de trabajo, en el mismo panel
  con "← Propuestas de trabajo"), cuando se toca Guardar con título, entonces queda con
  tipo (Precio fijo o Plan fijo mensual), descripción, "qué incluye" (una por línea),
  y precio: monto con moneda (US$, $ o €) o "A definir". Sin título no se guarda. No se
  guarda solo: volver sin Guardar no cambia nada.
- Dado un precio con monto, cuando se ve en el reporte, entonces se muestra con su
  moneda y, si el tipo es Plan fijo mensual, con " /mes"; si es "A definir", dice
  "A definir".
- Dados descuentos por pago adelantado (mensual, trimestral, semestral, anual) en %,
  cuando se ve la propuesta, entonces en el plan mensual con monto se muestra el
  total de cada período (y su valor por mes); en precio fijo, solo el %. Los vacíos o
  en 0 no se muestran.
- Dado el precio de lanzamiento activo con N% (1–99) y un monto, cuando se ve la
  propuesta, entonces muestra el "antes" tachado (`precio / (1 - N/100)`, redondeado
  a múltiplos de 5), el precio guardado como "ahora", la etiqueta "Lanzamiento -N%" y
  la línea de urgencia. Con "A definir" no se muestra.
- Dada la grilla de propuestas, cuando se usan las flechas ← → de una card, entonces el
  nuevo orden se guarda y es el que ve el cliente en "Trabajemos juntos".
- Dada una propuesta abierta en el editor, cuando se toca Eliminar, entonces se pide
  confirmación en el panel y solo al confirmar se elimina.
- Dado un estudio sin propuestas guardadas (o con el set viejo de dos, nunca
  editado), cuando se abre su reporte, entonces se siembran las tres por defecto:
  Diagnóstico completo (US$ 300), Plan Mensual - Aliado (US$ 500) y Propuesta
  Mensual Pro (US$ 1.000), con lanzamiento -20% activo.
- Dada la sección "Propuestas de trabajo" desmarcada en "Qué ve el cliente", o sin
  propuestas, cuando el cliente abre el reporte, entonces no aparece el botón flotante
  "Trabajemos juntos". Con propuestas, el botón abre un modal con las cards en columnas
  y "Reservar ahora tu diagnóstico" en cada una (ver `reportes.md`).

## Alcance
Grilla y editor de propuestas en Configuración, cálculo de precios (lanzamiento y
descuentos), la tarjeta en el reporte del cliente y la confirmación de borrado.

## Fuera de alcance / No tocar
- Fuera de alcance: cambiar los precios o textos de las propuestas por defecto.
- El precio guardado es el precio FINAL con descuento. No guardar el "antes".
- Mantener sincronizados `propuestaCardHTML` y el `propCard` de `SR_boot`.
- `esSeedViejo` y la siembra en `ensureReporte` son migraciones de datos guardados:
  no quitarlas.

## Dependencias
- `ensureReporte` y `saveReporte` (`reportes/comun.js`): el reporte vive dentro del
  estudio y se guarda con `store.saveEstudio` (con ~600 ms de demora).
- Configuración (`reportes/configuracion.js`) y el reporte del cliente
  (`share/boot.js`).

## Estados (UI)
- Vacío: solo la card "+ Nueva propuesta" en la grilla; el cliente no ve el botón
  flotante.
- Carga: N/A (las propuestas vienen con el estudio ya cargado).
- Error: A CONFIRMAR (hoy, si falla el guardado demorado del reporte, no hay aviso
  propio; en modo `server` aparece el toast global).

## Diseño
N/A

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan.
- Propio: si el cambio toca la tarjeta o el cálculo, revisar la misma propuesta
  (mensual con descuentos y lanzamiento) en el modal "Trabajemos juntos" de la vista
  previa.

## Dónde vive
`reporte.propuestas` dentro de cada estudio. Helpers: `normalizePropuesta`,
`propLaunch`, `propDiscRows`, `propuestaCardHTML` (online) en
`src/reportes/propuestas.js`, y `propCard` dentro de `SR_boot` en `src/share/boot.js`
(reporte del cliente). `defaultPropuestas()` siembra las tres por defecto. Grilla y
editor en `src/reportes/configuracion.js` (`propuestas`, `editorPropuesta`).

## Conocido
- Las dos propuestas por defecto mensuales ("Plan Mensual - Aliado" y "Propuesta
  Mensual Pro") se siembran con tipo "Precio fijo": el cliente ve la etiqueta
  "Precio fijo" y el precio sin "/mes".
- Una propuesta nueva arranca con precio "A definir" (`normalizePropuesta`).
