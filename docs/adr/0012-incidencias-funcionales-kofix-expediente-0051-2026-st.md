# ADR 0012: Incidencias funcionales de KOFIX (expediente 0051-2026-ST) — análisis situacional

## Estado
Aceptado · **Fase 1 implementada en local** (sin commit ni despliegue a QA) · Fases 2-5 pendientes · INC-01 queda como propuesta. **En pausa desde el 2026-10-01**, a la espera de revisar y commitear la Fase 1, desplegarla y que el área usuaria responda los puntos abiertos. Ver el [Registro de implementación](#registro-de-implementación) y los [Puntos abiertos](#puntos-abiertos).

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
| INC-02 | Programación | Defecto | Con programación vigente, la información no aparece. | Media | Hipótesis ligada a INC-08 (ver H-02). |
| INC-03 | No Objeciones | Cambio funcional | Falta **Carta** en tipo de documento. | Baja | Confirmado: catálogo `TIPO_DOCUMENTO` solo tiene 4 valores. |
| INC-04 | No Objeciones | Funcionalidad faltante | No se puede desistir sin borrar. | Alta | Confirmado: no hay estado persistido de N.O. |
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
   error visual y probablemente se relaciona con INC-02 (H-02).
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

### H-02 — Programación vigente "no muestra información" (INC-02) ❓ hipótesis

Sin captura. Por H-08.2, cualquier meta con una N.O. desembolsada al 100% sale
`Bloqueado = true` en programación, aunque tenga saldo de meta. Si "no aparece la
información" significa que no se puede reprogramar o que los ítems aparecen bloqueados o
vacíos, el arreglo de H-08 lo resuelve. Hay que confirmarlo con el área usuaria antes de
tocar el módulo.

### H-03 / H-05 — Catálogos (INC-03, INC-05) ✅ confirmado

Ambos son datos de `FIN.KDX_FIN_TG_CATALOGO` (seed en `kardex_setup_full.sql:550-579`), sin
listas hardcodeadas en el frontend: `desembolso.page.ts` y el modal cargan
`getByGrupo('TIPO_PAGO')`.
- `TIPO_DOCUMENTO`: OFICIO(1), INFORME_TECNICO(2), RESOLUCION(3), MEMORANDO(4) → falta CARTA.
- `TIPO_PAGO`: TRANSFERENCIA(12), CHEQUE(13), PAGO_DESTINO(14). `CHEQUE` ya tiene un ciclo
  propio DEVENGADO → GIRADO (ADR-020 del backend, `desembolso.model.ts:44`), así que
  "Cheques de gerencia" es un **cambio de descripción**, no un tipo nuevo.

### H-04 — No Objeción sin estado propio (INC-04) ✅ confirmado

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

### D4 — No Objeciones (INC-03, INC-04)
- **INC-03:** se agrega `TIPO_DOCUMENTO` = `CARTA` (seed + migración).
- **INC-04:** nueva acción **Desistir**:
  - Estado persistido en `KDX_FIN_TMC_NO_OBJECION` (columna nueva o FK a un grupo de
    catálogo `ESTADO_NO_OBJECION`). El estado derivado (Registrado / En Uso / Utilizado)
    se mantiene para las N.O. no desistidas; "Desistida" tiene prioridad sobre él.
  - El alta de desembolso **rechaza en backend** cualquier ítem de una N.O. desistida, sea
    cual sea su avance (no basta con ocultarla en el frontend).
  - Lo ya desembolsado se conserva; el saldo no desembolsado deja de contar como
    comprometido (D2).
  - Adjunto opcional: carta de desistimiento del jefe de UN (reusa el flujo de archivos de
    la N.O.). Motivo obligatorio.
  - Botón en `no-objecion.page.html`, filtro y pill de estado "Desistida" en la lista y en
    los reportes.

### D5 — Programación y adendas (INC-01, INC-02)
INC-02 se reevalúa **después** de D1: si el síntoma era el bloqueo por saldo falso, queda
resuelto sin tocar el módulo.

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
- El estado Desistida entra en filtros, reportes y en la validación del alta de desembolso.
- Cambia la terminología Solicitud → Memorándum de validación en pantallas, reportes y
  manuales.
- Casi todo el trabajo es de `mc-api-ejecucion` (SPs + servicios). El frontend cambia en
  `kardex-varianza-tab`, `no-objecion.page`, `desembolso.page`/modales y `rendicion.page`.

## Plan por fases

| Fase | Alcance | Repos | Depende de |
| --- | --- | --- | --- |
| 0 | Diagnóstico de datos de 0051-2026-ST (consultas abajo) | BD KARDEX | — |
| 1 ✅ local | INC-08 + H-09 + H-10 + D2/D2b: saldo de meta, ejecutado = pagado, comprometido = adjudicado, sin fan-out por rendiciones, avance físico = monto ÷ precio unitario (también en `KARDEXEJECUCIONPERIODO`, que consume SIGEC-RTF); bloqueo de programación con la misma fórmula; tests en `KardexServiceTests` y spec de `kardex-varianza-tab` | API + UI | Fase 0, confirmar consumidores de `imp_saldoNuevo` |
| 2 | INC-07: extorno al anular desembolso; error visible en la lista | API + UI | Fase 0 |
| 3 | INC-03 + INC-05: catálogos (CARTA; renombrar e inactivar tipos de pago) + migración de tipos de pago | API (SQL) | Regla de migración |
| 4 | INC-04: estado Desistida, endpoint, validación en el alta de desembolso, UI | API + UI | Fase 1 (comprometido) |
| 5 | INC-06: terminología Memorándum de validación | UI (+ API si es campo nuevo) | Respuesta del punto abierto |
| — | INC-01 (solo propuesta, ver D5), INC-02 | SEL + KOFIX | Validar el uso de `convenio_incentivo_ampliacion` en QA/prod y qué modifica una adenda; INC-02 se reevalúa tras desplegar la Fase 1 |

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
- `ProgramacionService.SaveCronogramaAsync` / `GetEstadoBloqueoAsync`: saldo disponible y
  bloqueo con `MontoAprobado − Imp_efectivizado`.
- `ExecutionSummaryInternal`: se elimina `Imp_saldoActual`.
- Tests: `KardexServiceTests` (+ caso 0051-2026-ST: saldo 72,000 = varianza) y
  `ProgramacionServiceSaldoTests` (nuevo, 5 casos: no bloquea con N.O. parcial, bloquea al
  pagar el 100%, sin ejecución, rechaza o permite reprogramar según el saldo de la meta).
  **`dotnet test`: 110/110 ✅.**

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
- [ ] **INC-02:** qué pantalla y qué datos deberían verse con una programación vigente.
  ¿El síntoma es que la meta aparece **bloqueada**? (si sí, se resuelve con D1).
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
- [ ] **INC-04:** si una N.O. se desiste con solicitudes **pendientes** (no pagadas), ¿se
  anulan, se permite terminar de pagarlas o se impide desistir?
- [ ] **INC-05:** en QA no hay `PAGO_DESTINO` en uso. Falta confirmar que todo `CHEQUE`
  histórico es de gerencia, y repetir el conteo en producción.
- [ ] Validar las severidades con la Unidad de Negocios.

## Referencias
- `KOFIX_APP/mc-api-ejecucion/Database/20260822_estandarizar_nomenclatura_sp.sql` — SPs de
  movimiento, resumen, listado de N.O. y desembolsos.
- `KOFIX_APP/mc-api-ejecucion/Database/20260825_desembolso_editar_anular.sql` — anulación sin extorno.
- `KOFIX_APP/mc-api-ejecucion/Docs/ADR-020-Ciclo-Cheque-Gerencia-Devengado-Girado.md`.
- [ADR 0008](0008-remediacion-ui-kofix-ejecucion.md), [ADR 0009](0009-refinamiento-ux-modales-financieros-kofix.md) — antecedentes de UI en kofix-ejecucion.
