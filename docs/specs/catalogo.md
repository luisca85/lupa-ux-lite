# Feature: Catálogo de heurísticas y sesgos  ·  id: cat

Historia de usuario: Como consultor/a UX, quiero una biblioteca de heurísticas y
sesgos propia, para fundamentar cada hallazgo con criterios consistentes.

Objetivo: tener a mano los criterios con los que se evalúa y relacionarlos con
cada hallazgo.

## Criterios de aceptación
- Dado el catálogo, cuando se abre, entonces muestra la base fija: las 10
  heurísticas de Nielsen y los sesgos y patrones de `src/core/catalogo-base.js`,
  sin botón de borrar.
- Dado el modal "Nueva heurística" con nombre, cuando se guarda, entonces aparece
  como "Propia", numerada después de las de Nielsen, y sobrevive a recargar.
- Dado el modal "Nuevo sesgo o patrón" con nombre y categoría (Ley de UX, Sesgo
  cognitivo, Memoria, Principio), cuando se guarda, entonces aparece en su categoría
  y sobrevive a recargar.
- Dado un modal de alta sin nombre, cuando se guarda, entonces no se crea nada y el
  foco vuelve al nombre.
- Dado un texto en el buscador, cuando se escribe, entonces solo quedan las
  heurísticas y sesgos cuyo nombre, descripción o aplicación lo contienen.
- Dado un filtro (Todos, Heurísticas o una categoría), cuando se elige, entonces
  solo se ven los elementos de ese tipo.
- Dado un elemento propio que ningún hallazgo usa, cuando se confirma el borrado,
  entonces desaparece del catálogo.
- Dado un elemento propio que usan uno o más hallazgos (de cualquier estudio),
  cuando se intenta borrar, entonces el aviso dice cuántos hallazgos lo usan y no
  deja borrarlo. (Hoy NO implementado: se borra y el id queda huérfano.)
- Dado un hallazgo con heurísticas y sesgos, cuando se ven la ficha, el reporte
  online, la página compartida o el texto plano, entonces muestran sus nombres.

## Alcance
Vista Catálogo: listado de base + propios, búsqueda, filtro por tipo, alta y borrado
de heurísticas y sesgos propios, y el bloqueo de borrado si están en uso.

## Fuera de alcance / No tocar
- Fuera de alcance: editar elementos propios o las descripciones de la base.
- Los ids base (`nn1`…`nn10`) están guardados en hallazgos existentes: no renumerar.
- `heurById` / `sesgoById`: los usan hallazgos, reportes, journeys, texto plano y la
  página compartida. Cambiar su forma de respuesta rompe todos esos lugares.

## Dependencias
- `store.listCustom` / `saveCustom` / `delCustom` (capa `store`, API tipo Firestore).
- Los hallazgos de todos los estudios, para contar usos antes de borrar.
- Carga inicial de `state.customHeur` / `state.customSesgos` en `main.js` y al
  importar datos (`respaldo.js`).

## Estados (UI)
- Vacío: si la búsqueda o el filtro no dejan resultados, "No hay heurísticas que
  coincidan" / "No hay sesgos que coincidan". (La base nunca está vacía.)
- Carga: A CONFIRMAR (hoy no hay indicador; los propios se cargan al iniciar la app).
- Error: A CONFIRMAR (hoy, si falla la carga de propios al iniciar, se ignora en
  silencio; si falla un alta o borrado en modo `server`, aparece el toast global).

## Diseño
N/A

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan.
- Propio: probar el borrado bloqueado con un propio usado por un hallazgo de otro
  estudio; probar en modo `server` y en modo `idb`.

## Dónde vive
`src/views/catalogo.js` (vista y modales), `src/core/state.js` (`allHeur`,
`allSesgos`, `heurById`, `sesgoById`). Datos propios en `cat_heur/{id}` y
`cat_sesgo/{id}` (globales, no por estudio).

## Conocido
- El texto de la vista dice "Las descripciones son editables", pero no hay edición.
  Corregir el texto (queda fuera de alcance agregar edición).
- Las heurísticas propias se numeran por posición: al borrar una, las siguientes
  cambian de número.
