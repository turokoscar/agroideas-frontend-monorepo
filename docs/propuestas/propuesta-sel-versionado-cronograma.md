# Propuesta al equipo del SEL: versionado del cronograma por convenio y registro de reprogramaciones en la BD del SEL

**Para:** equipo de desarrollo del SEL (`selv2`, `sel-api-general`, BD del SEL)
**De:** equipo de KOFIX (AGROIDEAS)
**Fecha:** 2026-11-11 · **Estado:** propuesta para revisión
**Relacionado:** ADR 0016 del monorepo frontend (cierre mensual y reprogramación de saldos no
devengados).

## 1. Resumen

KOFIX necesita que los especialistas, al cierre de cada mes, trasladen a meses futuros lo
programado que no se devengó, y que cada cambio quede como una **versión consultable del
cronograma del convenio**, con su motivo.

El cronograma vive en la BD del SEL (`cronograma_marco_logico`), y **la primera versión
siempre la registra la organización en el SEL**. Por eso el SEL es el lugar natural para el
historial y las reglas del cronograma. Guardarlo en otra base, como estaba previsto por la
restricción de "solo SP", dejaría el cronograma en el SEL y su historia en KOFIX.

**Se propone agregar a la BD del SEL:**
- **2 tablas:** cabecera de versión del convenio y detalle de traslados.
- **1 catálogo:** motivos de reprogramación.
- **1 columna nullable** en `cronograma_marco_logico`.
- **Unos SP** para crear y consultar versiones.

**Todos los cambios suman, no modifican.** Las consultas actuales (`estado = 1`,
`MAX(numero_version)`) siguen funcionando sin cambios. También se proponen correcciones a tres
inconsistencias que encontramos entre las aplicaciones que hoy escriben el cronograma.

## 2. Situación actual: quién escribe el cronograma y cómo

Revisamos el código de las tres aplicaciones (2026-11-11).

| # | Escritor | Operación | Cómo versiona | Montos que actualiza |
|---|---|---|---|---|
| E1 | `selv2` · `usp_genera_marco_logico_poa_cronograma` / `usp_genera_cronograma_marco_logico` | Crea las filas de los meses del ítem | Sin versión (`numero_version` por defecto = 1) | Inserta filas en **0** para cada mes |
| E2 | `selv2` · `CronogramaMarcoLogicoController` (`multiple`, `store`, `save`) | **La OA registra su cronograma (versión 1)** | `numero_version = 1`. Edita en el lugar | `save()` recalcula `metaFinanciera`, **PCC y OA** en proporción |
| E3 | `selv2` · `CronogramaMarcoLogicoController::update` | Edición del cronograma | Edita en el lugar, sin versión | Solo `metaFisica` y `metaFinanciera`. **No recalcula PCC ni OA** |
| E4 | `selv2` · `MarcoLogicoReprogramacionController` (ajuste "Reprogramación de actividades") | `duplicaItem`: copia el **ítem** (`marco_logico`) y su cronograma con `estado = 0`, y sube `numero_version` del ítem. `updateReprogramacion`: edita el cronograma **en el lugar** | Versión **a nivel de ítem** (`marco_logico`), con copia | Solo `metaFisica` y `metaFinanciera`. **No recalcula PCC ni OA** |
| E5 | `selv2` · `MarcoLogicoAjusteSaldoController` (ajuste "Uso de saldos") | Igual que E4 (duplica el ítem, edita en el lugar) | A nivel de ítem | Igual que E4 |
| E6 | `sel-api-general` · `ProgramacionServicio.GuardarCronogramaAsync` (lo usa KOFIX) | Reprogramación del especialista | Versión **a nivel de cronograma**: pasa las filas a `estado = 0` e inserta nuevas con `numero_version + 1` | Recalcula PCC y OA. **Descarta los meses con meta física 0** |

### Inconsistencias encontradas

1. **Dos significados de "versión".**
   - E4 y E5 versionan el **ítem**: crean un `marco_logico` nuevo con `estado = 0`, y su
     cronograma cuelga de ese id nuevo.
   - E6 versiona las **filas del cronograma** del mismo ítem.

   Un mismo convenio puede tener las dos historias mezcladas, y ninguna dice **por qué**
   cambió.
