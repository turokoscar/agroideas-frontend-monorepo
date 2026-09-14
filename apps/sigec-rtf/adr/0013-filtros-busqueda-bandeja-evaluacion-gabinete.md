# ADR-013: Filtros de búsqueda en la Bandeja de Evaluación de Gabinete (UN) — estado situacional y decisión de implementación

## Estado
Aceptado

## Contexto

Se pidió agregar tres filtros a la bandeja de `UnGabineteComponent` (`/rtf/evaluacion-gabinete`):

1. Texto libre que busque por **número de convenio, razón social o RUC**.
2. Dropdown de **estado**.
3. Rango de **fecha límite** (desde/hasta).

Antes de implementar se analizó el frontend (`apps/sigec-rtf`) y el backend
`sigec-api-rtf` (controlador → servicio → repositorio → stored procedure) para decidir
dónde debe vivir cada filtro.

### Cómo llega hoy la data de la bandeja (frontend)

`UnGabineteComponent.ngOnInit` dispara dos cargas independientes, ambas ya completas
(sin paginar) al momento de renderizar:

- `UnGabineteService.loadBandejaUn()` — hace `forkJoin` de `GET /rtfs?estado=X` para los
  6 estados propios de esta bandeja (`EN_REVISION`, `AUDITADO_CAMPO`, `IN_REVISION_UN`,
  `VENCIDO`, `PLAZO_INICIAL_NOTIFICACION`, `PLAZO_LIMITE_NOTARIAL`) y concatena los
  resultados en `unRtfList` (signal). No se envían `pagina`/`cantidad`.
- `ConvenioGeneralService.obtenerAsignados()` — trae **todos** los convenios asignados al
  especialista desde `sel-api-general` (`GET /convenios/asignados`, tope 2000) en un solo
  request, y arma `conveniosInfo: Map<ideConvenio, { numeroConvenio, ruc, razonSocial,
  fechaFirma }>` (mismo patrón ya usado por `UnDashboardComponent`).

Es decir: **RUC, razón social, número de convenio, estado y fecha límite de todas las
filas ya están en memoria del navegador** antes de que el usuario escriba nada en un
filtro. La tabla (`app-ui-data-table`, migrada en el cambio anterior) solo pagina 10 en
10 del lado cliente sobre ese arreglo ya completo.

### Qué filtra hoy el backend (`sigec-api-rtf`)

Cadena real: `RtfController.Listar` (`GET /rtfs`) → `RtfCabeceraServicio.
ListarRtfsPaginadoAsync` → `RtfRepositorio.ListarRtfsPaginadoAsync` → SP
`rtf.SP_R_Rtf` (`data/rtf_procedures.sql`):

```sql
CREATE OR ALTER PROCEDURE rtf.SP_R_Rtf
    @IdeConvenio BIGINT = NULL,
    @Estado VARCHAR(50) = NULL,
    @Offset INT = 0,
    @Limit INT = 10,
    @TotalRegistros INT OUTPUT
...
WHERE (@IdeConvenio IS NULL OR ide_convenio = @IdeConvenio)
  AND (@Estado IS NULL OR est_rtf = @Estado)
ORDER BY fec_registro DESC
OFFSET @Offset ROWS FETCH NEXT @Limit ROWS ONLY;
```

Dos hallazgos clave:

1. **El SP solo admite filtro exacto por `ideConvenio` y `estado`.** No hay parámro de
   rango de fecha (`fec_limite` sí existe como columna `DATETIME NOT NULL` en
   `rtf.SRT_TMC_RTF`, así que agregarlo sería trivial) ni de texto libre.
2. **RUC y razón social no existen en ninguna tabla de `sigec-api-rtf`.** `SRT_TMC_RTF`
   solo guarda `ide_convenio` (el id numérico). Esos datos viven exclusivamente en BD_SEL,
   detrás de `sel-api-general` — filtrar por ellos en el SP exigiría un join
   cross-servicio (o que el backend de RTF llame primero a `sel-api-general` para
   resolver qué `ideConvenio` matchean el texto, y recién con esa lista consultar el SP).
