# ADR 0010: Semáforo de avance en Metas Físicas (T1) e Indicadores (R2) del registro OA

## Estado
Aceptado · **Completado** (ver [Registro de implementación](#registro-de-implementación))

## Fecha
2026-09-17

## Responsables
Equipo Frontend AGROIDEAS · Owner del módulo: Oscar Pazos

## Aplica a
`apps/sigec-rtf`: `OaRegistroComponent` (`features/oa-registro/`), tabs T1 (Metas Físicas) y
R2 (Indicadores), en sus 4 variantes (tarjeta móvil / tabla escritorio × esquema BD_SEL /
legacy). No modifica `@agroideas/ui` — reutiliza `UiStatusPillComponent` tal como está.

## Contexto

Se pidió una ayuda visual tipo semáforo para que la OA identifique de un vistazo, en T1 y R2,
qué actividades/indicadores no llegaron al 100% de lo programado, cuáles lo cumplieron
exacto y cuáles lo superaron. Antes de diseñar la solución se auditó el estado actual de
ambas pestañas y se encontraron tres problemas concretos, no solo la ausencia del semáforo:

1. **Solo 2 estados de color, no 4.** El % de avance usa únicamente `text-success` (≥100%) /
   `text-warning` (<100%) — ver `metasSelRowTpl`/`metasLegacyRowTpl`/`indicadoresSelRowTpl`/
   `indicadoresLegacyRowTpl` y el tile "Avance" de las tarjetas de metas. No distingue "sin
   iniciar" de "en progreso", ni "cumplió justo" de "superó" — ambos casos pintan el mismo
   verde.
2. **Inconsistencia entre T1 y R2 en móvil**: las tarjetas de Metas Físicas sí muestran un
   tile "Avance %"; las tarjetas de Indicadores (BD_SEL y legacy) **no lo muestran en
   absoluto** — solo Línea Base / Planificado / Logrado. Un usuario que trabaja desde celular
   en campo (perfil típico de una OA) hoy no tiene ninguna pista de avance en R2 sin hacer la
   resta mentalmente.
3. **Ya existe un semáforo en esta misma app** (`un-dashboard.component.ts:70-72`, rol UN,
   umbrales 70/30 sobre avance financiero promedio de cartera) y **ya existe un patrón
   documentado para aproximar estados de negocio a la paleta cerrada de
   `UiStatusPillComponent`** (`BandejaOAComponent.estadoPillStatus` /
   `UnGabineteComponent.estadoPillStatus`, ambos en `sigec-rtf`): se elige el `StatusType` más
   cercano solo para el color, y la etiqueta real se pasa aparte vía `[text]`. Cualquier
   solución nueva debe seguir ese mismo criterio en vez de inventar un lenguaje de color
   distinto o tocar la paleta cerrada del componente compartido (usado por ~30 archivos entre
   `kofix-ejecucion`, `sat-ui` y `sigec-rtf`).

## Decisiones

### D1 — Reutilizar `UiStatusPillComponent` sin tocar `@agroideas/ui`
Se aproxima cada uno de los 4 estados de avance al `StatusType` más cercano por color, con la
etiqueta real vía `[text]` — mismo criterio ya documentado en
`BandejaOAComponent.estadoPillStatus`. Se descarta extender la paleta cerrada del componente
compartido (ver Alternativas) porque el patrón existente ya resuelve el problema sin tocar un
componente consumido por otras dos apps.

| Estado | Condición | `StatusType` usado (color) | Texto mostrado |
|---|---|---|---|
| Sin iniciar | `ejecutado` es `null`/`0` | `Baja` (gris) | "Sin iniciar" |
| En progreso | `0 < ejecutado < programado` | `Pendiente` (ámbar) | "En progreso" |
| Cumplida | `ejecutado == programado` (y `programado > 0`) | `Aprobado` (verde) | "Meta cumplida" |
| Superada | `ejecutado > programado` | `Media` (celeste) | "Meta superada" |

Superada usa el bucket celeste (`Media`) en vez de otro tono de verde a propósito: reciclar
el mismo verde con distinta intensidad no se distingue en pantallas de campo con mucho sol
(contexto real de las OA), y no debe confundirse con el semáforo financiero de cartera de
`un-dashboard` (mismo verde/ámbar/rojo, significado distinto — promedio de cartera vs.
cumplimiento puntual de una fila).

### D2 — Un único helper de clasificación, no 8 condicionales repetidas
La lógica de clasificación (`calcularEstadoAvance`) vive una sola vez en
`OaRegistroComponent`; `estadoAvancePillStatus`/`estadoAvanceLabel` son capas delgadas sobre
ella. Se llama igual desde las 4 tarjetas y las 4 plantillas de fila de tabla — evita repetir
`ejecutado / programado >= 1` con variaciones de nombre de campo en 8 sitios distintos, mismo
criterio ya aplicado al refactor previo de `evidenciasDe`/`descargarEvidencias` en este mismo
componente.

### D3 — La pill es la única fuente de color del estado; el número de `%` queda neutro
Hoy el número de `%` y el estado son la misma señal codificada dos veces (y a veces en
conflicto: 100% y 150% pintan el mismo verde). Se retira el color condicional del número de
`%` en las 4 plantillas de fila y en el tile de las tarjetas — el color vive solo en la pill,
el número queda en texto neutro como dato de precisión complementario.

### D4 — Resumen de conteos por pestaña
Se agrega una fila de conteos ("Sin iniciar: N · En progreso: N · Cumplidas: N · Superadas:
N") al inicio de T1 y R2, calculada con un `computed()` (`resumenMetas`/`resumenIndicadores`)
que normaliza los campos de ambos esquemas (BD_SEL/legacy) antes de clasificar. Responde la
pregunta agregada ("¿cuántas me faltan?") sin depender de escanear fila por fila — mismo
espíritu que `un-dashboard.component.ts` con su propio resumen de RTFs por estado.

### D5 — R2 gana el tile de Avance % que hoy le falta
Las tarjetas de Indicadores (ambos esquemas) pasan de un grid de 3 columnas
(Línea Base/Planificado/Logrado) a 4 columnas, agregando "Avance %" — mismo patrón que ya
tienen las tarjetas de Metas Físicas. Esto no es opcional dentro del alcance de este ADR: es
una omisión preexistente que el propio semáforo hace más visible (sin este tile, la pill
quedaría flotando sin el dato numérico que la acompaña en T1).

## Plan de implementación

### Fase 1 — Helpers de clasificación en `OaRegistroComponent`
`calcularEstadoAvance(ejecutado, programado)`, `estadoAvancePillStatus(...)`,
`estadoAvanceLabel(...)`, `contarEstados(items)`, y los `computed()` `resumenMetas` /
`resumenIndicadores` (normalizando `metaFisicaEjecutada`/`metaFisicaProgramada` vs.
`canEjecutada`/`canProgramada` para metas, y `metaEjecutada`/`metaProgramada` vs.
`canEjecutado`/`canProgramado` para indicadores). Import de `UiStatusPillComponent` y
`StatusType` desde `@agroideas/ui`, agregado a `imports` del componente.
**Criterio de aceptación:** `calcularEstadoAvance` cubre los 4 estados sin división por cero
cuando `programado` es 0.

### Fase 2 — Resumen de conteos en T1 y R2
Insertar la fila de conteos justo debajo del banner informativo de cada tab.
**Criterio de aceptación:** los conteos suman el total de filas visibles en cada tab (metas
filtradas por `metaFisicaProgramada > 0` en T1; todos los indicadores en R2).

### Fase 3 — Pill en las 4 tarjetas móviles (T1 metas × 2 esquemas, R2 indicadores × 2 esquemas)
La pill se agrega junto al chip de categoría existente ("🌱 Actividad", "🌾 Meta", "🌱
Indicador", "📈 Medida"), no dentro del grid de 3 columnas — es la posición de mayor
visibilidad de la tarjeta. El grid de indicadores pasa a 4 columnas (D5). El color
condicional del tile "Avance" en metas se retira (D3).
**Criterio de aceptación:** ninguna tarjeta de R2 queda sin dato de avance %; ninguna
tarjeta usa `[class.text-success]`/`[class.text-warning]` en el número de `%`.

### Fase 4 — Columna "Estado" en las 4 tablas de escritorio
Nueva columna `estadoAvance` (`type: 'custom'`, alineada al centro, ancho fijo ~130px) en
`metasSelColumns`, `metasLegacyColumns`, `indicadoresSelColumns`, `indicadoresLegacyColumns`,
renderizada en el `ng-template` de fila correspondiente. Se retira el color condicional de
la columna `%`/`metaFisicaAvance`/`avancePct` existente (D3).
**Criterio de aceptación:** las 4 tablas muestran la pill en su propia columna, sin romper
el `paginator` ni el `showIndex` existentes.

### Fase 5 — Verificación
`nx lint sigec-rtf` (0 errores nuevos) y verificación visual en navegador
(`localhost:4300/rtf/pasos-criticos/32002/registrar`) contra datos reales, en T1 y R2, tabla
y tarjeta.

## Consecuencias

### Positivas
- La OA distingue de un vistazo 4 estados reales de ejecución, no 2, sin abrir cada fila.
- Cero cambios a `@agroideas/ui`: cero riesgo para los ~30 consumidores de
  `UiStatusPillComponent` en `kofix-ejecucion`/`sat-ui`/`sigec-rtf`.
- Corrige una omisión real (R2 sin `%` en móvil) que existía independientemente de este
  pedido.
- Elimina una señal de color contradictoria (100% y 150% pintados igual) que existía antes
  de este cambio.

### Negativas / riesgos
- La pill usa una paleta de 12 estados pensada para flujos de aprobación (`Aprobado`,
  `Pendiente`, etc.), no para avance de metas — el mapeo es una aproximación de color, ya
  aceptada como patrón en este mismo repo. Si en el futuro se necesitan más estados de
  avance (p. ej. "en riesgo" a medio camino), esta aproximación puede quedarse corta antes
  que la paleta real.
- La columna nueva "Estado" angosta el espacio disponible para las demás columnas en
  pantallas medianas (breakpoint `md`, antes del `lg` donde sobra espacio); aceptable, sin
  scroll horizontal nuevo observado en la verificación de Fase 5.

### Neutras
- No modifica el semáforo financiero de `un-dashboard.component.ts` (independiente, distinto
  significado — avance de cartera, no cumplimiento de una fila).
- No modifica ningún contrato de backend ni el esquema BD_SEL/legacy existente.

## Alternativas consideradas y descartadas

1. **Extender `StatusType` en `UiStatusPillComponent` con 4 estados nuevos**
   (`SinIniciar`/`EnProgreso`/`Cumplida`/`Superada`) — descartado: aunque sería aditivo y no
   rompería a los consumidores actuales, iría en contra del patrón ya establecido en este
   mismo repo (D1) de aproximar a la paleta existente en vez de crecerla por cada nuevo caso
   de uso, y tocaría un componente `scope:shared` para un problema que el patrón actual ya
   resuelve sin tocarlo.
2. **Iconos + color inline sin el componente compartido** (propuesta inicial del análisis
   UX) — descartado en favor de D1: `UiStatusPillComponent` ya garantiza el texto siempre
   visible (no solo color), que era el objetivo de accesibilidad buscado, sin duplicar
   markup que el componente compartido ya resuelve.
3. **Semáforo de 3 colores (rojo/ámbar/verde) sin distinguir "cumplida" de "superada"** —
   descartado: era precisamente la distinción que se pidió explícitamente: separar el 100%
   exacto de un excedente sobre lo programado.

## Referencias

- `libs/ui/src/lib/ui-status-pill/` — componente reutilizado sin cambios.
- `apps/sigec-rtf/src/app/features/bandeja-oa/bandeja-oa.component.ts` (`estadoPillStatus`) y
  `apps/sigec-rtf/src/app/features/un-gabinete/un-gabinete.component.ts`
  (`estadoPillStatus`) — precedente del patrón de aproximación de color reutilizado en D1.
- `apps/sigec-rtf/src/app/features/un-dashboard/un-dashboard.component.ts:70-72` — semáforo
  financiero de cartera existente, con significado distinto (D5, Consecuencias neutras).

## Registro de implementación

| Fase | Estado | PR | Fecha cierre | Notas |
|------|--------|----|-------------|-------|
| 1 — Helpers de clasificación | ✅ Completada | _pendiente_ | 2026-09-17 | `calcularEstadoAvance`, `estadoAvancePillStatus`, `estadoAvanceLabel`, `contarEstados`, `resumenMetas`, `resumenIndicadores`. |
| 2 — Resumen de conteos | ✅ Completada | _pendiente_ | 2026-09-17 | Fila de conteos en T1 y R2. |
| 3 — Pill en tarjetas móviles | ✅ Completada | _pendiente_ | 2026-09-17 | 4 tarjetas actualizadas; grid de indicadores pasa a 4 columnas. |
| 4 — Columna "Estado" en tablas | ✅ Completada | _pendiente_ | 2026-09-17 | 4 tablas de escritorio. |
| 5 — Verificación | ✅ Completada | _pendiente_ | 2026-09-17 | `nx lint sigec-rtf` y verificación visual en `localhost:4300` contra datos reales del RTF 32002. |
