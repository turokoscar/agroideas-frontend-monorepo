# ADR-014: Pliego de Observaciones real para la OA y rediseño de la Bandeja RTF

## Estado
Parcialmente implementado. **Fases 1, 2, 3, 4, 5, 7 y 7b implementadas el 17/09/2026** (backend
de ADR-016 completo salvo su Fase 6; parser `txt_seccion` compartido; pliego de observaciones
real, ahora con atención por ítem habilitada; banner en `oa-registro` + tile corregido en
`oa-dashboard`; gate de reenvío en la UI; rediseño de `bandeja-oa`; fix de aislamiento entre
organizaciones) — ver "Fase 1 — estado real" y "Fase 7 — estado real" más abajo. **Solo queda
la Fase 6**: `UnGabineteComponent` mostrando `txtRespuestaOa` de solo lectura al reabrir el
gabinete. `sigec-api-rtf` **ADR-016**
(`docs/ADR-016_Pliego_Observaciones_OA_y_Atencion_por_Item.md`) pasó de "Propuesto" a
"Parcialmente implementado" el mismo día — sus Fases 1-5, 7-8 ya están hechas y verificadas en
vivo.

## Relacionado con
- **sigec-api-rtf ADR-016** — diseña el modelo de datos y los endpoints que este ADR consume
  del lado frontend. Este documento **no rediseña nada del backend**, solo ejecuta ese diseño
  y agrega las decisiones específicas de UI/UX que ADR-016 deja abiertas (contenido exacto de
  pantalla, navegación, y qué pasa con `bandeja-oa`, que ADR-016 no menciona).
- **sigec-api-rtf ADR-014 §Parte 4** — origen de `SRT_TMD_REVISION`, `txt_seccion`,
  `PoliticaEvaluacionUr`, y el parser `UR_{KIND}_{ID}` que este ADR reutiliza.
- **ADR-010 (este repo)** — origen del vocabulario "UR" que hay que retirar de
  `oa-observaciones` y de `oa-dashboard`.
- **ADR-013 (este repo)** — precedente directo para el rediseño de `bandeja-oa`: ya resolvió
  el mismo problema (consolidar N estados en una sola llamada con `estados=` CSV, migrar de
  `<table>` cruda a `UiDataTableComponent`, filtros 100% cliente sobre una lista ya cargada)
  para la bandeja de gabinete de la UN. Este ADR aplica el mismo patrón ya probado a la
  bandeja de la OA, no inventa uno nuevo.
- **ADR-012 (este repo)** — origen de `plazoBannerLabel`/`loadEstadoPlazo`, cuya lógica de
  "días restantes" se reutiliza para la columna de plazo de la bandeja.

## Contexto

Se pidió: (1) implementar el flujo completo de levantamiento de observaciones por parte de
la OA, y (2) rediseñar `bandeja-oa` (`/rtf/bandeja`) para que sea visualmente más atractiva
y útil, **sin duplicar** lo que ya hace `oa-dashboard`. Antes de proponer nada se analizó el
código real de ambos componentes, `oa-rtf.service.ts`, `un-gabinete.component.ts`, y el
backend `sigec-api-rtf` (incluido su propio ADR-016, escrito un día antes de este).

### A. El pliego de observaciones — el hueco ya está diagnosticado, falta ejecutarlo

Confirmado en código (no solo en el ADR-016 del backend):

- `oa-registro.component.ts` nunca llama a `GET rtfs/{id}/evaluaciones`. Su único gesto ante
  `estRtf === 'OBSERVADO'` es cambiar la etiqueta del banner de plazo a "Plazo para subsanar
  observaciones" (`oa-registro.component.ts:59-63`) — cero detalle de qué se observó.
- `oa-observaciones.component.ts` (ruta `rtf/pasos-criticos/observaciones`) es un **mock
  desconectado**: `onSubmit()` solo hace `rtfService.rtfStatus.set('Enviado')` y navega, sin
  ninguna llamada HTTP. El signal que debería poblar (`observacionesUR` en
  `oa-rtf.service.ts:67`) nunca lo asigna nadie.