2. **PCC y OA desactualizados (E3, E4, E5).**
   - Estas operaciones cambian `metaFinanciera` sin recalcular `metaFinancieraPCC` ni
     `metaFinancieraOA`.
   - KOFIX, sigec-rtf y los reportes leen `metaFinancieraPCC` como lo programado por
     AGROIDEAS.
   - Después de una reprogramación hecha en el SEL, ese monto puede no sumar lo que muestra
     el SEL. **Hay que medirlo con datos** (sección 7).
3. **Dos convenciones para los meses sin meta.**
   - E1 crea filas en 0 para todos los meses.
   - E6 solo inserta los meses con meta física mayor a 0.

   Un mismo ítem puede tener 36 filas o solo las de los meses con meta, según quién lo
   guardó por última vez.
4. **Sin motivo ni trazabilidad de qué se movió.**
   - Las solicitudes de ajuste (`postulante_ajuste_marco_logico`) guardan la justificación
     de la **solicitud**.
   - Pero el cronograma no se vincula a la solicitud que lo cambió.
   - `showHistorial` está vacío en `MarcoLogicoReprogramacionController`.

## 3. Necesidad de KOFIX

Al cierre de cada mes (con cierre contable), el especialista ve por ítem: lo programado, lo
devengado y el saldo no devengado. Ese saldo lo traslada a uno o varios meses futuros. Cada
traslado debe:
- generar **una versión del cronograma del convenio** (no una por ítem), con tipo, motivo,
  sustento, período de cierre, autor y fecha;
- registrar **de qué mes a qué mes** se movió cada monto;
- **no cambiar el total del ítem** y no tocar meses pasados;
- mover meta física, PCC y OA **en proporción**;
- quedar **consultable como histórico**, junto a la versión 1 de la OA y a los ajustes
  hechos en el SEL.

## 4. Principio de arquitectura propuesto

**Un solo dueño para cada dato y cada regla.**

| Contexto | Dueño | Datos | Reglas |
|---|---|---|---|
| **Planificación** (qué se programó) | **SEL** (BD + `sel-api-general`) | Cronograma, **versiones**, **traslados**, motivos | Total del ítem invariable · meses pasados inmutables · destino dentro de la vigencia · reparto proporcional de PCC/OA · tope de concentración en diciembre · límite de traslados sucesivos |
| **Ejecución** (qué se devengó y pagó) | **KOFIX** (BD KARDEX + `mc-api-ejecucion`) | Desembolsos, devengado, pagado, cierre contable, cierre de programación | Saldo no devengado · techo reprogramable (aprobado − solicitado) · solo se trasladan meses con cierre contable |

- **KOFIX no escribe reglas de cronograma.** Pide al SEL "reprogramar el convenio X con estos
  traslados y este motivo". El SEL valida sus reglas y crea la versión **en una sola
  transacción**.
- **La UI de KOFIX no tiene lógica de negocio.** Solo muestra y envía.
- **Todos los escritores del cronograma usan la misma operación de versionado:** el SP de la
  sección 5.3. Ningún escritor modifica filas vigentes en el lugar. Así desaparecen las
  inconsistencias 1 a 3.

## 5. Cambios propuestos en la BD del SEL

Los nombres siguen la convención actual del SEL (tablas `dbo` en minúscula, SP
`GENERAL.SEL_SP_*`). El equipo del SEL puede ajustarlos.

### 5.1 Tablas nuevas

**`dbo.cronograma_version`**: una fila por versión del cronograma de un convenio.

| Columna | Tipo | Nota |
|---|---|---|
| `id` | bigint identity | PK |
| `postulanteID` | bigint | Convenio |
| `numero` | int | Correlativo por convenio. 1 = registro de la OA. Único (`postulanteID`, `numero`) |
| `tipo` | varchar(30) | `INICIAL_OA`, `AJUSTE_SEL`, `REPROGRAMACION_CIERRE`, `AJUSTE_KOFIX`, `MIGRACION` |
| `postulanteAjusteMarcoLogicoID` | bigint null | FK a `postulante_ajuste_marco_logico` cuando la versión viene de una solicitud de ajuste del SEL |
| `motivoReprogramacionID` | bigint null | FK al catálogo 5.2 (obligatorio en `REPROGRAMACION_CIERRE`) |
| `sustento` | nvarchar(3000) null | |
| `anioCierre`, `mesCierre` | int null | Período calendario cerrado que originó el traslado |
| `sistemaOrigen` | varchar(20) | `SELV2`, `KOFIX` |
| `estado` | int | 1 vigente, 0 reemplazada |
| `created_auth`, `created_at` | | Convención actual |

