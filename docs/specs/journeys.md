# Feature: User Journeys

Objetivo: mapear la experiencia por etapas y pasos, con carriles de análisis y
una curva emocional, vinculando cada paso con hallazgos y user flows.

## Criterios de aceptación
- Un journey es un flujo con `tipo:"User Journey"` (misma colección que los flows).
- Matriz: etapas (agrupan pasos), pasos en columnas y carriles en filas. Carriles
  por defecto: Touchpoint, Emocionalidad, Acciones, Expectativas / pensamiento,
  Pain points, Oportunidades. Se pueden mostrar u ocultar.
- Carriles de lista (acciones, expectativas, pain points, oportunidades y
  "pills" del touchpoint) se editan como etiquetas.
- Emoción por paso en escala 0–4 (Muy negativo → Muy positivo) con emoji;
  la curva emocional se dibuja a partir de esos valores.
- Sidebar de relaciones por paso: vincular hallazgos y user flows existentes o
  crear uno nuevo ya vinculado.
- Guardado automático con demora corta (`jrSave`).

## Dónde vive
`src/journey/journey.js` (editor, `jrNormalizePaso`, etapas, carriles) y
`src/journey/relaciones.js` (sidebar). Datos en `estudios/{id}/flujos/{fid}`:
`etapas`, `carriles`, `pasos:[{..., emocion, touchpoint, tpPills, acciones,
expectativas, pain, oportunidades, hallazgos:[ids], flujos:[ids]}]`.

## No tocar
- `jrNormalizePaso` migra formatos viejos (campos en texto → listas,
  `flujoId` → `flujos`). Mantenerla al agregar campos.
- El render del journey está duplicado en el reporte online (`crJourneyMatrix`)
  y en la página autónoma (`boot.js`).
