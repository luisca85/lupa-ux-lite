# Feature: Catálogo de heurísticas y sesgos

Objetivo: tener a mano los criterios con los que se evalúa y relacionarlos con
cada hallazgo.

## Criterios de aceptación
- Base fija: las 10 heurísticas de Nielsen y una lista de sesgos cognitivos
  (`src/core/catalogo-base.js`). No se pueden editar ni borrar.
- Heurísticas y sesgos propios: alta, edición y borrado. Las heurísticas propias
  se numeran después de las de Nielsen.
- Búsqueda por texto y filtro por tipo.
- Los hallazgos guardan los ids de heurísticas y sesgos; el reporte muestra sus
  nombres.

## Dónde vive
`src/views/catalogo.js` (vista y modales), `src/core/state.js` (`allHeur`,
`allSesgos`, `heurById`, `sesgoById`). Datos propios en `cat_heur/{id}` y
`cat_sesgo/{id}` (globales, no por estudio).

## No tocar
- Los ids base (`nn1`…`nn10`) están guardados en hallazgos existentes: no renumerar.

## A CONFIRMAR
- Qué pasa con un hallazgo que referencia una heurística propia borrada (hoy el
  id queda en el hallazgo y no se muestra).
