# Feature: Propuestas de trabajo

Objetivo: cargar y ordenar propuestas comerciales que se muestran al cliente en
el reporte, con precio, qué incluye, descuentos y precio de lanzamiento.

## Criterios de aceptación
- Cada propuesta tiene: título, tipo (Precio fijo o Plan fijo mensual), descripción,
  "qué incluye" (lista), precio (monto con moneda, o "a definir").
- Descuentos por pago adelantado (mensual, trimestral, semestral, anual). En el plan
  mensual se calcula el total de cada período; en precio fijo se muestra solo el %.
- Precio de lanzamiento: el monto guardado YA tiene el descuento aplicado; el "antes"
  se deriva (`precio / (1 - pct/100)`) y se redondea a múltiplos de 5. Se muestra el
  antes tachado, el ahora, la etiqueta "Lanzamiento -N%" y una línea de urgencia.
- Reordenar por arrastrar o con flechas subir/bajar. El orden guardado es el que ve
  el cliente (online, autónomo y texto plano).
- Tres propuestas por defecto: Diagnóstico completo (US$ 300), Plan Mensual - Aliado
  (US$ 500), Propuesta Mensual Pro (US$ 1.000), todas con lanzamiento -20% activo.

## Dónde vive
`reporte.propuestas` dentro de cada estudio. Helpers: `normalizePropuesta`,
`propLaunch`, `propDiscRows`, `propuestaCardHTML` (online) y `propCard` dentro de
`SR_boot` (autónomo). `defaultPropuestas()` siembra las tres por defecto.

## No tocar
- El precio guardado es el precio FINAL con descuento. No guardar el "antes".
- Mantener sincronizados `propuestaCardHTML` y el `propCard` del autónomo.