- A diferencia de lo que afirma el ADR-016 del backend ("inalcanzable navegando"), **sí hay
  un enlace** a esa ruta: un tile estático en `oa-dashboard.component.html:296`, con label
  "Observaciones · Levantar observaciones UR/UN" (vocabulario pre-ADR-010, sin tocar desde
  el 9 de septiembre). Es decir, es peor que inalcanzable: un usuario llega, cree que está
  reportando algo, y no pasa nada.
- `un-gabinete.component.ts:311-313` ya tiene la lógica para decodificar
  `txt_seccion = UR_{KIND}_{ID}` (p. ej. `UR_META_7`, `UR_R1_142`) contra las metas/
  indicadores cargados — es un método privado (`cargarEvaluacionUr`), no compartido. El
  ADR-016 del backend (punto 2) ya pide extraer esta lógica "si el esfuerzo lo justifica";
  aquí se decide que sí lo justifica (ver Decisión B).

### B. `bandeja-oa` — utilidad real hoy, pero incompleta y visualmente pobre

- **Tabs incompletos**: `bandeja-oa.component.ts:19-26` solo tiene
  `PENDIENTE, EN_EDICION, EN_REVISION, APROBADO, RECHAZADO, VENCIDO`. **Falta `OBSERVADO`**
  — el estado que motivó este ADR — y no hay forma de verlo desde esta pantalla aunque el
  backend ya soporta `?estado=OBSERVADO` sin ningún cambio.
- **Una llamada HTTP por cada cambio de tab**, sin `estados=` CSV: `loadBandejaOA` solo
  acepta un `estado` singular (`oa-rtf.service.ts:390`). La bandeja de la UN ya resolvió
  exactamente este problema en ADR-013 (`un-gabinete.service.ts:91-113`, `estados=` CSV +
  `cantidad=1000` en una sola llamada) — `bandeja-oa` se quedó con el patrón viejo.
- **Tabla HTML cruda** (`bandeja-oa.component.html:83-144`), con badges armados a mano
  (`estadoBadgeClass()`), mientras que el gabinete de la UN ya migró a
  `UiDataTableComponent` (ADR-013). Inconsistencia visual entre las dos bandejas del mismo
  módulo.
- **Sin búsqueda ni filtros**, a diferencia de la bandeja de la UN (que sí tiene
  `filtroTexto`/`filtroEstado`/`filtroFecDesde`/`filtroFecHasta`, ADR-013).
- **No muestra plazo** por fila (días restantes), pese a que `RtfCabeceraDto.FecLimite` ya
  viaja en cada item del listado — es un cálculo cliente, no requiere endpoint nuevo.

### C. Qué NO hay que duplicar (restricción explícita del pedido)

`oa-dashboard.component.ts` ya resuelve, con datos reales, todo lo que un rediseño ingenuo de
la bandeja tendría la tentación de repetir:

| Ya existe en `oa-dashboard` | Dónde |
|---|---|
| KPIs de convenio activo, avance financiero, desembolso | `financialProgress`, `budget()`, `disbursed()` |
| Cronograma de pasos críticos con estado (Activo/Validado/pendiente) | `rtfService.pasos()`, `pasoClass()` |
| Bitácora / actividad reciente | `loadActividadReciente()`, `GET rtfs/actividad-reciente` |
| Lista de **pasos críticos sin RTF iniciado todavía** | `rtfService.pasos()`, leído directo de BD_SEL |

Este último punto importa especialmente: un registro en `SRT_TMC_RTF` solo se crea cuando la
OA guarda su primer borrador (`RtfCabeceraServicio.RegistrarRtfCabeceraAsync`, disparado
desde `oa-registro`). Un paso crítico habilitado que la OA nunca abrió **no tiene fila en la
tabla RTF**, así que `bandeja-oa` —que lista filas de `SRT_TMC_RTF`— estructuralmente no
puede (ni debe) mostrarlo. Esa vista es y seguirá siendo responsabilidad exclusiva del
dashboard.

## Decisión

### 1. Backend: ejecutar ADR-016 de `sigec-api-rtf` tal como está diseñado

