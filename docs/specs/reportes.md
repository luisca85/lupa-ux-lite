# Feature: Reportes  ·  id: rpt

Historia de usuario: Como consultor/a UX, quiero convertir el diagnóstico en un
reporte navegable, un texto plano, una página autónoma y un link público con PIN,
eligiendo qué ve el cliente, para entregarlo sin que necesite cuenta y sin exponer
lo que no quiero mostrar.

Objetivo: separar la información general del proyecto (pestaña Proyecto) de la
configuración del reporte (pestaña Reportes), y convertir el diagnóstico en cuatro
salidas: vista previa, texto plano, página HTML autónoma y link público de solo
lectura protegido con PIN y consentimiento.

## Criterios de aceptación

### Pestaña Proyecto (información general del estudio)
- Dado un estudio, cuando se abre, entonces la primera pestaña es "Proyecto" y
  contiene Resumen ejecutivo, Diagnóstico estratégico, Protopersonas, Propuestas de
  trabajo y Muestra inicial; los cambios se guardan solos (~600 ms) y sobreviven a
  recargar. Los datos siguen en `estudio.reporte` (sin migración).

### Qué ve el cliente (pestaña Reportes)
- Dada la pestaña Reportes, cuando se abre, entonces muestra "Qué ve el cliente":
  por sección un interruptor (hallazgos, flujos, journeys, protopersonas,
  diagnóstico, propuestas, contacto) y, donde hay ítems, "Elegir" para marcar uno
  por uno con "Todos" / "Ninguno" y el conteo "N de M". "Inicio (información del
  proyecto)" permite ocultar Introducción, Objetivos, Alcance y el aviso de muestra.
- Dado un ítem nuevo, cuando se crea, entonces aparece visible (se guardan los
  ocultos en `reporte.ocultos`, no los visibles).
- Dada una sección apagada o un ítem oculto, cuando se abre la vista previa, se
  genera la página autónoma o se publica el link, entonces ese contenido NO viaja
  (verificable buscando el texto en el HTML descargado o en la respuesta pública).
- Dado un hallazgo oculto (o la sección Hallazgos apagada), cuando se muestran
  flujos o journeys, entonces sus marcadores y relaciones con ese hallazgo no aparecen.
- Dadas protopersonas y propuestas, cuando se editan, entonces conservan su `id`
  (y con él su selección).

### Link público con PIN
- Dada la pestaña Reportes sin publicar, cuando se toca "Publicar reporte", entonces
  se guarda una foto del reporte filtrado en `publicos/{id}` (en partes de ≤600 000
  caracteres) y se muestran el link `/r/{id}` y un PIN de 6 dígitos, con "Copiar".
- Dado un reporte publicado, cuando se toca "Actualizar publicación", entonces la foto
  se reemplaza en el mismo link y con el mismo PIN; "Generar PIN nuevo" (con
  confirmación) invalida el anterior; "Despublicar" (con confirmación) borra la foto y
  el link deja de funcionar.
- Dado el link `/r/{id}`, cuando se abre, entonces pide PIN, nombre y aceptación de
  las condiciones de uso, sin cargar la app interna ni llamar a su API.
- Dado `POST /api/publico` con link inexistente o PIN incorrecto, cuando se pide,
  entonces responde 401 "Link o PIN incorrecto." (mismo mensaje en ambos casos);
  con 5 fallos seguidos bloquea ese link 15 minutos (429), aun con el PIN correcto.
- Dado el PIN correcto sin nombre o sin aceptación, cuando se pide, entonces responde
  400 y NO entrega el reporte.
- Dado PIN, nombre y aceptación, cuando se pide, entonces registra el consentimiento
  (nombre y fecha) en `publicos/{id}` y entrega la foto; se guardan solo los últimos
  10 registros por link. El dueño los ve en Reportes → Link público, y se conservan
  al actualizar la publicación.
- Dada la API con Access activo, cuando se pide cualquier otra ruta (incluida leer
  `publicos/` por `/api/doc` o `/api/collection`) sin JWT, entonces responde 401:
  `/api/publico` es la única ruta fuera de `authorize()`.
- El PIN en claro vive solo en el estudio (detrás de Access); en `publicos/` se guarda
  `sha256(sal + ":" + PIN)`. El PIN nunca viaja en la URL.

