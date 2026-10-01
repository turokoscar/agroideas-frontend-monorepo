# ADR 0012: Incidencias funcionales de KOFIX (expediente 0051-2026-ST) — análisis situacional

## Estado
Aceptado · **Fases 1, 2, 3 y 4 implementadas** (sin desplegar a QA; la Fase 2 quedó reducida al error de carga, ver su registro) · Fases 5 y 1b pendientes · INC-01 queda como propuesta. **En pausa desde el 2026-10-01**, a la espera de revisar y commitear la Fase 1, desplegarla y que el área usuaria responda los puntos abiertos. Ver el [Registro de implementación](#registro-de-implementación) y los [Puntos abiertos](#puntos-abiertos).

## Fecha
2026-10-01

## Responsables
Equipo Frontend AGROIDEAS · Owner del módulo: Oscar Pazos

## Aplica a
- `apps/kofix-ejecucion` — presentación de No Objeciones, Desembolsos y Kardex & Varianza
  (pestañas de `presentation/pages/ejecucion-detail/`).
- `KOFIX_APP/mc-api-ejecucion` (repo hermano) — **la mayoría de las causas raíz están aquí**:
  SPs de la BD `KARDEX` (`Database/20260822_estandarizar_nomenclatura_sp.sql`),
  `KardexService`, `ProgramacionService` y el catálogo `FIN.KDX_FIN_TG_CATALOGO`.
- `apps/sigec-rtf` + `SIGEC/sigec-api-rtf` — **consumidores afectados** (sin cambios de
  código): reciben el avance físico de KOFIX por `ejecucion-periodo` (H-10).
- `SEL_APIS/sel-api-general` — **no interviene** en estas incidencias: los catálogos de
  tipo de documento y tipo de pago son locales de KOFIX (`FIN.KDX_FIN_TG_CATALOGO`, leídos
  por `apiEjecucion/catalogos/grupo/{grupo}`), y la meta financiera programada llega por
  `ProyectoApiClient` (`proyectos/{id}/items`).

Enmarcado en el mantenimiento correctivo de KOFIX, Orden de Servicio N° 0001013 (AGROIDEAS).

## Contexto

El documento "Observaciones al KOFIX" (revisión funcional del 23/09/2026, seis capturas)
registra 8 incidencias sobre el expediente **0051-2026-ST** (Asociación de Productores
Agropecuarios Wishlaj Marca, Buenos Aires). Ese expediente tiene **una sola No Objeción**:
memorándum 0946-2026 del 26/05/2026, S/ 14,400.00, estado **Registrado**, para la meta
financiera **Asistencia técnica** (programada en S/ 86,400.00).

> **Corrección tras consultar QA (2026-10-01):** el expediente (`ide_postulante` 190432)
> tiene **4 N.O.**, no una. Dos son de la misma meta Asistencia técnica (ítem 172575): la
> 0946 (S/ 14,400) y el Oficio 02 del 15/09/2026 (S/ 72,000). Entre ambas suman exactamente
> la meta de S/ 86,400. Ver [Verificación en QA](#verificación-en-qa-expediente-0051-2026-st-2026-10-01).

Se redactó un borrador de decisión (ADR-001 de incidencias). Este ADR **contrasta ese
borrador con el código real** del frontend y del backend, para separar lo que es causa raíz
confirmada de lo que todavía es hipótesis, y ajustar las decisiones donde el código muestra
algo distinto de lo supuesto.

### Registro de incidencias

La severidad es propuesta; debe validarla la Unidad de Negocios.

| ID | Módulo | Tipo | Hallazgo | Severidad | Diagnóstico en código |
| --- | --- | --- | --- | --- | --- |
| INC-01 | General | Por definir | Adendas: solo se mencionan, sin detalle. | Por definir | Sin evidencia — no hay nada que analizar todavía. |
| INC-02 | Programación | Defecto | En ejecución, la reprogramación debe trabajar sobre el saldo no solicitado. | Media | **Aclarado por el owner**: saldo reprogramable = aprobado − solicitado (ver H-02, D6). |
| INC-03 | No Objeciones | Cambio funcional | Falta **Carta** en tipo de documento. | Baja | Confirmado: catálogo `TIPO_DOCUMENTO` solo tiene 4 valores. |
| INC-04 | No Objeciones | Funcionalidad faltante | No se puede **rebajar** el saldo no usado de una N.O. para liberarlo a una nueva N.O. | Alta | **Aclarado por el owner**: es una rebaja parcial, no un desistimiento (ver H-04, D4). |
| INC-05 | Desembolsos | Cambio funcional | Tipo de pago debe ser Transferencia bancaria / Cheques de gerencia. | Media | Confirmado: catálogo `TIPO_PAGO` tiene 3 valores (incluye `PAGO_DESTINO`). |
| INC-06 | Desembolsos | Cambio funcional | "N° Solicitud" → memorándum de validación del jefe de UN. | Media | Confirmado; el término aparece en 4 pantallas. |
| INC-07 | Desembolsos | Inconsistencia | Lista "Sin solicitudes" pero el Kardex marca S/ 14,400 ejecutado. | Alta → **Baja** | **No es defecto de datos**: capturas de momentos distintos (ver H-07). Quedan dos defectos menores. |
| INC-08 | Kardex & Varianza | Defecto | "Ejecutado 100%" con saldo S/ 0.00, pero barra 17% y varianza +S/ 72,000. | Alta | **Causa raíz confirmada en código y en QA** (ver H-08). |

## Hallazgos del análisis de código

### H-08 — El "Saldo Disponible" del Kardex es el saldo de la N.O., no el de la meta (INC-08) ✅ confirmado

La pestaña Kardex & Varianza mezcla **dos fuentes distintas** en la misma fila:

| Elemento en pantalla | Fórmula | Fuente |
| --- | --- | --- |
| Barra y "% ejecutado" | `montoEfectivizado / montoProgramado` → 14,400 / 86,400 = **17%** | `kardex-varianza-tab.component.html:135,139` |
| Varianza | `montoProgramado − montoEfectivizado` → **+72,000** | `kardex-varianza-tab.component.html:172-182` |
| Saldo Disponible, Estado "Ejecutado 100%", tachado del ítem | `item.saldo` → **0.00** | `kardex-varianza-tab.component.html:127,134,157,160` |

`item.saldo` viene de `KardexService.cs:57` → `Imp_saldoActual`, que es el
`imp_saldoNuevo` del **último movimiento** del ítem en `FIN.KDX_FIN_TMM_MOVIMIENTO`. Y ese
saldo se siembra mal en `FIN.KDX_FIN_SP_C_KARDEXMOVIMIENTO`
(`20260822_estandarizar_nomenclatura_sp.sql:212-232`):

```sql
IF @saldoAnterior = 0
    IF @ide_tipoOperacion = 8 -- DESEMBOLSO
        SELECT TOP 1 @saldoAnterior = ISNULL(nod.imp_montoAdjudicado, 0)   -- ← monto de la N.O. (14,400)
        FROM FIN.KDX_FIN_TMD_NOOBJECION_DET nod WHERE nod.ide_noObjecionDet = @ide_referenciaId ...
...
SET @saldoNuevo = @saldoAnterior - @imp_monto;                            -- 14,400 − 14,400 = 0
```

El saldo inicial es el **monto adjudicado de la N.O.**, no la **meta financiera programada**
(86,400). Un desembolso por el total de la N.O. deja el saldo en 0 y la meta aparece como
"Ejecutado 100%" aunque le queden S/ 72,000.00. El mismo patrón está en
`KDX_FIN_SP_C_SALDOTIPO` (línea 288) y `KDX_FIN_SP_C_SALDODEVOLUCION` (línea 340).

Defectos derivados del mismo diseño:
1. **Re-siembra con saldo legítimo en cero.** `IF @saldoAnterior = 0` no distingue "no hay
   movimientos" de "el saldo llegó a cero": tras agotar una N.O., el siguiente desembolso
   (de otra N.O. del mismo ítem) vuelve a sembrar con el adjudicado de esa otra N.O. El
   saldo nunca es un saldo de meta, es el de la N.O. "de turno".
2. **Bloquea la reprogramación.** `ProgramacionService.cs:63-72` y `:134` usan el mismo
   `Imp_saldoActual` para decidir `Bloqueado = saldoDisponible <= 0`. Con S/ 72,000 reales
   por ejecutar, la meta **queda bloqueada para reprogramar**. Esto es más grave que el
   error visual. Lo corrige D6, que define el saldo reprogramable (INC-02, H-02).
3. **"Comprometido" y "Ejecutado" son la misma cifra.** En `KDX_FIN_SP_R_KARDEXRESUMENEJECUCION`
   (líneas 47-48) ambos son `SUM(b.imp_montoSolicitado)` de la vista
   `FIN.vw_Kardex_CicloOperativo`, que parte de `KDX_FIN_TMD_SOLDESEMBOLSO_DET` y hace
   `LEFT JOIN` a `KDX_FIN_TMM_DESEMBOLSO`. Es decir:
   - "Comprometido (N.O.)" **no** es lo comprometido por N.O. — es lo **solicitado**.
   - "Ejecutado (Kardex)" cuenta lo **solicitado aunque no exista pago** (`ide_desembolso`
     nulo), incluido un cheque de gerencia en DEVENGADO aún no GIRADO (ADR-020 del backend).

El borrador decía "mantener el Kardex sobre lo comprometido probablemente explica el 100%
falso". El código muestra que **la causa del 100% es la siembra del saldo con el monto de la
N.O.**; la mezcla comprometido/ejecutado es un defecto adicional e independiente.

### H-09 — La vista multiplica lo solicitado por cada rendición (nuevo, hallado en BD) ✅ confirmado

`FIN.vw_Kardex_CicloOperativo` hace `LEFT JOIN` a `KDX_FIN_TMD_RENDICION_DETALLE`, así que
devuelve **una fila por cada detalle de rendición** de un mismo detalle de solicitud.
`KDX_FIN_SP_R_KARDEXRESUMENEJECUCION` suma `imp_montoSolicitado` sobre esas filas, y cada
rendición adicional **vuelve a sumar el mismo monto solicitado**. El mismo patrón está en
`KDX_FIN_SP_R_KARDEXRESUMENMES`. Ver la [verificación con datos](#verificación-con-datos-bd-local-2026-10-01).
Consecuencia: con varias rendiciones parciales, el Kardex muestra comprometido y ejecutado
**mayores que lo desembolsado** y una varianza negativa ("Desviación Presupuestal") falsa.
Es otra vía por la que el Kardex y la lista de Desembolsos se contradicen (INC-07).

### H-10 — El avance físico suma la cantidad de la N.O. completa en cada desembolso (nuevo, reportado por el owner) ✅ confirmado

**Regla de negocio (owner del módulo, 2026-10-01):** una meta (p. ej. Asistencia técnica,
12 meses = S/ 12,000) puede tener una **N.O. parcial** (6 meses = S/ 6,000) y
**desembolsos mensuales** (S/ 1,000). El avance físico de cada desembolso es
`monto desembolsado ÷ precio unitario`, con precio unitario = 12,000 ÷ 12 = 1,000. Cada
desembolso aporta 1 unidad, y 6 desembolsos suman 6 unidades.

**Lo que hace el sistema:** `FIN.KDX_FIN_SP_R_KARDEXEJECUCIONPERIODO`
(`20260910_fix_fecha_rendicion_ejecucion_periodo.sql:53`) calcula

```sql
SUM(... b.can_cantidad ...) AS CantidadEjecutada
```

sobre `vw_Kardex_CicloOperativo`, donde `can_cantidad` es la **cantidad total del detalle de
la N.O.** (`nod.can_cantidad`), repetida en **cada** solicitud de desembolso contra esa N.O.
(y en cada rendición, por el fan-out H-09). En el ejemplo, 6 desembolsos × 6 = **36
unidades** en lugar de 6, sobre una meta física de 12 (300%). La solicitud de desembolso no
guarda cantidad propia (`KDX_FIN_TMD_SOLDESEMBOLSO_DET` solo tiene `imp_montoSolicitado`),
así que la cantidad tiene que **derivarse del monto**.

**Evidencia (BD local, postulante 2242, ítem 10909 "Coordinador del Plan de negocios"):**
N.O. det 60003 con `can_cantidad = 12`, precio 2,450 y adjudicado 29,400. Una solicitud de
29,400 con 3 rendiciones da `CantidadEjecutada = 36`; el valor correcto es
29,400 ÷ 2,450 = 12. Aquí se suman dos errores (cantidad completa de la N.O. por fila y
fan-out por rendición).

**Evidencia en QA (2026-10-01, consulta `diag_avance_fisico.sql`, solo lectura):** el
defecto aparece en **todo detalle de N.O. con más de un desembolso**. La desviación es
exactamente `n_solicitudes ×` la cantidad de la N.O.:

| Postulante | Ítem | Cant. N.O. | Precio N.O. | Desembolsos | Desembolsado | `CantidadEjecutada` hoy | Correcta |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 190432 | 172575 (Asistencia técnica, 0051-2026-ST) | 6 | 2,400 | 2 (2,400 + 12,000) | 14,400 | **12** | 6 |
| 190432 | 172572 | 23 | 1,840 | 2 | 42,320 | **46** | 23 |
| 190432 | 172570 | 621 | 96 | 2 | 59,616 | **1,242** | 621 |
| 148855 | 172950 | 21 | 1,520 | 1 | 31,920 | 21 | 21 ✔ |

El caso de 0051-2026-ST es el ejemplo del owner. Asistencia técnica a S/ 2,400 por mes:
el desembolso de 2,400 cubre 1 mes y el de 12,000 cubre 5, en total 6. El SP entrega 12
a SIGEC-RTF: 6 por cada desembolso.

**Impacto, que va más allá del Kardex:** este SP es el endpoint
`GET desembolsos/ejecucion-periodo` que consume **SIGEC-RTF**:
`PasoCriticoServicio.cs:94` precarga `MetaFisicaEjecutada = CantidadEjecutada` en el avance
de metas por paso crítico. Eso alimenta el semáforo de avance (ADR 0010) y el PDF del RTF
(`PdfService.cs:609`). El avance físico sugerido al usuario en el RTF sale inflado.
En el frontend `apps/sigec-rtf`, `oa-registro.component` lo muestra tal cual:

- Tarjeta por meta (`oa-registro.component.html:242-283`): "Física Ejec." y
  `metaFisicaEjecutada / metaFisicaProgramada` como porcentaje, más la pill del semáforo
  `estadoAvancePillStatus/Label` (ADR 0010). Con el ejemplo del ítem 10909 mostraría 36
  de 12 = **300%**.
- Tabla del paso crítico (`:1378-1397`, columna `metaFisicaEjecutada`, `:223`) y el
  resumen de avance (`.ts:208`), con la misma fórmula.
- El modal de edición (`.ts:617`) **precarga** `editEjecutado` con el valor inflado; si el
  usuario guarda sin corregirlo, el error queda **persistido** en BD_SEL
  (`actualizarEjecucionMeta`, `.ts:694`). Desde ahí el avance guardado manda sobre KOFIX
  (`PasoCriticoServicio.cs:106-117`), y arreglar el SP ya no lo corrige.

El frontend de sigec-rtf **no necesita cambios**: el arreglo es solo del SP (D2b). Pero los
avances ya guardados con el valor inflado hay que detectarlos y corregirlos aparte (ver
Puntos abiertos). En el
mismo SP, `MontoComprometido` y `MontoDesembolsado` son la misma suma de solicitado (igual
que en H-08.3) y sufren el mismo fan-out.

### H-07 — La lista de Desembolsos y el Kardex no deberían poder contradecirse con el código actual (INC-07) ✅ resuelto con datos de QA

> **Conclusión (QA, 2026-10-01):** la N.O. 0946 tiene **dos desembolsos activos y pagados**
> (solicitudes 01 = S/ 2,400 y 02 = S/ 12,000, transferencia), registrados el **23/09/2026
> a las 19:45 y 19:47**, el mismo día de las capturas. Las capturas de N.O. "Registrado" y
> de Desembolsos "Sin solicitudes" se tomaron **antes** de esos registros, y la del Kardex
> (ejecutado S/ 14,400, saldo 0) **después**. No hay inconsistencia de datos ni de lógica:
> hoy la lista de Desembolsos de ese expediente debe mostrar las dos solicitudes. Se
> mantienen como defectos menores el error silenciado (punto 3) y el estado de solicitud que
> no avanza (ver Verificación). El análisis original de hipótesis se conserva abajo.

Las tres consultas leen las mismas tablas, con el mismo `ide_postulante` (las tres pestañas
reciben `convenio.id` en `ejecucion-detail.page.html:72,77` y `ejecucion-detail.page.ts:85`):

| Pantalla | SP | Condición |
| --- | --- | --- |
| Lista Desembolsos | `KDX_FIN_SP_R_DESEMBOLSOPOSTULANTE` | `SOL_DESEMBOLSO.est_estado = 1` + `INNER JOIN` al catálogo de estado |
| Estado N.O. "Registrado" | `KDX_FIN_SP_R_NOOBJECIONPOSTULANTE` (línea 486) | `montoUtilizado = 0` ⇔ **ningún `SOLDESEMBOLSO_DET` activo** contra la N.O. |
| Kardex "Ejecutado" | `vw_Kardex_CicloOperativo` | `SOLDESEMBOLSO_DET` activo + cabecera activa + N.O. activa |

Que la N.O. esté en **Registrado** implica que no hay detalle de solicitud activo, y
entonces la vista del Kardex **no devolvería fila** para el ítem: `KardexService.cs:55-57`
pondría `MontoEfectivizado = 0` y `Saldo = MetaFinanciera` (86,400). Las capturas muestran
lo contrario (efectivizado 14,400, saldo 0). Las capturas son **mutuamente inconsistentes
con el código actual**, así que la causa es de datos o de entorno, no de lógica visible.
Hipótesis, en orden de probabilidad:

1. **Desembolso anulado con movimiento de Kardex huérfano.** `KDX_FIN_SP_D_DESEMBOLSO`
   (`20260825_desembolso_editar_anular.sql:103-120`) pone `est_estado = 0` en cabecera y
   detalle, pero **no extorna el movimiento** de `KDX_FIN_TMM_MOVIMIENTO`. Esto explica el
   **saldo 0** (lista vacía y N.O. "Registrado" coinciden), pero no el efectivizado 14,400.
2. **Capturas de momentos distintos** (Kardex antes de anular, lista después), o de
   entornos distintos.
3. **Error HTTP silenciado.** `desembolso.page.ts:165` traga el error (`error: (err) => {}`);
   un 500 del listado se ve igual que "Sin solicitudes". Es un defecto propio aunque no sea
   esta la causa.

### H-02 — Reprogramación en fase de ejecución (INC-02) ✅ aclarado

**Aclaración del owner (2026-10-01):** INC-02 no es "falta información". En fase de
ejecución se puede habilitar el botón de programación del ítem, que en esa fase es una
**reprogramación**, y debe trabajar con saldos: *si de 100 hay 40 con solicitud de
desembolso, solo 60 están disponibles para reprogramar.* La base es lo **solicitado**
(pagado o no), no lo pagado: la regla difiere del saldo del Kardex (D1/D2).

**Cómo funciona hoy** (`programacion-vigente-detail` → `programacion-items` →
`programacion-cronograma-modal`):
- El botón por ítem abre el modal de cronograma. Queda en solo lectura si
  `GET programacion/proyectos/{id}/estado-bloqueo` marca el ítem como `bloqueado`.
- El modal limita el total financiero con `saldoDisponible` de ese endpoint
  (`montoLimite`, "Disponible p/ reprogramar") y `canSave` exige que lo programado sea
  **igual** a ese techo. El backend (`ProgramacionService.SaveCronogramaAsync`) vuelve a
  validar contra el mismo saldo.
- Antes de la Fase 1, ese saldo era el saldo corrido del ledger, sembrado con la N.O.
  (H-08.2): podía bloquear metas con saldo o dejar un techo equivocado. Además no
  correspondía a "aprobado − solicitado".

**Observaciones del modal (no se corrigen todavía, ver Puntos abiertos):**
1. La tarjeta "Meta física total" y `restanteFisico` siguen usando la meta física
   **completa**, aunque el techo financiero ya descuenta lo solicitado. La validación de
   `save()` permite programar hasta la meta física total. Lo que limita en la práctica es
   el techo financiero, porque la financiera se deriva de la física con el precio de la meta.
2. El cronograma guardado reemplaza la programación del ítem con montos que suman solo el
   saldo (p. ej. 60). Los meses ya cubiertos por solicitudes (los 40) **no se conservan**
   en la programación, y "Financiera Prog." quedará por debajo del aprobado.

### H-03 / H-05 — Catálogos (INC-03, INC-05) ✅ confirmado

Ambos son datos de `FIN.KDX_FIN_TG_CATALOGO` (seed en `kardex_setup_full.sql:550-579`), sin
listas hardcodeadas en el frontend: `desembolso.page.ts` y el modal cargan
`getByGrupo('TIPO_PAGO')`.
- `TIPO_DOCUMENTO`: OFICIO(1), INFORME_TECNICO(2), RESOLUCION(3), MEMORANDO(4) → falta CARTA.
- `TIPO_PAGO`: TRANSFERENCIA(12), CHEQUE(13), PAGO_DESTINO(14). `CHEQUE` ya tiene un ciclo
  propio DEVENGADO → GIRADO (ADR-020 del backend, `desembolso.model.ts:44`), así que
  "Cheques de gerencia" es un **cambio de descripción**, no un tipo nuevo.

### H-04 — Rebaja del saldo no usado de una No Objeción (INC-04) ✅ aclarado

**Aclaración del owner (2026-10-01):** lo que se pide no es desistir de la N.O. completa,
sino una **rebaja de la N.O.** Una N.O. siempre está amarrada a un proveedor. Si el
proveedor decide no continuar, se rebaja el saldo no usado de **esa N.O.** y ese monto
vuelve al **saldo disponible de la meta**. **La meta no cambia.**

| Paso | Meta (aprobado) | N.O. del proveedor | Saldo disponible de la meta para nuevas N.O. |
| --- | --- | --- | --- |
| Meta Asistencia técnica | 12,000 | — | 12,000 |
| N.O. de 6,000 | 12,000 | 6,000 | 6,000 |
| Se pagan 2,000 (2 meses) y el proveedor no continúa: rebaja de 4,000 | 12,000 | **2,000** | **10,000** |

La rebaja actúa **sobre la N.O.** (su adjudicado vigente baja de 6,000 a 2,000). Por eso
el saldo disponible de la meta sube, sin tocar la meta.

**Qué hay hoy en el código**, sin ningún mecanismo para hacer esto:

| Dónde | Qué hace | Efecto de la falta de rebaja |
| --- | --- | --- |
| `NoObjecionService.CreateAsync` + `KDX_FIN_SP_R_NOOBJECIONSUMAITEM` | Rechaza una N.O. nueva si `Σ adjudicado de N.O. activas + nuevo > MontoAprobado`, y lo mismo con la cantidad contra `MetaAprobada` | Los 4,000 no usados siguen sumando: con 6,000 comprometidos solo se puede adjudicar 6,000 más, nunca 10,000 |
| `KDX_FIN_SP_R_NOOBJECIONSUMAPOSTULANTE` | Saldo físico/financiero que muestra el modal de N.O. (`saldoFisico`, "Bal.") | Muestra como comprometido lo que ya no se va a usar |
| `KDX_FIN_SP_R_NOOBJECIONITEMSDESEMBOLSO` / `KDX_FIN_SP_R_DESEMBOLSOSALDOITEM` (último en `20260917_validacion_fechas_noobjecion_desembolso.sql`) | Saldo desembolsable por detalle de N.O. = adjudicado − solicitado + devoluciones | La N.O. sigue ofreciéndose para nuevos desembolsos por 4,000 |
| Kardex (Fase 1, `KARDEXRESUMENEJECUCION`) | Comprometido = Σ adjudicado | Comprometido inflado en 4,000 |
| `KDX_FIN_SP_R_NOOBJECIONPOSTULANTE` | Estado derivado Registrado / En Uso / Utilizado | Una N.O. rebajada quedaría "En Uso" para siempre |

Además existe un concepto parecido que **no sirve** para esto: la **DEVOLUCIÓN** (tipo de
operación 11, `RegistrarDevolucionAsync`) **suma** saldo al detalle de la N.O. (dinero que
regresa y se puede volver a desembolsar **dentro de la misma N.O.**). La rebaja hace lo
contrario: **reduce** la N.O., y lo rebajado vuelve al saldo disponible de la meta (la
meta no cambia).

**Antecedente (análisis previo, se mantiene):**
El "estado" de la N.O. **no se persiste**: se deriva en el SP de listado
(`CASE WHEN montoUtilizado = 0 THEN 'Registrado' … 'En Uso' … 'Utilizado'`, línea 486). No
existe grupo `ESTADO_NO_OBJECION` en el catálogo. Las acciones de la lista
(`no-objecion.page.html:61-75`) son ver, descargar, editar y eliminar (estas dos solo sin
solicitudes asociadas). Para desistir hace falta **estado persistido + validación en el alta
de desembolsos**, no solo un botón.

### H-06 — "N° Solicitud" (INC-06) ✅ confirmado

El término aparece en `desembolso-modal.component.html:10`, `desembolso.page.ts:57,72`
(lista y bandeja de cheques), `activar-cheque-modal.component.html:13` y
`rendicion.page.html:14` ("N° Solicitud Origen"). Persiste en
`KDX_FIN_TMC_SOL_DESEMBOLSO.cod_numeroSolicitud` y se formatea con `formatSolicitudNumber`
(`@agroideas/utils`).

## Decisiones

### D1 — Kardex: el saldo de una meta se calcula contra la meta programada (INC-08)
`Saldo Disponible = Programado − Ejecutado`, calculado en el SP de resumen (o en
`KardexService`) y **no** leído del último `imp_saldoNuevo` sembrado con la N.O. El estado
"Ejecutado 100%", el tachado y el bloqueo de reprogramación (`ProgramacionService`) usan esa
**misma** cifra que la barra y la varianza. El frontend **no** recalcula el saldo: deja de
haber dos fuentes en la fila y la pantalla solo presenta.

> **Pendiente de confirmar (ver Puntos abiertos):** si el saldo corrido de
> `KDX_FIN_TMM_MOVIMIENTO` tiene otro consumidor que *sí* necesita el saldo por N.O. Si es
> así, se conservan los dos conceptos con nombres distintos ("saldo de N.O." vs "saldo de
> meta") en vez de reemplazar uno por otro.

### D2 — Kardex: "Ejecutado" es solo lo pagado; "Comprometido" es lo adjudicado en N.O.
- **Ejecutado** = `SUM(imp_montoSolicitado)` solo donde hay `ide_desembolso` activo (pago
  real; para cheques, GIRADO).
- **Comprometido (N.O.)** = `SUM(imp_montoAdjudicado)` de N.O. activas y no desistidas.
- Los montos se agregan **a nivel de detalle de solicitud antes de unir rendiciones**
  (subconsultas o CTE separadas para solicitado, pagado y rendido), nunca con `SUM` sobre la
  vista con fan-out (H-09). Aplica a `KARDEXRESUMENEJECUCION` y `KARDEXRESUMENMES`.

Con esto el Kardex y la lista de Desembolsos usan el mismo criterio (decisión del borrador
para INC-07), y la columna "Comprometido" deja de duplicar a "Ejecutado".

### D2b — Avance físico proporcional al monto desembolsado (H-10)
`CantidadEjecutada = SUM(imp_montoSolicitado ÷ precio unitario)` por detalle de solicitud,
agregado **antes** de unir rendiciones (D2), con precio unitario =
`nod.imp_montoAdjudicado ÷ nod.can_cantidad` del detalle de N.O. que respalda la solicitud
(con guarda para `can_cantidad = 0`). **Confirmado por el owner (2026-10-01): el avance
físico se mide con el precio de la N.O.**, aunque difiera del programado. Por construcción del modal de N.O.
(`no-objecion-modal.component.ts:293`: `monto = cantidad ÷ metaFisica × aporteAgroideas`),
ese precio coincide con `meta financiera ÷ meta física`, la regla del owner. Se aplica
igual a `KARDEXEJECUCIONPERIODO`, y a cualquier otra vista o reporte que muestre
avance físico.

### D6 — Saldo reprogramable = aprobado − solicitado (INC-02)
`ProgramacionService` (`GetEstadoBloqueoAsync` y `SaveCronogramaAsync`) calcula
`SaldoDisponible = MontoAprobado − Imp_solicitado`, donde `Imp_solicitado` es la suma de
toda solicitud de desembolso **activa**, pagada o no (nueva columna de
`KDX_FIN_SP_R_KARDEXRESUMENEJECUCION`). El ítem se bloquea cuando ese saldo llega a 0, salvo
excepción registrada. El Kardex mantiene su propio saldo (aprobado − pagado, D1/D2): son dos
saldos distintos a propósito. El de reprogramación es más restrictivo, porque una solicitud
pendiente de pago ya no se puede redistribuir. El frontend no cambia: el modal ya usa
`saldoDisponible` como techo.

### D7 — Los SPs solo leen o escriben; la lógica de negocio va en la API
Principio fijado por el owner (2026-10-01) durante la Fase 4: los procedimientos almacenados
se limitan a **transacciones** (INSERT/UPDATE) y **lecturas** (con agregaciones de montos). Las
reglas de negocio viven en la API: topes, unidades enteras, montos derivados, fechas válidas y
estados. Aplicado en la Fase 4: `KDX_FIN_SP_C_NOOBJECIONREBAJA` solo inserta; el tope, las
unidades y el monto los calcula `NoObjecionRebajaService` (con `NoObjecionRebajaCalculo`); el
estado de la N.O. lo calcula `NoObjecionEstado`, ya no un `CASE` del listado.

**Deuda reconocida:** los SPs de resumen del Kardex de la Fase 1 (`KARDEXRESUMENEJECUCION`,
`KARDEXRESUMENMES` y `KARDEXEJECUCIONPERIODO`) todavía codifican criterios de negocio en la
consulta: qué cuenta como pagado (cheque GIRADO) y la conversión de monto a unidades físicas.
Ver Puntos abiertos.

### D3 — Desembolsos (INC-05, INC-06, INC-07)
- **INC-05:** `TIPO_PAGO` queda con dos valores activos: `TRANSFERENCIA` → "TRANSFERENCIA
  BANCARIA", `CHEQUE` → "CHEQUE DE GERENCIA". `PAGO_DESTINO` pasa a `est_estado = 0` (no se
  borra: hay registros que lo referencian). Regla de migración de los existentes en Puntos
  abiertos.
- **INC-06:** se renombra la terminología de "Solicitud" a "Memorándum de validación" en las
  4 pantallas listadas en H-06. Si es reemplazo o campo adicional sigue abierto.
- **INC-07:** antes de cambiar código se corren las consultas de [Diagnóstico](#diagnóstico-para-inc-07-e-inc-08)
  sobre 0051-2026-ST. Independientemente del resultado:
  - La anulación de un desembolso (`KDX_FIN_SP_D_DESEMBOLSO`) debe registrar un
    **EXTORNO** en el Kardex (el tipo de operación 10 ya existe en el catálogo).
  - `desembolso.page.ts` debe mostrar el error de carga en vez de la lista vacía.
  - **Corrección del owner (2026-10-01): lo que se anula es la No Objeción, no el
    desembolso.** Y solo su **saldo no solicitado**: lo solicitado se mantiene porque ya
    está en trámite. Equivale a la **rebaja total** de la Fase 4 (D4). Por eso **no se
    anulan desembolsos** y no hace falta EXTORNO. La implementación inicial de la Fase 2,
    que anulaba desembolsos con extorno, se **revirtió**. Ver el Registro de implementación.
  - Hallazgo que se mantiene: la anulación de desembolsos de la API nunca funcionó (el pago
    se crea al registrar y se rechazaba toda solicitud "efectivizada"). Se retira el botón
    de la UI; el endpoint queda sin uso.

### D4 — No Objeciones (INC-03, INC-04)
- **INC-03:** se agrega `TIPO_DOCUMENTO` = `CARTA` (seed + migración).
- **INC-04 (replanteado tras la aclaración del owner):** nueva acción **Rebaja** por
  detalle de N.O. (ítem + proveedor), no un estado "Desistida" de toda la N.O.:
  - **Registro propio, sin modificar la N.O.:** tabla nueva
    `FIN.KDX_FIN_TMD_NOOBJECION_REBAJA` (`ide_noObjecionDet`, `imp_rebajado`,
    `can_rebajada`, `fec_rebaja`, `cod_numeroCarta`, `fec_carta`, `ide_archivo`
    (carta), `txt_motivo`, `est_estado`, auditoría). El adjudicado original se conserva
    (trazabilidad). **Sin anulación por ahora** (owner): no hay endpoint para anular una
    rebaja; `est_estado` queda solo para una corrección administrativa en BD.
  - **Sustento: la carta de la organización** (owner, corregido el 2026-10-01; antes decía
    "un informe"): N° de carta, fecha y archivo adjunto, los tres obligatorios. Reusa el
    flujo de archivos de la N.O. Es la carta con la que la OA comunica que no continúa con
    el proveedor. No confundir con el tipo de documento "Carta" de la N.O. (INC-03), que es
    el documento que **autoriza** la N.O.
  - **Quién la registra: el mismo especialista** (owner): igual que el alta de N.O., exige el
    permiso `OPERACIONES_FINANCIERAS` (`NoObjecionController`) y que el convenio esté en su
    cartera (`ValidarAccesoConvenioAsync`). No hay paso de aprobación.
  - **La rebaja es de la N.O., no de la meta.** El `MontoAprobado` y la `MetaAprobada` de
    SEL no se tocan. Lo que baja es el **adjudicado vigente** del detalle de N.O. =
    `imp_montoAdjudicado − Σ rebajas activas` (lo mismo para la cantidad), y con él sube el
    saldo disponible de la meta (`aprobado − Σ adjudicado vigente`). Lo usan **todos** los puntos de la tabla de H-04:
    `NOOBJECIONSUMAITEM` y `NOOBJECIONSUMAPOSTULANTE` (liberan el saldo de la meta para la
    nueva N.O.), `NOOBJECIONITEMSDESEMBOLSO` y `DESEMBOLSOSALDOITEM` (la N.O. ya no ofrece
    lo rebajado), el comprometido del Kardex (Fase 1) y el listado de N.O.
  - **Tope de la rebaja** = saldo no solicitado del detalle =
    `adjudicado − solicitado (activo, pagado o no) + devoluciones − rebajas previas`. No se
    puede rebajar lo que ya tiene solicitud de desembolso, **porque se entiende que ya está en
    trámite** (owner): es el mismo criterio que D6. Si una solicitud pendiente no se va a
    pagar, primero se anula (flujo existente) y luego se rebaja.
  - **Unidades enteras** (owner): la rebaja se registra en **unidades** (`can_rebajada`
    entero, ≥ 1), y el monto se deriva: `imp_rebajado = can_rebajada × precio unitario de la
    N.O.` (`imp_montoAdjudicado ÷ can_cantidad`). Si el saldo no solicitado no es múltiplo
    exacto del precio unitario, el tope en unidades es `FLOOR(saldo ÷ precio)`. El precio
    unitario no cambia, así que el avance físico (D2b) sigue siendo correcto. En el ejemplo: 4,000 ÷ 1,000 = 4 meses liberados,
    y la meta (sigue en 12,000 / 12 meses) queda con 2,000 / 2 meses comprometidos en esa
    N.O. y 10,000 / 10 meses disponibles para nuevas N.O.
  - **Rebaja total = "Anular" la N.O.** (owner, 2026-10-01): anula **todo el saldo no
    solicitado**. Lo solicitado se mantiene, y la N.O. queda cerrada en lo solicitado, sin
    admitir nuevos desembolsos y sin borrarse. En la UI se ofrece como acción propia
    ("Anular saldo") junto a "Rebajar" (parcial, en unidades enteras). Ejemplo: N.O. de
    6,000 con 2,000 solicitados → al anular, la N.O. queda en 2,000 y 4,000 vuelven al
    saldo disponible de la meta. Mismo sustento (carta de la organización) y mismo permiso
    que la rebaja parcial. En la anulación total el monto se toma completo (incluida
    cualquier fracción de unidad), para que el adjudicado vigente quede exactamente en lo
    solicitado.
  - **Estado derivado** del listado: se agrega "Rebajada" (o "Cerrada" si el saldo vigente
    llega a 0 con rebaja), con filtro y pill en la lista y en los reportes.
  - **Validación en el backend** (no solo en la UI): el alta de desembolso y el alta de
    rebaja validan contra el adjudicado vigente.
  - **UI:** acción "Rebajar" en `no-objecion.page.html`, visible solo con
    `OPERACIONES_FINANCIERAS` y si hay al menos 1 unidad no solicitada. El modal muestra,
    por detalle (ítem + proveedor), adjudicado, solicitado, pagado y unidades rebajables;
    pide las unidades a rebajar (entero) y muestra el monto resultante, junto con el N°, la
    fecha y el adjunto de la carta de la organización y el motivo. Advierte que la rebaja no se puede
    deshacer.

### D5 — Adendas (INC-01)
INC-02 se resolvió con D6.

**INC-01 (adendas) queda solo como propuesta** (owner, 2026-10-01): primero hay que validar
que la BD de SEL guarde esa información. Lo encontrado en `BD_SEL_DEV` (local, 2026-10-01):

| Tabla | Qué guarda | Filas (local) | Quién la usa |
| --- | --- | --- | --- |
| `dbo.convenio_incentivo_ampliacion` | Adenda del convenio: `convenioID`, `tipoAmpliacionID`, `numeroAmpliacion`, `fechaAmpliacion`, `objetivo`, `fechaTermino`, `evidencia`, `estado` | **0** | Solo la app legacy `selv2` (Laravel, modelo `ConvenioIncentivoAmpliacion`, migración 2022-03-16). Ninguna API .NET (`sel-api-general`, `mc-api-ejecucion`) la lee. |
| `dbo.tipo_ampliacion` | Catálogo: 1 = Ampliación de plazo, 2 = Modificación del contenido | 2 | Ídem |
| `dbo.solicitud_modificaciones_plan_detalle` | Observaciones de evaluación del plan, con versionamiento (`versionamiento_anterior_id` → `versionamiento_id`) | 40 | No son adendas del convenio: son subsanaciones de la etapa de evaluación (FK a `solicitudes`) |

Conclusión: sí existe una estructura de adenda (`convenio_incentivo_ampliacion`), pero:
1. **Solo modela plazo y contenido**: no tiene montos ni detalle por meta o ítem. Una adenda
   que modifique la meta financiera o física **no tiene dónde guardarse**, y KOFIX seguiría
   leyendo el monto aprobado original (`MontoAprobado` de `SEL_SP_R_ListarItemPorPostulante`).
2. **No hay datos en local** y ninguna API actual la consume. Falta contar filas en QA y
   producción.
3. **Cómo la llena `selv2`** (`ConvenioIncentivoAmpliacionController::store`): el formulario
   pide tipo, número, fecha, justificación (→ `objetivo`) y **meses**, y calcula
   `fechaTermino = fechaAmpliacion + meses`. **No actualiza** `convenio_incentivo.fechaFin`:
   la nueva fecha de término vive solo en la adenda. Cualquier consumidor que lea
   `convenio_incentivo.fechaFin` ignora las ampliaciones de plazo.
4. **Relación con KOFIX:** la FK apunta a `convenio_incentivo` (columnas `expedienteID`,
   `numero`, `fechaFirma`, `duracion`, `fechaFin`; 1,687 convenios en local), no al
   postulante. KOFIX trabaja con `ide_postulante`, así que un consumo futuro necesita el
   cruce `postulante → expediente → convenio_incentivo`, expuesto por `sel-api-general`.

Propuesta (no aprobada): (a) confirmar con el área usuaria qué modifica una adenda (plazo,
montos o metas); (b) si modifica montos o metas, decidir si se versiona la programación
(como `solicitud_modificaciones_plan_detalle` hace en evaluación) o se agrega un detalle por
ítem a `convenio_incentivo_ampliacion`; (c) exponerla por `sel-api-general` para que KOFIX
use la meta **vigente** (con adendas) como programado en el Kardex y en el bloqueo.

## Alternativas consideradas

- **Corregir solo el frontend** (calcular el estado con `montoProgramado − montoEfectivizado`
  en `kardex-varianza-tab`). Se descarta como solución final: arreglaría la pantalla, pero
  `ProgramacionService` seguiría bloqueando metas con saldo. Puede usarse como **mitigación
  temporal** (Fase 0) si el backend tarda.
- **Rebaja editando `imp_montoAdjudicado`/`can_cantidad` del detalle.** Se descarta: pierde
  el monto original adjudicado (trazabilidad frente al documento de la N.O.) y no permite
  anular la rebaja.
- **Rebaja como movimiento negativo de DEVOLUCIÓN.** Se descarta: la devolución libera saldo
  **dentro** de la N.O., y la rebaja tiene que liberarlo hacia la **meta**. Mezclarlas
  rompería los saldos de desembolso.
- **Desistir con un estado "Desistida" de toda la N.O.** (propuesta inicial). Se reemplaza
  por la rebaja: la rebaja total cubre ese caso, y la parcial cubre el caso real del owner.
- **Desistimiento por eliminación.** Se descarta: borra la trazabilidad y permite recrear la
  solicitud con otro monto.
- **Desistimiento solo con el campo Observación.** Se descarta: no bloquea nuevos
  desembolsos.
- **Retirar `PAGO_DESTINO` con DELETE.** Se descarta: rompe la FK lógica de los desembolsos
  históricos; se inactiva.

## Consecuencias

- Los saldos, el estado, la barra y la varianza del Kardex salen de una sola fórmula; las
  metas con saldo dejan de estar bloqueadas para reprogramar.
- **Recalcular expedientes existentes:** cualquier meta con `saldo <= 0` que tenga
  `ejecutado < programado` está afectada. Si D1 se calcula al vuelo (no desde
  `imp_saldoNuevo`), no hay que migrar movimientos; si se conserva el saldo corrido, hay que
  recalcularlo.
- Al pasar "Ejecutado" a solo lo pagado (D2), las cifras de ejecución **bajan** en los
  expedientes con solicitudes sin pago o cheques DEVENGADO. Hay que avisar a la Unidad de
  Negocios antes del despliegue, y revisar los reportes (`reportes.page.ts`), las alertas de
  varianza (`alertas.page.ts`, `kpiVarianzas`) y la ejecución por periodo
  (`KDX_FIN_SP_R_KARDEXEJECUCIONPERIODO`), que leen la misma vista.
- La rebaja entra en todos los cálculos de saldo de N.O. (alta de N.O., alta de desembolso,
  Kardex, listado) y en filtros y reportes (estado "Rebajada"/"Cerrada").
- Cambia la terminología Solicitud → Memorándum de validación en pantallas, reportes y
  manuales.
- Casi todo el trabajo es de `mc-api-ejecucion` (SPs + servicios). El frontend cambia en
  `kardex-varianza-tab`, `no-objecion.page`, `desembolso.page`/modales y `rendicion.page`.

## Plan por fases

| Fase | Alcance | Repos | Depende de |
| --- | --- | --- | --- |
| 0 | Diagnóstico de datos de 0051-2026-ST (consultas abajo) | BD KARDEX | — |
| 1 ✅ local | INC-08 + H-09 + H-10 + D2/D2b: saldo de meta, ejecutado = pagado, comprometido = adjudicado, sin fan-out por rendiciones, avance físico = monto ÷ precio unitario (también en `KARDEXEJECUCIONPERIODO`, que consume SIGEC-RTF); bloqueo de programación con la misma fórmula; tests en `KardexServiceTests` y spec de `kardex-varianza-tab` | API + UI | Fase 0, confirmar consumidores de `imp_saldoNuevo` |
| 2 ✅ | INC-07: error de carga visible en la lista de Desembolsos; se retira el botón "Anular" de desembolsos (la anulación es de la N.O., ver Fase 4) | UI | — |
| 3 ✅ | INC-03 + INC-05: catálogos (CARTA; renombrar e inactivar tipos de pago); validador que rechaza PAGO_DESTINO. Sin migración de datos (QA no tiene PAGO_DESTINO en uso) | API (SQL + validador) | — |
| 4 ✅ | INC-04: rebaja parcial y "Anular saldo" (rebaja total) de la N.O.; tabla de rebajas, "adjudicado vigente" en los 6 SPs de saldo de N.O., endpoint de alta de rebaja (sin anulación), validaciones, modal "Rebajar" y estado en la lista | API + UI | Fase 1 (comprometido); puntos abiertos de INC-04 |
| 5 | INC-06: terminología Memorándum de validación | UI (+ API si es campo nuevo) | Respuesta del punto abierto |
| 1 ✅ local | INC-02 (D6): saldo reprogramable = aprobado − solicitado en `ProgramacionService` | API | — |
| 1b | INC-02, ajustes del modal de reprogramación: conservar los meses solicitados y mostrar el saldo físico | UI (+ API sel-general si se conservan meses) | Respuesta de los puntos abiertos de INC-02 |
| — | INC-01 (solo propuesta, ver D5) | SEL + KOFIX | Validar el uso de `convenio_incentivo_ampliacion` en QA/prod y qué modifica una adenda |

## Verificación con datos (BD local, 2026-10-01)

Se ejecutaron consultas de solo lectura contra el contenedor `sqlserver_dev` (BD `KARDEX` y
`BD_SEL_DEV`, credenciales de `mc-api-ejecucion.Api/appsettings.json`).

**El expediente 0051-2026-ST no existe en la BD local** (no hay N.O. 0946; solo hay
datos de los postulantes 2202, 2242, 86147 y 158873). Las capturas son de otro entorno
(QA o producción), así que INC-07 sigue sin poder reproducirse con sus datos reales.

Lo que sí confirman los datos locales:

1. **H-08 (siembra con la N.O.): confirmado en el 100% de los casos.** Los 9 movimientos
   DESEMBOLSO (tipo 8) tienen `imp_saldoAnterior` = `imp_montoAdjudicado` de la N.O.
   referenciada. Ninguno se sembró con la meta. En local **el defecto queda oculto**: en
   todos los ítems con movimientos la N.O. cubre el 100% de la meta (`MontoAprobado` de
   `GENERAL.SEL_SP_R_ListarItemPorPostulante` = adjudicado). Por eso el saldo 0 resulta
   correcto por casualidad. Para reproducir INC-08 hace falta una N.O. parcial, como la de
   0051-2026-ST: 14,400 de 86,400.
2. **H-09 (fan-out): confirmado.** Postulante 2242, ítem 10909 "Coordinador del Plan de
   negocios":

   | Fuente | Monto |
   | --- | --- |
   | Meta aprobada (`BD_SEL_DEV`) | 29,400.00 |
   | Solicitud de desembolso 40003 (única) | 29,400.00 |
   | Filas en `vw_Kardex_CicloOperativo` para ese detalle | **3** (3 rendiciones) |
   | Kardex `imp_comprometido` / `imp_efectivizado` | **88,200.00** (= 29,400 × 3) |

   En pantalla esa meta sale con barra al 100% (`Math.min`) y varianza **−58,800**
   ("Desviación Presupuestal"), cuando en realidad está desembolsada exactamente al 100%.
3. **`ide_estadoSolicitud` nunca avanza.** Las 10 solicitudes, incluidas las pagadas y
   rendidas, siguen en 5 = PENDIENTE. La columna "Estado" de la lista de Desembolsos no
   informa nada. Se anota como defecto menor relacionado con INC-07.
4. **Anulación sin extorno (H-07.1):** en local la única solicitud anulada con movimiento
   (`ide_solicitudDesembolso` 20004, cheque de prueba ADR-020) tiene su movimiento también
   con `est_estado = 0`, así que no reproduce el huérfano. La hipótesis sigue abierta para
   QA/producción.
5. **Catálogos:** `TIPO_DOCUMENTO` (1-4) y `TIPO_PAGO` (12 TRANSFERENCIA, 13 CHEQUE,
   14 PAGO_DESTINO, todos activos) coinciden con el seed. Hoy ningún detalle activo usa
   PAGO_DESTINO (14): en local, migrar INC-05 solo afecta a CHEQUE (13).

## Verificación en QA, expediente 0051-2026-ST (2026-10-01)

El usuario ejecutó el diagnóstico de abajo contra el SQL Server de QA (VPS OVH, contenedor
`sql-server`, BD `KARDEX`), solo lectura. `ide_postulante` = **190432**.

**No Objeciones del expediente:**

| N.O. | Tipo | Número | Fecha | Det | Ítem | Adjudicado | Desembolsado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 6 | Memorando | 0946 | 26/05/2026 | 7 | 172575 (Asistencia técnica) | 14,400.00 | 14,400.00 (2 transferencias) |
| 7 | Oficio | 02 | 15/09/2026 | 8 | 172575 (Asistencia técnica) | 72,000.00 | **0.00** |
| 8 | Resolución | 02 | 14/09/2026 | 9 | 172572 | 42,320.00 | 42,320.00 (2 cheques) |
| 9 | Memorando | 045 | 17/09/2026 | 10 | 172570 | 59,616.00 | 59,616.00 (2 cheques) |

**Movimientos de Kardex de Asistencia técnica (ítem 172575):**

| Mov | Monto | Saldo anterior | Saldo nuevo | Fecha |
| --- | --- | --- | --- | --- |
| 9 | 2,400.00 | **14,400.00** ← adjudicado de la N.O. 0946, no la meta 86,400 | 12,000.00 | 23/09 19:45 |
| 10 | 12,000.00 | 12,000.00 | **0.00** | 23/09 19:47 |

Conclusiones:

1. **INC-08 queda confirmado con los datos de las capturas.** El saldo se sembró con el
   adjudicado de la N.O. (14,400) y llegó a 0 con S/ 72,000 de meta por ejecutar. Además,
   esa meta tiene **otra N.O. vigente por S/ 72,000 (Oficio 02) sin desembolsar**: con el
   código actual, el próximo desembolso contra ella **re-sembrará el saldo con 72,000**
   (defecto H-08.1). El Kardex mostrará entonces un saldo de N.O. disfrazado de saldo de meta.
   Con D1 + D2 esta fila debe mostrar: Programado 86,400 · Comprometido 86,400 (las dos N.O.)
   · Ejecutado 14,400 · Saldo 72,000 · 17% · estado "Con Saldo".
2. **INC-07 no es un defecto:** ver la conclusión en H-07.
3. **Ítems 172572 y 172570:** saldo 0 por la misma siembra. Si su meta es mayor que la N.O.,
   tienen el mismo falso "Ejecutado 100%". Falta cruzar su `MontoAprobado` en `BD_SEL_DEV` de QA.
4. **Alcance global en QA:** 4 ítems con último saldo ≤ 0 en 2 postulantes (los 3 de 190432
   + 1 de otro postulante). El volumen a recalcular es pequeño.
5. **H-09 (fan-out) es latente en QA:** 0 detalles inflados, porque QA todavía no tiene
   rendiciones. Se corrige igual: aparecerá con la primera rendición parcial múltiple, como
   ya ocurre en la BD local.
6. **`ide_estadoSolicitud` nunca avanza:** las 6 solicitudes, todas pagadas, siguen en
   5 = PENDIENTE (igual que en local).
7. **Número de solicitud duplicado:** las solicitudes 9 y 10 tienen las dos
   `cod_numeroSolicitud = '04'`, en N.O. distintas. El número es texto libre sin unicidad, lo
   que refuerza INC-06: reemplazarlo por una referencia formal (memorándum de validación).
8. **INC-05:** en QA no hay detalles activos con PAGO_DESTINO (14): 3 TRANSFERENCIA (12) y
   4 CHEQUE (13), con `ide_cheque` del ciclo ADR-020. **No hace falta migrar datos**: basta
   renombrar 12 y 13 e inactivar 14.

## Diagnóstico para INC-07 e INC-08

Ejecutado en QA el 2026-10-01 (resultados arriba). Se conserva para repetirlo en
producción antes de desplegar. Ejecutar en la BD `KARDEX` **del entorno a revisar**, con el
`ide_postulante` del expediente 0051-2026-ST:

```sql
DECLARE @p BIGINT = /* ide_postulante de 0051-2026-ST */;

-- 1. Solicitudes de desembolso, incluidas las anuladas
SELECT sc.ide_solicitudDesembolso, sc.cod_numeroSolicitud, sc.est_estado AS cab_activa,
       sc.ide_estadoSolicitud, sd.est_estado AS det_activo, sd.imp_montoSolicitado,
       sd.ide_tipoPago, sd.ide_noObjecionDet, d.ide_desembolso, d.ide_cheque, d.est_estado AS pago_activo
FROM FIN.KDX_FIN_TMC_SOL_DESEMBOLSO sc
JOIN FIN.KDX_FIN_TMD_SOLDESEMBOLSO_DET sd ON sd.ide_solicitudDesembolso = sc.ide_solicitudDesembolso
LEFT JOIN FIN.KDX_FIN_TMM_DESEMBOLSO d ON d.ide_solicitudDesembolsoDet = sd.ide_solicitudDesembolsoDet
WHERE sc.ide_postulante = @p;

-- 2. Movimientos del Kardex (¿hay un DESEMBOLSO sin extorno de una solicitud anulada?)
SELECT ide_movimiento, ide_itemMl, ide_tipoOperacion, ide_referenciaId, imp_monto,
       imp_saldoAnterior, imp_saldoNuevo, fec_movimiento, est_estado
FROM FIN.KDX_FIN_TMM_MOVIMIENTO WHERE ide_postulante = @p ORDER BY ide_movimiento;

-- 3. Lo que hoy devuelve el resumen del Kardex
EXEC FIN.KDX_FIN_SP_R_KARDEXRESUMENEJECUCION @ide_postulante = @p;

-- 4. Alcance de la recalculación: metas con saldo 0 en todos los expedientes
--    (cruzar luego con la meta programada de sel-api-general / ProyectoApi)
SELECT m.ide_postulante, m.ide_itemMl, m.imp_saldoNuevo
FROM FIN.KDX_FIN_TMM_MOVIMIENTO m
WHERE m.est_estado = 1 AND m.imp_saldoNuevo <= 0
  AND m.ide_movimiento = (SELECT MAX(x.ide_movimiento) FROM FIN.KDX_FIN_TMM_MOVIMIENTO x
                          WHERE x.ide_postulante = m.ide_postulante AND x.ide_itemMl = m.ide_itemMl AND x.est_estado = 1);

-- 5. Desembolsos con tipos de pago a migrar (INC-05)
SELECT ide_tipoPago, COUNT(*) FROM FIN.KDX_FIN_TMD_SOLDESEMBOLSO_DET WHERE est_estado = 1 GROUP BY ide_tipoPago;
```

### Diagnóstico de avance físico (H-10) — `diag_avance_fisico.sql`

```sql
-- Diagnóstico H-10 (avance físico) — SOLO LECTURA — BD KARDEX (QA)
SET NOCOUNT ON;
PRINT '=== 1. Por detalle de N.O.: cantidad actual (SP) vs correcta (monto / precio unitario)';
WITH sol AS (   -- una fila por detalle de solicitud, sin fan-out de rendiciones
  SELECT sd.ide_solicitudDesembolsoDet, sd.ide_noObjecionDet, sd.imp_montoSolicitado
  FROM FIN.KDX_FIN_TMD_SOLDESEMBOLSO_DET sd
  JOIN FIN.KDX_FIN_TMC_SOL_DESEMBOLSO sc ON sc.ide_solicitudDesembolso = sd.ide_solicitudDesembolso AND sc.est_estado = 1
  WHERE sd.est_estado = 1)
SELECT h.ide_postulante, nod.ide_itemMl, nod.ide_noObjecionDet, nod.can_cantidad AS cant_NO,
       nod.imp_precioAdjudicado, nod.imp_montoAdjudicado,
       COUNT(s.ide_solicitudDesembolsoDet) AS n_solicitudes,
       SUM(s.imp_montoSolicitado) AS desembolsado,
       COUNT(s.ide_solicitudDesembolsoDet) * nod.can_cantidad AS cantidad_actual_aprox,
       SUM(s.imp_montoSolicitado) / NULLIF(nod.imp_montoAdjudicado / NULLIF(nod.can_cantidad, 0), 0) AS cantidad_correcta
FROM FIN.KDX_FIN_TMD_NOOBJECION_DET nod
JOIN FIN.KDX_FIN_TMC_NO_OBJECION h ON h.ide_noObjecion = nod.ide_noObjecion AND h.est_estado = 1
JOIN sol s ON s.ide_noObjecionDet = nod.ide_noObjecionDet
WHERE nod.est_estado = 1
GROUP BY h.ide_postulante, nod.ide_itemMl, nod.ide_noObjecionDet, nod.can_cantidad, nod.imp_precioAdjudicado, nod.imp_montoAdjudicado
ORDER BY h.ide_postulante, nod.ide_itemMl;

PRINT '=== 2. Lo que hoy entrega el SP a SIGEC-RTF para 0051-2026-ST (190432)';
EXEC FIN.KDX_FIN_SP_R_KARDEXEJECUCIONPERIODO @ide_postulante = 190432, @fec_inicio = '2000-01-01', @fec_fin = '2100-12-31';
```

## Registro de implementación

### Fase 1 — 2026-10-01 (local, sin desplegar)

**`mc-api-ejecucion`**
- `Database/20261001_adr0012_fase1_kardex_ejecucion_pagada.sql` (nuevo; no toca los scripts
  con cambios locales pendientes). Redefine:
  - `KDX_FIN_SP_R_KARDEXRESUMENEJECUCION`: comprometido = adjudicado de las N.O. activas;
    ejecutado = solicitado **pagado** (fila activa en `KDX_FIN_TMM_DESEMBOLSO` y, si es
    cheque, en estado `GIRADO`); rendido agregado aparte; deja de devolver `imp_saldoActual`.
    Incluye ahora los ítems con N.O. sin solicitudes (comprometido > 0, ejecutado 0).
  - `KDX_FIN_SP_R_KARDEXRESUMENMES`: los mismos criterios por mes (N.O. por
    `fec_documento`, ejecutado por `fec_pago`, rendido por `fec_emisionComprobante`).
  - `KDX_FIN_SP_R_KARDEXEJECUCIONPERIODO` (SIGEC-RTF): `CantidadEjecutada = Σ monto pagado ×
    can_cantidad ÷ montoAdjudicado`; `MontoDesembolsado` = pagado en el periodo;
    `MontoComprometido` = adjudicado de N.O. con `fec_documento` en el periodo. Mantiene el
    mismo conjunto de ítems (los que tienen solicitudes), porque SIGEC distingue "sin dato"
    de 0.
- `KardexService.GetKardexConsolidadoAsync`: `Saldo = MetaFinanciera − MontoEfectivizado`.
- `ProgramacionService.SaveCronogramaAsync` / `GetEstadoBloqueoAsync`: saldo reprogramable y
  bloqueo con `MontoAprobado − Imp_solicitado` (D6; ajustado el 2026-10-01 tras la
  aclaración de INC-02, antes usaba lo pagado).
- `ExecutionSummaryInternal`: se elimina `Imp_saldoActual` y se agrega `Imp_solicitado`
  (el SP de resumen devuelve la nueva columna `imp_solicitado`).
- Tests: `KardexServiceTests` (+ caso 0051-2026-ST: saldo 72,000 = varianza) y
  `ProgramacionServiceSaldoTests` (nuevo, 6 casos: no bloquea con N.O. parcial, bloquea al
  solicitar el 100%, sin ejecución, descuenta lo solicitado aunque no esté pagado, y
  rechaza o permite reprogramar según el saldo). **`dotnet test`: 111/111 ✅.**

**`agroideas-frontend-monorepo`**
- `kardex-varianza-tab`: sin cambios de lógica (ya presentaba `saldo` del backend). Se
  ajusta el glosario de "Ejecutado" (transferencias registradas y cheques girados). El spec
  suma 2 casos: "Con Saldo" + 17% + 72,000 para 0051-2026-ST, y "Ejecutado 100%" solo con
  saldo 0. **`nx test kofix-ejecucion --testPathPattern=kardex-varianza-tab`: 5/5 ✅.**

**`despliegue/deploy_kofix.sh`**: se agrega el script al final de `DB_SCRIPTS`. Ojo: la
lista vuelve a aplicar `20260822_estandarizar_nomenclatura_sp.sql` en cada despliegue, que
redefine estos mismos SPs con la versión anterior. Por eso el script nuevo debe quedar
**siempre al final**. Además, la lista **no incluye** `20260910_*`, `20260917_*` ni otros
scripts posteriores al 28/08: revisar antes del próximo despliegue.

**Verificación en BD local (script aplicado en `sqlserver_dev`, 2026-10-01):**

| Postulante / ítem | Antes | Después |
| --- | --- | --- |
| 2242 / 10909 (fan-out ×3) — comprometido / ejecutado | 88,200 / 88,200 | 29,400 / 29,400 |
| 2242 / 10909 — `CantidadEjecutada` (meta 12) | 36 | **12** |
| 86147 / 19015 (N.O. 25 und., 86,000) — `CantidadEjecutada` | 25 | 25 (un solo desembolso, sin cambio) |
| 86147 / 19017 (cheque GIRADO) — ejecutado | 9,600 | 9,600 (sigue contando: está girado) |

Esperado en QA tras desplegar (0051-2026-ST, ítem 172575): comprometido **86,400** (0946 +
Oficio 02), ejecutado 14,400, saldo **72,000**, 17%, "Con Saldo";
`CantidadEjecutada` = **6** (antes 12), 172572 = 23 (antes 46) y 172570 = 621 (antes 1,242).

### Fase 2 — 2026-10-01

**Versión final (vigente):**
- `kofix-ejecucion`, `desembolso.page`: `loadError` cambia el estado vacío a "No se pudieron
  cargar las solicitudes" en vez de "Sin solicitudes" (INC-07). Specs del error de carga.
- Se **retira el botón "Anular"** de la lista de Desembolsos y su handler. Nunca funcionó:
  la API rechazaba toda solicitud con pago, y todas lo tienen desde que se registran. Además,
  la anulación es de la N.O. (Fase 4).
- **`nx test kofix-ejecucion`: 524/524 ✅**; lint 0 errores.

**Implementación inicial, revertida el mismo día:** por un malentendido se implementó la
anulación de **desembolsos** (sin rendición y con N.O. abierta), con EXTORNO en el Kardex y
baja del pago y del cheque (API `9a4a2ce`, monorepo `2027ad3`). El owner aclaró que lo que
se anula es la **N.O.**, y solo su saldo no solicitado. Se revirtió con `b1e7a34` en
`mc-api-ejecucion`: los SPs `KARDEXMOVIMIENTO`, `PUEDE_MODIFICAR`, `D_DESEMBOLSO` y
`DESEMBOLSOPOSTULANTE` vuelven a su versión previa, también en la BD local, y el script
`20261001_adr0012_fase2_anulacion_desembolso_extorno.sql` se eliminó del repo y de
`deploy_kofix.sh`. En el frontend se quitaron `puedeAnular` y el botón. La verificación
de esa versión (extorno, baja del cheque, recuperación del saldo) queda como referencia si
alguna vez se necesita anular desembolsos individuales.

### Fase 4 — 2026-10-01

**`mc-api-ejecucion`**
- `Database/20261001_adr0012_fase4_rebaja_noobjecion.sql` (idempotente):
  - Tabla `FIN.KDX_FIN_TMD_NOOBJECION_REBAJA` (detalle de N.O., `flg_total`, unidades,
    monto, N°/fecha/archivo de la carta, motivo, auditoría). PK, FK al detalle, `CHECK`
    de montos positivos e índice por detalle.
  - Vista `FIN.vw_Kardex_NoObjecionDetSaldo`: por detalle activo, adjudicado original,
    rebajado, **adjudicado vigente**, solicitado, devuelto y saldo no solicitado. Solo
    agrega montos.
  - SPs nuevos, sin reglas: `NOOBJECIONREBAJA_SALDO` (lectura: cabecera, saldos e
    historial), `NOOBJECIONDET_SALDO` (lectura con `UPDLOCK` dentro de la transacción de la
    API), `C_NOOBJECIONREBAJA` (solo INSERT) y `NOOBJECIONTIENEREBAJAS`.
  - SPs que pasan al adjudicado vigente: `NOOBJECIONSUMAITEM` y `NOOBJECIONSUMAPOSTULANTE`
    (saldo de la meta para nuevas N.O.), `NOOBJECIONITEMSDESEMBOLSO` y `DESEMBOLSOSALDOITEM`
    (lo rebajado deja de ofrecerse para desembolsar), `NOOBJECIONPOSTULANTE` y
    `NOOBJECIONPORID` (montos sin procesar, sin `CASE` de estado) y los tres SPs del Kardex de
    la Fase 1 (comprometido = vigente; el avance físico usa el precio **original**, que la
    rebaja no altera).
- `NoObjecionRebajaService` + `NoObjecionRebajaController`
  (`GET api/no-objeciones/{id}/rebajas/saldo`, `POST api/no-objeciones/{id}/rebajas`, con
  `OPERACIONES_FINANCIERAS` + cartera). Valida que el ítem sea de la N.O.; que la fecha de la
  carta sea ≥ la de la N.O., no futura y de un periodo abierto. Luego, en una transacción,
  relee el saldo con bloqueo, valida el tope y calcula unidades y monto (parcial: entero ≥ 1 y
  ≤ unidades rebajables, monto = unidades × precio; total: todo el saldo) e inserta. Audita
  `REBAJAR` / `ANULAR_SALDO`.
- `NoObjecionRebajaValidator`: carta (N°, fecha, archivo) y motivo obligatorios; unidades ≥ 1
  en la parcial.
- `NoObjecionReglas.cs`: `NoObjecionRebajaCalculo` (unidades rebajables, monto) y
  `NoObjecionEstado` (Registrado / En Uso / Utilizado / **Rebajada** / **Cerrada**).
- `NoObjecionService`: el listado calcula el estado en la API; editar o eliminar una N.O. con
  rebajas se rechaza.
- Tests: `NoObjecionRebajaServiceTests` (10), `NoObjecionReglasTests` (13),
  `NoObjecionRebajaValidatorTests` (5) y 3 nuevos en `NoObjecionServiceTests`.
  **`dotnet test`: 146/146 ✅.**

**`agroideas-frontend-monorepo`** (`kofix-ejecucion`)
- Modelos y repositorio (`getSaldoRebaja`, `registrarRebaja`); el mapper suma
  `montoRebajado`/`numRebajas`.
- `no-objecion-rebaja-modal` (nuevo): tabla de ítems con precio, vigente, solicitado, saldo
  sin solicitar y unidades rebajables; modalidad "Rebajar (parcial)" / "Anular saldo (total)";
  monto resultante y con cuánto queda la N.O.; carta (N°, fecha entre la de la N.O. y hoy,
  PDF subido a **sel-api-archivos** con el mismo flujo que el documento de la N.O.); motivo;
  confirmación que avisa que no se puede deshacer; e historial de rebajas.
- `no-objecion.page`: botón "Rebajar / Anular saldo" (ícono `content_cut`) solo si
  `saldoMonto > 0`; editar y eliminar deshabilitados con desembolsos **o rebajas**; columnas
  "Adjudicado Vigente" y "Sin Solicitar"; pills para los estados que calcula la API.
- Specs: modal (12) y página (6 nuevos). **`nx test kofix-ejecucion`: 539/539 ✅**; lint 0
  errores; `nx build` OK.

**Verificación en BD local** (transacción con `ROLLBACK`; N.O. de Porongos ampliada a 100
und × 192 con 50 solicitadas): rebaja parcial de 20 und → vigente 15,360, "Rebajada", 30 und
rebajables, meta comprometida 15,360 / 80 und. Anular saldo → vigente 9,600 (= solicitado),
"Cerrada", ya no se ofrece para desembolso, Kardex comprometido 9,600, avance físico 50
(precio original). Un error del SP original con `ROLLBACK` revertía la transacción del
llamador; con D7 el SP ya no tiene esa lógica.

**No verificado:** el flujo completo contra la API levantada (requiere un token de
`sel-api-seguridad`); se cubrió con tests unitarios y con los SPs en la BD local.

### Fase 3 — 2026-10-01

**`mc-api-ejecucion`**
- `Database/20261001_adr0012_fase3_catalogos_documento_pago.sql` (idempotente, re-ejecutable
  en cada despliegue):
  - INC-03: `TIPO_DOCUMENTO` = `CARTA` (orden 5).
  - INC-05: `TRANSFERENCIA` → "TRANSFERENCIA BANCARIA", `CHEQUE` → "CHEQUE DE GERENCIA",
    `PAGO_DESTINO` → `est_estado = 0` (no se borra). Los `ide_catalogo` y `cod_codigo` no
    cambian, porque `DesembolsoService` decide el flujo por id (12 directo a GIRADO, 13
    DEVENGADO → GIRADO).
- `DesembolsoValidator`: `TipoPagoId` solo admite 12 o 13. Antes, un 14 enviado directo a la
  API se procesaba como transferencia, y cualquier otro id registraba la solicitud **sin
  efectivizarla**. La condición se aplica solo a la regla nueva
  (`ApplyConditionTo.CurrentValidator`), para no desactivar la de "obligatorio".
- `DesembolsoService`: se retira la rama `TipoPagoId == 14` y los comentarios de PAGO_DESTINO.
- Tests: `Validators/DesembolsoValidatorTests` (nuevo: 12 y 13 válidos, 14 rechazado,
  0 solo con el mensaje de obligatorio). **`dotnet test`: 115/115 ✅.**

**Frontend:** sin cambios. Los selects de tipo de documento (`no-objecion-modal`) y de tipo
de pago (`desembolso-modal`, filtro de `desembolso.page`) leen el catálogo, que ya filtra
`est_estado = 1`. Los textos solo aparecen en fixtures de specs.

**Verificación en BD local** (script aplicado dos veces, sin duplicados):
`CATALOGOPORGRUPO 'TIPO_PAGO'` devuelve solo 12 "TRANSFERENCIA BANCARIA" y 13 "CHEQUE DE
GERENCIA"; `'TIPO_DOCUMENTO'` agrega 20001 "CARTA".

**`despliegue/deploy_kofix.sh`:** script agregado al final de `DB_SCRIPTS`.

**Efecto en datos existentes:** la columna "Tipo de Pago" de la lista de Desembolsos toma la
descripción del catálogo (`DESEMBOLSOPOSTULANTE`), así que los registros históricos se ven
con los nombres nuevos automáticamente.

## Puntos abiertos

- [ ] **INC-01 (propuesta):** ¿una adenda modifica plazo, montos o metas? Contar filas en
  BD_SEL de QA y producción (ver D5):
  `SELECT tipoAmpliacionID, COUNT(*) FROM dbo.convenio_incentivo_ampliacion GROUP BY tipoAmpliacionID;`
  Si solo amplía plazo, basta con exponer la tabla por `sel-api-general` y usar la última
  `fechaTermino` como fecha de fin vigente. Si cambia montos o metas, hay que extender el
  modelo.
- [ ] **Fase 1:** revisar y commitear (en `mc-api-ejecucion` los cambios se mezclan con otros
  cambios locales pendientes), desplegar con `deploy_kofix.sh` (el script nuevo al final;
  revisar los `20260910_*` y `20260917_*` que faltan en la lista) y repetir los dos
  diagnósticos en QA.
- [x] **INC-02:** es la reprogramación en fase de ejecución; saldo = aprobado − solicitado
  (owner, 2026-10-01). Implementado en el backend (D6).
- [ ] **INC-02, meses ya solicitados:** al reprogramar, ¿el cronograma debe **conservar** los
  meses ya cubiertos por solicitudes (bloqueados, no editables) y redistribuir solo el
  saldo, o basta con programar el saldo en meses futuros? Hoy se reemplaza todo el
  cronograma del ítem y lo solicitado desaparece de la programación (H-02, obs. 2).
- [ ] **INC-02, meta física:** ¿el modal debe mostrar y limitar también el saldo **físico**
  (meta − unidades ya solicitadas, con el precio de la N.O.)? Hoy muestra la meta física
  completa (H-02, obs. 1).
- [ ] **INC-02, habilitar el botón:** ¿la reprogramación queda abierta a todo usuario con
  acceso a Programación vigente, o requiere un permiso o una acción explícita ("habilitar
  reprogramación")? Hoy el botón está siempre activo salvo bloqueo por saldo.
- [ ] **INC-06:** ¿el memorándum de validación **reemplaza** "N° Solicitud" o **se añade**?
  ¿Es texto libre (número de memorándum) o lleva fecha y archivo adjunto como la N.O.?
- [x] **Entorno de las capturas:** QA (VPS OVH). Diagnóstico ejecutado el 2026-10-01.
- [x] **INC-07 / INC-08:** INC-08 confirmado; INC-07 explicado por capturas de momentos
  distintos. Confirmar con quien tomó las capturas que la lista de Desembolsos ya muestra
  las solicitudes 01 y 02.
- [ ] **Ítems 172572 / 172570 y el 4.º ítem con saldo 0:** cruzar la meta (`MontoAprobado`)
  en `BD_SEL_DEV` de QA para saber cuáles muestran un falso "Ejecutado 100%".
- [x] **H-10, precio unitario:** se usa el de la N.O. (owner, 2026-10-01).
- [x] **H-10 en SIGEC-RTF:** SIGEC solo corre en local; en QA y producción no hay avances
  guardados a partir de la precarga inflada. Solo hay que limpiar los datos de prueba
  locales si se quieren conservar.
- [ ] **Orden de despliegue:** en local hay cambios de KOFIX y de `sel-api-general` que
  todavía no están en QA. Los SPs que corrige este ADR deben partir de la versión local
  vigente, y desplegarse junto con esos cambios o después de ellos. El diagnóstico de QA
  refleja la versión desplegada, no la local. Repetir
  `diag_0051.sql` y `diag_avance_fisico.sql` tras desplegar.
- [x] **Desembolsos contra el Oficio 02 (S/ 72,000):** se recalcula después (owner,
  2026-10-01). Con D1 implementado el saldo se calcula al vuelo (aprobado − pagado), así que
  el re-sembrado del ledger ya no afecta al Kardex ni al bloqueo: no hay nada que recalcular
  en saldos una vez desplegada la Fase 1.
- [x] **D1:** `Imp_saldoActual` solo lo leían `KardexService` y `ProgramacionService`, y ya
  no se usa. El saldo corrido de `KDX_FIN_TMM_MOVIMIENTO` se conserva en la tabla (lo leen
  `imp_saldoMes` de `KARDEXRESUMENMES` y el detalle por ítem); queda como deuda corregir su
  siembra o retirarlo.
- [x] **D2:** "Ejecutado" = **solo lo pagado**; cheques de gerencia **desde GIRADO** (owner,
  2026-10-01).
- [x] **INC-04:** es una rebaja del saldo no usado que lo libera para una nueva N.O. (owner,
  2026-10-01). Ver D4.
- [x] **INC-04, solicitudes pendientes:** solo se rebaja lo no solicitado; lo solicitado ya
  está en trámite (owner, 2026-10-01).
- [x] **INC-04, unidades:** solo unidades enteras (owner, 2026-10-01).
- [x] **INC-04, sustento y permiso:** la **carta de la organización** (N°, fecha y adjunto;
  corregido por el owner, antes "informe"); la registra el mismo especialista (owner,
  2026-10-01).
- [x] **INC-04, anulación:** no, por ahora (owner, 2026-10-01).
- [ ] **INC-04, precio unitario no entero:** si `imp_montoAdjudicado ÷ can_cantidad` tiene
  decimales (p. ej. 1,000 ÷ 3), el monto rebajado se redondea a 2 decimales y, si la
  rebaja es total, se ajusta para que el adjudicado vigente quede exactamente en lo
  solicitado. Validar con datos reales antes de implementar.
- [x] **INC-05:** en QA no hay `PAGO_DESTINO` en uso y los 4 `CHEQUE` tienen el ciclo de
  cheque de gerencia (ADR-020): no hay datos que migrar. Repetir el conteo en producción
  antes de desplegar ahí (`diag_0051.sql`, consulta 8).
- [ ] **Edición de desembolsos:** hoy el botón "Editar" existe, pero la API rechaza toda
  solicitud con pago, es decir, todas. ¿Se habilita la edición (con qué reglas) o se retira
  el botón?
- [ ] **D7, deuda:** ¿se refactorizan los SPs de resumen del Kardex (Fase 1) para que la API
  decida qué es "pagado" y cómo se convierte el monto a unidades? Implica traer filas por
  detalle de solicitud y agregar en C#.
- [ ] **Fase 4, concurrencia:** el bloqueo del detalle serializa rebajas concurrentes, pero no
  un desembolso registrado al mismo tiempo que una rebaja del mismo ítem. Para cerrarlo,
  `DesembolsoService` debería releer el saldo con el mismo bloqueo antes de registrar.
- [ ] **Fase 4, permiso en la UI:** el botón "Rebajar / Anular saldo" se muestra a quien ve la
  lista (como Editar/Eliminar). La API exige `OPERACIONES_FINANCIERAS`. ¿Se oculta también
  en la UI según el permiso?
- [ ] Validar las severidades con la Unidad de Negocios.

## Referencias
- `KOFIX_APP/mc-api-ejecucion/Database/20260822_estandarizar_nomenclatura_sp.sql` — SPs de
  movimiento, resumen, listado de N.O. y desembolsos.
- `KOFIX_APP/mc-api-ejecucion/Database/20260825_desembolso_editar_anular.sql` — anulación sin extorno.
- `KOFIX_APP/mc-api-ejecucion/Docs/ADR-020-Ciclo-Cheque-Gerencia-Devengado-Girado.md`.
- [ADR 0008](0008-remediacion-ui-kofix-ejecucion.md), [ADR 0009](0009-refinamiento-ux-modales-financieros-kofix.md) — antecedentes de UI en kofix-ejecucion.
