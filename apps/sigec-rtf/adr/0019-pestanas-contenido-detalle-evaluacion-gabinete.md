# ADR-019: Pestañas para el contenido siempre-visible del detalle de RTF (R1/T1/R2/F1) en Evaluación de Gabinete

> **Nota de numeración**: se salta 0016 (colisiona con referencias existentes en este código a
> ADR-016 del *backend*, ver ADR-017) y también 0018 (colisiona igual con ADR-018 del *backend*,
> "Máquina de Estados Completa..." — referenciado en decenas de comentarios de
> `un-gabinete.component.ts`/`.html` y en el README de esta app). Sigue directamente a ADR-017.

## Estado
Aceptado e implementado — verificado en vivo (22/09/2026).

**Cierre**: `npx nx lint/test/build sigec-rtf` en verde (156/156 tests, 0 errores de lint, 100
warnings preexistentes). Verificado en vivo forzando el RTF 20003 a `EN_REVISION` (con datos
reales de metas/indicadores/gastos ya sincronizados de una sesión de prueba anterior): las 4
pestañas (R1/T1/R2/F1) muestran su contenido real; el footer sticky de acciones queda visible sin
scroll extra apenas se abre el expediente (antes exigía atravesar las 4 tarjetas primero); el
badge de T1 pasó de vacío a "1" en vivo al marcar una meta como "Observar" (dictamen inline
intacto: select, textarea de observación y checkbox "Subsanable por la OA" funcionando igual que
antes); el badge persiste correctamente al cambiar de pestaña. Revertido después (estado del RTF
de prueba; el dictamen de prueba nunca se guardó, solo vivía en el borrador en memoria).

## Contexto