**`dbo.cronograma_traslado`**: una fila por monto movido.

| Columna | Tipo | Nota |
|---|---|---|
| `id` | bigint identity | PK |
| `cronogramaVersionID` | bigint | FK a `cronograma_version` |
| `marcoLogicoID` | bigint | Ítem |
| `mesOrigen`, `mesDestino` | int | Mes del convenio (`mes` actual) |
| `metaFisica`, `metaFinanciera`, `metaFinancieraPCC`, `metaFinancieraOA` | decimal(18,5) | Lo movido, con la misma precisión que el cronograma |

### 5.2 Catálogo
**`dbo.motivo_reprogramacion`** (`id`, `descripcion`, `estado`, auditoría). Valores
iniciales:
- clima;
- proveedor;
- trámite de la OA;
- falta de contrapartida de la OA;
- demora de AGROIDEAS;
- fuerza mayor;
- otro.

Si se prefiere, se puede reutilizar `tipo_ajuste` agregando el valor "Reprogramación por
cierre mensual" y dejar el motivo como texto. Es una decisión del equipo del SEL.

### 5.3 Columna nueva y SP

- **`cronograma_marco_logico.cronogramaVersionID`** (bigint **null**, FK a
  `cronograma_version`).
  - Al ser nullable, las filas y los escritores actuales siguen funcionando mientras se
    adaptan.
  - Índice sugerido: (`marcoLogicoID`, `estado`, `numero_version`) INCLUDE (`mes`,
    `metaFinancieraPCC`). Lo usan las consultas de "versión vigente".
- **SP de escritura (el único punto para versionar):**
  - `GENERAL.SEL_SP_C_CronogramaVersion`: crea la cabecera y devuelve su id y número.
    Bloquea el convenio (`UPDLOCK`) para que dos escritores no tomen el mismo número.
  - `GENERAL.SEL_SP_P_AplicarDetalleVersion`: por ítem, pasa las filas vigentes a
    `estado = 0` e inserta las nuevas con `numero_version + 1` y `cronogramaVersionID`.
    **Siempre inserta todos los meses del ítem, incluidos los que quedan en 0.** Así hay una
    sola convención (inconsistencia 3).
  - `GENERAL.SEL_SP_C_CronogramaTraslado`: registra los traslados.

  Los tres corren en **una transacción** que abre el que llama: `sel-api-general` o `selv2`.
- **SP de lectura:**
  - `GENERAL.SEL_SP_R_ListarVersionesConvenio`: versiones del convenio, con tipo, motivo,
    autor, fecha y totales.
  - `GENERAL.SEL_SP_R_ObtenerCronogramaConvenio`: todos los ítems de una versión dada o de la
    vigente.
  - `GENERAL.SEL_SP_R_ListarTraslados`: traslados de una versión.

### 5.4 Reglas en `sel-api-general` (no en los SP)

Un servicio `ReprogramacionServicio` concentra las reglas de la sección 4 (columna SEL):
- total por ítem invariable;
- meses pasados inmutables (mes calendario = `fechaFirma + mes − 1`, menor al mes actual);
- destino dentro de la vigencia, con adendas;
- reparto proporcional de PCC/OA, con **una sola función** compartida con
  `GuardarCronogramaAsync`;
- tope de diciembre y límite de traslados, en `appsettings`.

Endpoints:
- `POST convenios/{id}/reprogramaciones`, con versión base esperada para concurrencia
  optimista;
- `GET convenios/{id}/versiones`;
- `GET convenios/{id}/versiones/{numero}`.

KOFIX lo invoca a través de `mc-api-ejecucion`, igual que hoy.

## 6. Impacto

