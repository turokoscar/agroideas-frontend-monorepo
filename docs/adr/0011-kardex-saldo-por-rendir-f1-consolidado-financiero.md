# ADR 0011: F1 Consolidado Financiero como kardex de rendición (solo monto AGROIDEAS)

## Estado
Aceptado · **Completado** (ver [Registro de implementación](#registro-de-implementación))

## Fecha
2026-09-17

## Responsables
Equipo Frontend AGROIDEAS · Owner del módulo: Oscar Pazos

## Aplica a
`apps/sigec-rtf`: `OaRegistroComponent` (`features/oa-registro/`), tab F1 (Consolidado
Financiero), rama `@else if (rtfService.relacionGastosF1())` (ADR-017). No modifica
`sigec-api-rtf` ni ningún contrato de backend — todo el cálculo nuevo es client-side sobre
datos que ya trae `RelacionGastosF1Dto`.

## Contexto

Se pidió un análisis UX de F1 y una alternativa de solución tipo "estado de cuenta / libro
bancos / kardex": una fila por actividad con su meta financiera programada, y debajo el
detalle de comprobantes (proveedor, RUC, tipo y número de documento, fecha de emisión,
monto) con una columna de saldo por rendir. Se aportó un prototipo HTML de referencia.

Antes de diseñar se auditó qué trae hoy el backend (`RelacionGastosF1Dto` /
`RelacionGastosF1ItemDto` / `GastoF1Dto`, ADR-017) y se encontró que **el modelo de datos ya
tiene todo lo pedido** — proveedor, RUC, tipo/serie de comprobante, fecha, monto, y un
desglose `montoAprobadoOa`/`montoAprobadoAgroideas`/`montoAprobadoTotal` por ítem. El
problema es puramente de presentación en `oa-registro.component.html:652-762`:

1. **La lista de comprobantes no es una tabla real.** Cada fila (línea 687-707) es una serie
   de `<span>` con anchos fijos en `flex-wrap` (`w-20`, `min-w-[8rem]`) que envuelven en vez
   de alinear columnas — el ojo no puede escanear una columna hacia abajo, que es justo lo
   que hace legible un kardex.
2. **Sin saldo corrido.** Hoy solo existe un total por ítem (`montoDiferencial`), no un saldo
   que baje comprobante a comprobante — la pieza que distingue un kardex/libro bancos de una
   lista plana con un total al final.
3. **Terminología contable poco clara para una OA no contadora**: "Diferencial" no dice
   "cuánto me falta rendir"; además su signo se explica solo en un `title` (tooltip) difícil
   de descubrir (línea 669).
4. **Bug de estilo preexistente**: `[class.text-error]` (líneas 675, 753) usa una clase que
   **no existe** en `libs/theme/src/tailwind-preset.js` (el token es `destructive`, no
   `error`) — el color condicional de "Diferencial" negativo nunca se pintó en producción.

Durante el análisis se preguntó explícitamente contra qué monto aprobado debía calcularse el
"saldo por rendir": el propietario del producto confirmó una regla de negocio no derivable
del código — **en este sistema solo se rinde el dinero que AGROIDEAS entrega a la
organización agraria; la contrapartida de la propia OA (`montoAprobadoOa`) es solo
informativa y no participa de ningún cálculo de rendición** (fondos públicos vs. aporte
propio de la organización). Ver memoria de proyecto
`project_rendicion_solo_monto_agroideas`.

## Decisiones

### D1 — "Saldo por Rendir" se calcula solo contra `montoAprobadoAgroideas`
Nunca contra `montoAprobadoTotal` ni `montoAprobadoOa`. Nuevo helper puro
`saldoPorRendir(aprobado, facturado) = aprobado - facturado`, reutilizado a nivel de ítem
(`item.montoAprobadoAgroideas`) y de total (`relacion.totalAprobadoAgroideas`).
`hayExcedenteGastosF1` (usada para la nota "*** Los montos excedentes... serán asumidos por
la OA") migra de `item.montoDiferencial < 0` a `saldoPorRendir(item.montoAprobadoAgroideas,
item.montoFacturado) < 0` — sigue siendo cierto que un excedente sobre lo aprobado por
AGROIDEAS lo asume la OA, ahora medido contra la cifra correcta.

### D2 — Saldo corrido (running balance) por comprobante, no un total repetido
Un valor de "saldo por rendir" idéntico repetido en cada fila del detalle no aporta
información nueva sobre el total del encabezado — no sería un kardex, solo el mismo dato
duplicado. Se calcula un saldo que **baja después de cada comprobante**
(`comprobantesConSaldo(item)`), ordenando los comprobantes por `fecEmision` ascendente
(con `ideGastoF1` como desempate) y acumulando desde `item.montoAprobadoAgroideas`. Esto
requiere una función en el componente, no en el template (Angular templates no deben llevar
lógica de acumulación) — mismo criterio que los helpers de estado de avance del ADR 0010.

### D3 — El detalle se renderiza con `<table>` real, no `<span>` en `flex-wrap`
Corrige el Hallazgo 1: columnas fijas (`Fecha Emisión`, `Comprobante`, `Proveedor`, `Monto`,
`Saldo por Rendir`, `Sustento`) con `<thead>`/`<tbody>` reales. Se envuelve en
`overflow-x-auto` en vez de construir una vista de tarjetas móvil separada (a diferencia de
T1/R2 en el ADR 0010): un libro contable denso se lee mejor con scroll horizontal que
reorganizado en tarjetas, y el volumen de comprobantes por ítem es pequeño en la práctica.
Si el uso real muestra lo contrario, se puede revisar en una iteración posterior.

### D4 — Se corrige el bug de `text-error` de paso
Se reemplaza por `text-danger` (token real de `@agroideas/theme`) en los dos puntos donde
aparecía. No es el objetivo de este ADR pero es trivial de arrastrar junto con el resto del
cambio de color del saldo.

### D5 — La contrapartida OA se mantiene visible, pero como dato secundario informativo
No desaparece de la pantalla (transparencia hacia la OA sobre su propio aporte), pero deja de
competir visualmente con las cifras de rendición: pasa de columna propia en el grid principal
a una línea de texto secundaria bajo la barra de progreso de cada ítem y en el total,
rotulada explícitamente "informativa, no se rinde".

## Plan de implementación

### Fase 1 — Helpers en `OaRegistroComponent`
`saldoPorRendir(aprobado, facturado)` y `comprobantesConSaldo(item: RelacionGastosF1ItemDto)`
(ordena y acumula desde `montoAprobadoAgroideas`). `hayExcedenteGastosF1` migrado a D1.
`RelacionGastosF1ItemDto` agregado al re-export de `rtf.service.ts` (ya existía en
`core/models`, solo faltaba el barril del servicio) para poder tipar el helper.
**Criterio de aceptación:** `comprobantesConSaldo` no muta `item.comprobantes` (copia antes
de ordenar) y el saldo del último comprobante coincide con `saldoPorRendir` del ítem.

### Fase 2 — Encabezado de ítem rediseñado
Grid con Actividad / Meta Programada AGROIDEAS / Monto Facturado / Saldo por Rendir (color
`success`/`danger` según signo, ya no `text-error`), más una barra de progreso delgada
(facturado vs. AGROIDEAS aprobado) y la nota secundaria de contrapartida OA.
**Criterio de aceptación:** ningún monto de contrapartida OA aparece como columna del mismo
peso visual que Meta Programada/Facturado/Saldo.

### Fase 3 — Detalle tipo kardex
`<table>` real por ítem con las 6 columnas de D3, filas generadas por
`comprobantesConSaldo(item)`, saldo corrido coloreado por signo.
**Criterio de aceptación:** las fechas quedan en orden ascendente y el saldo de cada fila es
estrictamente el de la fila anterior menos el monto de esa fila.

### Fase 4 — Total y nota de excedente
Fila de "Total" migrada a Meta Programada AGROIDEAS / Facturado / Saldo por Rendir (D1);
`hayExcedenteGastosF1()` recalculado (D1).
**Criterio de aceptación:** el saldo del total coincide con la suma de los saldos finales de
cada ítem.

### Fase 5 — Verificación
`nx lint sigec-rtf` (0 errores nuevos) y verificación visual en navegador contra datos reales
del RTF en `localhost:4300`.

### Fase 6 — Verificación de backend (post-implementación) y deduplicación
Tras implementar, se detectó que la fila "Total" del kardex duplicaba exactamente
"Programado"/"Ejecutado" del resumen superior "Progreso del Presupuesto" — mismo dato, mismo
origen. Antes de deduplicar se verificó contra los 3 backends (`sigec-api-rtf`,
`mc-api-ejecucion`, `sel-api-general`) que ambos números en efecto comparten base de cálculo
(ver Consecuencias, antes "riesgo", ahora resuelto):

- `sel-api-general/Database/migracion_17092026b_meta_financiera_oa_por_paso_critico.sql:6-14`
  confirma por escrito (comentario de migración, mismo día) que `metaFinancieraProgramada`
  es solo la porción AGROIDEAS — el mismo campo que consumen tanto
  `EjecucionFinancieraServicio.ObtenerAvanceFinancieroPasoCriticoAsync` (resumen, "Programado")
  como `RelacionGastosF1Calculadora.Calcular` (kardex, "Meta Programada AGROIDEAS"): literal
  mismo valor sumado dos veces en dos lugares.
- En `mc-api-ejecucion`, los stored procedures `FIN.KDX_FIN_SP_R_KARDEXEJECUCIONPERIODO`
  (resumen, consulta en vivo) y `FIN.KDX_FIN_SP_R_GASTOSF1POSTULANTE` (snapshot local del
  kardex) leen `imp_totalComprobante` de la misma vista `FIN.vw_Kardex_CicloOperativo`, mismo
  filtro `ide_rendicion IS NOT NULL`, misma fecha de referencia `fec_emisionComprobante` — uno
  filtra el período en SQL, el otro en C# (`RtfCabeceraServicio.cs:338`) contra las fechas del
  propio RTF (que se graban desde las fechas del paso crítico al crear el RTF). Misma base.
- **Matiz real, no bug:** el resumen superior consulta KOFIX en vivo; el kardex usa el
  snapshot local que solo se actualiza al presionar "Sincronizar" — pueden verse distintos
  momentáneamente si no se ha sincronizado recientemente. Por eso se refuerza la visibilidad
  del botón de sincronización (ver más abajo) en vez de ocultar el matiz.

Cambios:
1. Se agrega "Saldo por Rendir (Paso Crítico)" como quinta métrica de "Progreso del
   Presupuesto" (`saldoPorRendir(programado, ejecutado)`, mismo helper de la Fase 1).
2. Se retira la fila "Total" del kardex — se conserva solo la nota de contrapartida OA total
   (informativa) y la nota de excedente, sin repetir Programado/Ejecutado/Saldo.
3. El botón "Sincronizar" pasa de link de texto (`text-[11px]`, sin fondo) a un botón real
   (`bg-primary`, con icono animado mientras sincroniza) dentro de una franja propia con la
   fecha de última sincronización — el usuario reportó que no se notaba lo suficiente pese a
   ser la acción que mantiene "Ejecutado"/"Monto Facturado" al día antes de enviar el RTF.
**Criterio de aceptación:** ningún número aparece dos veces en la pantalla; el botón de
sincronizar tiene fondo, no solo subrayado, y muestra un ícono girando mientras sincroniza.

## Consecuencias

### Positivas
- Cero cambios de backend: el rediseño completo corre sobre datos que ADR-017 ya expone.
- Corrige un bug de estilo real (`text-error` inexistente) que llevaba tiempo sin pintar
  nada.
- El saldo corrido responde la pregunta real de la OA ("¿cuánto me queda de AGROIDEAS en esta
  actividad después de esta compra?") en vez de solo un total al cierre.
- Alinea la terminología de la UI con la regla de negocio real de rendición (memoria de
  proyecto `project_rendicion_solo_monto_agroideas`), reduciendo el riesgo de que una OA
  interprete mal cuánto le queda por sustentar.

### Negativas / riesgos
- ~~El resumen superior "Progreso del Presupuesto"... no se auditó...~~ **Resuelto en Fase
  6**: se auditaron los 3 backends y se confirmó que "Programado"/"Ejecutado" del resumen y
  "Meta Programada AGROIDEAS"/"Monto Facturado" del kardex comparten exactamente la misma
  base de cálculo — por eso se deduplicaron en la Fase 6 en vez de dejarlos como números
  independientes que podrían desalinearse con el tiempo.
- El detalle con scroll horizontal (D3) es una concesión de alcance, no una solución
  probada con usuarios reales en celular — aceptable como primera iteración.
- El resumen ("Programado"/"Ejecutado") consulta KOFIX en vivo; el kardex usa el snapshot
  local sincronizable — pueden verse momentáneamente distintos si no se sincroniza. No es un
  bug (es el motivo de existir del botón "Sincronizar", ahora con más peso visual desde la
  Fase 6), pero es una asincronía real que el usuario debe entender.

### Neutras
- No afecta a `kofix-ejecucion` ni `sat-ui`.

## Alternativas consideradas y descartadas

1. **Saldo por rendir contra `montoAprobadoTotal` (AGROIDEAS + OA)** — descartado por regla
   de negocio explícita (D1): este sistema rinde fondos públicos de AGROIDEAS, no el aporte
   propio de la organización.
2. **Un solo saldo por ítem repetido en cada fila del detalle, sin acumulación** — descartado
   (D2): no aporta información nueva sobre el encabezado y no cumple la analogía de "libro
   bancos" que motivó el pedido.
3. **Vista de tarjetas móvil separada para el detalle, como en T1/R2 (ADR 0010)** —
   descartada por ahora (D3): la densidad y el volumen de columnas de un libro contable no se
   presta tan bien a tarjetas como los 3-4 campos de una meta/indicador; se prefiere scroll
   horizontal como primera iteración, con opción de reconsiderar si el uso real lo pide.
4. **Replicar el resto del prototipo** (sincronización/validez SUNAT, checklist de
   Detracciones/Padrón/Panel fotográfico, drawer de observaciones, dock de firma digital,
   previsualización de Anexo 17) — descartado explícitamente por el propio pedido: esos
   elementos no tienen respaldo de datos en `sigec-api-rtf` (no hay integración SUNAT ni
   tracking de detracciones en este sistema) o ya viven, con datos reales, en otras pestañas
   (`ANEXO17`, Pliego de Observaciones de `bandeja-oa`).

## Referencias

- `apps/sigec-rtf/src/app/core/models/relacion-gastos-f1.dto.ts` — modelo ya existente
  (ADR-017), sin cambios.
- Memoria de proyecto `project_rendicion_solo_monto_agroideas` — regla de negocio que
  fundamenta D1.
- [ADR 0010 — Semáforo de avance en T1/R2](./0010-semaforo-avance-metas-indicadores-oa-registro.md)
  — mismo criterio de centralizar cálculo en helpers del componente en vez del template.
- `sel-api-general/Database/migracion_17092026b_meta_financiera_oa_por_paso_critico.sql` —
  origen documentado de `MetaFinancieraProgramada` = solo AGROIDEAS (Fase 6).
- `mc-api-ejecucion/Database/20260910_fix_fecha_rendicion_ejecucion_periodo.sql` y
  `20260917_gastosf1_expone_ide_itemml.sql` — ambos stored procedures verificados en Fase 6,
  misma vista `FIN.vw_Kardex_CicloOperativo`.

## Registro de implementación

| Fase | Estado | PR | Fecha cierre | Notas |
|------|--------|----|-------------|-------|
| 1 — Helpers | ✅ Completada | _pendiente_ | 2026-09-17 | `saldoPorRendir`, `comprobantesConSaldo`; `RelacionGastosF1ItemDto` agregado al re-export de `rtf.service.ts`. |
| 2 — Encabezado de ítem | ✅ Completada | _pendiente_ | 2026-09-17 | Meta Programada AGROIDEAS / Facturado / Saldo por Rendir + barra de progreso + nota de contrapartida OA. |
| 3 — Detalle kardex | ✅ Completada | _pendiente_ | 2026-09-17 | `<table>` real con saldo corrido por comprobante. |
| 4 — Total y excedente | ✅ Completada | _pendiente_ | 2026-09-17 | `hayExcedenteGastosF1` recalculado contra `montoAprobadoAgroideas`. |
| 5 — Verificación | ✅ Completada | _pendiente_ | 2026-09-17 | `nx lint sigec-rtf` y verificación visual en `localhost:4300`. |
| 6 — Verificación backend y deduplicación | ✅ Completada | _pendiente_ | 2026-09-17 | Auditados `sigec-api-rtf`/`mc-api-ejecucion`/`sel-api-general`: misma base confirmada. "Saldo por Rendir" agregado al resumen; fila Total del kardex retirada; botón Sincronizar rediseñado con mayor peso visual. |