No se rediseña nada — se implementan sus 4 fases de backend exactamente como las especifica:
migración (`est_atencion`, `txt_respuesta_oa`, `fec_atencion` en `SRT_TMD_REVISION` +
`SP_U_Rtf_RevisionAtencion`), extensión de `RevisionDto`/`EvaluacionUrEstadoDto`,
`POST rtfs/{id}/evaluaciones/atencion` en `RtfController`, y el gate
`PoliticaEvaluacionUr.ValidarAtencionCompleta` en `EnviarRtfAsync`. Ese trabajo se rastrea en
el propio ADR-016 (repo `sigec-api-rtf`), no se repite aquí.

### Fase 1 — estado real (implementado 17/09/2026)

Las 4 fases se implementaron tal como las diseña ADR-016 (detalle completo en ese documento,
repo `sigec-api-rtf`): migración + SP, `RevisionDto` extendido, endpoint de escritura y gate en
`EnviarRtfAsync`. De paso se creó `RolesSigecRtf.PersonalMidagri` (constante compartida que
reemplaza la lista de roles que `NotificacionController` tenía duplicada y ligeramente
distinta de la de `RtfController` — la clase de deuda que ADR-015 ya había señalado). 12 tests
nuevos de backend, suite completa **302/302 en verde**.

**Verificado en vivo, no solo con mocks** — migración aplicada contra `sqlserver_dev` (Docker) y
API reiniciada con el binario nuevo; ciclo lectura→escritura→lectura probado con peticiones HTTP
reales (JWT firmado con el secret real de `user-secrets`) contra el RTF 10001, revisión
`UR_META_27162` (`ide_revision=21`). **Encontró y corrigió un bug real**:
`ActualizarAtencionRevisionAsync` devolvía `false` aunque el `UPDATE` sí se ejecutaba — el SP
tiene `SET NOCOUNT ON` (como todos los de ese repositorio), lo que hace que `ExecuteAsync` del
lado ADO.NET devuelva -1 en vez del conteo real; se corrigió agregando `SELECT @@ROWCOUNT;` al
SP y usando `ExecuteScalarAsync<int>`, el mismo patrón que ya usaban
`ActualizarRtfCabeceraAsync`/`ActualizarEstadoRtfAsync` en ese repo. **Este bug no lo habría
atrapado la suite de tests unitarios** (mockea el repositorio, nunca toca Dapper/SQL real) —
exactamente el tipo de gap que la verificación en vivo existe para atrapar. Detalle completo en
`docs/ADR-016_...md` (repo `sigec-api-rtf`), sección "Nota de verificación en vivo". El RTF 10001
se dejó restaurado a su estado anterior (revisión 21 de vuelta a `PENDIENTE`) para no afectar
otras verificaciones en vivo que ya lo usan como expediente de referencia (ADR-013/014).

### 2. Frontend — extraer el parser de `txt_seccion` a un lugar compartido

Nuevo archivo `apps/sigec-rtf/src/app/core/models/revision-seccion.util.ts`, con la función
pura que hoy vive inline en `un-gabinete.component.ts:311-321`
(`UR_{KIND}_{ID}` → `{ kind, id }`). `un-gabinete.component.ts` pasa a importarla en vez de
tener su propia copia; `oa-observaciones.component.ts` (punto 3) la usa igual. Sin esto,
cualquier cambio futuro al formato de `txt_seccion` habría que replicarlo en dos componentes.

### 3. Frontend — reescribir `oa-observaciones.component.ts` como el Pliego de Observaciones real

Se reutiliza el componente/ruta existente (`rtf/pasos-criticos/observaciones`), no se crea
uno nuevo:

- `ngOnInit` llama a un nuevo método `obtenerEvaluacionUr(rtfId)` ya expuesto en
  `oa-rtf.service.ts` (mismo endpoint `GET rtfs/{id}/evaluaciones` que ya consume
  `un-gabinete.service.ts` — sin cambios de backend, sin restricción de rol hoy).
- Cruza cada `RevisionDto` (vía el parser del punto 2) contra `pasoCriticoMetas()` /
  `pasoCriticoIndicadores()` que `oa-rtf.service.ts` **ya tiene cargados** desde
  `oa-registro` (no se vuelve a pedir al backend).