### Reporte del cliente (vista previa, link público y página autónoma)
- Dado el reporte abierto, cuando se ve, entonces usa un sidebar al estilo shadcn/ui:
  header con estudio y cliente, grupo "Reporte" con ícono y conteo por sección,
  footer con el autor, botón para colapsar a íconos (256 → 48 px) y, en ≤ 768 px,
  panel lateral con fondo que se cierra al elegir una sección.
- Dada la primera sección, cuando se abre, entonces se llama "Presentación" y muestra:
  bienvenida y dos aclaraciones ("Hecho por una persona, no por una herramienta
  automática" y "Es un diagnóstico inicial"), editables desde la Marca (vacías = texto
  por defecto), datos del estudio, resumen, indicadores, objetivos, alcance y, al final, el bloque
  del autor (nombre, rol, estudio, servicio, contacto) con "Dejar recomendación en
  LinkedIn" si la Marca tiene LinkedIn.
- Dada la Marca con LinkedIn, cuando el cliente toca otra sección por primera vez,
  entonces aparece "¿Me dejarías una recomendación?" con "Dejar recomendación en
  LinkedIn" y "Ver el reporte"; se puede saltear y no vuelve a aparecer.
- Dado el reporte, cuando el cliente intenta seleccionar, copiar, cortar, usar clic
  derecho, arrastrar imágenes, Ctrl/Cmd+C/X/A/P/S/U o imprimir, entonces se bloquea
  (no evita capturas de pantalla).
- Dado un journey, cuando se abre su detalle, entonces el mapa ocupa el 100% del
  ancho del contenedor y tiene el mismo desplazamiento del editor: slider y flechas
  arriba y abajo, sincronizados, visibles solo si el mapa no entra.
- Dado un estudio, cuando se usa "Vista previa del reporte", entonces se ve el mismo
  reporte que el link público (mismo `SR_boot`, mismos filtros), sin pedido de PIN ni
  consentimiento, con un botón para cerrar la vista previa. Deja de haber un render
  aparte del reporte en la app (`cliente.js`).

### Salidas que ya existían
- Dado un estudio, cuando se usa "Exportar en texto plano", entonces se abre un modal
  con todo el estudio como texto, con "Copiar todo" (con alternativa si el
  portapapeles falla) y "Descargar .txt" (`<nombre del estudio>.txt`).
- Dado un estudio, cuando se usa "Generar página para compartir", entonces se
  descarga `<nombre>-reporte.html`, autónomo (datos, estilos e imágenes con
  anotaciones embebidos), que abre sin cuenta ni red, con el mismo diseño del link
  público pero sin pedido de PIN ni consentimiento.
- Dada la app, cuando se abre con `#reporte/{id}`, entonces NO abre un reporte: la
  ruta y `reportLink()` se eliminan.

## Alcance
Pestaña Proyecto; pestaña Reportes (acciones, qué ve el cliente, link público con
consentimientos); `reportes/seleccion.js` y `reportes/publicar.js`; ruta
`POST /api/publico`; página `/r/{id}` (`share/publico.js`); rediseño de `SR_boot`
(sidebar, Presentación, LinkedIn, sin copia, journey a ancho completo); campos
LinkedIn y bienvenida en la Marca; la limpieza de `#reporte/{id}`.

## Fuera de alcance / No tocar
- Fuera de alcance: el contenido de las propuestas (ver `propuestas.md`); verificar
  la identidad de quien acepta (se guarda el nombre que escribe); consentimiento en la
  página HTML descargable (no tiene servidor donde registrarlo).
- No reintroducir el reporte/preview PDF (se removió a propósito).
- `SR_boot` (`src/share/boot.js`) es el único render del reporte del cliente: lo usan
  la vista previa, el link público y la página autónoma. No volver a duplicarlo.
- Fuera de alcance: la pestaña "Protopersonas" del estudio queda en "Próximamente"
  (las protopersonas se editan en Proyecto).
- `boot.js` se incrusta como TEXTO: no puede importar nada.
- `ensureReporte` completa campos faltantes, migra datos viejos (seed viejo de
  propuestas) y ahora asigna `id` a protopersonas y propuestas. No quitar esas migraciones.
- `publico()` en `functions/api` no debe leer nada fuera de `publicos/` ni devolver
  otro contenido que la foto publicada.

