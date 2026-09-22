# Feature: Reportes

Objetivo: convertir el diagnóstico cargado en tres salidas: un reporte navegable
para el cliente, un export de texto plano, y una página HTML autónoma para compartir.

## Criterios de aceptación
- El reporte del cliente muestra solo secciones habilitadas (toggles en `reporte.online`)
  y nunca notas internas.
- "Vista previa del reporte" abre el reporte navegable (hallazgos, flujos, journeys,
  protopersonas, diagnóstico, propuestas, contacto) en modo solo lectura.
- "Exportar en texto plano" arma todo el estudio como texto para copiar o descargar .txt.
- "Generar página para compartir" produce un HTML autónomo con datos e imágenes
  embebidos, que abre cualquiera sin cuenta.
- La sección Reportes usa un layout de columnas tipo mosaico (sin el visor PDF, que
  fue removido).

## Dirección visual
Barra de acciones arriba; bloques de configuración en columnas (`.rpt-cols2`).
El reporte del cliente usa las clases `.cr-*` (mismo look en online y autónomo).

## No tocar
- No reintroducir el reporte/preview PDF (se removió a propósito).
- La lógica de render del reporte está duplicada entre online (`crPropuestas`,
  `crDiagnostico`, etc., en `src/reportes/cliente.js`) y autónomo (`SR_boot` en
  `src/share/boot.js`: `secProp`, `secDiag`). Cambiar una
  obliga a cambiar la otra.
