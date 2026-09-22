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

## Contenido que se carga en la pestaña Reportes
- Título del informe, resumen ejecutivo, objetivos, alcance, métricas y metas
  (una línea por ítem), diagnóstico (intro, hallazgos clave, recomendaciones),
  aviso de "muestra inicial", propuestas (ver `propuestas.md`).
- Protopersonas: nombre, edad, título/arquetipo, ubicación, ocupación, bio,
  objetivos, necesidades, dolores. Viven en `reporte.protopersonas`; la pestaña
  "Protopersonas" del estudio todavía es un marcador de "Próximamente".
- Marca del autor (global, `marca/perfil`): wordmark, logo, imagen de cabecera,
  nombre, rol, sitio, email, teléfono, color, servicio (nombre, descripción, URL).

## Dirección visual
Barra de acciones arriba; bloques de configuración en columnas (`.rpt-cols2`).
El reporte del cliente usa las clases `.cr-*` (mismo look en online y autónomo).

## No tocar
- No reintroducir el reporte/preview PDF (se removió a propósito).
- La lógica de render del reporte está duplicada entre online (`crPropuestas`,
  `crDiagnostico`, etc., en `src/reportes/cliente.js`) y autónomo (`SR_boot` en
  `src/share/boot.js`: `secProp`, `secDiag`). Cambiar una
  obliga a cambiar la otra.
- `ensureReporte` completa campos faltantes y migra datos viejos (reemplaza el
  seed viejo de 2 propuestas por las 3 actuales). No quitar esas migraciones.

## Conocido
- `reportLink()` (link `#reporte/{id}`) no se usa: era para compartir el reporte
  online en claude.ai. Con Cloudflare Access, ese link pediría login al cliente.
  A CONFIRMAR si se borra o se reemplaza por otra forma de compartir.
- La página autónoma y el reporte online difieren en colores de severidad
  (`RSEV` vs `--sev*`) y la autónoma no tiene filtros de hallazgos.
