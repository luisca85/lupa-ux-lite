# Feature: Reportes  ·  id: rpt

Historia de usuario: Como consultor/a UX, quiero configurar el reporte viendo cómo
queda para el cliente y compartirlo con un link y un PIN, para entregarlo sin que
necesite cuenta, saber si está al día y enterarme cuando quiere contratar.

Objetivo: tres pantallas con el mismo esquema (panel a la izquierda, contenido a la
derecha):
- **Reportes:** compartir y elegir qué ve el cliente, con vista previa en vivo.
- **Configuración:** el contenido del proyecto, la marca y las propuestas.
- **Reporte del cliente:** link público con hallazgos en grilla y "Trabajemos juntos"
  con reserva.

Sale de la exploración `explorar/reportes-panel` (Figma 49:1470).

## Criterios de aceptación

### Reportes: panel de configuración + vista previa en vivo
- Dada la pestaña Reportes, cuando se abre, entonces se ven:
  - **A la izquierda**, un panel de 480 px con la tarjeta **Compartir** y "Qué ve el
    cliente".
  - **A la derecha**, la vista previa del reporte del cliente con el estado
    "Actualizando…" / "Al día" y "Pantalla completa".
  - No hay modales en el panel, salvo el de Compartir.
- Dado un cambio en "Qué ve el cliente", en Configuración o en la Marca, cuando se
  vuelve a Reportes o se cambia un interruptor, entonces la vista previa se actualiza
  sola (~350 ms de espera) y conserva la sección abierta, el filtro y el scroll.
- Dado un panel angosto (ventana ≤ 1280 px), cuando se ve la vista previa, entonces el
  reporte se dibuja como escritorio (1024 px de ancho) y se escala para entrar: no
  pasa a la versión de celular.
- Dada la vista previa, cuando se toca "Pantalla completa", entonces se abre la vista
  previa de siempre (`montarVistaPrevia`), con "Cerrar vista previa".
- La vista previa es el mismo `SR_boot` que el link público, montado en un iframe con
  `D.preview` (sin bloqueo de copia ni pedido de PIN).

### Qué ve el cliente
- Dada la pestaña Reportes, cuando se abre, entonces "Qué ve el cliente" está siempre
  desplegado (sin acordeón). Tiene:
  - un interruptor por sección: hallazgos, flujos, journeys, diagnóstico, propuestas y
    contacto;
  - "Elegir" para marcar ítem por ítem, con "Todos" / "Ninguno" y el conteo "N de M".
- "Inicio (información del proyecto)" permite ocultar Introducción, Objetivos, Alcance
  y el aviso de muestra.
- Dado un ítem nuevo, cuando se crea, entonces aparece visible (se guardan los ocultos
  en `reporte.ocultos`, no los visibles).
- Dada una sección apagada o un ítem oculto, cuando se ve la vista previa o se publica
  el link, entonces ese contenido NO viaja (verificable en la respuesta de
  `/api/publico`).
- Dado un hallazgo oculto (o la sección Hallazgos apagada), cuando se muestran flujos o
  journeys, entonces sus marcadores y relaciones con ese hallazgo no aparecen.
- La lista de hallazgos muestra el título y "Sev N". No muestra el tipo.

### Compartir (link público con PIN)
- Dada la tarjeta Compartir, cuando se mira, entonces tiene:
  - el botón azul **Compartir** (`--sel`, ícono de link);
  - una **etiqueta de estado** y una línea de detalle;
  - el botón de ayuda **?**.
- La etiqueta muestra uno de tres estados:
  - **Sin publicar** (gris): "Compartir genera un link con PIN para tu cliente."
  - **Publicado** (verde): "Foto del {fecha}".
  - **Cambios sin publicar** (ámbar): "Tu cliente todavía ve la foto del {fecha} (al
    compartir se actualiza sola)".
- Dado un reporte publicado, cuando cambia algo de lo que ve el cliente, entonces la
  etiqueta pasa a **Cambios sin publicar**. Si se deshace el cambio, vuelve a
  **Publicado**. Los cambios que cuentan son:
  - qué ve el cliente;
  - la Marca;
  - los datos del proyecto;
  - las propuestas;
  - hallazgos nuevos o editados.