Continuación de la Fase 2 identificada en la revisión UX de `UnGabineteComponent`
(`/rtf/evaluacion-gabinete`) y explícitamente dejada fuera de ADR-017: el scroll largo de la
pantalla de detalle de un RTF (fricción #2 de esa revisión). El usuario compartió un prototipo
HTML propio como inspiración, con 4 pestañas de contenido (Metas T1, Financiera F1, Cualitativa
R1, Checklist Admisibilidad) y un panel lateral fijo de dictamen.

### El prototipo no mapea 1:1 contra la pantalla real — se adapta, no se copia

Antes de tocar código se releyó `un-gabinete.component.html` completo (942 líneas) para mapear con
precisión qué existe hoy. Hallazgo clave: **la pantalla real tiene una estructura más rica que el
mockup estático del prototipo**, con dos partes de naturaleza distinta:

1. **Contenido siempre visible, independiente del estado del RTF**: la grilla 2×2 de tarjetas
   R1 (Información Cualitativa) / F1 (Gastos Financieros) / T1 (Metas Físicas) / R2 (Indicadores),
   más "Evidencias Adjuntas" debajo. Esto es lo que de verdad genera el scroll largo — 4 tarjetas
   apiladas que hay que atravesar sin importar en qué estado esté el expediente.
2. **Un panel inferior que cambia según el estado del RTF** (`estaEnEvaluacionPrevia()` /
   `enBloqueoDefinitivo()` / `enControlDePlazo()` / si no, evaluación final), mutuamente
   excluyente vía `@if/@else if`: Dictamen de Gabinete + Checklist de Admisibilidad + Anexo 19
   (en evaluación previa), Bloqueo Definitivo + botón de Resolución de Convenio, Control de Plazos
   (registro de Cartas), o el formulario completo del Anexo 18 (evaluación final) + devolución.
   El footer sticky de acciones (Aprobar/Rechazar/Devolver/Continuar/Marcar Resuelto) replica esa
   misma ramificación de 4 estados.

**El "Checklist Admisibilidad" del prototipo, como cuarta pestaña fija, no tiene equivalente
limpio acá**: en esta pantalla el checklist es solo una de las 4 variantes del panel de estado
(2), no contenido que coexista permanentemente con R1/T1/R2/F1. Convertirlo en una pestaña
seleccionable por el usuario sería **semánticamente incorrecto** — implicaría que el evaluador
puede "elegir ver" el checklist en cualquier momento, cuando en realidad ese panel solo existe
(y solo tiene sentido) cuando el RTF está en evaluación previa. Lo mismo aplica a Control de
Plazos/Bloqueo Definitivo/Anexo 18: son vistas de un estado, no pestañas de contenido.

Además, cada tarjeta de R1/T1/R2 ya trae, inline, sus propios controles de dictamen por ítem
(`select` Conforme/Observar + `textarea` de observación + checkbox "Subsanable") cuando
`estaEnEvaluacionPrevia()` — el evaluador ya evalúa mientras lee, fila por fila, sin un paso
separado de "leer" vs. "evaluar". Esto es en esencia lo mismo que propone el prototipo (un
`<select>` de dictamen por fila de la tabla T1), solo que en tarjetas en vez de una tabla — no
hay que rediseñarlo, solo reubicarlo dentro de una pestaña.

## Decisión

Convertir **solo** la grilla 2×2 siempre-visible (R1/F1/T1/R2) en una tarjeta con pestañas —
mismo patrón de pestañas ya establecido en ADR-017 (botones + señal, sin componente compartido
nuevo). El resto de la pantalla (Evidencias Adjuntas, el panel inferior de 4 variantes según
estado, y el footer sticky) **no cambia** — sigue siendo contenido único, no tabulado, porque
tabularlo sería incorrecto por lo explicado arriba.

No se adopta el panel lateral fijo de dictamen del prototipo en esta fase: el panel de estado ya
tiene su propio botón de guardar/acción bien ubicado (encabezado de "Dictamen de Gabinete", footer
sticky) y moverlo a un panel lateral es un cambio de layout más grande, con más riesgo de romper
el responsive actual, y no está directamente justificado por la fricción original (scroll largo)
— queda como idea a evaluar aparte, no como parte de este ADR.

### Pestañas y badges

| Pestaña | Contenido | Badge |
|---|---|---|
| R1 — Información Cualitativa | igual que hoy (5 campos + dictamen de sección) | — |
| T1 — Metas Físicas | igual que hoy (lista de metas + dictamen por fila) | N° de metas observadas (solo si `estaEnEvaluacionPrevia()` y > 0) |
| R2 — Indicadores | igual que hoy (lista de indicadores + dictamen por fila) | N° de indicadores observados (mismo criterio) |
| F1 — Gastos Financieros | igual que hoy (tabla + botón Sincronizar) | — |

Pestaña por defecto: **R1** (primera, coincide con la posición actual arriba-izquierda). Al abrir
un RTF distinto (`seleccionarRtf`) la pestaña activa se reinicia a R1 — mismo criterio que
ADR-017 resetea el filtro de estado al cambiar de pestaña de la bandeja: no dejar seleccionado
algo que puede no aplicar al nuevo contexto.

### Implementación

- `un-gabinete.component.ts`: `activeContentTab = signal<'r1'|'t1'|'r2'|'f1'>('r1')`; reset a
  `'r1'` dentro de `seleccionarRtf`. Dos `computed` triviales (`metasObservadasCount`,
  `indicadoresObservadasCount`) filtrando `metas()`/`indicadores()` por
  `dictamenDe('META'|'INDICADOR', id) === 'OBSERVADO'`.
- `un-gabinete.component.html`: la grilla `grid grid-cols-1 lg:grid-cols-2 gap-6` (con sus 4
  tarjetas) se reemplaza por una tarjeta contenedora con nav de pestañas (mismo patrón de
  `bandeja-oa`/ADR-017) y 4 `@if (activeContentTab() === 'x')` con el contenido de cada tarjeta
  movido tal cual (mismas clases, mismos bindings) — sin tocar la lógica de dictamen/evidencias
  por ítem.
- Sin cambios en `un-gabinete.service.ts` ni en el backend.

### Verificación

`npx nx lint/test/build sigec-rtf`, más verificación en vivo abriendo un RTF real en evaluación
previa (con datos de prueba de la sesión de ADR-018/backend) para confirmar que el dictamen por
ítem sigue funcionando igual dentro de cada pestaña, y que el resto de la pantalla (evidencias,
panel de estado, footer) no cambió.

## Consecuencias

### Positivas
- Reduce el scroll de la parte siempre-visible de 4 tarjetas apiladas a 1, sin tocar la lógica de
  evaluación por ítem ni el panel de estado.
- Mismo patrón de pestañas que ADR-017 — no introduce un componente ni un criterio nuevo.
- Los badges de T1/R2 dan una señal temprana de cuántos ítems ya se marcaron como observados sin
  tener que entrar a cada pestaña.

### Negativas / Riesgos
- El scroll del panel inferior de estado (sobre todo el formulario del Anexo 18, ~9 textareas) no
  se acorta — queda fuera de alcance de este ADR, tal como se explicó arriba.
- Si en el futuro se agrega una quinta pieza de contenido "siempre visible" (paralela a
  R1/T1/R2/F1), hay que recordar agregarla como pestaña acá — no hay ninguna validación que lo
  fuerce.