- Por cada fila `estConformidad = 'OBSERVADO'`: categoría, texto de observación,
  subsanable, y — una vez implementada la Fase 3 del ADR-016 backend — un campo de
  respuesta + botón "Marcar como atendida", que llama a un nuevo método
  `atenderObservaciones(rtfId, respuestas)` en `oa-rtf.service.ts`
  (`POST rtfs/{id}/evaluaciones/atencion`).
- Se retira el signal muerto `observacionesUR` (`oa-rtf.service.ts:67`) y todo el vocabulario
  "Especialista Regional"/"UR" del template.
- Mientras la Fase 3-4 del backend no exista, la pantalla queda en modo **solo lectura**
  (muestra el pliego, no permite "atender") — no se bloquea la Fase 5 del frontend esperando
  al backend completo; ver Plan de fases.

### 4. Frontend — enlazar la pantalla desde donde corresponde

- `oa-registro.component.ts`: nuevo banner (no un botón perdido) visible solo cuando
  `rtfService.rtfStatus() === 'OBSERVADO'`, contando filas `estAtencion = 'PENDIENTE'`
  (ej. "3 observaciones pendientes de atender"), con link a
  `/rtf/pasos-criticos/observaciones`. Mismo patrón visual que el banner de plazo ya
  existente (`plazoBannerLabel`).
