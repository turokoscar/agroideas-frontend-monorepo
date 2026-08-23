# ADR 0009: Refinamiento de UX en los modales financieros de `kofix-ejecucion` e identificación del convenio

## Estado
Aceptado · **Completado** (Fase 1 ✅ · Fase 2 ✅ · Fase 3 ✅ — ver [Registro de implementación](#registro-de-implementación))

## Fecha
2026-08-22

## Responsables
Equipo Frontend AGROIDEAS · Owner del módulo: Oscar Pazos

## Aplica a
`apps/kofix-ejecucion`: `no-objecion-modal`, `desembolso-modal`, `rendicion-modal`,
`convenio-detail.page.ts`. Amplía `@agroideas/utils` con una utilidad nueva
(`formatConvenioNumber`) que no modifica ningún consumidor existente fuera de kofix.

## Contexto

Este ADR es una continuación directa de [ADR 0008](./0008-remediacion-ui-kofix-ejecucion.md).
Tras angostar los tres modales financieros (1000px/900px/950px → 760px/760px/800px) y
redistribuir sus campos por contenido, una revisión visual iterativa con el propietario
del producto —sobre capturas reales del `no-objecion-modal` y `rendicion-modal` corriendo
contra el backend (`mc-api-ejecucion`) ya levantado— detectó tres focos adicionales:

1. **Densidad de la tabla de ítems de `no-objecion-modal`**: con el modal ya angosto,
   "Cantidad" y "Razón Social" quedaban visualmente comprimidos dentro de una sub-grilla
   de 2 columnas anidada en la 4ª columna de la tabla.
2. **Defectos de usabilidad puntuales en `rendicion-modal`**: un campo que nace en estado
   de error antes de cualquier interacción, una nota de auditoría que ocupa espacio fijo
   permanente, y ausencia de guía sobre el orden de la tarea.
3. **El encabezado de los tres modales muestra `Convenio ID: 86147`** — un identificador
   interno sin significado para el usuario, en vez del número de convenio formateado y la
   razón social de la organización, que sí le permiten confirmar de un vistazo que está
   operando sobre el convenio correcto.

### Hallazgo 1 — Tabla de ítems de `no-objecion-modal`

Iterando en vivo con el propietario del producto se acordó (y se implementó) una grilla
de **12 columnas explícitas**, replicada en ambas filas del ítem para que se alineen entre
sí:
- Fila 1: Ítem `col-span-6`, Cantidad `col-span-3`, Adjudicado `col-span-3`.
- Fila 2: RUC `col-span-4`, Razón Social `col-span-8`.
- El botón de eliminar vive fuera de la grilla de 12 columnas (slot fijo de 32px), con un
  espaciador invisible del mismo ancho en la fila 2 para mantener la alineación.

Esto reemplazó el primer intento (grid de 2 filas con anchos de columna ad-hoc en `rem`),
que ya corregía la truncación pero no distribuía el espacio proporcionalmente al contenido
real de cada campo (un RUC nunca supera 11 dígitos; una razón social puede ser tan larga
como "ASOCIACIÓN DE PRODUCTORES AGROPECUARIOS...", visible en los propios datos de prueba
del convenio usado para las capturas).

### Hallazgo 2 — Defectos puntuales de `rendicion-modal`

| # | Hallazgo | Severidad | Detalle |
|---|---------|-----------|---------|
| H1 | "Monto Total Factura" nace inválido | 🔴 bug de confianza | `[ngClass]` solo evalúa `.invalid`, sin `.touched` — el campo se muestra en rojo (`S/ 0`) desde el primer render, antes de que el usuario haya escrito nada |
| H2 | "Nota de Auditoría" es una caja ámbar de altura fija permanente | 🟡 densidad | Repite un mensaje que un usuario recurrente no necesita releer cada vez; compite por espacio con el dropzone en la misma columna |
| H3 | Sin guía de secuencia de la tarea | 🟡 flujo | Nada impide (ni comunica) que el usuario llene Comprobante/Sustento antes de elegir la Solicitud de Desembolso a la que pertenecen esos datos |
| H4 | Header sin subtítulo | 🟢 consistencia | `no-objecion-modal` sí mostraba un subtítulo (aunque con el defecto del Hallazgo 3 de abajo); `rendicion-modal` y `desembolso-modal` no mostraban ninguno |

### Hallazgo 3 — El encabezado no identifica el convenio de forma útil

Los tres modales reciben únicamente `convenioId: number` como `@Input`/`input()` — nunca el
objeto `Convenio` completo — y por eso el único dato disponible para el subtítulo era el ID
crudo. Antes de decidir cómo resolverlo se verificó explícitamente:

- **`ConvenioStateService`** (`providedIn: 'root'`, ya usado por `desembolso-modal` para
  `refresh()`) mantiene un signal `convenio: Signal<Convenio | null>` que `convenio-detail.page.ts`
  hidrata con `stateService.refresh(id)` en su `ngOnInit`, **antes** de que cualquier pestaña
  (y por lo tanto cualquiera de estos tres modales, todos anidados dentro de esa página) se
  renderice. Es decir: **el dato ya existe en memoria en el momento en que estos modales se
  abren** — no hace falta ninguna llamada nueva al backend.
- Se revisó `mc-api-ejecucion` (repo hermano en `KOFIX_APP/`) para confirmar que el formateo
  "NNNN-YYYY-ST" no debía delegarse al servidor: `ConvenioService.GetByIdAsync` (el endpoint
  que alimenta a `ConvenioStateService`) devuelve `NumeroConvenio` **sin formatear**; el
  formateo servidor solo existe en dos servicios no relacionados (`KardexEnrichmentService`,
  `NoObjecionService`) y usa `FechaFirma` en vez de `FechaInicio` — una inconsistencia interna
  del backend que confirma que el frontend no debe asumir un formato dado y debe seguir
  formateando él mismo, como ya lo hacía `convenio-detail.page.ts`.
- `formatConvenioNumber(convenio: Convenio)` ya existía, pero solo como método privado de
  `convenio-detail.page.ts`. Con esta ADR pasa a necesitarse en 4 lugares — se promueve a
  `@agroideas/utils` como función pura `formatConvenioNumber(numeroConvenio, fechaInicio)`
  (sin depender del tipo `Convenio`, que vive en el dominio de `kofix-ejecucion` y no puede
  ser importado por un lib `scope:shared` sin violar `@nx/enforce-module-boundaries`).

**Nota de alcance:** las rutas de nivel superior `/main/no-objeciones`, `/main/desembolsos`,
`/main/rendiciones` cargan estas mismas páginas fuera del árbol de `convenio-detail`, donde
`convenioId` es un `input.required<number>()` sin binding aparente en `app.routes.ts`. Esto
es una inconsistencia preexistente ajena a este ADR — no se investiga ni se corrige aquí,
pero queda anotada para una futura revisión de esas rutas.

## Decisiones

### D1 — Alcance: solo los 3 modales financieros + la utilidad compartida
No se toca ningún otro consumidor de `@agroideas/utils`. La nueva función
`formatConvenioNumber` es aditiva (no reemplaza `formatCurrency` ni ninguna otra utilidad
existente) y `convenio-detail.page.ts` migra a consumirla sin cambiar su propia firma
pública (`formatConvenioNumber(convenio?: Convenio)` sigue existiendo ahí, ahora como una
capa delgada sobre la función compartida).

### D2 — El subtítulo se resuelve con el estado ya cargado, no con nuevos `@Input`
Se decidió inyectar `ConvenioStateService` directamente en los tres modales (como ya
hacía `desembolso-modal` para otro propósito) en vez de agregar un nuevo `@Input convenio`
enhebrado a través de `no-objecion.page.ts` / `desembolso.page.ts` / `rendicion.page.ts`.
Motivo: el servicio ya es la fuente de verdad singleton para "el convenio actualmente
abierto" en toda la página; agregar un Input duplicaría ese estado sin necesidad.

### D3 — Progresión visual, no bloqueo funcional
El atenuado de "Detalles del Comprobante"/"Sustento" en `rendicion-modal` (Hallazgo H3) se
implementó como guía visual (`opacity-40 pointer-events-none`) condicionada a
`!selectedDesembolso() && !isEdit()`, replicando el mismo patrón CSS que ya usaba el propio
selector de solicitud en modo edición. La exclusión explícita de `isEdit()` evita un
regresión conocida: en edición, `selectedDesembolso()` puede no poblarse si el desembolso
asociado ya no figura en la lista de "pendientes" (comportamiento preexistente, fuera de
alcance), lo que habría atenuado incorrectamente una rendición real ya cargada.

## Plan de implementación (fases, ya ejecutadas)

### Fase 1 — Tabla de ítems de `no-objecion-modal` a grilla de 12 columnas
Reemplazar los anchos fijos en `rem` de la iteración anterior por `grid-cols-12` explícito
en ambas filas del ítem (6/3/3 y 4/8), con el botón de eliminar fuera de la grilla y un
espaciador para mantener la alineación entre filas.
**Criterio de aceptación:** ninguna truncación de "Cant." ni "Razón Social" en el ancho de
760px; las dos filas de cada ítem alinean sus columnas visualmente.

### Fase 2 — Defectos de `rendicion-modal`
1. `totalComprobante`: añadir `&& form.get('totalComprobante')?.touched` a la condición de
   estilo inválido.
2. Reemplazar la caja ámbar de "Nota de Auditoría" por un ícono `info` con `title` (tooltip)
   junto al encabezado "Sustento (Archivo PDF)" — mismo patrón ya usado para "Adjudicación
   Técnica" en `no-objecion-modal` (ADR 0008 Fase 3).
3. Atenuar el bloque de 2 columnas ("Datos del Comprobante") mientras no haya una solicitud
   de desembolso seleccionada, con un mensaje `"Selecciona una solicitud de desembolso para
   habilitar los datos del comprobante."` — condicionado a `!isEdit()` (D3).
**Criterio de aceptación:** el campo de monto no se muestra en rojo hasta ser tocado; no
queda ninguna caja de color fija de ancho completo para la nota de auditoría; el bloque de
comprobante se atenúa antes de elegir solicitud solo en modo creación.

### Fase 3 — Identificación del convenio en los 3 modales
1. `libs/utils/src/lib/convenio-number.ts`: nueva función pura `formatConvenioNumber`.
2. `convenio-detail.page.ts`: su método homónimo delega en la función compartida.
3. `no-objecion-modal`, `desembolso-modal`, `rendicion-modal`: inyectar
   `ConvenioStateService`, exponer `convenioSubtitle = computed(...)` con el formato
   `"{número formateado} · {razón social}"`, y enlazarlo a `[subtitle]` de `app-ui-modal`
   (reemplazando `'Convenio ID: ' + convenioId` en `no-objecion-modal`; agregando el binding
   por primera vez en los otros dos).
**Criterio de aceptación:** los 3 modales muestran el mismo formato de subtítulo; cero
llamadas nuevas al backend (verificable: ningún repositorio nuevo inyectado, solo el
servicio de estado ya existente).

## Consecuencias

### Positivas
- Cierra el ciclo de retroalimentación visual iniciado en ADR 0008 con datos reales del
  backend, no solo con maquetas.
- Elimina un defecto de confianza real (campo en rojo sin interacción) que afectaba a todo
  usuario que abriera el modal de rendición.
- `formatConvenioNumber` deja de estar atado a un solo componente — cualquier vista futura
  que necesite mostrar el número de convenio ya tiene una función probada y sin
  dependencias de dominio.
- El subtítulo "número · razón social" es ahora una convención reutilizable para cualquier
  modal futuro que opere sobre un convenio específico.

### Negativas / riesgos
- La atenuación visual (Fase 2.3) no es un bloqueo real de formulario — un usuario que edite
  el DOM o dispare eventos por otra vía podría seguir completando los campos sin solicitud
  elegida. Aceptable: la validación real sigue ocurriendo en `save()` y en `saveDisabled`.
- Si en el futuro estas páginas se vuelven alcanzables desde las rutas de nivel superior sin
  pasar por `convenio-detail.page.ts`, `ConvenioStateService.convenio()` sería `null` y el
  subtítulo se mostraría vacío (no roto, solo ausente) — comportamiento degradado aceptable,
  documentado en la nota de alcance de Hallazgo 3.

### Neutras
- No se modifica `mc-api-ejecucion` ni ningún contrato de API — confirmado explícitamente
  durante el análisis que el formateo debe permanecer en el frontend.
- No afecta a `sat-ui` ni a ningún otro consumidor de `@agroideas/utils`.

## Alternativas consideradas y descartadas

1. **Formatear el número de convenio en el backend** — descartado tras revisar
   `mc-api-ejecucion`: el formateo existente allí es inconsistente entre servicios (usa
   `FechaFirma`, no `FechaInicio`) y el endpoint principal (`GetByIdAsync`) no lo aplica en
   absoluto. Cambiarlo tocaría un contrato usado por más consumidores que este ADR audita.
2. **Agregar un `@Input convenio: Convenio` a los 3 modales** — descartado (ver D2): hubiera
   requerido tocar las 3 páginas contenedoras para pasar un dato que `ConvenioStateService`
   ya expone sin fricción.
3. **Bloquear (deshabilitar de verdad) los campos de Comprobante/Sustento hasta elegir
   solicitud** — descartado en favor de la atenuación visual (D3): deshabilitar los
   `FormControl` reales habría requerido lógica adicional de habilitar/deshabilitar
   sincronizada con validadores, con mayor riesgo de dejar el formulario en un estado
   inconsistente; la guía visual logra el mismo objetivo de UX sin ese riesgo.

## Referencias

- [ADR 0008 — Remediación de UI en `apps/kofix-ejecucion`](./0008-remediacion-ui-kofix-ejecucion.md)
- `libs/utils/src/lib/convenio-number.ts` — función nueva de este ADR.
- `apps/kofix-ejecucion/src/app/shared/services/convenio-state.service.ts`
- Repo hermano `KOFIX_APP/mc-api-ejecucion` — revisado para descartar formateo server-side
  (`ConvenioService`, `KardexEnrichmentService`, `NoObjecionService`).

## Registro de implementación

| Fase | Estado | PR | Fecha cierre | Notas |
|------|--------|----|-------------|-------|
| 1 — Grilla 12 columnas en ítems | ✅ Completada | _pendiente_ | 2026-08-22 | Iterado en vivo con el propietario del producto sobre el resultado real en navegador; reemplaza el ajuste de anchos en `rem` de la iteración previa. |
| 2 — Defectos de `rendicion-modal` | ✅ Completada | _pendiente_ | 2026-08-22 | 3 cambios aplicados (touched-gate, ícono de auditoría, atenuado condicionado a `!isEdit()`). |
| 3 — Identificación del convenio | ✅ Completada | _pendiente_ | 2026-08-22 | `formatConvenioNumber` promovida a `@agroideas/utils`; los 3 modales inyectan `ConvenioStateService` y exponen `convenioSubtitle()`. Specs de los 3 modales actualizados para mockear `ConvenioStateService.convenio` (antes ausente o incompleto). `nx build`, `nx lint` (kofix-ejecucion 251/0, utils sin hallazgos) y `nx test` (54 suites / 397 tests) verdes. |
