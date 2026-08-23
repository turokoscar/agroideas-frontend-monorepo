# ADR 0008: Remediación de UI en `apps/kofix-ejecucion` — bug visual, accesibilidad y consistencia del design system

## Estado
Aceptado · **Completado** (Fase 1 ✅ · Fase 2 ✅ · Fase 3 ✅ · Fase 4 ✅ · Fase 5 ✅ — ver [Registro de implementación](#registro-de-implementación))

## Fecha
2026-08-22

## Responsables
Equipo Frontend AGROIDEAS · Owner del módulo: Oscar Pazos

## Aplica a
`apps/kofix-ejecucion` (alcance contenido). Puede tocar `@agroideas/ui` únicamente
si la Fase 4 decide promover un componente de tabs/tabla a la librería compartida
— en ese caso el cambio amplía la librería pero no obliga a `sat-ui` a adoptarlo.

## Contexto

Una revisión de la capa de presentación de `kofix-ejecucion` (2026-08-22, sobre la
rama `desarrollo`: 16 páginas enrutadas + 10 componentes de presentación, capa
`layout` compartida vía `UiAppShellComponent`) confirma que la app cumple el
requisito duro del monorepo — **0 imports directos** de PrimeNG/Material/CDK/
Bootstrap/SweetAlert2/Leaflet, todo pasa por `@agroideas/*` — pero detecta
incidencias puntuales de correctness visual, accesibilidad y adopción inconsistente
del design system que no bloquean el uso de la app pero degradan su calidad y
mantenibilidad.

### Hallazgos clave

| # | Hallazgo | Severidad | Ejemplo |
|---|---------|-----------|---------|
| H1 | Clases Tailwind inexistentes en el preset → texto/badge se renderiza sin color (bug visual silencioso) | 🔴 bug | `midagri-blue-light`, `midagri-blue-dark`, `text-indigo-650`, `dark:text-slate-250` en `convenio-detail.page.html` y `cronograma-consolidado.component.html` — Tailwind no genera CSS para clases fuera de su escala (no existe shade `650` ni `250`) y `midagri-blue-*` no está definido en `libs/theme/src/tailwind-preset.js` |
| H2 | Deuda de accesibilidad en templates | 🟠 a11y | 313 warnings de lint totales; de ellos, **54** `label-has-associated-control` + 4 `interactive-supports-focus` + 4 `click-events-have-key-events` = 62 puntos con labels sin control asociado o elementos clicables sin soporte de teclado |
| H3 | `convenio-detail.page.html` es una plantilla inflada | 🟡 mant | 416 líneas: tab-bar de 6 pestañas casi idéntico repetido inline con `[ngClass]` duplicado, tabla Kardex de ~80 líneas inline, guía de glosario inline — mismo antipatrón que motivó la Fase 7 del ADR 0002 en `sat-ui` |
| H4 | Tablas inconsistentes: `<table>` nativa conviviendo con `app-ui-data-table` | 🟡 consistencia | 6 archivos (`rendicion-modal`, `desembolso-modal`, `no-objecion-modal`, `cronograma-consolidado`, `programacion-cronograma-modal`, tab Kardex de `convenio-detail`) usan `<table>` nativa mientras las páginas de listado usan `app-ui-data-table` |
| H5 | Botones nativos sueltos junto a `ui-button` | 🟢 consistencia | 12 `<button>` nativos detectados en templates que en su mayoría ya usan `ui-button` (64 usos) |
| H6 | Componentes de `@agroideas/ui` sin consumidor en la app | 🟢 informativo | `ui-dropzone`, `ui-file-chip`, `ui-pdf-viewer`, `ui-countdown-banner`, `ui-countdown-ring`, `lib-ui-select-search`, `app-ui-pagination` — sin uso en `kofix-ejecucion` hoy |
| H7 | Gaps de la librería compartida que fuerzan HTML nativo | 🟢 gap de librería | No existe un componente de tabs ni de input en `@agroideas/ui`; por eso el buscador del header (`app.layout.component.ts`) y el tab-bar de `convenio-detail` usan `<input>`/`<button>` nativos — no es un defecto de la app, es una carencia de la librería |
| H8 | Cobertura de tests incompleta en componentes de presentación | 🟢 cobertura | Sin `.spec.ts`: páginas `home`, `styleguide` (ambas triviales/vitrina) y componentes `login-form`, `reporte-mensual-chart`, `reporte-mensual-donut`, `resumen-ejecutivo` |

Adicionalmente, `nx lint kofix-ejecucion` reporta **0 errores, 313 warnings**
(desciende levemente de los 319 documentados en `CLAUDE.md` tras el commit de
eliminación de código muerto de `dashboard.page`). De esos 313: 186
`no-explicit-any`, 42 `no-unused-vars`, 8 `no-non-null-assertion`, 8
`no-empty-function`, 7 `no-output-on-prefix` — deuda ya reconocida y cubierta
por el override transicional de ESLint (`apps/kofix-ejecucion/eslint.config.js`,
ver `CLAUDE.md`); este ADR no reabre esa decisión, solo la deuda de accesibilidad
(H2), que ese override **no** relaja a nivel de severidad de negocio aunque sí
la baje a `warn` a nivel de lint.

### Lo que ya está bien y se conserva
Cero imports directos de librerías de terceros prohibidas; adopción sólida de
`ui-button`/`app-ui-data-table`/`app-ui-filter-bar`/`app-ui-status-pill` en las
páginas principales de listado; capa Clean Architecture (`domain`/`data`/
`presentation`) respetada; `AppLayoutComponent` correctamente delgado sobre
`UiAppShellComponent`; cobertura de tests alta (solo 6 de ~26 unidades de
presentación sin spec, todas de bajo riesgo); `OnPush` ya presente en el layout
y en la mayoría de páginas revisadas.

### Por qué un ADR ahora
1. H1 es un **bug de producción visible** (texto/badges sin el color de marca
   esperado) que amerita trazabilidad de cuándo y cómo se corrigió, no un fix
   silencioso.
2. H3/H4 tocan varios archivos y sientan un patrón (extraer un componente de
   tabs, decidir cuándo usar `app-ui-data-table` vs `<table>` simple) que debe
   quedar documentado para no repetirse en páginas futuras.
3. Este ADR replica el patrón ya validado por el **ADR 0002** (`sat-ui`):
   remediación por fases con PRs independientes, ROI descendente. Se sigue el
   mismo molde para mantener consistencia documental del portafolio.

## Decisiones

### D1 — Alcance: solo `apps/kofix-ejecucion`, sin tocar `sat-ui`
Las correcciones aplican exclusivamente a `kofix-ejecucion`. `sat-ui` ya cerró
su propio ciclo de modernización (ADR 0002, 10 fases completadas). Tocar ambas
apps a la vez diluye la trazabilidad y multiplica el riesgo de regresión.

> Excepción: si la Fase 4 (tabs) concluye que el patrón es reutilizable, se
> añade un componente nuevo a `@agroideas/ui` (p. ej. `ui-tabs`). Eso **no**
> obliga a `sat-ui` a adoptarlo en este ADR — solo lo deja disponible.

### D2 — Ejecución por fases con PRs independientes
Cada fase es un PR autocontenido que deja la app en estado entregable y
operativo, permitiendo pausar/reanudar y bisectar regresiones por fase — mismo
criterio que D2 del ADR 0002.

### D3 — Las 5 fases (ROI descendente)

#### Fase 1 — Bug visual de correctness 🔴
**Objetivo:** Corregir el defecto real de producción antes de cualquier
refactor o limpieza.

| Tarea | Archivo | Hallazgo |
|------|---------|----------|
| 1.1 | Reemplazar `bg-midagri-blue-light/10`, `text-midagri-blue-dark`, `border-midagri-blue-light/30` por tokens reales del preset (`info`/`secondary`/`tertiary` según el matiz que se busque — decisión visual del propietario del diseño) | `convenio-detail.page.html:26` | H1 |
| 1.2 | Reemplazar `text-indigo-650` por un shade real de la escala Tailwind (`indigo-600`) o, preferible, un token del preset si el color es semántico (p. ej. `text-info`) | `convenio-detail.page.html:280` | H1 |
| 1.3 | Reemplazar `dark:text-slate-250` por `dark:text-slate-200` o `dark:text-slate-300` | `convenio-detail.page.html:258` | H1 |
| 1.4 | Repetir el mismo barrido en `cronograma-consolidado.component.html` (segundo archivo con `midagri-blue-*`) | `cronograma-consolidado.component.html` | H1 |
| 1.5 | Añadir un check de CI (grep o regla de lint) que falle si aparecen clases con sufijo numérico fuera de la escala estándar de Tailwind (`-[0-9]*[13579]0\b` que no sea 50/100.../900/950) o nombres de color no declarados en `tailwind-preset.js`, para que este bug no se repita silenciosamente | nuevo script en `apps/kofix-ejecucion` o regla compartida | H1 |

**Criterio de aceptación:** inspección visual (DevTools → computed style) confirma
color renderizado en los 4 puntos afectados; `grep -rn "midagri-blue\|indigo-650\|slate-250" apps/kofix-ejecucion/src` devuelve 0.

#### Fase 2 — Accesibilidad de templates 🟠
**Objetivo:** Cerrar los 62 warnings de accesibilidad que sí representan una
barrera real de uso (no solo estilo).

| Tarea | Detalle | Hallazgo |
|------|---------|----------|
| 2.1 | Asociar cada `<label>` afectado con su control vía `for`/`id` o envolviendo el control dentro del `<label>` | 54 ocurrencias, priorizar formularios de `programacion-items`, `no-objecion-modal`, `rendicion-modal`, `desembolso-modal` (donde hay más inputs) | H2 |
| 2.2 | Añadir `tabindex="0"` + manejador de teclado (`(keydown.enter)`/`(keydown.space)`) o migrar a un elemento nativo (`<button>`) en los 4 elementos con `interactive-supports-focus` | localizar con `nx lint kofix-ejecucion` filtrando la regla | H2 |
| 2.3 | Añadir el handler de teclado equivalente en los 4 casos de `click-events-have-key-events` | ídem | H2 |

**Criterio de aceptación:** `nx lint kofix-ejecucion` reporta 0 ocurrencias de
`label-has-associated-control`, `interactive-supports-focus` y
`click-events-have-key-events` (el resto de warnings del override transicional
se mantiene sin regresión).

#### Fase 3 — Consistencia de tablas y botones 🟡
**Objetivo:** Unificar el uso del design system donde ya existe un componente
equivalente, sin inventar uno nuevo.

| Tarea | Archivo | Hallazgo |
|------|---------|----------|
| 3.1 | Migrar la tabla Kardex de `convenio-detail.page.html` (tab 5) a `app-ui-data-table` | `convenio-detail.page.html:339-407` | H4 |
| 3.2 | Evaluar caso a caso las tablas de los 5 modales (`rendicion-modal`, `desembolso-modal`, `no-objecion-modal`, `cronograma-consolidado`, `programacion-cronograma-modal`): migrar a `app-ui-data-table` las que tengan paginación/orden real; documentar como excepción deliberada las que son listas fijas de pocas filas dentro de un modal (no todo `<table>` es un defecto) | 5 componentes | H4 |
| 3.3 | Reemplazar los 12 `<button>` nativos restantes por `ui-button` donde el semáforo visual (severity/size) ya cubre el caso de uso; dejar constancia en el PR de los que se mantienen nativos y por qué (p. ej. dentro de un `<label>` custom) | toda la app | H5 |

**Criterio de aceptación:** `grep -c "<table" apps/kofix-ejecucion/src --include=*.html -r` baja del conteo actual documentando explícitamente cada excepción restante en la descripción del PR; `<button` nativo solo permanece donde el PR justifica la excepción.

#### Fase 4 — Descomponer `convenio-detail.page.html` 🟡
**Objetivo:** Bajar la plantilla de 416 líneas a un tamaño mantenible, mismo
criterio que la Fase 7 del ADR 0002 (`sat-ui`, componentes >250 LOC).

| Tarea | Detalle |
|------|---------|
| 4.1 | Extraer el tab-bar de 6 botones repetidos a un componente `ConvenioDetailTabsComponent` (o promoverlo a `@agroideas/ui` como `ui-tabs` si se confirma que `sat-ui`/otras apps lo necesitarán — decisión a tomar al inicio de la fase) |
| 4.2 | Extraer el contenido del tab "Kardex & Varianza" (guía de glosario + tabla, ya migrada a `app-ui-data-table` en Fase 3) a `KardexVarianzaTabComponent` |
| 4.3 | Dejar `convenio-detail.page.html` como orquestador delgado que solo resuelve `activeTabIndex()` y proyecta los subcomponentes |

**Criterio de aceptación:** `convenio-detail.page.html` ≤150 líneas; ningún
componente nuevo supera 200 líneas de template inline.

#### Fase 5 — Cobertura de tests y cierre 🟢
**Objetivo:** Cerrar la cobertura faltante y limpiar cualquier resto detectado
durante la ejecución de las fases previas.

| Tarea | Detalle | Hallazgo |
|------|---------|----------|
| 5.1 | Crear specs para `login-form`, `reporte-mensual-chart`, `reporte-mensual-donut`, `resumen-ejecutivo` | componentes de presentación sin test hoy | H8 |
| 5.2 | Crear specs mínimos para `home.component.ts` y `styleguide.page.ts` (smoke test de creación) | páginas triviales/vitrina | H8 |
| 5.3 | Decidir explícitamente el destino de H6 (componentes `ui-*` sin consumidor): si un flujo pendiente los necesita (p. ej. `ui-dropzone`/`ui-file-chip` para carga de comprobantes en desembolsos/rendiciones), documentarlo aquí como trabajo futuro; si no, dejar constancia de que son scaffolding intencional de `@agroideas/ui` para otras apps |
| 5.4 | Actualizar `CLAUDE.md`/`AGENTS.md` con el nuevo conteo de warnings de lint tras las Fases 1-4 | mantener documentación viva |

**Criterio de aceptación:** `nx test kofix-ejecucion` cubre el 100% de páginas
y componentes de presentación con al menos un spec; `CLAUDE.md` refleja el
conteo de warnings post-remediación.

### D4 — Orden y dependencias entre fases

```
Fase 1 (bug visual)   ─┐
                       ├─→ [independientes entre sí]
Fase 2 (a11y)          ┘

Fase 3 (tablas/botones) ─→ Fase 4 (split convenio-detail)   [secuenciales: 4 depende de que
                                                              la tabla Kardex ya esté en
                                                              app-ui-data-table antes de extraerla]

Fase 5 (tests + cierre) ─→ depende de que 1-4 estén cerradas para no testear código que va a moverse
```

Las Fases 1 y 2 son el **camino crítico** (bug de producción + barrera de
accesibilidad). Las Fases 3-4 son refinamiento estructural y pueden
intercalarse con trabajo de producto si la prioridad cambia. La Fase 5 cierra
el ciclo.

### D5 — Política de PRs y commits
- Un PR por fase, título `[kofix-ejecucion][faseN] <descripción>`.
- Cada PR incluye en su descripción la sección correspondiente de este ADR.
- Mensajes de commit en español, siguiendo el estilo del repo.
- Se actualiza el [Registro de implementación](#registro-de-implementación) al
  cerrar cada fase.

## Consecuencias

### Positivas
- Elimina un bug visual real y verificable sin esperar a un ciclo de refactor mayor.
- Cierra una barrera de accesibilidad concreta (62 puntos), no solo deuda de estilo.
- `convenio-detail.page.html` deja de ser el archivo de mayor riesgo de la app (416 → ≤150 líneas).
- Refuerza el patrón "un componente de listado usa `app-ui-data-table`" de forma consistente, facilitando el mantenimiento futuro.
- Sirve como segundo precedente operativo (tras ADR 0002) de remediación por fases en el portafolio.

### Negativas / riesgos
- La Fase 4 puede descubrir que el tab-bar no es fácilmente genérico (depende de `disabled` condicionado a `isProgramacionCompleta()`) — si ese acoplamiento resulta muy específico de `convenio-detail`, se mantiene el componente local en vez de promoverlo a `@agroideas/ui`, evitando una abstracción prematura.
- Migrar tablas de modales a `app-ui-data-table` (Fase 3) puede requerir extender ese componente si no soporta hoy filas sin paginación — se evalúa caso a caso, no se fuerza la migración si el componente no encaja.
- 5 PRs en secuencia exigen disciplina de revisión, igual que en ADR 0002.

### Neutras
- No cambia contratos con los tres backends .NET (`apiSeguridad`, `apiEjecucion`, `apiGeneral`).
- No reabre la decisión ya tomada sobre el override transicional de ESLint (`no-explicit-any`, etc. en `warn`) — esa deuda sigue su propio track fuera de este ADR.
- No afecta a `sat-ui` salvo la promoción opcional de un componente a `@agroideas/ui` (D1, excepción).

## Alternativas consideradas y descartadas

1. **Fix silencioso del bug visual sin ADR** — descartado: H1 es un bug de
   producción con impacto de marca; conviene dejar constancia trazable de
   cuándo y por qué se rompió (clases fuera de la escala Tailwind) para
   prevenir recurrencia (de ahí la Fase 1.5, el check de CI).
2. **Refactor monolítico en un solo PR** — descartado por el mismo motivo que
   en ADR 0002: imposible de revisar, sin granularidad para bisectar.
3. **Forzar `app-ui-data-table` en todas las tablas de modales sin excepción**
   — descartado: algunas son listas fijas de 3-5 filas dentro de un modal,
   donde `app-ui-data-table` añadiría paginación/orden innecesarios; se opta
   por evaluación caso a caso (Fase 3.2).
4. **Promover `ui-tabs` a `@agroideas/ui` sin confirmar reutilización** —
   descartado como decisión de entrada: se difiere a la Fase 4 para evitar
   una abstracción prematura si el patrón resulta demasiado específico de
   `convenio-detail`.

## Referencias

- [ADR 0001 — Migración a Monorepo Frontend AGROIDEAS](./0001-migracion-monorepo-frontend-agroideas.md)
- [ADR 0002 — Modernización de `apps/sat-ui`](./0002-modernizacion-sat-ui-buenas-practicas-angular.md) — molde de remediación por fases seguido aquí.
- `CLAUDE.md` — convenciones del monorepo, override transicional de ESLint de `kofix-ejecucion`.
- `AGENTS.md` — guía corta para agentes IA (sincronizar tras cada fase).
- `apps/kofix-ejecucion/` — código objetivo de este ADR.
- `libs/theme/src/tailwind-preset.js` — fuente de verdad de los tokens de color válidos (base de la Fase 1).
- Skill `angular-best-practices` — base de criterio para H2-H4.

## Registro de implementación

| Fase | Estado | PR | Fecha cierre | Notas |
|------|--------|----|-------------|-------|
| 1 — Bug visual | ✅ Completada | _pendiente_ | 2026-08-22 | 1.1–1.4: `midagri-blue-light/dark` → token `info` (`--info: 193 100% 45%`, el matiz azul-cian que ya se buscaba) en `convenio-detail.page.html:26` y `cronograma-consolidado.component.html:77`; `text-indigo-650` → `text-indigo-600` y `dark:text-slate-250` → `dark:text-slate-200` en `convenio-detail.page.html:258,280` (alineado con el patrón `text-slate-800 dark:text-slate-200` ya usado en el resto del archivo). 1.5: guard script `apps/kofix-ejecucion/scripts/check-tailwind-tokens.sh` + target `nx run kofix-ejecucion:check-tailwind-tokens`, anclado a la paleta estándar de Tailwind (evita falsos positivos como `border-t-2`/`ring-offset-2`) más detección del prefijo `midagri-` no declarado en el preset; verificado que detecta los 3 patrones originales y queda en verde tras el fix. `grep -rn "midagri-blue\|indigo-650\|slate-250" apps/kofix-ejecucion/src` → 0. `nx lint` (313 warnings, 0 errores, sin regresión) y `nx build kofix-ejecucion` verdes; inspección del CSS del bundle confirma que `.text-info`/`.text-indigo-600` ahora sí generan reglas (antes las 3 clases no emitían nada). No se wireó a un pipeline de CI porque el repo no tiene `.github/workflows` todavía — queda como target `nx run kofix-ejecucion:check-tailwind-tokens` listo para engancharse cuando exista CI. |
| 2 — Accesibilidad | ✅ Completada | _pendiente_ | 2026-08-22 | 2.1: 54 `label-has-associated-control` resueltos añadiendo `id`/`for` explícitos en 12 páginas y 3 modales (`desembolso-modal`, `no-objecion-modal`, `rendicion-modal`); en `cartera.page.html` 3 de los 6 `<label>` reportados no tenían ningún control asociado (eran texto informativo de solo lectura: "Convenio:", "Organización:", "Especialista Actual:") y se corrigieron cambiando el tag a `<span>` en vez de forzar un `for` artificial. 2.2/2.3: de los 4+4 `interactive-supports-focus`/`click-events-have-key-events`, 2 pares se resolvieron con la solución estándar del ADR — `cartera.page.html:47` (span clicable de convenio) pasó a `role="link"` + `tabindex="0"` + `(keydown.enter)`, y `rendicion-modal.component.html:74` (dropzone de archivo) pasó a `role="button"` + `tabindex="0"` + `(keydown.enter)`/`(keydown.space)` con guarda `$event.target === $event.currentTarget` para no re-disparar el selector de archivo al operar por teclado el botón "Eliminar archivo" anidado. Los otros 2 pares (`cartera.page.html:93,94`, overlay/contenido de un modal artesanal que no usa `app-ui-modal`) NO se resolvieron con tabindex/role — el overlay envuelve controles interactivos reales (`select`, `textarea`, `ui-button`) y convertirlo en `<button>` o `role="button"` habría creado una jerarquía de controles anidados inválida; en su lugar se añadió `(keydown.escape)` real en el overlay (mejora genuina, ya existían además el botón "Cerrar" (X) y "Cancelar" como rutas de teclado equivalentes) y se documentó la excepción con comentarios `eslint-disable-next-line` en las 2 líneas — desviación explícita del enfoque genérico del ADR, registrada aquí en vez de forzar un role semánticamente incorrecto. `nx lint kofix-ejecucion`: 313 → 251 warnings (−62 exactos, 0 errores); `grep` confirma 0 ocurrencias restantes de las 3 reglas. `nx build` y `nx test` (45 suites / 351 tests) verdes sin regresión. |
| 3 — Tablas/botones | ✅ Completada | _pendiente_ | 2026-08-22 | **3.1:** tabla Kardex de `convenio-detail.page.html` (tab 5) migrada a `app-ui-data-table` con 8 columnas `type: 'custom'` y un `rowTemplate` compartido (`@switch (col.field)`) que reproduce barra de progreso, colores condicionales y badges idénticos al original; se adoptó también el estado de carga en skeleton del componente compartido en vez del spinner artesanal que había antes. **3.2:** las 5 tablas restantes se evaluaron caso a caso y **ninguna se migró** — decisión razonada, no omisión: `cronograma-consolidado.component.html` es una matriz Gantt de columnas dinámicas (1 por mes, hasta 36) incompatible con el modelo `columns: TableColumn[]` de esquema fijo de `app-ui-data-table`; `rendicion-modal`, `desembolso-modal`, `no-objecion-modal` y `programacion-cronograma-modal` son grillas de edición en línea de un `FormArray` reactivo (`formGroupName`/`formControlName` por fila, checkboxes/inputs editables, `<tfoot>` con totales) — `app-ui-data-table` no expone el índice de fila (`$index`) a su `rowTemplate` principal (solo al `actionsTemplate`) ni tiene slot de pie de tabla, por lo que forzar la migración habría requerido extender el componente compartido sin necesidad probada aún en otro lugar. **3.3:** de los 12 `<button>` nativos, **0 se reemplazaron por `ui-button`**, cada uno con motivo verificado: 9 (3 en `bandeja-aprobacion.page.html` + 6 en `convenio-detail.page.html`) son barras de pestañas con indicador de subrayado activo — `ui-button` no permite combinar `label()` con contenido adicional (su plantilla solo proyecta `ng-content` cuando NO se pasa `label`/`icon`), así que no puede representar el subrayado; quedan explícitamente diferidos a la decisión de `ui-tabs` de la Fase 4. 1 (`no-objecion-modal.component.html:61`, disparador del dropzone de PDF) envuelve contenido compuesto (icono + nombre de archivo dinámico + icono secundario) que el modelo de contenido de `ui-button` tampoco admite. 2 (`reporte-mensual-donut`, flechas de año) usan un glifo `‹`/`›` de 24×24px — el tamaño `iconOnly` más pequeño de `ui-button` es 32×32px (`sm`) y solo acepta iconos Material Symbols, no glifos crudos; adoptarlo en este widget de gráfico compacto arriesgaba una regresión visual no verificable sin navegador, así que se documenta como hallazgo de gap de librería (falta una variante `xs`) en vez de forzarlo. `grep -c "<table"` bajó de 6 a 5 archivos (exactamente los documentados arriba). `nx lint` (251 warnings, 0 errores, sin regresión), `nx build` y `nx test` (351/351) verdes. |
| 4 — Split `convenio-detail` | ✅ Completada | _pendiente_ | 2026-08-22 | **Decisión ui-tabs (D1 excepción):** NO se promovió a `@agroideas/ui`. Se comprobó que `sigec-rtf` (`bandeja-oa.component.html`) también tiene un tab-bar hecho a mano, pero con un estilo visual distinto (pastillas con fondo sólido) al de kofix (subrayado inferior animado); promover un `ui-tabs` genérico hoy habría exigido o bien imponer un estilo a un segundo consumidor sin acuerdo de diseño previo, o construir un componente configurable sin una necesidad probada — abstracción prematura. Se creó `ConvenioDetailTabsComponent` **local** a `kofix-ejecucion` (`presentation/components/convenio-detail-tabs/`), con spec propio. Las 3 pestañas de `bandeja-aprobacion.page.html` (mismo patrón de botones nativos, detectadas en la Fase 3.3) quedan fuera de esta extracción — no estaban en el alcance literal de 4.1 y unificarlas exigiría antes decidir si ambas barras deben verse iguales, lo cual es una decisión de producto, no de este ADR. **4.1:** tab-bar de 6 botones extraído a `ConvenioDetailTabsComponent` (`tabs`/`activeIndex` como `input()`, `tabChange` como `output()`); la página ahora deriva `tabs` con un `computed()` a partir de `isProgramacionCompleta()` en vez de repetir la condición 4 veces. **4.2:** contenido de "Kardex & Varianza" (guía de glosario + tabla `app-ui-data-table` de la Fase 3.1) extraído a `KardexVarianzaTabComponent`; de paso se detectó que el `formatCurrency` local de la página duplicaba exactamente la utilidad ya existente en `@agroideas/utils` — se corrigió en la página y en el componente nuevo usando la utilidad compartida en vez de crear una tercera copia. **Ampliación no listada originalmente:** para cumplir el criterio de ≤150 líneas también se extrajo la pestaña "Ficha Técnica" a `ConvenioFichaTecnicaTabComponent` (patrón presentacional: emite `downloadConvenioFisico`/`downloadKardexResumen`/`downloadReporteProgramacion` como `output<void>()`, la página conserva el manejo real vía `AlertService` y `formatConvenioNumber`). **4.3:** `convenio-detail.page.html` quedó en 117 líneas (desde 403); ningún componente nuevo supera 200 líneas (185 el más grande, `kardex-varianza-tab.component.html`). Se relocalizaron a los componentes nuevos las pruebas que la página tenía sobre lógica movida (`calculateExecutionPercentage`, `formatDate`) y se añadió spec nuevo para `ConvenioDetailTabsComponent` (sin cobertura previa) — ningún componente de esta fase queda sin test pendiente para la Fase 5. `nx build`, `nx lint` (251/0, sin regresión) y `nx test` (48 suites / 359 tests) verdes. |
| 5 — Tests + cierre | ✅ Completada | _pendiente_ | 2026-08-22 | **5.1:** specs nuevos para `login-form` (validez de formulario, `isFieldInvalid`, `onSubmit` con formulario válido/inválido), `reporte-mensual-chart` (escalado de `maxYVal`, paths SVG, tooltip, cambio de año), `reporte-mensual-donut` (porcentaje de ejecución, clasificación de estado/color, límites de año `minYear`/`maxYear`) y `resumen-ejecutivo` (formato de moneda, cálculo de porcentaje). Se verificó antes de reusar código que el `formatCurrency` local de `reporte-mensual-chart` (sin decimales, para el eje del gráfico) y el de `reporte-mensual-donut` (2 decimales, idéntico a `@agroideas/utils`) tienen comportamientos distintos — solo el segundo es una duplicación real, pero no se tocó por ser un cambio fuera del alcance de esta fase (solo cobertura de tests). **5.2:** specs para `home.component.ts` (carga de resumen/reporte mensual, agregación a `donutData`, manejo de error, cancelación de suscripción al cambiar de año) y `styleguide.page.ts`. Redactando el smoke test de `styleguide.page.ts` se detectó un **bug real preexistente**: el modal de demostración usaba `header`/`(onClose)`/`(onConfirm)`, atributos/eventos que no existen en `UIModalComponent` (cuya API real es `title`/`(onHide)`/`(onSave)`) — el modal de ejemplo nunca mostraba título y no se cerraba ni con la X, ni con el backdrop, ni con "Cancelar"/"Guardar". Corregido en el mismo commit. **5.3 (destino de H6):** `ui-dropzone`, `ui-file-chip` y `ui-pdf-viewer` **sí tienen un caso de uso concreto y perdido** en kofix: `no-objecion-modal` y `rendicion-modal` reimplementan a mano la carga de PDF (`<input type="file" hidden>` + CSS `form-file-upload` + nombre de archivo manual) exactamente lo que esos 3 componentes ya resuelven — se documenta aquí como trabajo futuro concreto (no se ejecuta en este ADR: cambia UX de carga de archivos en 2 modales de flujo real, requiere su propia validación funcional, fuera del alcance de "cobertura de tests" de esta fase). `ui-countdown-banner`/`ui-countdown-ring` no tienen caso de uso en kofix (naturaleza de cuenta regresiva no aplica a los flujos financieros actuales) — se confirma que es scaffolding intencional para otras apps. `ui-select-search`/`app-ui-pagination` tampoco se necesitan hoy: `app-ui-data-table` ya trae su propio paginador, y los `<select>` existentes tienen listas de opciones cortas; revisar si ese `<select>` de "Nuevo Especialista" (`cartera.page.html`) crece lo suficiente para justificar búsqueda. **5.4:** `CLAUDE.md` y `AGENTS.md` actualizados: conteo de warnings 319→251, y nota de que las reglas de accesibilidad de plantillas ya no aparecen (resueltas en la Fase 2). **Cobertura final:** `find apps/kofix-ejecucion/src/app/presentation/{pages,components} -maxdepth 1 -type d` sin ningún directorio sin `.spec.ts` — 100% de páginas y componentes de presentación con al menos un test. `nx lint` (251/0, sin regresión), `nx build` verde, `nx test` 54 suites / 397 tests verdes. |
