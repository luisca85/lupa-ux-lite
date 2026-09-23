# Feature: Propuestas de trabajo  ·  id: prop

Historia de usuario: Como consultor/a UX, quiero mostrar propuestas de trabajo con
precio dentro del reporte, para convertir el diagnóstico en un servicio contratado.

Objetivo: cargar y ordenar propuestas comerciales que se muestran al cliente en
el reporte, con precio, qué incluye, descuentos y precio de lanzamiento.

## Criterios de aceptación
- Dado el modal "Nueva propuesta", cuando se guarda con título, entonces queda con
  tipo (Precio fijo o Plan fijo mensual), descripción, "qué incluye" (una por línea),
  y precio: monto con moneda (US$, $ o €) o "A definir". Sin título no se guarda.
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
- Dada la lista de propuestas del panel, cuando se arrastra una o se usan las flechas
  subir/bajar, entonces el nuevo orden se guarda y es el que ve el cliente en el
  reporte online, la página autónoma y el texto plano.
- Dada una propuesta de la lista, cuando se toca borrar, entonces se pide
  confirmación y solo al confirmar se elimina. (Hoy NO implementado: borra al instante.)
- Dado un estudio sin propuestas guardadas (o con el set viejo de dos, nunca
  editado), cuando se abre su reporte, entonces se siembran las tres por defecto:
  Diagnóstico completo (US$ 300), Plan Mensual - Aliado (US$ 500) y Propuesta
  Mensual Pro (US$ 1.000), con lanzamiento -20% activo.
- Dada la sección "Propuestas de trabajo" desmarcada en el reporte online, o sin
  propuestas, cuando el cliente abre el reporte, entonces no aparece "Trabajemos juntos".

## Alcance
Lista y modal de propuestas en el panel del reporte, cálculo de precios (lanzamiento
y descuentos), la tarjeta en el reporte online, en la página autónoma y en el texto
plano, y la confirmación de borrado.

## Fuera de alcance / No tocar
- Fuera de alcance: cambiar los precios o textos de las propuestas por defecto.
- El precio guardado es el precio FINAL con descuento. No guardar el "antes".
- Mantener sincronizados `propuestaCardHTML` y el `propCard` del autónomo.
- `esSeedViejo` y la siembra en `ensureReporte` son migraciones de datos guardados:
  no quitarlas.

## Dependencias
- `ensureReporte` y `saveReporte` (`reportes/comun.js`): el reporte vive dentro del
  estudio y se guarda con `store.saveEstudio` (con ~600 ms de demora).
- Panel del reporte (`reportes/panel.js`), reporte online (`reportes/cliente.js`),
  texto plano (`reportes/texto-plano.js`), página autónoma (`share/compartir.js`,
  `share/boot.js`).

## Estados (UI)
- Vacío: "Sin propuestas." en el panel; el cliente no ve la sección.
- Carga: N/A (las propuestas vienen con el estudio ya cargado).
- Error: A CONFIRMAR (hoy, si falla el guardado demorado del reporte, no hay aviso
  propio; en modo `server` aparece el toast global).

## Diseño
N/A

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan.
- Propio: si el cambio toca la tarjeta o el cálculo, comparar la misma propuesta
  (mensual con descuentos y lanzamiento) en el reporte online, la página autónoma y
  el texto plano.

## Dónde vive
`reporte.propuestas` dentro de cada estudio. Helpers: `normalizePropuesta`,
`propLaunch`, `propDiscRows`, `propuestaCardHTML` (online) en
`src/reportes/propuestas.js`, y `propCard` dentro de `SR_boot` en `src/share/boot.js`
(autónomo). `defaultPropuestas()` siembra las tres por defecto. Lista y modal en
`src/reportes/panel.js` (`renderPropList`, `propuestaModal`).

## Conocido
- Las dos propuestas por defecto mensuales ("Plan Mensual - Aliado" y "Propuesta
  Mensual Pro") se siembran con tipo "Precio fijo": el cliente ve la etiqueta
  "Precio fijo" y el precio sin "/mes".
- Una propuesta nueva arranca con precio "A definir" (`normalizePropuesta`).
