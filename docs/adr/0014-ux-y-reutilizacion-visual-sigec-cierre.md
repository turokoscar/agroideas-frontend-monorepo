# ADR 0014: UX y reutilización visual en `apps/sigec-cierre` — análisis situacional y plan

## Estado
Aceptado · puntos abiertos resueltos por el owner (21/10/2026) · **Fases 0 y 1 implementadas** (21/10/2026); las Fases
2 a 6 sin implementar. Ver el
[Plan de implementación por fases](#plan-de-implementación-por-fases) y el
[Registro de implementación](#registro-de-implementación).

## Fecha
2026-10-21 · Análisis hecho sobre el código (métricas de plantillas de las tres apps). No se revisó en el navegador:
`sel-api-seguridad` estaba apagada y no se pudo iniciar sesión.

## Responsables
Equipo Frontend AGROIDEAS · Owner del módulo: Oscar Pazos

## Aplica a
- `apps/sigec-cierre` — **casi todo el trabajo**.
- `libs/ui` — piezas nuevas (pestañas, stepper, estados de carga/error/vacío) y una variante por tono de
  `app-ui-status-pill`.
- `libs/theme` — las clases `form-*` pasan a tokens (afecta también a `kofix-ejecucion`).
- `SIGEC/sigec-api-cierre` (repo hermano, rama `opazos`) — **un cambio**: exponer la fecha de firma del convenio
  para formatear su número (H-01).
- `apps/sigec-rtf` y `apps/kofix-ejecucion` — solo como referencia; no se cambian, salvo lo que arrastre `libs/theme`.

## Contexto
`sigec-cierre` se construyó en un día (ADR 0013, Fases 0–5 el 20/10/2026) y funciona de punta a punta: 196 pruebas,
lint y build en verde. La UN y la OA pasan de `sigec-rtf` a `sigec-cierre` dentro del mismo flujo (el Anexo 20 vive
en RTF), así que cualquier diferencia de lenguaje visual entre ambas apps la notan los mismos usuarios.

La percepción del owner es que Cierre "no reutiliza los estilos ya trabajados en kofix y RTF". El análisis la
confirma en parte, pero la causa no está en los formularios.

### Formularios: Cierre es la app más consistente

| Variantes de estilo | sigec-cierre | sigec-rtf | kofix-ejecucion |
|---|---|---|---|
| `<input>` | **8** (37 de 53 con `form-input`) | 14 (Tailwind a mano) | 24 |
| `<textarea>` | **1** (`form-textarea` en las 14) | 10 | 3 |
| `<label>` | **5** (`form-label` en 47 de 54) | 14 | 11 |
| Secciones `form-card-flat` | 27 | 0 | 8 |

Las clases `form-*` de `libs/theme/src/styles/base.css` salieron de kofix, y Cierre las adoptó casi sin excepción.
RTF no las usa: sus inputs combinan a mano `rounded-xl`, `bg-surface-container/20` y `focus:ring-primary/30`. KOFIX
mezcla `form-*`, `filter-*` y Tailwind con `slate` fijo. **No hay un único estilo de formulario que copiar.**

### Componentes: aquí está la brecha

| `@agroideas/ui` | Cierre | RTF | KOFIX | Cierre usa en su lugar |
|---|---|---|---|---|
| `app-ui-status-pill` | 0 | 12 | 12 | `EstadoCierrePillComponent` y 6 badges a mano en el expediente |
| `app-ui-kpi` | 0 | 23 | 16 | contadores dentro de las pestañas de la bandeja |
| `ui-dropzone` | 0 | 3 | 0 | `SelectorPdfComponent` (patrón `form-file-upload` de kofix, sin arrastrar y soltar) |
| `ui-info-tooltip` | 0 | 7 | 0 | párrafos de ayuda en texto |
| `ui-countdown-banner` | 0 | 4 | 0 | solo `ui-countdown-ring` |
| `app-ui-data-table` | solo la bandeja | sí | sí | 3 tablas a mano en las pestañas del expediente |
| Pestañas | 3 implementaciones propias | 1 | 0 | no existe en la librería |
| Stepper | propio | — | — | no existe en la librería |

### Colores
Cierre tiene **187 clases con color fijo** (`text-slate-400` ×45, `text-slate-500` ×36, `border-slate-200` ×33,
`bg-slate-50` ×19…) frente a 370 con tokens. RTF: 121 fijos y 1318 con tokens; KOFIX: 544 fijos y 106 con tokens.
Los fijos de Cierre vienen de copiar el patrón de kofix y de las propias clases `form-*`, que usan `slate` y
`bg-white` en lugar de tokens.

## Hallazgos

### H-01 — El número de convenio no se formatea 🔴
RTF y KOFIX muestran `0048-2023-ST` con `formatConvenioNumber(numero, fecha)` de `@agroideas/utils`
(`libs/utils/src/lib/convenio-number.ts`). Cierre muestra el número tal como llega del SEL (`48`), y cuando falta,
el `ideConvenio` (postulanteId), que es un identificador interno.

| Dónde | Hoy |
|---|---|
| Bandeja (pendientes y todos) | `row.txtNumeroConvenio ?? row.ideConvenio` |
| Cabecera del expediente | `Convenio {{ c.txtNumeroConvenio ?? c.ideConvenio }}` |
| Acta (Anexo 21) e Informe de Evaluación (Anexo 22) | `a.txtNumeroConvenio ?? '—'` |
| Evaluaciones de impacto | `e.txtNumeroConvenio ?? e.ideConvenio` |
| PDFs de los Anexos 20, 21 y 22 (API) | `TxtNumeroConvenio` sin formato |

Falta el dato para formatearlo: el año sale de la fecha de firma, y la API de cierre no la expone en `CierreDto`
ni en `ExpedientePendienteDto`. La conoce: `DatosDelSel` ya lee `FechaFirma` del SEL para los Anexos 20 y 22
(`FecInicioConvenio`), y `EvaluacionImpactoDto` ya trae `FecFirma`.

Además, el formato no estaba unificado fuera de Cierre: la función de `@agroideas/utils` convivía con cinco
implementaciones propias (`convenio-list` y `cartera` en KOFIX —esta última con el año de `periodo`, que
`sel-api-general` envía en 0—, el pipe `format-convenio.pipe.ts` de RTF, que sin año asumía 2023, y dos en C# en
`sigec-api-rtf`). La de la librería tenía dos defectos: `new Date('2026-01-01')` es medianoche UTC y en Lima da 2025,
y la fecha mínima que envían las APIs .NET (`0001-01-01`) producía `0048-1-ST`. El `fechaInicio` de KOFIX sí es la
fecha de firma: `mc-api-ejecucion` lo mapea desde `FechaFirma`.

### H-02 — Iniciar un expediente pide el `postulanteId` 🔴
El modal "Iniciar expediente" de la bandeja pide "ID del convenio en el SEL (postulanteId)" como número. La UN no
conoce ese identificador interno: tiene que buscarlo en otra parte. Lo esperable es buscar por N° de convenio u
organización, como en RTF (`convenios/asignados` de `sel-api-general`), con `lib-ui-select-search`.

### H-03 — Cierre fabrica componentes que la librería ya tiene 🟠
Insignia de estado, carga de PDF, tablas, banners de plazo y ayudas contextuales (tabla de la sección Contexto).
Para el usuario: en RTF un estado, un plazo o una carga de archivo se ven de una forma y en Cierre de otra.

Dos de ellos tienen motivo: `app-ui-status-pill` solo admite un vocabulario fijo (`'Activo' | 'Suspendido' |
'Finalizado' | …`) y no los 9 estados del expediente, y `ui-dropzone` está pensado para varios PDFs. La solución es
ampliar la librería, no rodearla.

### H-04 — Piezas sin equivalente en la librería 🟠
Pestañas (bandeja y expediente, 3 implementaciones con el mismo marcado repetido por botón), stepper de etapas y
estados de carga, error y vacío (cada componente escribe su "Cargando…" con estilo propio). Son candidatas a
`libs/ui`: RTF también tiene pestañas.

### H-05 — El expediente es una página muy larga 🟠
Cabecera, stepper, **las 6 tarjetas de etapa** (las pendientes al 60 % de opacidad, ocupando espacio sin aportar) y
debajo las pestañas. El formulario activo, que es a lo que viene el usuario, queda a mitad de página. El stepper no
navega: no hace scroll a la etapa ni la abre.

### H-06 — Formularios sin validación por campo 🟠
Los requisitos llegan como lista de `faltantes` de la API arriba del formulario; ningún campo se marca, no hay
`aria-invalid` ni mensaje junto al campo. En el Acta (≈40 campos y 4 tablas) el usuario busca a mano qué le falta.
Todo el módulo usa `ngModel`; KOFIX usa formularios reactivos en 5 pantallas.

### H-07 — Colores fijos mezclados con tokens 🟡
En una misma pantalla conviven `border-border`/`bg-card` (tokens) y `border-slate-200`/`bg-white` (fijos). Se nota
en bordes y grises, e impide cualquier ajuste de tema por token.

### H-08 — Detalles de legibilidad 🟡
- 64 usos de texto de 9–11 px (RTF tiene 159; KOFIX 80): no es propio de Cierre, pero en el Acta y el Anexo 22 se
  suma a tablas densas.
- Las tablas editables del Acta y el Anexo 22 tienen ancho mínimo y scroll horizontal: en una laptop se pierden
  columnas.
- Las etapas pendientes al 60 % de opacidad bajan el contraste del texto gris.

### Lo que está bien y se conserva
- El Acta sigue el orden del formato oficial; los datos del SEL se muestran bloqueados y se explica por qué.
- Listas precargadas del SEL (presidente, objetivos específicos) con alternativa de texto libre si el SEL no tiene
  datos.
- La bandeja usa `app-ui-filter-bar`, `app-ui-data-table` y `app-ui-pagination`, con mensajes de vacío claros.
- Confirmación en modal antes de las acciones sin vuelta atrás (remitir a la DE, suscribir la RDE).
- `ui-button` en toda la app (42 usos), con `ariaLabel` en los botones de solo ícono.
- Las clases `form-*` del tema en casi todos los formularios.

## Decisiones

### D1 — El estándar es `@agroideas/ui` y `@agroideas/theme`, no el estilo de otra app
Ni RTF ni KOFIX son un patrón uniforme. Cierre no copia el marcado de ninguna: usa los componentes de la librería y
las clases del tema. Cuando falta algo, se agrega a la librería (D3) para que RTF y KOFIX puedan adoptarlo después.

### D2 — Un solo formato de número de convenio: `NNNN-AAAA-ST` con el año de la fecha de firma
Decisión del owner (21/10/2026), para los tres módulos (KOFIX, RTF, Cierre), en pantalla **y en los PDFs oficiales**.
- **Frontend:** una sola implementación, `formatConvenioNumber(numero, fechaFirma)` y el pipe `formatConvenio` de
  `@agroideas/utils`. Ninguna app escribe la suya. Reglas: relleno a 4 dígitos; si ya trae `-ST` o no es numérico,
  se devuelve tal cual; sin número, `-`; sin fecha válida (o `0001-01-01`), año `XXXX`; el año se lee del texto ISO
  para no depender de la zona horaria. Nunca se muestra el `ideConvenio` en su lugar.
- **API de cierre:** `SCC_TMC_CIERRE` guarda `fec_firmaConvenio` (del SEL al abrir el expediente, con migración que
  completa los existentes) y la exponen `CierreDto`, `ExpedientePendienteDto` y los DTO de los Anexos 20, 21 y 22.
- **PDFs (Anexos 20, 21 y 22):** llevan el número formateado. Como la API es C#, tiene **una** función equivalente
  (`FormatoConvenio.Formatear`) con los mismos casos de prueba que `convenio-number.spec.ts`.

### D3 — Lo que falta se agrega a `libs/ui`
- `app-ui-status-pill`: variante por **tono** (`tone: 'primary' | 'success' | 'warning' | 'danger' | 'muted'` +
  `text`), sin romper el vocabulario actual. `EstadoCierrePillComponent` queda como un mapeo estado → tono sobre ella.
- `ui-tabs` (accesible: `role="tablist"`, flechas del teclado, contador opcional).
- `ui-stepper` (etapas con situación completada/activa/pendiente, actor, fecha, clic para navegar).
- `ui-state` (carga, error con reintento y vacío con ícono y mensajes), alineado con el vacío de
  `app-ui-data-table`.
- Siguen la regla del barrel: nada pesado ni con efectos al cargar el módulo.

### D4 — Las clases `form-*` del tema pasan a tokens
`text-slate-*`, `border-slate-*` y `bg-white` → `text-muted-foreground`, `border-input`, `bg-background`, etc., en
`libs/theme/src/styles/base.css`. Afecta también a KOFIX: se eligen los tokens que dejan el mismo aspecto y se
verifica en ambas apps. Cierre deja de usar `slate` directo en sus plantillas.

### D5 — El expediente se centra en la etapa activa
- La tarjeta de la etapa activa va primero, abierta, con su formulario.
- Las completadas se muestran como resumen plegable (fecha, documentos); las pendientes, solo en el stepper.
- El stepper navega a cada etapa.
- La cabecera y las pestañas secundarias se mantienen.

### D6 — Validación por campo en los formularios largos
Acta (Anexo 21) e Informe de Evaluación (Anexo 22): validación en el cliente de los campos obligatorios, con
`aria-invalid`, mensaje bajo el campo y, al intentar guardar o registrar, foco y scroll al primer error. La lista
`faltantes` de la API se mantiene como resumen. Migrar a formularios reactivos solo si la validación lo pide: no es
un objetivo en sí.

### D7 — Sin cambios de flujo ni de reglas
El ADR es de presentación. Las reglas siguen en la API (`MaquinaEstadosCierre`, `faltantes`, plazos), y fuera de
H-01 y H-02 no se piden endpoints nuevos.

## Plan de implementación por fases

Cada fase deja lint, test y build en verde (`npx nx run-many -t lint,test,build -p sigec-cierre`, y los proyectos
de `libs` tocados), se prueba en el navegador con los usuarios de prueba locales y se commitea por separado.

### Fase 0 — Número de convenio formateado (H-01) 🔴
- **API (`sigec-api-cierre`):** columna `fec_firmaConvenio`, migración que la completa desde el SEL para los
  expedientes existentes, captura al abrir el expediente y exposición en `CierreDto`, `ExpedientePendienteDto` y los
  DTO de los Anexos 21 y 22. Pruebas.
- **UI:** pipe `convenio` sobre `formatConvenioNumber`; reemplazo en bandeja, expediente, `mi-cierre`, Acta,
  Anexo 22, evaluaciones de impacto y nombres de archivo descargados. Se quita el respaldo a `ideConvenio`.
- **PDFs:** `FormatoConvenio.Formatear` en la API de cierre (D2), usado por los generadores de los Anexos 20, 21 y
  22.
- ✅ Implementada el 21/10/2026 (ver Registro).

**Criterio de aceptación:** el expediente 10004 muestra "Convenio 0048-AAAA-ST" (año de su firma) en la bandeja, la
cabecera, el Acta, el Anexo 22 y en los tres PDFs, igual que RTF para el mismo convenio.

### Fase 1 — Buscador de convenio al iniciar el expediente (H-02) 🔴
- El modal "Iniciar expediente" busca los convenios en `sel-api-general` (los asignados al especialista o todos, según
  el rol), mostrando "0048-2023-ST · Organización" y el RUC.
- Se envía el `postulanteId` elegido; el usuario no lo ve.
- ✅ Implementada el 21/10/2026 con un componente nuevo, `ui-autocomplete`, en lugar de `lib-ui-select-search` (ver
  Registro). Busca por RUC o razón social: el SEL no busca por número (punto abierto 3).

**Criterio de aceptación:** un usuario de la UN inicia un expediente escribiendo parte del RUC o del nombre de la
organización, sin conocer el `postulanteId`.

### Fase 2 — Adopción de lo que ya existe en `@agroideas/ui` (H-03) 🟠
- `app-ui-status-pill` con la variante por tono (D3) y `EstadoCierrePillComponent` sobre ella; los 6 badges de
  etapa del expediente pasan a la misma pieza.
- `ui-dropzone` en lugar de `SelectorPdfComponent` (con `multiple=false`), o `SelectorPdfComponent` como envoltura
  fina de `ui-dropzone` si hace falta mantener su API.
- `ui-countdown-banner` para los plazos activos (como en RTF) junto al anillo.
- `ui-info-tooltip` para las ayudas que hoy son párrafos.
- `app-ui-data-table` en las pestañas Documentos, Plazos y Correos enviados.
- `app-ui-kpi` en la cabecera de la bandeja: vencidos, por vencer, en plazo y sin plazo.

**Criterio de aceptación:** estados, plazos, ayudas y carga de PDF se ven igual en Cierre y en RTF; Cierre no tiene
insignias ni tablas escritas a mano fuera de los formularios editables.

### Fase 3 — Piezas nuevas en `libs/ui` (H-04) 🟠
- `ui-tabs`, `ui-stepper` y `ui-state` (D3), con specs y accesibilidad de teclado.
- Adopción en Cierre (bandeja, expediente, administración) y reemplazo de los "Cargando…" ad hoc.
- RTF y KOFIX pueden adoptarlas después; no es parte de esta fase.

**Criterio de aceptación:** Cierre no tiene implementaciones propias de pestañas, stepper ni estados; las nuevas
piezas tienen pruebas y funcionan con teclado.

### Fase 4 — Expediente centrado en la etapa activa (H-05) 🟠
- Reordenar según D5: etapa activa primero, completadas plegadas, pendientes solo en el stepper, stepper navegable.

**Criterio de aceptación:** al abrir un expediente, el formulario de la etapa activa queda visible sin hacer
scroll en una pantalla de laptop (1366×768); las etapas completadas se pueden consultar desplegándolas.

### Fase 5 — Validación por campo (H-06) 🟠
- D6 en el Acta y el Anexo 22, incluidos los modales de indicadores y las tablas editables.
- Tablas editables legibles en 1366 px: columnas de referencia plegables o filas en dos niveles.

**Criterio de aceptación:** al intentar registrar con datos faltantes, cada campo incompleto se marca con su mensaje
y el foco va al primero; un lector de pantalla anuncia el error.

### Fase 6 — Tokens en lugar de colores fijos (H-07, H-08) 🟡
- D4 en `libs/theme` (clases `form-*`), verificado en KOFIX y Cierre.
- Reemplazo de los 187 colores fijos de Cierre por tokens.
- Etapas pendientes sin opacidad; textos de 9–10 px a un mínimo de 11 px en Cierre.

**Criterio de aceptación:** `grep` de `(bg|text|border)-slate-` en `apps/sigec-cierre` da 0; KOFIX se ve igual
antes y después (capturas de sus formularios principales).

### Resumen

| Fase | Alcance | Repos | Depende de |
|---|---|---|---|
| 0 | Número de convenio formateado | API + UI | — |
| 1 | Buscador de convenio al iniciar | UI | 0 (para mostrar el número formateado) |
| 2 | Adoptar componentes existentes | `libs/ui` + UI | — |
| 3 | Pestañas, stepper y estados en `libs/ui` | `libs/ui` + UI | — |
| 4 | Expediente centrado en la etapa activa | UI | 3 (`ui-stepper`) |
| 5 | Validación por campo | UI | — |
| 6 | Tokens en lugar de colores fijos | `libs/theme` + UI | — |

Las fases 0 y 1 son las de más impacto para el usuario y las más cortas. La 2, la 3 y la 6 son independientes entre
sí.

## Alternativas consideradas
- **Copiar el estilo de RTF en Cierre.** Descartada: RTF no usa las clases `form-*` del tema y tiene 14 variantes de
  input; copiarlo trasladaría su dispersión.
- **Formatear el número de convenio en la UI sin cambiar la API** (consultando `sel-api-general` por cada fila).
  Descartada: una consulta por expediente en la bandeja, y los PDFs de la API seguirían sin formato.
- **Que la API devuelva el número ya formateado.** Descartada para la UI: duplicaría en C# la regla de
  `formatConvenioNumber`, que es la que usan RTF y KOFIX. Para los PDFs no hay alternativa, porque los genera la
  API: lleva una función C# equivalente con los mismos casos de prueba (D2).
- **Rehacer los formularios con formularios reactivos de una vez.** Descartada: el problema es la falta de
  retroalimentación por campo, no la técnica; se migra solo donde la validación lo pida (D6).

## Consecuencias

### Positivas
- La UN y la OA ven el mismo lenguaje visual en RTF y Cierre.
- El número de convenio se reconoce igual en los tres módulos.
- `libs/ui` gana pestañas, stepper y estados que RTF y KOFIX pueden adoptar.
- El tema por tokens permite ajustes de marca o de contraste sin tocar las apps.

### Negativas / riesgos
- La Fase 0 toca la API y la BD de cierre (columna y migración) y hay que desplegarla junto con la UI.
- D4 cambia clases que usa KOFIX: riesgo de diferencias visuales sutiles; se mitiga con capturas antes y después.
- Ampliar `app-ui-status-pill` debe mantener su API actual: tiene 24 usos en RTF y KOFIX.

## Puntos abiertos
1. **Formato en `sigec-api-rtf`:** `PostulanteServicio` (dashboard de la OA) y `ClienteExternoRtf` (correos) formatean
   en C# por su cuenta; el primero, sin fecha de firma, usa el año actual y, sin número, el `Id` del convenio. Deben
   pasar a la misma regla (D2). Fuera del alcance de este ADR; se registra para RTF.
2. **`formatDocNumber` de KOFIX** (`no-objecion.page.ts`, `bandeja-aprobacion.page.ts`): duplica
   `formatSolicitudNumber` para los números de documento. No es el número de convenio; se registra como deuda.
3. **Búsqueda de convenios por número en el SEL:** `GENERAL.SEL_SP_R_ListarConvenioCartera` (`convenios/todos`,
   `asignados`, `cartera`) aplica `@Busqueda` solo al RUC y a la razón social, aunque la documentación de
   `BusquedaRequest` dice que también al número; el filtro `NumeroConvenio` solo lo recibe `vigentes`. Ampliar el SP
   afecta a KOFIX, RTF y SAT y requiere desplegarlo en BD_SEL: el owner decidió no tocarlo por ahora (21/10/2026).

### Resueltos
- **Año del número de convenio** (21/10/2026, owner): el de la fecha de firma, en los tres módulos.
- **PDFs oficiales** (21/10/2026, owner): llevan el número formateado.
- **Pipe propio de RTF** (21/10/2026, owner: "estandariza la función y reutilicémosla"): eliminado; ver Registro.

## Referencias
- `docs/adr/0013-ui-sigec-cierre-expediente-de-cierre.md` — flujo, roles y fases de la app.
- `docs/adr/0003-unificacion-visual-reusabilidad-sat-ui.md` y `docs/adr/0008-remediacion-ui-kofix-ejecucion.md` —
  precedentes de unificación visual en el monorepo.
- `libs/utils/src/lib/convenio-number.ts` — `formatConvenioNumber`.
- `libs/theme/src/styles/base.css` — clases `form-*` compartidas.
- `SIGEC/sigec-api-cierre/SIGEC_CIERRE.Negocio/Integraciones/DatosDelSel.cs` — origen de `TxtNumeroConvenio` y
  `FechaFirma`.

## Registro de implementación

### Fase 0 (primera parte) — 2026-10-21: función de formato estandarizada (commit `5c4bcc6`)
- **`@agroideas/utils`:** `formatConvenioNumber(numero, fechaFirma)` corregida (año leído del texto ISO, sin desfase
  UTC; `0001-01-01` y fechas inválidas → `XXXX`; números no numéricos se devuelven tal cual; acepta `number` y
  `Date`). Nuevo pipe `FormatConvenioPipe` (`formatConvenio`) exportado desde el barrel. Pruebas en
  `convenio-number.spec.ts`.
- **`sigec-rtf`:** se elimina `core/pipes/format-convenio.pipe.ts` (año 2023 por defecto); `oa-dashboard` usa el pipe
  de la librería.
- **`kofix-ejecucion`:** `convenio-list` y `cartera` usan la función de la librería; `cartera` toma el año de
  `fechaFirma` en lugar de `periodo`.
- **`sigec-cierre`:** el Anexo 22 (`fecInicioConvenio`, que es la fecha de firma del SEL) y Evaluaciones de impacto
  (`fecFirma`) muestran el número formateado; también el nombre de los PDFs descargados del Anexo 22. La bandeja, la
  cabecera del expediente y el Acta esperan a que la API exponga la fecha de firma (resto de la Fase 0).
- **Pruebas:** utils 37/37, kofix-ejecucion 541/541, sigec-cierre 196/196, sigec-rtf 206/206; lint sin errores
  (advertencias previas: 238 en kofix, 104 en RTF); build de las tres apps.

### Fase 0 (segunda parte) — 2026-10-21: fecha de firma en la API de cierre y número formateado en todo Cierre
- **Corrección de la primera parte:** en Evaluaciones de impacto se había usado `fecFirma`, que es la fecha en que se
  firmó el Anexo 22, no el convenio: el número salía con el año 2026. Ahora usa `fecFirmaConvenio`.
- **`sigec-api-cierre`** (rama `opazos`):
  - `fec_firmaConvenio` en `SCC_TMC_CIERRE` (`schema.sql` y `migracion_21102026_fecha_firma_convenio.sql`, que la
    completa desde el Anexo 22 o el Anexo 20 de cada expediente). La apertura la copia del SEL; si el SEL envía la
    fecha mínima de .NET, se guarda NULL.
  - Expuesta en `CierreDto` (y el detalle), `ExpedientePendienteDto`, `PlazoPorAlertarDto`, `EvaluacionImpactoDto`
    (`FecFirmaConvenio`, distinta de `FecFirma`) y `Anexo21Dto` (desde el SEL, sin guardarse con el acta). SP
    actualizados: `SCC_SP_R_CIERRES`, `SCC_SP_P_APLICARCAMBIO`, `SCC_SP_R_BANDEJA`, `SCC_SP_R_PLAZOSPORALERTAR` y
    `SCC_SP_R_EVALUACIONESIMPACTO`.
  - `FormatoConvenio` (`SIGEC_CIERRE.Utils/Convenios`), equivalente a `formatConvenioNumber` con los mismos casos de
    prueba. Lo usan los PDFs de los Anexos 20, 21 y 22, los nombres de sus archivos, las notificaciones de los cambios
    de estado y las alertas de plazos.
  - **Pruebas:** 381/381 (11 nuevas). Verificado: los tres PDFs generados muestran "0048-2026-ST" (`pdftotext`).
- **`sigec-cierre`:** número formateado en la bandeja (también se busca por él), la cabecera del expediente, el Acta y
  el nombre de su PDF. **Pruebas:** 197/197; lint y build.
- **`sigec-rtf`:** el bloque del Anexo 20 y el nombre de su PDF. **Pruebas:** 206/206; lint (104 advertencias previas)
  y build.
- **BD local:** migración y SP aplicados; los cuatro expedientes tienen la fecha de firma del SEL (dos se completaron a
  mano desde BD_SEL_DEV, porque no tenían Anexo 20 ni 22). En Calidad no hay expedientes todavía.
- **Pendiente:** verlo en el navegador (necesita `sel-api-seguridad`) y desplegar API y UI juntas: la UI nueva con la
  API anterior mostraría el año "XXXX".

### Fase 1 — 2026-10-21: buscador de convenio al iniciar el expediente
- **`libs/ui`: `ui-autocomplete`** (combobox de WAI-ARIA: ↓/↑, Enter, Escape; `aria-activedescendant`), sin PrimeNG y
  con las clases del tema. Emite `search` tras una espera y con longitud mínima, y `optionSelected` (`null` si el
  usuario vuelve a escribir). La lista va en el flujo, debajo del campo, para no quedar recortada en `app-ui-modal`.
  No se usó `lib-ui-select-search`: es un Dropdown de PrimeNG que busca al presionar Enter y cuyo estilo
  (`sat-dropdown-panel`, `primeng.min.css`) solo existe en sat-ui. 5 pruebas.
- **`sigec-cierre`:** `ConvenioSelService` (`convenios/asignados` si el único rol del personal es la UN, como
  `ICarteraDelUsuario` de la API; si no, `convenios/todos`), `apiGeneral` y `busquedaConvenios` (sugerencias, longitud
  mínima, espera) en los `environment*.ts`, y `location /api-general/` en `Dockerfile.sigec-cierre-ui`. El modal
  muestra número formateado, organización y RUC del elegido; un error del SEL se muestra en la lista. Solo cuenta la
  última búsqueda (se cancela la anterior).
- **Pruebas:** ui 49/49, sigec-cierre 202/202; lint y build.
- **En el navegador** (con `opazos`, Jefe de UN y Administrador): "perfiles" → "0048-2026-ST · ASOCIACION DE
  PRODUCTORES AGROPECUARIOS PERFILES COFFEE PERU", elegido con ↓ + Enter; un término sin coincidencias muestra
  "Ningún convenio coincide." y una sola petición a `convenios/todos`. No se pulsó "Iniciar" para no alterar los
  datos de prueba. También se vio la Fase 0 en vivo: "Convenio 0046-2024-ST" (OA) y "0266-2023-ST" (bandeja).