3. Para el caso exacto de esta bandeja, `RtfCabeceraServicio.ListarRtfsPaginadoAsync`
   activa `soloConveniosAsignados = true` (ver `RtfController.Listar`, porque los 6
   estados de esta bandeja siempre caen en esa rama salvo accesoGlobal). En esa rama el
   servicio pide al SP `offset:0, limit:int.MaxValue` (sí trae toda la tabla para ese
   estado) y filtra en memoria por convenios asignados — **pero el resultado final se
   vuelve a truncar** con `filtrados.Skip(offset).Take(limit)`, usando el `offset`/`limit`
   *originales* que llegaron del controlador (`pagina`/`cantidad`), no `int.MaxValue`.

### ⚠️ Bug encontrado (no introducido por este cambio, pero lo activa): truncamiento silencioso a 10 filas por estado

`RtfController.Listar` tiene `cantidad = 10` por defecto (`[FromQuery] int cantidad = 10`).
`UnGabineteService.loadBandejaUn()` llama `GET /rtfs?estado=X` **sin enviar `cantidad`**,
así que cada una de las 6 llamadas queda con `limit = 10`. Combinado con el punto 3 de
arriba: el servicio trae toda la cartera del especialista para ese estado, la filtra
correctamente, pero al final le aplica `.Take(10)` antes de devolverla — el `total` que
viaja en la respuesta es correcto, pero `items` queda truncado a 10. Un especialista con,
por ejemplo, 23 RTFs en `EN_REVISION` solo veía los 10 más recientes (`ORDER BY
fec_registro DESC` en el SP); los otros 13 nunca llegaban al navegador — **con o sin
filtros**, esto ya pasaba antes de este cambio.

Esto invalida el supuesto de la sección anterior ("ya está todo en memoria") si la cartera
de un especialista supera 10 RTFs en un mismo estado. Se corrige en este mismo cambio:
`loadBandejaUn()` ahora pide explícitamente `cantidad=1000` en cada una de las 6 llamadas
(`GET /rtfs?estado=X&cantidad=1000`), mismo patrón que ya usa
`ConvenioGeneralService.obtenerAsignados(cantidad = 2000)` en este mismo repo. Con eso,
`unRtfList()` sí queda con la cartera completa del especialista para los 6 estados, y el
resto del análisis (filtrar/paginar en cliente) vuelve a ser válido.

## Decisión

Implementar los 3 filtros **enteramente en el cliente** (`UnGabineteComponent`), sobre
los datos que ya están en memoria (`unRtfList()` + `conveniosInfo()`), sin tocar
`sigec-api-rtf`.

Razones:
- Los tres campos a filtrar (número de convenio + RUC + razón social vía
  `conveniosInfo`, estado, fecha límite) ya están 100% disponibles en el navegador antes
  de filtrar — no hace falta ida y vuelta al servidor.
- Cambiar el SP exige: nueva migración fechada en `data/migrations/`, actualizar
  `rtf_procedures.sql`, el repositorio, el servicio y el controlador de
  `sigec-api-rtf` — y aun así **no resolvería RUC/razón social**, porque esa data no vive
  en esa base de datos. El único filtro que el SP podría absorber hoy sin cruzar
  servicios es el de fecha límite, y no vale la pena partir la lógica de filtrado entre
  cliente y servidor por un solo campo.
- El propio backend ya trata este flujo (bandeja de cartera del especialista) como "trae
  todo, filtra/pagina en memoria" — no es una regresión de arquitectura, es seguir el
  mismo criterio que ya usa `RtfCabeceraServicio` para este caso.

**Límite conocido (no se resuelve ahora):** esto asume que la cartera de un especialista
UN es pequeña (decenas/cientos de RTFs, no miles) — el mismo supuesto que ya hace
`RtfCabeceraServicio.ListarRtfsPaginadoAsync` al pedir `limit:int.MaxValue` al SP para
`soloConveniosAsignados`, y por eso `loadBandejaUn()` pide `cantidad=1000` (arriba) en vez
de un número arbitrariamente alto: es un techo defensivo, no una paginación real. Si algún
especialista llegara a superar ese techo en un mismo estado, volvería a truncarse en
silencio. Si el volumen deja de ser "cartera de un especialista" y pasa a ser real
paginación, el filtro de fecha podría moverse al SP sin gran esfuerzo (columna ya
indexable); el de texto (RUC/razón social) seguiría necesitando resolver contra
`sel-api-general` primero, o cachear esa data en `sigec-api-rtf`.

### Implementación