- La comparación usa la huella de los datos publicados (`firmaReporte`: SHA-256 de lo
  mismo que se publica, con cada imagen reducida a su largo y su final), guardada en
  `reporte.publico.firma`.
- Dada una publicación sin huella (hecha antes de este cambio), cuando se ve la
  etiqueta, entonces dice **Publicado**.
- Dado un estado distinto de **Publicado** al día (sin publicar, con cambios o sin
  huella), cuando se toca **Compartir**, entonces primero publica o actualiza, con el
  mismo link y el mismo PIN, mostrando "Publicando…" / "Actualizando…". Recién después
  abre el modal.
- Dado el modal **Compartir reporte**, cuando se abre, entonces muestra:
  - "Publicado y al día · foto del {fecha}";
  - el link `/r/{id}` y el PIN de 6 dígitos, cada uno con **Copiar**;
  - el consejo "Mandá el link y el PIN por canales distintos";
  - **Generar PIN nuevo**, **Despublicar** y **Listo**.
- El modal **no** tiene "Actualizar publicación". Se cierra con Listo, la X, Escape o
  un clic afuera.
- **Generar PIN nuevo** y **Despublicar** piden confirmación dentro del modal:
  - Generar PIN nuevo invalida el anterior y vuelve a mostrar el modal con el PIN
    nuevo.
  - Despublicar borra la foto, el link deja de funcionar y la etiqueta pasa a **Sin
    publicar**.
- Dado el botón **?**, cuando se toca, entonces abre un globo anclado a la tarjeta (no
  un modal) con:
  - "Cómo funciona el link y el PIN", en 5 pasos: Compartir y la foto, canales
    distintos, qué hace el cliente, reservas y seguridad;
  - la lista de **Reservas** ("Reservaron {propuesta} · fecha");
  - la lista de **Consentimientos** ("Abrieron el link · fecha").
  - Las de antes del 2026-10-21 muestran el nombre con que entró el cliente.