- `oa-dashboard.component.html:296`: se corrige el tile roto — label real ("Ver pliego de
  observaciones", sin "UR/UN"), visible siempre pero con badge de conteo cuando aplica, en
  vez de un enlace estático ciego a un mock.
- `canSubmit()`/`enviarRtf()` en `oa-registro.component.ts`: se agrega la misma validación
  que el backend (punto 1) va a exigir — deshabilitar "Enviar RTF" con mensaje explícito si
  hay observaciones `OBSERVADO` sin `ATENDIDA`, espejando el gate server-side (mismo patrón
  ya usado para `isEditable`: el backend es la fuente de verdad, el frontend solo evita el
  viaje redondo de un error 400).

### 5. Frontend — `un-gabinete.component.ts` muestra la respuesta de la OA

Cuando la UN reabre el gabinete para reevaluar, la tabla de evaluación agrega una
columna/tooltip de solo lectura con `txtRespuestaOa` si existe (Fase 6 del ADR-016 backend).
Cambio acotado: extender la fila ya renderizada por `cargarEvaluacionUr`, sin tocar su
estructura general.

### 6. Frontend — rediseño de `bandeja-oa`, aplicando el patrón ya validado por ADR-013

- **Nuevo tab "Con Observaciones"** (`estado=OBSERVADO`) — la brecha más señalada. Se agrega
  a `bandeja-oa.component.ts:19-26` sin tocar nada más de la estructura de tabs.
- **Consolidar estados con `estados=` CSV**, mismo mecanismo que `loadBandejaUn`
  (`un-gabinete.service.ts:91-113`) ya usa en producción:
  - Tab "En Revisión en AGROIDEAS" = `EN_REVISION,AUDITADO_CAMPO,IN_REVISION_UN` en una sola
    llamada. La OA no necesita distinguir el sub-estado interno de la UN (verificación de
    campo vs. evaluación de gabinete) — solo le importa que ya no está en su cancha.
  - `loadBandejaOA` gana un parámetro `estados?: string[]` opcional (mismo cambio de firma
    que ya tiene `RtfController.Listar` en el backend — no requiere tocar backend, ya lo
    soporta).
  - `cantidad=200` en vez de 10 (la cartera de un postulante es órdenes de magnitud menor que
    la de un especialista UN, que ya usa 1000 con el mismo patrón sin problema de
    rendimiento).
- **Migrar la tabla a `UiDataTableComponent`** (`@agroideas/ui`), igual que ya hizo el
  gabinete de la UN — mismo componente, mismas convenciones de `TableColumn`, badges vía
  `UiStatusPillComponent` en vez de `estadoBadgeClass()` hardcodeado.
- **Búsqueda cliente** (`filtroTexto` signal + `computed`, sobre la lista ya cargada en
  memoria) por ID de RTF o paso crítico — mismo patrón exacto que ADR-013 dejó funcionando
  en `un-gabinete.component.ts`, no una reimplementación.
- **Columna de plazo** ("Vence en N días" / "Vencido"): cálculo 100% cliente sobre
  `rtf.fecLimite`, que ya viaja en cada fila del listado — sin llamada adicional por fila.
- **Acciones contextuales nuevas por fila**:
  - `OBSERVADO` → botón "Atender observaciones", navega a
    `/rtf/pasos-criticos/observaciones` (además de "Editar"/"Enviar" ya existentes).
  - `APROBADO`/`RECHAZADO` → botón "Ver Anexo 18", nuevo método `descargarAnexo18(rtfId)` en
    `oa-rtf.service.ts` (mismo patrón que `descargarAnexo17`, apunta a
    `GET rtfs/{id}/documentos/anexo18`, que `DocumentoController` ya expone — hoy solo lo
    consume el lado UN vía `cargarAnexo18`, que además trae el formulario, no el PDF).
- **Explícitamente no se agrega**: selector de convenio (no se confirmó que un postulante
  pueda tener más de un convenio activo simultáneo — no se construye sin esa confirmación),
  ningún KPI de avance financiero, ningún cronograma Gantt, ninguna bitácora de actividad,
  ninguna exportación a Excel. Todo eso es y sigue siendo exclusivo de `oa-dashboard`;
  `bandeja-oa` se mantiene enfocada en ser el listado operativo transaccional de RTFs con
  capacidad de filtrar, buscar y actuar — no un segundo dashboard.

### Fase 7 — estado real (implementado 17/09/2026)

Todo lo descrito en el punto 6 se implementó tal cual, con specs nuevos
(`bandeja-oa.component.spec.ts`, 9 tests) y verificación de `lint`/`build`/`test` en verde.
Un hallazgo real surgió al implementarlo, no anticipado en el diseño original:

**Bug de scoping pre-existente en `RtfController.Listar` (backend), afecta al tab "En Revisión
en AGROIDEAS".** `esBandejaEspecialistaUn` se calculaba solo mirando si *todos* los estados
pedidos estaban en `EstadoRtf.EstadosBandejaUn` (`EN_REVISION`, `AUDITADO_CAMPO`,
`IN_REVISION_UN`, `VENCIDO`, `PLAZO_INICIAL_NOTIFICACION`, `PLAZO_LIMITE_NOTARIAL`) —
**sin mirar el rol de quien llama**. Cuando una OA pedía ese tab, `esBandejaEspecialistaUn`
daba `true`, `accesoGlobal` daba `false` (POSTULANTE no está en la lista de roles globales),
así que `soloConveniosAsignados` daba `true` y el backend intentaba resolver la "cartera
asignada" de la OA contra `sel-api-general` — un concepto que no existe para un postulante.

**Al verificar el fix apareció un problema más serio, no anticipado.** `bandeja-oa` (este
repo, desde antes de este ADR) nunca envía `ideConvenio` en ninguna llamada. `rtf.SP_R_Rtf`
(`data/rtf_procedures.sql:5-42`, `sigec-api-rtf`) tiene `WHERE (@IdeConvenio IS NULL OR
ide_convenio = @IdeConvenio) ...` — con `@IdeConvenio` nulo el filtro se ignora por completo.
`RtfController.Listar` no forzaba ningún `ideConvenio` para quien no cae en la rama de
cartera UN. Es decir: **cualquier OA autenticada podía leer los RTFs de todas las
organizaciones** en cualquier estado que no fuera de `EstadosBandejaUn` (que es la mayoría —
`PENDIENTE`, `EN_EDICION`, `OBSERVADO`, `APROBADO`, `RECHAZADO`), no solo los suyos. El fix
angosto de `esBandejaEspecialistaUn` por sí solo habría convertido el bug de "tab vacío" en
"tab que sí filtra por cartera, pero cualquier otra llamada de la OA sigue exponiendo datos de
otras organizaciones" — peor, no mejor. Confirmado con el usuario antes de tocar código
(`AskUserQuestion`) que correspondía arreglar ambos juntos.

**Fix implementado (`sigec-api-rtf`, mismo día):**
- Nuevo `SIGEC_RTF.Entidad/Rtf/RolesSigecRtf.cs` — constante compartida `PersonalMidagri`
  (6 roles), reemplaza la lista duplicada que antes vivía privada en `NotificacionController`
  y difería de la lista de `accesoGlobal` de `RtfController` (deuda de nomenclatura que
  ADR-015 ya había señalado como patrón general del proyecto).
- `RtfController.Listar`: inyecta `IPostulanteServicio` (ya registrado en DI, mismo servicio
  que usan `PostulanteController`/`NotificacionController`). Quien no tiene un rol de
  `RolesSigecRtf.PersonalMidagri` es tratado como OA — su `ideConvenio` se resuelve siempre
  server-side vía `ResolvePostulanteIdAsync(GetUserId())`, **ignorando cualquier `ideConvenio`
  que mande el cliente** (defensa en profundidad: una OA no puede pedir el convenio de otra
  organización ni aunque lo intente explícitamente).
- `esBandejaEspecialistaUn` ahora exige además `esPersonalMidagri` — ya no se dispara para una
  OA sin importar qué `estados` pida.
- `NotificacionController` migrado a la misma constante compartida (mismo comportamiento,
  ahora una sola fuente de verdad).
- 7 tests nuevos/reescritos en `RtfControllerTests.cs` (incluido uno que reproduce
  exactamente el escenario del tab nuevo de `bandeja-oa` y otro que verifica que un
  `ideConvenio` ajeno mandado por el cliente se ignora). Suite completa: **290/290 en verde**
  (`dotnet build` + `dotnet test`).

No se generó un ADR propio en `sigec-api-rtf` para este fix — queda documentado aquí porque
nació directamente del trabajo de la Fase 7 de este ADR; se puede promover a un ADR del
backend si el equipo lo prefiere para mantener el registro de decisiones de seguridad de ese
repo autocontenido.

## Qué queda explícitamente fuera

- **Historial de ciclos de observación/atención** — ya excluido por el propio ADR-016 del
  backend; solo el ciclo vigente es visible.
- **Notificación push/email cuando la OA atiende una observación** — ídem, excluido por
  ADR-016 backend; la UN se entera al reabrir el gabinete.
- **Selector de multi-convenio en `bandeja-oa`** — sin confirmar que aplique al modelo de
  negocio; se documenta como pendiente de confirmar, no se construye a ciegas.
- **Botón separado "Ver Pliego Notificado (PDF)"** — quedaría redundante una vez que existe
  la pantalla real del pliego (Decisión 3); no se genera un PDF nuevo solo para esto.
- **Exportación a Excel de la bandeja** — no hay caso de uso confirmado que lo justifique
  todavía; se puede reconsiderar en un ADR propio si surge la necesidad.

## Plan de implementación por fases

| Fase | Alcance | Repo | Depende de |
|---|---|---|---|
| 1 | ✅ **Hecho (17/09/2026)** — Backend: Fases 1-4 de ADR-016 (`sigec-api-rtf`) — SQL, lectura, escritura, gate de reenvío. Verificado en vivo contra `sqlserver_dev`; encontró y corrigió un bug real (ver nota abajo) | `sigec-api-rtf` | — |
| 2 | ✅ **Hecho (17/09/2026)** — Frontend: extraer parser `txt_seccion` compartido (`revision-seccion.util.ts`, con specs); `un-gabinete.component.ts` pasa a importarlo | este repo | — |
| 3 | ✅ **Hecho (17/09/2026)** — Frontend: `oa-observaciones.component.ts` reescrito en modo lectura (pliego real, sin "atender" todavía, reusa `GET rtfs/{id}/evaluaciones` sin cambios de backend); retirado el signal muerto `observacionesUR`; 6 specs nuevos | este repo | Fase 2 |
| 4 | ✅ **Hecho (17/09/2026)** — Frontend: banner de observaciones en `oa-registro` (con conteo, visible solo en `OBSERVADO`); tile de `oa-dashboard` corregido (label real, badge de conteo, ya fija `rtfId` antes de navegar — no lo hacía antes); 4 specs nuevos | este repo | Fase 3 |
| 5 | ✅ **Hecho (17/09/2026)** — Frontend: habilitar "atender" en `oa-observaciones` (respuesta + botón por fila) + gate de UI en `canSubmit()`/`enviarRtf()` de `oa-registro`, con mensaje explícito | este repo | Fase 1, Fase 3 |
| 6 | Frontend: `un-gabinete.component.ts` muestra `txtRespuestaOa` de solo lectura | este repo | Fase 1 |
| 7 | ✅ **Hecho (17/09/2026)** — Frontend: rediseño de `bandeja-oa` (tab Observado, `estados=` CSV, `UiDataTableComponent`, búsqueda, columna de plazo, acciones contextuales, `descargarAnexo18`) | este repo | independiente — puede ir en paralelo a 1-6 |
| 7b | ✅ **Hecho (17/09/2026)** — Backend: `esBandejaEspecialistaUn` ahora exige rol de personal MIDAGRI; se descubrió y corrigió además un problema mayor de aislamiento entre organizaciones (`ideConvenio` nunca se forzaba para una OA) — ver "Fase 7 — estado real" arriba | `sigec-api-rtf` | — |
| 8 | Tests: `PoliticaEvaluacionUrTests`/`RtfCabeceraServicioTests` (backend); specs de `oa-observaciones`, `oa-registro` (gate) — `bandeja-oa` ya tiene los suyos (Fase 7) | ambos | Fases 1-6 |
| 9 | Verificación en vivo: aplicar la migración SQL contra la BD real antes de cerrar este ADR — patrón recurrente en ADR-011/013/014/016 de migraciones escritas pero no aplicadas causando errores reales | `sigec-api-rtf` | Fase 1 |

## Consecuencias

### Positivas
- Cierra, del lado frontend, el hueco de UX ya diagnosticado en `sigec-api-rtf` ADR-016: la
  OA deja de depender del texto colapsado del correo para saber qué corregir.
- La Fase 7 (bandeja) no depende de que el backend termine ADR-016 — puede entregarse antes y
  de forma independiente, dando valor visible de inmediato (el tab "Observado" solo, ya
  resuelve la queja original).
- Reutiliza tres patrones ya probados en producción en este mismo módulo (ADR-013:
  `estados=` CSV, `UiDataTableComponent`, filtros cliente) en vez de inventar nuevos —
  reduce riesgo y tiempo de implementación.
- Corrige un enlace roto y engañoso (`oa-dashboard.component.html:296`) que hoy hace creer al
  usuario que puede reportar observaciones cuando no pasa nada.

### Negativas / consideraciones
- La Fase 5 (atender observaciones) queda bloqueada hasta que `sigec-api-rtf` implemente su
  ADR-016 — es un cambio cross-repo real, con coordinación de despliegue entre ambos
  proyectos.
- El gate de reenvío (Fase 5) es una regla de negocio nueva que puede bloquear a una OA
  acostumbrada a reenviar sin fricción — mismo riesgo que ya señala el ADR-016 del backend;
  hay que comunicarlo como cambio de comportamiento.
- `cantidad=200` en `bandeja-oa` asume que ningún postulante individual va a superar esa
  cantidad de RTFs históricos; si algún convenio de muchos años lo hiciera, habría que
  paginar de verdad en vez de traer todo — no se prevé que ocurra en el horizonte actual del
  módulo (36 meses por convenio, máximo 6 pasos críticos).

## Referencias

- `sigec-api-rtf/docs/ADR-016_Pliego_Observaciones_OA_y_Atencion_por_Item.md` — diseño
  completo del backend que este ADR ejecuta.
- `sigec-api-rtf/docs/ADR-014_...md` §Parte 4 — origen de `SRT_TMD_REVISION`/
  `PoliticaEvaluacionUr`/`txt_seccion`.
- `apps/sigec-rtf/adr/0013-filtros-busqueda-bandeja-evaluacion-gabinete.md` — precedente
  directo de `estados=` CSV, `UiDataTableComponent` y filtros cliente, aplicado aquí a la
  bandeja de la OA.
- `apps/sigec-rtf/adr/0010-unificacion-rol-ur-en-un-rtf.md` — origen del vocabulario "UR" que
  se retira de `oa-observaciones`/`oa-dashboard`.