- **`sigec-api-rtf` (batch de estados, agregado tras revisar el impacto de `cantidad=1000`
  con 500 usuarios concurrentes — ver Consecuencias):** `rtf.SP_R_Rtf` gana un parámetro
  `@Estados NVARCHAR(500)` (CSV, vía `STRING_SPLIT`) además del `@Estado` singular ya
  existente (`data/migrations/2026-09-13_sp_r_rtf_batch_estados.sql`). `RtfController.
  Listar` acepta `estados` (query string CSV) y lo reenvía por
  `IRtfRepositorio`/`IRtfCabeceraServicio.ListarRtfsPaginadoAsync` (nuevo parámetro
  `IEnumerable<string>? estados`, al final de la firma para no romper los call sites
  existentes). `EstadoRtf.EstadosBandejaUn` centraliza el set de 6 estados que activa
  `soloConveniosAsignados` (antes, un `estado is X or Y or Z` inline). Cubierto por 4 tests
  nuevos en `RtfControllerTests`/`RtfCabeceraServicioTests`.
- **`sigec-api-rtf` (paginación real en el SP, agregado a pedido — evita paginar en
  memoria):** `rtf.SP_R_Rtf` gana `@ConveniosAsignados NVARCHAR(MAX)` (CSV, mismo patrón
  `STRING_SPLIT` que `@Estados`) (`data/migrations/2026-09-14_sp_r_rtf_paginacion_real_cartera.sql`).
  `RtfCabeceraServicio.ListarRtfsPaginadoAsync`, en la rama `soloConveniosAsignados`, ya no
  pide `offset:0, limit:int.MaxValue` + filtra con `HashSet<long>.Contains` + `Skip/Take`
  en memoria: ahora reenvía la cartera (`IClienteExternoRtf.
  ObtenerConveniosAsignadosAsync`) y el `offset`/`limit` reales al repositorio, y el propio
  SP filtra por convenio, cuenta (`@TotalRegistros`) y pagina (`OFFSET`/`FETCH NEXT`) en
  una sola pasada — como corolario, el `COUNT(1)` que antes escaneaba toda la tabla sin
  filtrar por convenio (deuda técnica señalada más abajo) queda resuelto de paso. Guarda
  explícita para cartera vacía (`conveniosAsignados.Count == 0` → responde vacío sin
  llamar al repositorio): evita el round-trip y no depende de cómo el SP resuelva un
  `@ConveniosAsignados` vacío (verificado directamente contra la BD local:
  `STRING_SPLIT('', ',')` da una fila con `''`, y `CAST('' AS BIGINT)` en SQL Server 2022
  no falla — convierte a `0`, que no matchea ningún `ide_convenio` real — pero es un
  detalle implícito de conversión, no un contrato en el que el código deba apoyarse).
  Cubierto por 3 tests nuevos.
- `UnGabineteService.loadBandejaUn()`: una sola llamada `GET /rtfs?estados=A,B,C,...
  &cantidad=1000` en vez de 6 (`forkJoin` de `GET /rtfs?estado=X`) — corrige tanto el
  truncamiento a 10 filas por estado como las 6 llamadas redundantes a
  `sel-api-general.ObtenerConveniosAsignadosAsync` por carga de bandeja.
- `UnGabineteComponent`: signals `filtroTexto`, `filtroEstado`, `filtroFecDesde`,
  `filtroFecHasta` + un `computed bandejaFiltrada()` que cruza `unRtfList()` con
  `conveniosInfo()` y aplica los 3 filtros (texto normalizado sin tildes/mayúsculas,
  comparando contra `numeroConvenio` formateado, `ruc` y `razonSocial`; estado por
  igualdad exacta; fecha límite por rango inclusive).
- `app-ui-data-table` pasa a recibir `[data]="bandejaFiltrada()"` en vez de
  `unRtfList()` directamente.
- Barra de filtros con `app-ui-filter-bar` (mismo componente y clases `filter-group` /
  `filter-label` / `filter-input` / `filter-search-wrap` que usa `kofix-ejecucion` en
  `cartera.page.html` y `convenio-list`): input de texto con ícono de búsqueda, `<select
  class="filter-input">` de estado (opciones = los 6 estados de esta bandeja +
  "Todos"), y dos `<input type="date">` para el rango de fecha límite.

## Consecuencias

### Sobre concurrencia (¿qué pasa con 500 usuarios cargando la bandeja a la vez?)

