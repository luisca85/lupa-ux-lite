# Feature: Design system: radios, estados y componentes base  ·  id: ds

Historia de usuario: Como consultor/a UX que diseña Lupa UX en Figma, quiero que la app
use los mismos radios, estados y componentes que el design system, para que lo que
diseño y lo que se construye se vean igual.

Objetivo: alinear la app con el Figma "Ux-Diagnostic-tool" (kit shadcn "Nova" + variables
"Lupa UX"): tokens de radio por tipo de componente, un color de selección y los
componentes base (botones, estado vacío, aviso, chips de filtro, escala de severidad,
campos compactos). Sale de la exploración `explorar/layout-figma`.

## Criterios de aceptación

### Radios (tokens en `:root`)
- Dada cualquier pantalla, cuando se miden los radios, entonces coinciden con el Figma:

  | Token | Valor | Dónde |
  |---|---|---|
  | `--r-card` | 6 px | Tarjetas: estudios, "Nuevo estudio", dashboard, indicadores, protopersonas, formulario de alta, hallazgos; también miniaturas, zona para pegar y selector de severidad del editor |
  | `--r-btn` | 8 px | Botones, botones de ícono, pestañas (la activa: 6 px) |
  | `--r-input` | 10 px | Buscador e inputs de formularios (Input - Nova) |
  | `--r-field` | 4 px | Campos, cards y botón secundario del panel de hallazgos |
  | `--r-empty` | 14 px | Estado vacío (Empty - Nova) |
  | `--r-alert` | 10 px | Aviso (Alert - Nova) |
  | `--r-menu` | 10 px | Menú y chip de usuario |
  | `--r-pill` | 999 px | Chips, badges, estado, contadores y números de hallazgo |

- El botón dentro de un estado vacío usa 10 px. Un cambio de radio se hace en el token,
  no componente por componente.

### Estado seleccionado
- Dado un elemento seleccionado (chip de filtro activo, hallazgo elegido en el panel,
  severidad elegida, botón principal del panel), cuando se ve, entonces usa `--sel`
  (#1d5fd0; #3b82f6 en tema oscuro) con texto `--sel-fg` (blanco). Los bordes de campos
  compactos usan `--line-input` (#d4d4d4).

### Componentes
- **Botón (`.btn`):** radio 8, borde `--line`; `sm` con padding 4 × 10 px y 14 px.
  Variante `.btn.sel` (azul) para la acción principal del área de Hallazgos.
- **Botón secundario (`.btn-sec`):** fondo `--surface-2`, 34 px de alto, radio 4, con ícono
  a la derecha (`catalogo-abrir.svg`).
- **Estado vacío (`.empty`):** fondo de tarjeta, borde punteado, radio 14, padding 32,
  ícono de 20 px en una caja `--surface-2` de radio 6, título 16 px medium, texto 14 px
  `--muted` y botón con borde.
- **Aviso (`.alert`):** borde, radio 10, padding 8 × 12, ícono de 16 px y texto 14 px.
- **Chip de filtro (`.chip-f`):** 26 px de alto, pill, 12 px medium; activo en `--sel`.
- **Escala de severidad (`.sev-scale`):** cinco botones 0–4 de 32 px, radio 4; el elegido
  en `--sel`.
- **Campo compacto (`.pf`):** etiqueta 13 px y control con borde `--line-input`, radio 4,
  13 px; `.pf-row` pone dos campos por fila.

## Alcance
`src/styles/base.css` (tokens y componentes), los íconos `volver.svg` y
`catalogo-abrir.svg` en `src/assets/figma/`, y el uso de los componentes en las vistas
de proyecto, hallazgos y home.

## Fuera de alcance / No tocar
- Fuera de alcance: migrar todas las reglas viejas de `base.css` a los tokens (se
  sobrescriben al final de la hoja); tipografías del Figma distintas de Geist / IBM Plex
  Mono / Inter (el panel del Figma usa IBM Plex Sans); estilos de texto del kit.
- No editar los SVG de `src/assets/figma/`: se usan como máscara (`.fig-ico`) para que
  tomen el color del tema.
- El reporte del cliente (`SR_boot`) no usa estos tokens y no cambia.

## Dependencias
- Figma "Ux-Diagnostic-tool": librería shadcn ui kit (Nova) y la colección de variables
  "Lupa UX".
- Tokens de color existentes (`--surface`, `--surface-2`, `--line`, `--ink`, `--muted`,
  `--faint`).

## Estados (UI)
- Vacío / carga / error: N/A (son componentes; los estados de cada pantalla viven en su
  spec: `home`, `proy`, `hz`).

## Diseño
Figma "Ux-Diagnostic-tool":
https://www.figma.com/design/TgoGlLsjt4rs2dH04TQnFL/Ux-Diagnostic-tool?node-id=29-3102 y
https://www.figma.com/design/TgoGlLsjt4rs2dH04TQnFL/Ux-Diagnostic-tool?node-id=29-3575.
Componentes locales en el frame "Componentes · Lupa UX" (node 7:90).

## Definición de hecho
- La de AGENTS.md: `npm run check`, `npm run smoke` y `npm run test:e2e` pasan.
- Propio: medir con el inspector los radios de la tabla en home, Resumen y Hallazgos;
  revisar el estado seleccionado en tema claro y oscuro.

## Dónde vive
`src/styles/base.css`: bloques "Ajuste Figma …" (`--sel`, `.btn`, `.empty`, `.alert`,
`.chip-f`, `.sev-scale`, `.pf`) y "Radios del DS" (`--r-*`). Íconos en
`src/assets/figma/volver.svg` y `src/assets/figma/catalogo-abrir.svg`.
