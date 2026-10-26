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
  cuando se ve la propuesta con monto, entonces todos los planes (precio fijo o mensual)
  los muestran igual, con el **precio final con el descuento**: el período en una línea
  y, debajo, el %, el total del período (monto × meses) y, si es de más de un mes, su
  valor por mes. Ejemplo: "Trimestral (3 meses)" / "-10% · US$ 3.240 (US$ 1.080/mes)".
  - Con "A definir" se muestra solo el %. Los vacíos o en 0 no se muestran.
  - En celular la fila no desborda la card.
- Descuento o promoción (cambio del 2026-10-26, chequeo legal): dado "Mostrar descuento o
  promoción" activo con un monto, el autor puede cargar:
  - **Precio anterior** (opcional): un precio que cobró de verdad. Si es mayor que el
    monto, se muestra tachado, con el monto como "ahora" y la etiqueta "-N%" (calculada
    con los dos precios). Si no es mayor, el editor avisa "El precio anterior tiene que
    ser mayor que el monto." y no se tacha nada.
  - **Válido hasta** (opcional): una fecha. El cliente ve "Precio válido hasta el {fecha}."
    Pasada la fecha, no se muestra ni el precio anterior ni la validez.
  - El precio anterior ya **no se calcula** desde un %, y no existe la línea "Precio de
    lanzamiento por tiempo limitado". Motivo: un precio tachado que nunca existió o una
    urgencia sin fecha pueden considerarse publicidad engañosa (Ley de Lealtad
    Comercial). Las propuestas guardadas con el % viejo se ven solo con su precio.
  - Con "A definir" no se muestra.
- Dada la grilla de propuestas, cuando se usan las flechas ← → de una card, entonces el
  nuevo orden se guarda y es el que ve el cliente en "Trabajemos juntos".
- Dada una propuesta abierta en el editor, cuando se toca Eliminar, entonces se pide
  confirmación en el panel y solo al confirmar se elimina.
- Dado un estudio sin propuestas guardadas (o con el set viejo de dos, nunca
  editado), cuando se abre su reporte, entonces se siembran las tres por defecto:
  Diagnóstico completo (US$ 300), Plan Mensual - Aliado (US$ 500) y Propuesta
  Mensual Pro (US$ 1.000), sin descuento (desde el 2026-10-26; antes se sembraban con
  lanzamiento -20%).
- Dada la sección "Propuestas de trabajo" desmarcada en "Qué ve el cliente", o sin
  propuestas, cuando el cliente abre el reporte, entonces no aparece el botón flotante
  "Trabajemos juntos". Con propuestas, el botón abre un modal con las cards en columnas
  y el botón de reserva en cada una (ver `reportes.md`).

### Textos, recomendada, botón y preguntas frecuentes (2026-10-21, exploración `explorar/propuestas-de-trabajo`)
- Dadas Configuración → Propuestas de trabajo, cuando se abren, entonces arriba de la
  grilla está la tarjeta **Textos de "Trabajemos juntos"**, que se guarda sola:
  - **Antetítulo**, **Título** y **Descripción**: los textos de arriba del modal.
    Vacíos, ese texto no se muestra; los valores por defecto son "Trabajemos juntos",
    "Sigamos mejorando tu producto" y "Elegí cómo querés avanzar sobre este
    diagnóstico. Reservás tu lugar y te escribo para coordinar los detalles.";
  - **Plan recomendado**: "Ninguno" o una de las propuestas;
  - **Vista previa**: abre la vista previa a pantalla completa con "Trabajemos juntos"
    ya abierto (desactivado sin propuestas).
- Dado un plan recomendado, cuando se ve la grilla, entonces su card tiene borde azul y
  la etiqueta "Recomendado". En el modal del cliente va destacado y con la etiqueta.
- Con "Ninguno", ninguna card se destaca.
- Un estudio que ya tenía propuestas arranca con la primera como recomendada si hay
  más de una (como se veía antes), y sin recomendada si hay una sola.
