# ADR-017: Separación de la Bandeja de Evaluación de Gabinete (UN) en pestañas Evaluación / Plazos y Cobranza

> **Nota de numeración**: este repo (`apps/sigec-rtf`) ya usa "ADR-016" en varios comentarios de
> código para referirse al ADR-016 del *backend* (`sigec-api-rtf`, Pliego de Observaciones — ver
> `un-gabinete.component.ts`/`.spec.ts`). Para no crear dos significados distintos de "ADR-016"
> dentro del mismo repo, este documento (frontend-local, primero de esta secuencia desde el
> ADR-015) se numera 0017, no 0016.

## Estado
Aceptado e implementado — 4 fases completas, verificadas en vivo (22/09/2026).

**Cierre**: `npx nx lint/test/build sigec-rtf` en verde (156/156 tests, 12 nuevos; 0 errores de
lint, 100 warnings preexistentes). Verificado en vivo en `/rtf/evaluacion-gabinete` con datos
reales: conteos de pestaña correctos (`Evaluación 0` / `Plazos y Cobranza 2`, badge rojo con
ítems pendientes), columna "Plazo" con urgencia calculada en la pestaña de plazos
("Vencido hace 158d"/"523d"), dropdown "Estado" listando solo los estados de la pestaña activa, y
`filtroEstado` reseteándose correctamente al cambiar de pestaña.

## Contexto

A pedido del usuario se hizo una revisión UX de `UnGabineteComponent` (`/rtf/evaluacion-gabinete`)
desde la perspectiva de un evaluador especialista UN que usa la pantalla varias veces al día. El
hallazgo principal (de una lista de fricciones más amplia, documentada solo en la conversación, no
en un ADR aparte): **la bandeja mezcla en una sola lista plana dos tareas mentales distintas**.

- **Evaluación técnica** (`EN_REVISION`, `AUDITADO_CAMPO`, `IN_REVISION_UN`): revisar un informe
  técnico-financiero recién llegado.
- **Plazos y cobranza** (`VENCIDO`, `PLAZO_INICIAL_NOTIFICACION`, `EN_DESACATO`,
  `PLAZO_LIMITE_NOTARIAL`, `BLOQUEO_DEFINITIVO`, ver ADR-018 de `sigec-api-rtf`): seguimiento
  administrativo/legal de un convenio que incumplió un plazo — cartas, escalamiento, eventual
  Resolución de Convenio.

Hoy ambas conviven en la misma tabla (`UnGabineteComponent.bandejaFiltrada`, alimentada por
`estadosBandeja`, un arreglo plano de 8 estados) sin ninguna separación visual. Con pocos
registros no se nota; a medida que crece el volumen, el especialista tiene que leer la columna
"Estado" fila por fila para saber qué tipo de acción le corresponde.

### El patrón ya existe del lado OA — no hay que inventar nada nuevo

`BandejaOAComponent` (`/rtf/bandeja`) ya separa su propia bandeja en pestañas por estado
(`tabs: BandejaTab[]`, señal `activeTabKey`, botones simples con estilos condicionales
`bg-primary`/`bg-surface-container`) — ver `bandeja-oa.component.ts`/`.html`. No existe un
componente `UiTabs` compartido en `@agroideas/ui`; cada bandeja lo resuelve con su propio arreglo
de tabs + señal, mismo criterio que este ADR sigue para `UnGabineteComponent`.

### Por qué no hace falta tocar el backend

`UnGabineteService.loadBandejaUn()` ya trae **todos** los estados de la bandeja en una sola
llamada combinada (`GET /rtfs?estados=A,B,C,...&cantidad=1000`, optimización de ADR-013 de este
mismo repo — antes eran 6 llamadas separadas). `unRtfList()` ya tiene en memoria del navegador
absolutamente todo lo que necesitan ambas pestañas; separar es un problema 100% de presentación en
el cliente, no de datos. Pedir por separado a cada pestaña sería un paso atrás respecto a esa
optimización (volver a partir una llamada combinada en varias).

### Sobre el prototipo de referencia que se compartió

El usuario compartió un prototipo HTML propio como inspiración. Se revisó y **no se adopta tal
cual**, por dos razones:

1. **Resuelve un problema distinto.** Sus pestañas organizan el *contenido de un RTF individual*
   (Metas T1 / Financiera F1 / Cualitativa R1 / Checklist), no la *lista* de RTFs pendientes. Es
   una idea válida para la fricción de scroll largo en la pantalla de detalle (candidata a un ADR
   propio más adelante, fuera de alcance acá), no para lo que se pidió esta vez.
2. **Trae su propio sistema visual** (paleta de colores vía Tailwind config, tipografía Plus
   Jakarta Sans) que no es la de este proyecto — acá todo pasa por `@agroideas/theme` (verde INIA,
   Roboto) y componentes de `@agroideas/ui`; las apps no definen su propio sistema de color (ver
   root `CLAUDE.md`). Si más adelante se retoma la idea de pestañas en el detalle, se reexpresa con
   los tokens/componentes existentes, no copiando el HTML/Tailwind del prototipo.

Lo único que se rescata de esa referencia para este cambio puntual es el patrón de **badge de
conteo sobre cada pestaña** (ya usado en este mismo proyecto para el ícono de notificaciones del
header) — se suma a las pestañas para que el especialista vea de un vistazo cuánto hay pendiente
en cada bandeja sin necesidad de entrar.

## Decisión

Separar `UnGabineteComponent` en dos pestañas, **enteramente en el cliente**, sin cambios en
`sigec-api-rtf` ni en `UnGabineteService`.

