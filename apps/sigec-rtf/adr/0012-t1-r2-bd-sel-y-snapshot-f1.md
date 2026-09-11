# ADR-012: T1/R2 exclusivamente contra BD_SEL y Gastos F1 como snapshot local sincronizable

## Estado
Aceptado

## Contexto
El registro de un RTF incluía dos rutas paralelas para las metas físicas (T1) e indicadores
(R2): una legacy, respaldada por las tablas propias de `sigec-rtf` (`SRT_TMD_METAFISICA` /
`SRT_TMD_INDICADOR`, expuestas como `MetaFisicaDto`/`IndicadorDto` vía
`OaRtfService.loadMetas`/`loadIndicadores` y `updateMetas`/`updateIndicadores`), y otra contra
BD_SEL (`PasoCriticoMeta`/`PasoCriticoIndicador`, ya introducida en ADR-002/ADR-003 y con el
avance ejecutado persistido localmente por RTF desde ADR-009). `OaRegistroComponent` decidía
en tiempo de ejecución cuál de las dos usar (`useBdSelMetas`), y `UrCompletoDto` (el payload de
`/rtfs/{id}/completo` que consume la UN en gabinete) devolvía metas/indicadores/gastos siempre
en la forma legacy.

Esto dejaba dos problemas:
1. Las tablas legacy ya estaban retiradas del backend en la práctica — la rama "sin BD_SEL" de
   `OaRegistroComponent` y los métodos `updateMetas`/`updateIndicadores` de `OaRtfService`
   apuntaban a endpoints que ya no tenían nada que servir de forma confiable.
2. `RtfCabeceraDto` solo exponía `numPasoCritico` (el ordinal 1-6 del paso, no un id), así que
   ni `BandejaOAComponent` (al reabrir un RTF existente) ni `UnGabineteService` (al cargar el
   RTF completo del lado UN) podían resolver el `idePasoCritico` real para pedir T1/R2 a BD_SEL
   — quedaban forzados a la rama legacy.

Aparte, los Gastos F1 se resolvían leyendo en vivo desde KOFIX en cada carga de
`/rtfs/{id}/completo`, acoplando la disponibilidad del RTF a la disponibilidad de KOFIX en ese
instante y sin dejar rastro de cuándo se había mirado por última vez.

## Decisión
1. **T1/R2 siempre contra BD_SEL.** Se agrega `RtfCabeceraDto.idePasoCritico` (id real en
   BD_SEL, resuelto perezosamente por el backend si una fila antigua no lo tenía) manteniendo
   `numPasoCritico` solo como columna puente (el ordinal, no usar para lógica de negocio). Con
   `idePasoCritico` disponible, tanto `OaRegistroComponent` (al reabrir sin `idpc` en la ruta)
   como `UnGabineteService.loadRtfCompleto` cargan T1/R2 con
   `PasoCriticoService.loadMetasPorPasoCritico`/`loadIndicadoresPorPasoCritico` — la misma
   fuente que ya usaba el flujo con `idpc` en la ruta. `UrCompletoDto` deja de traer
   `metas`/`indicadores`/`gastos`: cada uno se carga por su endpoint dedicado.
2. **Se retira la rama legacy.** `OaRtfService.loadMetas`/`loadIndicadores`/`updateMetas`/
   `updateIndicadores` (tablas `SRT_TMD_METAFISICA`/`INDICADOR`) se eliminan. El guardado de
   avance de T1/R2 queda exclusivamente en el guardado fila a fila que ya existía para BD_SEL
   (`PasoCriticoService.actualizarEjecucionMeta`/`actualizarEjecucionIndicador`, ADR-009);
   "Guardar Borrador"/"Enviar RTF" ya no necesitan un paso adicional de bulk-update de
   metas/indicadores.
3. **Gastos F1 como snapshot local sincronizable.** `GET /rtfs/{id}/gastos-f1` deja de ser la
   única forma de verlos — se añade `fecRegistro` al DTO (fecha del snapshot) y un endpoint
   explícito `POST /rtfs/{id}/gastos-f1/sincronizacion` que refresca el snapshot desde KOFIX. La
   UI (OA y UN) muestra "Última sincronización: …" y un botón "Sincronizar" en vez de depender de
   una llamada en vivo cada vez que se abre el RTF.

## Consecuencias
### Positivas
- Una sola fuente de verdad para T1/R2 (BD_SEL) en todo el flujo, sin ramas condicionales según
  cómo se llegó a la pantalla.
- `UrCompletoDto` más liviano y con responsabilidad única (cabecera + evidencias); T1/R2/F1 se
  cargan (y pueden fallar/recargar) de forma independiente.
- Los Gastos F1 dejan de bloquear la carga del RTF si KOFIX está lento o no disponible en ese
  momento — se ve el último snapshot conocido y se sincroniza bajo demanda.

### Negativas / Riesgos
- Un RTF cuya fila aún no tiene `idePasoCritico` resuelto (caso raro, filas muy antiguas) no
  carga T1/R2 hasta que el backend lo resuelva; no hay ya ninguna ruta legacy de respaldo.
- El snapshot de Gastos F1 puede quedar desactualizado si el usuario no pulsa "Sincronizar" —
  es una decisión consciente (evitar depender de una llamada en vivo a KOFIX en cada carga), pero
  desplaza la responsabilidad de mantenerlo al día hacia el usuario.

## Notas Adicionales
Esta decisión se encuentra reflejada en:
- `apps/sigec-rtf/src/app/core/models/rtf-cabecera.dto.ts`, `ur-completo.dto.ts`,
  `gasto-f1.dto.ts`.
- `apps/sigec-rtf/src/app/core/services/oa-rtf.service.ts`,
  `un-gabinete.service.ts` (delega en `PasoCriticoService` para T1/R2, ver también la nota de
  duplicación evitada en el propio código), `paso-critico.service.ts`.
- `apps/sigec-rtf/src/app/features/oa-registro/oa-registro.component.ts`,
  `un-gabinete/un-gabinete.component.ts`, `bandeja-oa/bandeja-oa.component.ts`.