Se revisó esto explícitamente porque `cantidad=1000` en `loadBandejaUn()` sonaba, a
primera vista, a "traer 1000 en vez de 10". No es así: en la rama
`soloConveniosAsignados` (la que aplica a esta bandeja), el repositorio ya llamaba al SP
con `@Limit = int.MaxValue` **antes** de este cambio — el `Skip/Take` a 10 pasaba después,
en memoria .NET, sobre datos que ya habían pagado el costo completo de la consulta. Subir
ese `Take` a 1000 no agrega una sola consulta SQL adicional para este rol.

Lo que sí encarece con concurrencia real (y **no** se arregla con el número de
`cantidad`) es: (1) `SELECT COUNT(1) ... WHERE est_rtf = @Estado` en `SP_R_Rtf`, sin
filtrar por convenio, ejecutado en cada llamada; y (2) que
`RtfCabeceraServicio.ListarRtfsPaginadoAsync` llamaba a
`IClienteExternoRtf.ObtenerConveniosAsignadosAsync()` (un `GET` real a
`sel-api-general`) **una vez por cada una de las 6 llamadas** que hacía el frontend por
estado — 6 llamadas externas redundantes pidiendo la misma cartera, en cada carga de
bandeja, por cada usuario. Con 500 usuarios concurrentes eso son 3000 llamadas salientes
a otro microservicio por ese único momento.

Esto se resolvió agregando `@Estados` (CSV) a `SP_R_Rtf` y `estados` a
`RtfController.Listar`, para que el frontend pida los 6 estados en una sola llamada
(`GET /rtfs?estados=A,B,C,...&cantidad=1000`) en vez de 6. Eso corta de 6 a 1 tanto los
round-trips HTTP del navegador como las llamadas redundantes a `sel-api-general` — la
palanca de mayor impacto para el escenario de 500 usuarios concurrentes. El `COUNT(1)`
sin filtrar por convenio (mencionado arriba) se resolvió aparte, agregando
`@ConveniosAsignados` al mismo SP — ver más abajo.

### Positivas
- Cero cambios en `sigec-api-rtf` para los 3 filtros en sí (viven enteramente en el
  cliente) — los cambios de backend (batch de `estados`, filtro/paginado por cartera en
  el SP) salieron de la revisión de concurrencia, no de los filtros en sí.
- Filtrado instantáneo (sin round-trip de red) al escribir o cambiar el dropdown/fechas.
- Reutiliza `app-ui-filter-bar` de `@agroideas/ui`, consistente con `cartera` y
  `convenio-list` de `kofix-ejecucion`.
- La carga de la bandeja pasa de 6 requests + 6 llamadas a `sel-api-general` a 1 de cada
  una, por cada carga de página, sin cambiar el resultado final para el usuario.
- El `SELECT COUNT(1)` de `SP_R_Rtf` ya filtra por convenio cuando aplica
  (`@ConveniosAsignados`) — dejó de escanear/contar toda la tabla del estado sin acotar a
  la cartera del especialista.
- `RtfCabeceraServicio.ListarRtfsPaginadoAsync` ya no trae la cartera completa a memoria
  .NET para filtrar/paginar ahí (`HashSet.Contains` + `Skip/Take`) — el `@Offset`/`@Limit`
  que llegan del controlador ahora paginan de verdad en SQL, sobre el conjunto ya
  filtrado por convenio y estado(s).

### Negativas / Riesgos
- El techo `cantidad=1000` del frontend sigue existiendo (`loadBandejaUn()` quiere "toda
  la cartera de una vez" para filtrar/paginar en la tabla del lado cliente, no una página
  de verdad) — ya no implica traer de más en el backend (el SP solo materializa esas
  1000 filas, no toda la tabla), pero si algún especialista superara ese techo en un
  mismo estado, seguiría truncándose en silencio del lado del frontend.
- El filtro de texto no puede beneficiarse de un índice de base de datos (es un
  `Array.filter` en el navegador) — irrelevante al volumen actual, a revisar si ese
  supuesto cambia.
- `loadBandejaUn()` ahora trae hasta 1000 filas en un solo request (antes, hasta 10 × 6
  en 6 requests): el payload puede crecer si la cartera real es grande, pero a cambio de
  eliminar 5 de los 6 round-trips y las 5 llamadas redundantes a `sel-api-general`.