| Pestaña | Estados | Orden por defecto |
|---|---|---|
| **Evaluación** (por defecto al entrar) | `EN_REVISION`, `AUDITADO_CAMPO`, `IN_REVISION_UN` | `fecRegistro` descendente (como hoy) |
| **Plazos y Cobranza** | `VENCIDO`, `PLAZO_INICIAL_NOTIFICACION`, `EN_DESACATO`, `PLAZO_LIMITE_NOTARIAL`, `BLOQUEO_DEFINITIVO` | Por severidad de escalamiento (más crítico primero), no por fecha |

Cambios adicionales, acotados y justificados directamente por los hallazgos de la revisión UX (no
alcance nuevo inventado):

- Badge de conteo en cada pestaña (rojo/alerta en "Plazos y Cobranza" cuando `> 0`).
- El filtro "Estado" del `app-ui-filter-bar` pasa a listar solo los estados de la pestaña activa
  (hoy mezcla los 8 en un solo dropdown).
- La pestaña "Plazos y Cobranza" gana una columna de urgencia ("Vence en Nd" / "Vencido hace Nd"),
  mismo cálculo/formato que ya usa `BandejaOAComponent.diasRestantes` — hoy esa bandeja solo
  muestra la fecha límite en texto plano, sin traducirla a "hace cuánto".

### Fases de implementación

**Fase 1 — Capa de datos (`un-gabinete.component.ts`)**
- `activeTab = signal<'evaluacion' | 'plazos'>('evaluacion')`.
- Dos constantes `ESTADOS_EVALUACION` / `ESTADOS_PLAZOS` (reemplazan el `estadosBandeja` plano
  actual, que se mantiene como la unión de ambas para no romper nada que lo use).
- `bandejaPorPestana = computed(...)`: filtra `unRtfList()` por el set de estados de la pestaña
  activa — se intercala *antes* de la lógica de texto/estado/fecha que ya existe en
  `bandejaFiltrada`, reutilizándola (no se duplica el filtrado de texto/fecha).
- `conteoEvaluacion`/`conteoPlazos`: `computed(() => unRtfList().filter(...).length)`, para los
  badges.
- Reordenar `bandejaFiltrada()` resultante por severidad cuando `activeTab() === 'plazos'`
  (mapa `SEVERIDAD_ESTADO: Record<string, number>`).
- `diasRestantes(fecLimite, estRtf)`: portar tal cual desde `BandejaOAComponent` (mismo criterio,
  mismo formato de texto) para la nueva columna de la pestaña de plazos.

**Fase 2 — UI (`un-gabinete.component.html`)**
- Nav de pestañas, mismo patrón exacto (clases, estructura) que `bandeja-oa.component.html` —
  botones + badge de conteo, sin componente nuevo.
- El `<select>` de "Estado" itera `ESTADOS_EVALUACION`/`ESTADOS_PLAZOS` según `activeTab()` en vez
  del `estadosBandeja` plano.
- Columna condicional de "Vence en/Vencido hace" en la pestaña de plazos (reutiliza
  `bandejaColumns`, agrega una columna extra solo quando `activeTab() === 'plazos'` o la muestra
  siempre con valor vacío en la otra pestaña — a decidir en la implementación según qué quede más
  limpio con `app-ui-data-table`).
- Cambiar de pestaña resetea `filtroEstado` (para no dejar seleccionado un estado que no existe en
  la pestaña nueva) — no resetea texto/fechas, esos filtros siguen siendo válidos en ambas.

**Fase 3 — Tests**
- `un-gabinete.component.spec.ts`: casos nuevos para `bandejaPorPestana`/`bandejaFiltrada` por
  pestaña, conteos, reset de `filtroEstado` al cambiar de pestaña, orden por severidad.
- Verificar que los tests existentes que dependen de `estadosBandeja`/`bandejaFiltrada` sigan
  pasando con la nueva capa intermedia.

**Fase 4 — Verificación**
- `npx nx lint/test/build sigec-rtf`.
- Verificación en vivo en navegador con datos reales en ambas pestañas (ya hay RTF de prueba en
  distintos estados de la sesión de trabajo de ADR-018) — confirmar conteos, orden por severidad,
  reseteo del filtro de estado al cambiar de pestaña, y que ningún RTF quede fuera de las dos
  pestañas (unión de `ESTADOS_EVALUACION ∪ ESTADOS_PLAZOS` debe seguir siendo exactamente el
  `estadosBandeja` que hoy consulta `loadBandejaUn()`).

## Consecuencias

### Positivas
- Separa dos tareas mentales distintas sin tocar el backend ni la llamada combinada de ADR-013.
- Reutiliza un patrón ya validado y en producción (`bandeja-oa`), no introduce un componente ni un
  sistema visual nuevo.
- La columna de urgencia y el orden por severidad en "Plazos y Cobranza" resuelven de paso otra
  fricción de la revisión UX (falta de señal de prioridad) con cambios pequeños.

### Negativas / Riesgos
- Dos pestañas más un filtro de estado contextual agregan una pequeña superficie de estado nueva
  (`activeTab`) que hay que mantener sincronizada con `filtroEstado` al cambiar de pestaña — si se
  olvida el reset, un usuario podría quedar con un filtro de estado "fantasma" de la otra pestaña.
  Cubierto explícitamente por un test en la Fase 3.
- Si en el futuro se agregan más estados a `EstadosBandejaUn` (backend, ADR-018 de
  `sigec-api-rtf`), hay que recordar clasificarlos en `ESTADOS_EVALUACION` o `ESTADOS_PLAZOS` acá
  — no hay ninguna validación automática que lo fuerce. Vale la pena un comentario explícito en el
  código señalando esto.
- No resuelve la fricción de scroll largo en la pantalla de detalle (esa es la Fase 2 que se
  discutió aparte, inspirada en el prototipo compartido, y queda fuera de alcance de este ADR).