## Dependencias
- Cloudflare Access: una aplicación con política **Bypass** solo para
  `lupaux.uxuaria.com/r/*` y `lupaux.uxuaria.com/api/publico` (sin eso, Access pide
  login al cliente). El resto sigue detrás de la aplicación "Lupa UX".
- `store`, `flowStore`, `brandStore` (`marca/perfil`, con `linkedin`, `bienvenida`,
  `notaIA` y `notaInicial`),
  la capa `DB` para `publicos/`, y D1 en la API pública.
- `vistaCliente()` (filtro central), `collectShareData`, `SR_boot`, `compositeDataUrl`,
  `downloadFile`, Web Crypto (`crypto.subtle`, `getRandomValues`).

## Estados (UI)
- Vacío: "Todavía nadie abrió el link." en consentimientos; "vacío" en secciones sin
  ítems; en el reporte, las secciones sin contenido no aparecen en el sidebar.
- Carga: "Cargando datos del estudio..." en la pestaña; "Publicando..." al publicar;
  "Abriendo..." en el pedido de PIN; "Generando..." al generar la página.
- Error: "Link o PIN incorrecto.", "Demasiados intentos…", "Para ver el reporte,
  escribí tu nombre y aceptá las condiciones de uso.", "Sin conexión…" en `/r/{id}`;
  "No se pudo: …" al publicar; "No se pudieron cargar." en consentimientos.

## Diseño
N/A (sin Figma). Referencia visual del sidebar: componente Sidebar de shadcn/ui.

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan.
- Propio: buscar en el HTML descargado y en la respuesta de `/api/publico` un dato
  oculto (no debe estar); con `AUTH_MODE=access` y sin JWT, todas las rutas salvo
  `/api/publico` dan 401; probar PIN incorrecto, bloqueo, consentimiento obligatorio,
  actualizar / PIN nuevo / despublicar; probar el reporte en 375 px y el journey a
  ancho completo.

## Contenido que se carga en la pestaña Proyecto
- Título del informe, resumen ejecutivo, objetivos, alcance, métricas y metas
  (una línea por ítem), diagnóstico (intro, hallazgos clave, recomendaciones),
  aviso de "muestra inicial", propuestas (ver `propuestas.md`).
- Protopersonas: nombre, edad, título/arquetipo, ubicación, ocupación, bio,
  objetivos, necesidades, dolores. Viven en `reporte.protopersonas`.
- Marca del autor (global, `marca/perfil`, se edita desde Reportes → Marca):
  wordmark, logo, imagen de cabecera, nombre, rol, sitio, email, teléfono, color,
  servicio (nombre, descripción, URL), LinkedIn, texto de bienvenida y las dos
  aclaraciones de Presentación (hecho por una persona / diagnóstico inicial).

## Dirección visual
Panel: barra de acciones arriba; bloques en columnas (`.rpt-cols2`). Reporte del
cliente: sidebar `.sb-*` (tokens `--sidebar*`), contenido `.cr-*`, Presentación
`.pr-*`, pedido de PIN `.pub-*`.

## Dónde vive
`src/reportes/panel.js` (pestañas Reportes y Proyecto, modales, link público),
`seleccion.js` (`vistaCliente`, `ocultos`), `publicar.js` (publicar, despublicar,
consentimientos), `cliente.js` (vista previa: monta `SR_boot`), `comun.js` (`ensureReporte`,
`saveReporte`, `marcaActual`), `texto-plano.js`, `src/share/compartir.js`
(`collectShareData`, `generateSharePage`, `montarReportePublico`),
`src/share/publico.js` (página `/r/{id}`), `src/share/boot.js` (`SR_boot`) y
`functions/api/[[path]].js` (`publico()`). Datos en `estudios/{id}.reporte`
(`ocultos`, `publico`) y `publicos/{id}` + `publicos/{id}/partes/{n}`.

## Conocido
- El reporte del cliente usa sus propios colores de severidad (`RSEV` en `boot.js`),
  distintos de los de la app (`--sev*`), y no tiene filtros de hallazgos.
- La sección Hallazgos aparece en el menú aunque el estudio no tenga hallazgos (las
  demás se ocultan si están vacías).
- El bloqueo de copia frena la copia casual; no impide capturas ni las herramientas
  del navegador.
- El PIN es una llave compartida: quien reciba link y PIN puede entrar (se corta con
  "Generar PIN nuevo" o "Despublicar").