- Si se elimina la recomendada o el cliente no la ve (está oculta), no se recomienda
  ninguna.
- Dado el editor de una propuesta, cuando se abre, entonces tiene además:
  - **Texto del botón** (hasta 60 caracteres). Vacío, el botón dice "Reservar ahora tu
    diagnóstico";
  - **Preguntas frecuentes** (opcional): "Agregar pregunta" suma un par pregunta /
    respuesta. Cada uno se puede subir, bajar y quitar. Se guardan con Guardar, como el
    resto de la propuesta, y se descartan los pares vacíos.
- Dadas preguntas frecuentes en alguna propuesta, cuando el cliente abre "Trabajemos
  juntos", entonces:
  - la propuesta elegida es la recomendada (o la primera, si no hay recomendada);
  - tocar una card (o Enter / Espacio sobre ella) la elige y la marca con un borde;
  - debajo aparecen "Preguntas frecuentes · {propuesta}" con cada pregunta plegada
    (+ para abrir, − para cerrar). En escritorio van debajo de la fila de cards; con
    las cards en una columna (≤ 800 px), justo debajo de la elegida;
  - si la elegida no tiene preguntas, no se muestra la sección.
- Sin preguntas en ninguna propuesta, las cards no se pueden elegir (como antes).
- Tocar el botón de reserva reserva esa propuesta, sin cambiar la elegida.
- En la vista previa a pantalla completa, "Trabajemos juntos" y el aviso de LinkedIn
  quedan encima de la vista previa (antes quedaban detrás).

## Alcance
Grilla y editor de propuestas en Configuración, cálculo de precios (lanzamiento y
descuentos), la tarjeta en el reporte del cliente y la confirmación de borrado.

## Fuera de alcance / No tocar
- Fuera de alcance: cambiar los precios o textos de las propuestas por defecto.
- El precio guardado es el precio FINAL. El "antes" lo carga el autor (`lanz.antes`); no
  volver a calcularlo ni a sugerir urgencia sin fecha.
- Mantener sincronizados `propuestaCardHTML` / `propDiscRows` y el `propCard` de
  `SR_boot`, y los textos por defecto de `TJ_TEXTOS` con los de `SR_boot`.
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
  previa. Revisar también la recomendada (una y "Ninguno"), un botón con texto propio
  y las preguntas frecuentes al elegir otra card, en escritorio y en celular.

## Dónde vive
`reporte.propuestas` dentro de cada estudio (cada una con `boton` y
`faq:[{q, a}]`), y `reporte.tj` (`kicker`, `titulo`, `texto`, `recomendada` = id o "").
Helpers: `normalizeTj`, `TJ_TEXTOS`, `BOTON_RESERVA`, `normalizePropuesta`,
`propLaunch`, `propDiscRows`, `propuestaCardHTML` (online) en
`src/reportes/propuestas.js`, y `propCard` dentro de `SR_boot` en `src/share/boot.js`
(reporte del cliente). `defaultPropuestas()` siembra las tres por defecto. Grilla y
editor en `src/reportes/configuracion.js` (`propuestas`, `editorPropuesta`). En
`SR_boot`: `abrirPropuestas` (recomendada, elegida y `ubicarFaq`) y `V.tjOpen` para la
Vista previa (`openClientReport(id, {tjOpen:true})` en `reportes/cliente.js`).

## Conocido
- Las dos propuestas por defecto mensuales ("Plan Mensual - Aliado" y "Propuesta
  Mensual Pro") se siembran con tipo "Precio fijo": el cliente ve la etiqueta
  "Precio fijo" y el precio sin "/mes".
- Una propuesta nueva arranca con precio "A definir" (`normalizePropuesta`).
- Los descuentos de un precio fijo usan las mismas etiquetas que el plan mensual ("Pago
  mensual", "Trimestral (3 meses)"…), aunque en un precio fijo no son períodos.
- Las preguntas frecuentes, el texto del botón y la recomendada no tienen prueba e2e
  propia (se verificaron en el navegador).