- El globo se cierra con Escape, con un clic afuera o con el mismo botón.
- Se mantiene lo que ya existía del link público:
  - foto en `publicos/{id}` + `publicos/{id}/partes/{n}`, en partes de ≤ 600 000
    caracteres;
  - página `/r/{id}` con PIN y aceptación de las condiciones (ver "Entrar al link
    público");
  - 401 "Link o PIN incorrecto." (mismo mensaje para link inexistente o PIN
    incorrecto);
  - 5 fallos seguidos bloquean el link 15 minutos (429);
  - con PIN correcto pero sin consentimiento, 400 y no entrega el reporte;
  - se guardan los últimos 10 consentimientos y se conservan al actualizar;
  - en `publicos/` va `sha256(sal + ":" + PIN)`; el PIN en claro vive solo en el
    estudio y nunca viaja en la URL;
  - con Access activo, toda otra ruta sin JWT da 401.
- Se elimina "Descargar página HTML" (`generateSharePage`). El link es la única forma de
  **entregar** el reporte al cliente. El texto plano vuelve, pero solo como exportación
  para el administrador (ver "Exportar").

### Reporte del cliente (`SR_boot`)
- Se mantiene:
  - el sidebar al estilo shadcn/ui, con header, grupo "Reporte", footer con el autor,
    colapsable y con panel lateral en ≤ 768 px;
  - Presentación, con bienvenida, aclaraciones, indicadores y bloque del autor;
  - el pedido de recomendación en LinkedIn;
  - el bloqueo de copia;
  - el journey a ancho completo.
- Dada la sección **Hallazgos**, cuando se abre, entonces muestra:
  - una **grilla de cards** (columnas de ≥ 230 px) ordenadas de mayor a menor
    severidad;
  - en cada card, la captura de la pantalla con su pin, la severidad con su color y
    nombre, el título y la pantalla;
  - al tocar una card, el detalle (como antes).
- Dados hallazgos de 2 o más severidades, cuando se ve la sección, entonces arriba hay
  chips de filtro: **Todas N** y uno por severidad presente (Catástrofe, Mayor, Menor,
  Cosmético, No es problema), con su color y conteo. El activo va relleno con su color.
- Dado el menú, cuando se mira, entonces **Flujos** y **User Journeys** aparecen
  habilitados (desde el 2026-10-20) si hay al menos uno que el cliente vea y no se
  apagaron en "Qué ve el cliente". Ya no hay "Pronto".

### Flujos y User Journeys en el reporte (2026-10-20, exploración `explorar/reporte-flujos`)
- Dada la sección **Flujos**, cuando se abre, entonces:
  - lista los User Flows visibles;
  - cada uno abre su diagrama (interacciones, happy path y desvíos);
  - cada interacción abre su detalle, con "Ve" y "Hace", la imagen y los hallazgos
    numerados.
- Dada una interacción que usa una pantalla del estudio (`pantallaId`), cuando se ve,
  entonces muestra esa pantalla (miniatura en el diagrama, imagen completa en el
  detalle). El pin de cada hallazgo va donde está en Hallazgos (`hallazgo.pin`), igual que
  en la app.
- Dada la sección **User Journeys**, cuando se abre un journey, entonces se ve el mapa:
  - las etapas, con su descripción al pasar el mouse;
  - pasos, carriles y curva emocional;
  - una fila **Hallazgos**, con los hallazgos visibles de cada paso. Cada uno abre su
    detalle y vuelve con "User Journey".
- Dado el detalle de un hallazgo, cuando está en pasos visibles, entonces muestra **"Dónde
  aparece"**, con un botón por paso ("User Flow" o "User Journey" · flujo · N. paso):
  - el de un flow abre la interacción;
  - el de un journey abre el mapa desplazado hasta el paso, que se resalta.
- Lo oculto en "Qué ve el cliente" no aparece: ni los flows o journeys ocultos, ni los
  hallazgos ocultos en marcas, pasos o "Dónde aparece".

### Exportar (solo para el administrador, 2026-10-20)
- Dada la pestaña Reportes, cuando entra el administrador (o sin cuentas, en local o
  `idb`), entonces hay una sección **Exportar · Solo para vos** con dos botones:
  - **Texto plano (.txt)**: estudio, autor, presentación, diagnóstico, todos los
    hallazgos (código H1…, severidad, pantalla y pin, descripción, recomendación,
    heurísticas, sesgos, "Aparece en"), los user journeys (etapas con descripción; cada
    paso con etapa, emoción, touchpoint, acciones, expectativas, pain points,
    oportunidades, hallazgos y user flows) y los user flows (interacciones y conexiones);
  - **JSON para IA (.json)**: `formato: "lupa-ux/reporte"`, `version: 1`,
    `instrucciones_para_ia`, `escala_severidad`, `estudio`, `autor`, `presentacion`,
    `diagnostico`, `hallazgos`, `user_flows`, `user_journeys` y `totales`. Los pasos y las
    interacciones referencian los hallazgos por su código.
- Los dos tienen **lo mismo que ve el cliente** (`vistaCliente`): lo oculto no sale y
  nunca hay notas internas, PIN ni datos del link. No llevan imágenes.
- El archivo se llama `{estudio}-reporte-{AAAA-MM-DD}.txt` o `.json`.
- Dada una cuenta de la beta, cuando abre Reportes, entonces no ve Exportar: entrega el
  reporte solo por el link (`puedeExportar()`). El cliente nunca tiene exportación.
- Dado el menú, cuando se mira, entonces no hay **Protopersonas** ni **Trabajemos
  juntos**.
- Dadas propuestas visibles, cuando se ve cualquier sección, entonces abajo a la
  derecha hay un botón flotante grande, azul y redondeado: **Trabajemos juntos**
  (56 px de alto; 50 px en ≤ 800 px). No aparece en la página de gracias ni sin
  propuestas.
- Dado **Trabajemos juntos**, cuando se toca, entonces se abre un modal:
  - antetítulo, título y descripción editables (por defecto "Trabajemos juntos",
    "Sigamos mejorando tu producto" y "Elegí cómo querés avanzar…");
  - las propuestas como **cards de pricing en columnas** (hasta 3 por fila; 1 en
    ≤ 800 px), con la misma tarjeta `propCard` de siempre;
  - la recomendada (elegida en Configuración, o ninguna) destacada con borde azul y la
    etiqueta "Recomendado". Los reportes publicados antes del cambio destacan la
    primera si hay más de una;
  - en cada card, su botón de reserva (por defecto **Reservar ahora tu diagnóstico**);
  - debajo, las preguntas frecuentes de la propuesta elegida.
  - El detalle está en `propuestas.md`.
- El modal se cierra con la X, Escape o un clic afuera.
- Dado **Reservar ahora tu diagnóstico**, cuando se toca en el link público, entonces:
  - envía `POST /api/publico` con `accion:"reserva"`, el mismo id y PIN y la propuesta
    (id, título y precio como texto). No manda datos de quien reserva;
  - si responde bien, muestra la **página de gracias**;
  - si falla, el modal sigue abierto con "No pudimos registrar la reserva. Revisá tu
    conexión y probá de nuevo."
- En la vista previa de la app, Reservar no envía nada y muestra la página de gracias.
- Dada la página de gracias, cuando se ve, entonces tiene:
  - el logo de **uxuaria** (marca de la home);
  - un check;
  - "¡Gracias! Tu reserva está confirmada";
  - "Ya recibí tu decisión de avanzar con {propuesta}. Me voy a comunicar con vos muy
    pronto para coordinar los próximos pasos.";
  - la propuesta reservada con su precio;
  - tres pasos (Te escribo, Conversamos, Arrancamos);
  - el contacto de la Marca, si hay;
  - "Volver al reporte".

### Entrar al link público (2026-10-21, exploración `explorar/reportes-condiciones`)
- Dado `/r/{id}`, cuando se abre, entonces se pide solo el **PIN** y aceptar las
  **Condiciones de uso**, con una sola casilla ("Acepto las condiciones de uso"). No se
  pide nombre ni email.
- Las condiciones dicen:
  - que el reporte es confidencial y de solo lectura, y que se registra la aceptación y
    la fecha, que se le muestran a quien lo compartió;
  - que **quien preparó el reporte** puede mencionar que lo realizó y compartir
    aprendizajes generales sobre la experiencia, sin revelar información clave ni datos
    confidenciales;
  - con links a las condiciones de los reportes y a la política de privacidad.
- Vale igual para todos los reportes, de uxuaria y de las cuentas de la beta. Ya no
  existe la casilla aparte "Una condición más de uxuaria".
- Sin aceptar, la app muestra "Para ver el reporte tenés que aceptar las condiciones de
  uso." y el servidor responde 400 ("Para ver el reporte, aceptá las condiciones de
  uso.").
- Al entrar, el servidor guarda `{fecha, mencion:true}` en
  `publicos/{id}.consentimientos` (los últimos 10), sin datos de quien entra.
- La card del PIN se achica al ancho del celular (antes desbordaba en pantallas
  angostas).

### Reservas (API)
- Dado `POST /api/publico` con `accion:"reserva"`, cuando el PIN es correcto, entonces:
  - exige el título de la propuesta (si falta, 400 "Faltan datos de la reserva.");
  - guarda `{propuesta:{id, titulo, precio}, fecha}` en `publicos/{id}.reservas`
    (las últimas 20);
  - responde `{ok:true, enviado}`.
- La reserva sigue las mismas reglas de PIN y bloqueo que abrir el link. No exige el
  consentimiento de nuevo.
- Las reservas se conservan al actualizar la publicación y se borran al despublicar.
- Dada una reserva, cuando existe `RESEND_API_KEY`, entonces manda un correo con Resend:
  - asunto: "Nueva reserva: {propuesta}";
  - a `RESERVA_TO` (por defecto `info@uxuaria.com`), con copia a `RESERVA_CC`;
  - desde `RESERVA_FROM` (por defecto `Lupa UX <reservas@uxuaria.com>`);
  - con "Tu cliente reservó {propuesta}", precio, estudio, cliente y fecha (hora de
    Buenos Aires).
- Si el correo falla o no está configurado, la reserva igual queda guardada
  (`enviado:false`) y el cliente ve la página de gracias.
- Al publicar, `publicos/{id}` también guarda `estNombre` y `estCliente` para el correo.

### Pestañas propias (2026-10-21, exploración `explorar/reporte-pestanas-custom`)
- Dada la pestaña Reportes, cuando se abre, entonces debajo de "Qué ve el cliente" está
  **Pestañas propias**:
  - sin pestañas, el texto "Sumá una pestaña al menú del reporte con tu propio
    contenido: un HTML que pegás o un texto con formato.";
  - con pestañas, una fila por cada una con su casilla de visible, el nombre, el tipo
    (HTML o Texto, y "· oculta" si está oculta), ↑ ↓ para el orden y **Editar**;
  - el botón **+ Nueva pestaña**.
  - Cada cambio (casilla, orden, guardar, eliminar) se guarda solo y actualiza la vista
    previa.
- Dado **+ Nueva pestaña** o **Editar**, cuando se toca, entonces se abre un modal con:
  - **Nombre en el menú** (hasta 40 caracteres, obligatorio: "Poné un nombre para el
    menú.");
  - **Contenido**: "Texto con formato" o "HTML". Lo escrito en cada modo se conserva al
    cambiar de uno a otro, pero se guarda solo el del modo elegido;
  - **Mostrar al cliente** (marcado por defecto);
  - **Crear pestaña** o **Guardar**, **Cancelar** y, si ya existe, **Eliminar pestaña**
    con confirmación ("La pestaña … deja de aparecer en el reporte. No se puede
    deshacer.").
- Dado el modo **HTML**, cuando se pega o se escribe código, entonces a la derecha
  "Así se ve en el reporte" lo muestra con sus estilos (~300 ms después de escribir).
  Tab inserta dos espacios. Sin código no se guarda ("Pegá el código HTML."). Más de
  400 KB tampoco ("El HTML pesa N KB; el máximo es 400 KB. Probá sin imágenes
  incrustadas.").
- Dado el modo **Texto con formato**, cuando se escribe, entonces el editor muestra el
  texto con los mismos estilos que el reporte, y tiene:
  - estilos de párrafo: Párrafo, Título, Subtítulo, Cita y Destacado;
  - negrita, cursiva y subrayado (también con Ctrl/Cmd + B, I y U);
  - lista con viñetas, lista numerada y separador;
  - Link (sobre el texto seleccionado, con "Aplicar" y "Quitar"; sin `http`, se agrega
    `https://`) y Limpiar (quita el formato).
  - Enter en una Cita o un Destacado vacíos vuelve a Párrafo.
  - Al pegar, se conservan los títulos, las listas, las negritas y los links, y se
    descarta el resto.
- Dada una pestaña visible con nombre, cuando el cliente abre el reporte, entonces
  aparece en el menú lateral antes de **Contacto**, en el orden elegido, con un ícono
  de documento (Texto) o de código (HTML). Las ocultas no viajan (`vistaCliente`).
- Dada una pestaña abierta en el reporte, cuando se ve, entonces no tiene título en la
  página: solo su contenido.
  - **Texto**: con el estilo de lectura del reporte (Título 22 px, Subtítulo 17 px, Cita
    con borde a la izquierda, Destacado con fondo azul claro).
  - **HTML**: ocupa todo el ancho del contenido, sin borde ni margen. Toma el alto de lo
    que muestra (también si cambia después de cargar), así que no tiene scroll propio:
    el scroll es el de la página.
- Seguridad:
  - El HTML va en un iframe con `sandbox="allow-scripts allow-popups
    allow-popups-to-escape-sandbox"`, sin `allow-same-origin`. Sus scripts corren, pero
    no pueden leer ni cambiar el reporte, la app ni la sesión.
  - El texto se limpia con una lista blanca al guardar y otra vez en `SR_boot`
    (`limpiarTexto`). Solo quedan p, h2, h3, h4, blockquote, aside, listas, b, i, u, br,
    hr y links `http(s):` o `mailto:`, que abren en otra pestaña. Se borran scripts,
    estilos, iframes, atributos y eventos.

### Configuración: menú lateral + contenido
- Dada la pestaña Configuración, cuando se abre, entonces:
  - a la izquierda hay un panel de 320 px con el menú **Datos del proyecto**, **Marca**
    y **Propuestas de trabajo** (ícono, nombre y subtítulo; el activo marcado);
  - a la derecha se carga el contenido del ítem.
- Al recargar, se vuelve al ítem en el que se estaba.
- Dado **Datos del proyecto**, cuando se abre, entonces muestra tres tarjetas, en este
  orden, que se guardan solas (~600 ms):
  1. **Muestra inicial**: interruptor y texto.
  2. **Resumen ejecutivo**: título, introducción, objetivos, alcance, métricas y metas.
  3. **Diagnóstico estratégico**: introducción, hallazgos clave y recomendaciones
     prioritarias.
- Dado un hallazgo clave o una recomendación, cuando se toca o se agrega, entonces se
  edita en el mismo panel:
  - con **← Datos del proyecto**, **Guardar**, **Cancelar** y, si ya existe,
    **Eliminar** (con confirmación en el panel);
  - sin título no se guarda ("Poné un título").
- Dada **Marca**, cuando se abre, entonces está el formulario de la marca global
  (imágenes, datos, LinkedIn, textos de Presentación, servicio), con guardado
  automático y "Guardando…" / "Guardado".
- Dadas **Propuestas de trabajo**, cuando se abren, entonces se ven:
  - arriba, la tarjeta de textos de "Trabajemos juntos" con el plan recomendado y
    **Vista previa** (ver `propuestas.md`);
  - una grilla de cards con tipo, título, precio ("A definir" si no tiene monto) y
    hasta 3 ítems de "qué incluye" ("+N más");
  - en cada card, la posición "N de M" y flechas ← → para cambiar el orden que ve el
    cliente;
  - al final, la card **+ Nueva propuesta**.
- Dada una propuesta, cuando se toca o se crea, entonces se edita en el mismo panel
  con **← Propuestas de trabajo**:
  - los mismos campos de antes: título, tipo, descripción, qué incluye, precio
    (monto/a definir, moneda), lanzamiento con vista previa del "antes" y descuentos
    por pago adelantado;
  - **Guardar** (no se guarda solo), **Cancelar** y **Eliminar** con confirmación.
  - Volver sin guardar no cambia nada.
- Se quita la tarjeta de **Protopersonas**:
  - los datos guardados en `reporte.protopersonas` no se borran;
  - no viajan al cliente (`collectShareData` manda `protopersonas:[]`);
  - no aparecen en "Qué ve el cliente".

### Pestañas del estudio
- **Métricas** queda oculta (`oculta:true` en `STUDY_TABS`; el código sigue). La barra
  de salida queda: Reportes y Configuración.
- Dado el Resumen, cuando se toca "Crear protopersona" o "Editar" en la card
  Protopersonas, entonces lleva a la sección **Protopersonas** ("Próximamente"), no a
  Configuración.

## Alcance
- Pestaña Reportes (`reportes/panel.js`): tarjeta Compartir, modal, ayuda, estado por
  huella, vista previa en iframe escalado.
- Pestaña Configuración (`reportes/configuracion.js`).
- `reportes/publicar.js`: `firmaReporte`, `actividadDe`, campos `estNombre` /
  `estCliente` / `reservas`.
- `share/boot.js`: grilla, filtros, Pronto, botón flotante, modal de propuestas,
  reserva, página de gracias y pestañas propias.
- `reportes/pestanas.js`: lista y editor de pestañas propias.
- `share/publico.js`: pasa id, PIN y nombre a `SR_boot`.
- `share/compartir.js`: `buildShareHtml`, caché de composiciones, sin
  `generateSharePage`.
- `functions/api`: `reservar()` y `avisarReserva()`.
- Estilos en `base.css` y `cliente.css`.
- Borrar `texto-plano.js`.
- `STUDY_TABS` (Métricas oculta) y el destino de la card Protopersonas del Resumen.

## Fuera de alcance / No tocar
- `SR_boot` sigue siendo el único render del reporte del cliente y se incrusta como
  TEXTO: no puede importar nada.
- `/api/publico` sigue siendo la única ruta fuera de `authorize()`. La reserva entra
  por la misma ruta, exige el mismo PIN y solo escribe en `publicos/{id}`. No sumar
  otras rutas sin login.
- `vistaCliente()` filtra todo lo que llega al cliente; lo oculto no debe viajar.
- `ensureReporte` (migraciones y siembra de propuestas) no se toca.
- No borrar `reporte.protopersonas` ni el código de la sección Protopersonas
  (Próximamente).
- No reintroducir la página HTML descargable. El texto plano y el JSON existen solo como
  exportación del administrador (decisión del 2026-10-20); no ofrecerlos a las cuentas de la
  beta ni al cliente sin una decisión nueva.
- Fuera de alcance:
  - configurar Resend (cuenta, dominio, secretos), que lo hace el dueño;
  - verificar la identidad de quien reserva;
  - pagos.

## Dependencias
- Cloudflare Access con Bypass en `/r/*` y `/api/publico` (sin cambios).
- Resend (`https://api.resend.com/emails`): secreto `RESEND_API_KEY` y variables
  `RESERVA_TO`, `RESERVA_CC` y `RESERVA_FROM` en Cloudflare Pages. El dominio del
  remitente tiene que estar verificado en Resend.
- `store`, `brandStore`, `DB` (`publicos/`), `vistaCliente`, `collectShareData`,
  `compositeDataUrl`, `normalizePropuesta` / `propPriceLine` / `propMoney`, Web Crypto,
  `ResizeObserver`.

## Estados (UI)
- **Vacío:**
  - "Compartir genera un link con PIN para tu cliente." (sin publicar);
  - "Todavía no publicaste el reporte.", "Todavía no hay reservas." y "Todavía nadie
    abrió el link." en la ayuda;
  - "vacío" en secciones sin ítems;
  - "Sin hallazgos clave." / "Sin recomendaciones." en Datos del proyecto;
  - en el cliente, "Sin hallazgos." y sin botón flotante si no hay propuestas.
- **Carga:**
  - "Cargando datos del estudio..." en la pestaña;
  - "Actualizando…" en la vista previa;
  - "Publicando…" / "Actualizando…" en la etiqueta;
  - "Cargando..." en la ayuda;
  - "Reservando…" en el botón de reserva;
  - "Guardando…" en la Marca;
  - una pestaña HTML se ve en blanco hasta que carga su contenido.
- **Error:**
  - "No se pudo actualizar la vista previa";
  - "No se pudo publicar: …" (toast);
  - "No se pudo: …" en el modal;
  - "No se pudo cargar la actividad.";
  - "No pudimos registrar la reserva. Revisá tu conexión y probá de nuevo.";
  - "No se pudo guardar la marca.";
  - "Poné un título";
  - "Poné un nombre para el menú.", "Pegá el código HTML.", "El HTML pesa N KB; el máximo
    es 400 KB…" y "Seleccioná el texto del link" en las pestañas propias;
  - en `/r/{id}`, los mensajes de siempre.

## Diseño
Figma "Ux-Diagnostic-tool", layout de Reportes:
https://www.figma.com/design/TgoGlLsjt4rs2dH04TQnFL/Ux-Diagnostic-tool?node-id=49-1470.
Configuración, la tarjeta Compartir, el reporte del cliente y la página de gracias se
construyeron en la exploración, sin frame propio en Figma.

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan.
- Propio:
  - `tests/e2e/compartir.spec.mjs` (modo servidor) cubre:
    - Configuración (menú, edición en el panel con Atrás, sin Métricas ni
      Protopersonas);
    - Compartir publica y abre el modal;
    - Cambios sin publicar, y que Compartir actualiza con el mismo link y PIN;
    - el cliente entra con PIN, reserva y ve la página de gracias;
    - la ayuda lista la reserva y el consentimiento;
    - Despublicar.
  - El test de regresión cubre la vista previa en vivo, la grilla de hallazgos,
    Flujos y Journeys navegables (flow con su diagrama, journey con sus etapas), la
    exportación en texto y JSON (sin imágenes), y que ocultar una sección la saca de la
    vista previa. `login.spec` prueba que una cuenta de la beta no ve Exportar.
  - A mano: con Resend configurado, una reserva manda el correo a `RESERVA_TO` con
    copia a `RESERVA_CC`.

## Dónde vive
- `src/reportes/panel.js`: pestaña Reportes (`renderReportesInto`, `renderCompartir`,
  `abrirModalCompartir`, `pintarAyuda`, `renderSeleccion`).
- `src/reportes/configuracion.js`: pestaña Configuración (`renderProyectoInto`, Marca,
  editores de bloques y propuestas).
- `src/reportes/seleccion.js` (`vistaCliente`, `ocultos`).
- `src/reportes/publicar.js` (publicar, despublicar, `actividadDe`, `firmaReporte`).
- `src/reportes/cliente.js` (Pantalla completa).
- `src/reportes/exportar.js` (`datosReporte`, `reporteTexto`, `reporteJSON`, `exportarTexto`,
  `exportarJSON`, `puedeExportar`).
- `src/reportes/comun.js` (`ensureReporte`, `saveReporte`, `marcaActual`).
- `src/share/compartir.js` (`collectShareData`, `buildShareHtml`,
  `montarReportePublico`, `montarVistaPrevia`). Para flows y journeys: la imagen de la
  pantalla del estudio en cada interacción, las marcas en el pin del hallazgo, los
  `hallazgos` e `id` de cada paso del journey, la descripción de las etapas y los
  `pasos` ("Dónde aparece") de cada hallazgo.
- `src/share/publico.js` (página `/r/{id}`).
- `src/share/boot.js` (`SR_boot`).
- `functions/api/[[path]].js` (`publico()`, `reservar()`, `avisarReserva()`).
- `src/reportes/pestanas.js` (`renderPestanas`, `editorPestana`, `limpiarTexto`). En
  `SR_boot`: `secPestana` y su propio `limpiarTexto` (la misma regla: si cambia una,
  cambiar la otra).
- Estilos: `base.css` (bloques "Reportes: …" y "Configuración: …"), `reportes.css`
  (`.rp-exp-a` y `.px-*` del editor de pestañas) y `cliente.css` (hallazgos en grilla,
  Trabajemos juntos, gracias, `.cr-paso*`, `.cr-jr-hz*` y `.cr-px-*` de las pestañas
  propias).
- Datos:
  - en el estudio, `estudios/{id}.reporte` (`ocultos`; `publico` con id, PIN, sal y
    `firma`; `pestanas:[{id, nombre, tipo:"html"|"texto", html, texto, visible}]`; `tj`
    con los textos de Trabajemos juntos y la recomendada);
  - en la foto, `publicos/{id}` (`estNombre`, `estCliente`, `consentimientos`,
    `reservas`) + `publicos/{id}/partes/{n}`.
- Estado de la UI en `state.cfg` (ítem y editor abierto de Configuración).

## Conocido
- El bloqueo de copia frena la copia casual; no impide capturas ni las herramientas
  del navegador.
- El PIN es una llave compartida: quien reciba link y PIN puede entrar y reservar (se
  corta con "Generar PIN nuevo" o "Despublicar").
- La huella también cambia si se vuelve a codificar una imagen. En la práctica se
  calcula siempre en el mismo navegador.
- Cada reserva manda un correo; no hay límite aparte del PIN y del tope de 20 guardadas.
- La primera vista previa de un estudio con muchas capturas tarda unos segundos
  (compone cada pin); después se reutiliza la caché.
- A CONFIRMAR:
  - si la página de gracias promete un plazo de respuesta (hoy no lo promete);
  - si limitar las reservas repetidas;
  - las propuestas por defecto que se siembran en cada estudio nuevo.
- El texto plano y el JSON no llevan propuestas de trabajo (precios), protopersonas ni
  pestañas propias.
- Pestañas propias:
  - no tienen prueba e2e propia (se verificaron en el navegador);
  - un HTML que mide su alto en `vh` crecería sin fin: el alto deja de agrandarse
    después de 12 aumentos seguidos (tope 30.000 px);
  - el contenido de un HTML que se agranda solo después de 2,5 s sin cambiar el tamaño
    de la página puede quedar cortado;
  - el editor de texto usa `document.execCommand` (obsoleto, pero hoy funciona en los
    navegadores);
  - el bloqueo de copia del reporte no alcanza al contenido del HTML.
- Un User Flow sin interacciones visibles o un journey sin pasos se listan igual, con
  "Sin pasos" en el mapa.