### 6.1 Sobre lo que ya existe
| Elemento | Impacto | Acción |
|---|---|---|
| Consultas de lectura con `estado = 1` y `MAX(numero_version)`: unos 27 usos en los SP de `sel-api-general`, 9 en procedimientos, 2 en vistas y 1 en funciones de `sel-app`, más los de `selv2` y sigec-rtf | **Ninguno**: no cambia el significado de `estado` ni de `numero_version` | Ninguna |
| E1 (SP que generan los meses en 0) | Bajo | Crear la cabecera `INICIAL_OA` (número 1) y pasar su id |
| E2 (registro de la OA, `save()`) | Bajo | Asociar las filas a la versión 1. Mientras la OA no envíe su plan, la versión 1 se puede seguir editando en el lugar (sigue en borrador) |
| E3 (`update`) | Medio | Recalcular PCC/OA con la misma función de `save()`. Si se usa después de aprobado el plan, crear una versión |
| E4 / E5 (ajustes del SEL) | Medio | Dejar de editar en el lugar. Al aplicar un ajuste, crear una versión `AJUSTE_SEL` ligada a `postulanteAjusteMarcoLogicoID`. Se puede mantener la copia del ítem si el SEL la necesita para el `marco_logico` |
| E6 (`GuardarCronogramaAsync`) | Bajo | Usar los SP de 5.3, insertar todos los meses y registrar la versión `AJUSTE_KOFIX` |
| `showHistorial` (vacío) | Positivo | Se puede implementar con `SEL_SP_R_ListarVersionesConvenio` |

### 6.2 Datos existentes (migración)
- Un script crea, por convenio, una versión `MIGRACION` por cada `numero_version` distinto que
  ya exista, con autor y fecha tomados de `created_auth` y `created_at`. Después vincula las
  filas existentes.
- Como la columna es nullable, el script puede correr **después** del despliegue y por lotes.
- Las versiones a nivel de ítem de E4/E5 (copias de `marco_logico` con `estado = 0`) se
  conservan como están. El histórico las muestra como "versión anterior del ítem".

### 6.3 Orden de despliegue
1. DDL (tablas, catálogo, columna nullable, índice). Solo suma y se puede revertir.
2. SP nuevos.
3. `sel-api-general` con `ReprogramacionServicio` y los endpoints. KOFIX empieza a usarlos.
4. Script de migración por lotes.
5. Adaptación de `selv2` (E1 a E5), sin urgencia: hasta entonces sus escrituras quedan sin
   cabecera, como hoy.

### 6.4 Riesgos
- **Escritores sin adaptar** (paso 5): sus cambios no generan versión. Se mitiga priorizando
  E3/E4/E5 por el problema de PCC/OA.
- **Concurrencia entre `selv2` y KOFIX** sobre el mismo ítem: `SEL_SP_C_CronogramaVersion`
  bloquea el convenio, y `sel-api-general` valida la versión base.
- **Volumen:** insertar todos los meses en cada versión multiplica las filas (p. ej. 36 por
  ítem por versión). Con el índice propuesto y pocas reprogramaciones por mes es manejable.
  Si no, se puede guardar solo lo que cambió y reconstruir la versión al leerla.

## 7. Verificaciones previas sugeridas (con datos)
1. **PCC/OA desactualizados:** cuántos ítems vigentes cumplen
   `ABS(metaFinanciera − metaFinancieraPCC − metaFinancieraOA) > 0.01`. Si hay, hace falta un
   script de corrección antes de usar el PCC para reprogramar.
2. **Mezcla de convenciones:** cuántos ítems tienen filas vigentes en 0 y cuántos solo los
   meses con meta.
3. **Ítems en ajuste** (`marco_logico.estado = 3`) que hoy tengan cronograma vigente.

## 8. Alternativa si no se aprueba
Se mantiene la restricción de **solo SP en el SEL**:
- KOFIX guarda la cabecera de versión y los traslados en su BD (KARDEX) y los vincula por
  (`marcoLogicoID`, `numero_version`).
- Las reglas del cronograma quedan en `sel-api-general`, sin tablas nuevas.

Funciona, pero el historial queda **partido entre dos bases**:
- el SEL no puede mostrar el motivo de una reprogramación;
- `selv2` y sigec no ven los traslados;
- las inconsistencias 1 a 3 siguen abiertas.

Por eso recomendamos esta propuesta.

## 9. Lo que pedimos al equipo del SEL
1. Aprobar o ajustar el modelo de la sección 5. En particular, decidir si se usa un catálogo
   propio de motivos o `tipo_ajuste`.
2. Validar las verificaciones de la sección 7 en QA.
3. Acordar quién implementa cada paso de la sección 6.3. KOFIX puede proponer los SP y
   `ReprogramacionServicio` como pull request a `sel-api-general`.
