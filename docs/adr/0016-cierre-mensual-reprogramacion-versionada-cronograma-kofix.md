# ADR 0016: Cierre mensual, traslado de saldos no devengados y programación versionada para la certificación presupuestal (KOFIX)

## Estado
Propuesto · Revisado el 2026-11-11 contra los ADR de `mc-api-ejecucion` (ADR-003 a ADR-028).
Esta versión incorpora la definición de **devengado** dada por el owner y el vínculo con el
**expediente SIAF**. El 2026-11-11 el owner fijó el alcance inmediato: **la reprogramación
(Fases 1 a 4)**. El SIAF queda como mejora futura. También resolvió la aprobación, qué se
mueve, el mes cerrado y las versiones previas ([Puntos abiertos](#puntos-abiertos), punto
0). Para la Fase 4 falta acordar con la UN las fechas de corte y los topes (puntos 2 y 3).

## Fecha
2026-11-11 · Verificado leyendo el código de `sel-api-general` y `mc-api-ejecucion`
(sin ejecutar pruebas; no se cambió código).

## Responsables
Equipo Frontend AGROIDEAS · Owner del módulo: Oscar Pazos

## Aplica a
- `apps/kofix-ejecucion`: módulo nuevo **Cierre de programación** y cambios en
  `programacion-vigente-detail` / `programacion-cronograma-modal`.
- `SEL_APIS/sel-api-general` (repo hermano): **dueño del cronograma**
  (`cronograma_marco_logico`), que ya versiona por ítem. **Restricción (owner, 2026-11-11):
  en la BD del SEL no se crean tablas, solo SP.** Por eso aquí solo van SP nuevos de lectura
  y código del API. Ver D1.
- `KOFIX_APP/mc-api-ejecucion` (repo hermano): **dueño de los desembolsos** (BD `KARDEX`).
  Aquí van la versión del convenio (sus datos), los traslados, el devengado, el cierre de
  programación, el requerimiento de certificación y el vínculo con el SIAF.
- Relación con ADR existentes. **Ninguno se reemplaza**:
  - Este monorepo: ADR 0010 (semáforo), ADR 0012 (H-02, D6 saldo reprogramable, D7 lógica en
    la API).
  - `mc-api-ejecucion/Docs`: ADR-003 (nomenclatura), ADR-010 (sin consultas entre BD),
    ADR-011 (fórmulas del Kardex), ADR-019 (navegación), ADR-020 (cheque devengado/girado),
    ADR-026 (visión general, cierre contable, auditoría), **ADR-027 (ejecutado = pagado)**,
    ADR-028 (reporte mensual).
  - `sel-api-general/docs/adr`: ADR 0002 (versionamiento incremental), ADR-001 (`mes`
    relativo al convenio).
- Se complementa con el **ADR-029** de `mc-api-ejecucion/Docs` (`ADR-029-Devengado-Bolsa-y-Fecha-de-Giro.md`, propuesto). Ese ADR registra
  ahí las decisiones del backend: devengado como medida hermana del ejecutado de ADR-027 y
  corrección de H-09.

## Contexto

### El problema de negocio
Cada especialista tiene una **cartera de convenios**. Cada mes, AGROIDEAS le pide indicar al
**Responsable de la Unidad de Negocio (UN)** cuánto se va a ejecutar el mes siguiente. Con
eso, la UN coordina con **Presupuesto** y se solicita la **certificación presupuestal**.

Ese monto debería salir del **cronograma mensualizado de cada organización (OA)**. En la
práctica:

1. Cuando una OA no ejecuta lo programado en un mes (p. ej. octubre), el saldo queda
   "flotando". Nadie lo traslada de forma explícita, o se traslada editando el cronograma sin
   dejar constancia de qué se movió, desde dónde ni por qué.
2. El monto que se informa a la UN se arma fuera del sistema. No coincide necesariamente con
   el cronograma vigente, y no queda una foto de lo que se pidió certificar.
3. Lo no ejecutado se acumula en **diciembre**, el mes con más riesgo: cierre contable,
   feriados, proveedores saturados. Si diciembre no se ejecuta, lo certificado no se devenga
   y el bajo avance afecta el presupuesto del año siguiente.
4. No se mide la **precisión de la programación** (certificado frente a devengado) por
   especialista ni por OA.
5. KOFIX no guarda el **expediente SIAF** de cada desembolso. Por eso no se puede conciliar
   lo registrado en KOFIX con las fases del SIAF.

### Qué significa "ejecutado" (aclaración del owner, 2026-11-11)
La palabra cambia según quién pregunta. Este ADR usa tres medidas, cada una con su nombre:

| Medida | Fase SIAF | Qué responde | Transferencia | Cheque de gerencia |
|---|---|---|---|---|
| **Devengado** | D | ¿Se cumplió la meta presupuestal? | Al registrarse | Desde `DEVENGADO` (`KDX_FIN_TMC_CHEQUE.fec_devengado`) |
| **Pagado** (el "ejecutado" de ADR-027) | G/P | ¿La OA ya tiene el dinero? | Al registrarse | Solo desde `GIRADO` (`fec_pagado`) |
| **En bolsa** = devengado − pagado | entre D y G | ¿Cuánto espera la contrapartida de la OA? | Siempre 0 | Cheques en `DEVENGADO` |

El cheque de gerencia **se genera y se devenga**, pero no se efectiviza hasta que la OA
deposita su contrapartida. Para presupuesto, **la meta ya se cumplió**. Pero el dinero no está
en la cuenta de la OA: espera en una "bolsa" la autorización para proceder.

**Para este módulo, que es presupuestal, la medida es el devengado.** El pagado sigue siendo
la medida del Kardex, de las rendiciones y de los saldos de la OA (ADR-027). Las dos no
compiten: responden preguntas distintas y cada una tiene un solo cálculo.

### Cómo funciona hoy (verificado en el código)

**Guardado del cronograma.** KOFIX llama a `POST {apiEjecucion}/programaciones/items/cronograma`.
`mc-api-ejecucion` (`ProgramacionService.SaveCronogramaAsync`, línea 45) valida la cartera y
el saldo reprogramable (ADR 0012 D6: `aprobado − solicitado`), y delega en `sel-api-general`
(`PUT items/{marcoLogicoId}/cronograma`).

**El versionado ya existe, por ítem** (`sel-api-general` ADR 0002).
`ProgramacionServicio.GuardarCronogramaAsync` (`sel-api-general.Negocio/Programacion/ProgramacionServicio.cs:117`)
calcula `MAX(numero_version) + 1` del ítem, pasa la versión vigente a `estado = 0` (no borra)
e inserta la nueva con `estado = 1`. Los reportes leen la vigente con
`estado = 1 AND numero_version = MAX(...)`.

**`mes` es relativo al convenio** (`sel-api-general` ADR-001): el mes calendario es
`DATEADD(month, mes − 1, fechaFirma)` (`Database/004_procedimientos.sql:1344` y `:2411`).

**Programado mensual por convenio.** Ya existe en `sel-api-general`
`POST programacion/reporte-mensual/detalle`, que devuelve el programado por convenio, año y mes
de la versión vigente (ADR-028, opción 1B).

**Cierre contable.** Ya existe `FIN.KDX_FIN_TC_CIERRES` (mes y año calendario, para todo el
sistema), con `CierreController` y el permiso `CIERRE_CONTABLE`. Impide registrar operaciones
con fecha en el período cerrado (ADR-026).

**Ejecutado (= pagado).** `EjecutadoCalculo` + `IPagoEfectivoPolicy` sobre
`KDX_FIN_SP_R_PAGOS_POSTULANTES`. Una transferencia cuenta al registrarse; un cheque, solo
desde `GIRADO` (ADR-020, ADR-027).

### Hallazgos

| # | Hallazgo | Impacto |
|---|---|---|
| H-01 | La versión del cronograma es **por ítem**, no por convenio. | Un traslado de 8 ítems genera 8 versiones sueltas. No hay una "versión v3 del convenio". |
| H-02 | La versión no guarda **tipo, motivo, período ni aprobador**. | No se distingue una corrección de un traslado. No hay sustento para el OCI. |
| H-03 | No se registra el **origen y destino** de lo movido. | No se puede responder "¿de dónde vienen los S/ 40,000 de diciembre?". |
| H-04 | No hay endpoints para **listar versiones** ni leer una versión pasada. | El histórico existe en la BD pero no se usa. |
| H-05 | No hay **bloqueo de meses cerrados**. El guardado reemplaza el cronograma completo del ítem. | Se puede reescribir octubre después de cerrado y "borrar" el saldo no devengado. |
| H-06 | Se descartan los detalles con `MetaFisica = 0` (`ProgramacionServicio.cs:144`). | Un mes con solo monto financiero se pierde sin aviso. |
| H-07 | La reprogramación guarda **solo el saldo** y pierde lo programado de los meses ya cubiertos (ADR 0012 H-02, obs. 2). | No se puede calcular lo no devengado de meses pasados. |
| H-08 | El monto para la UN no tiene **foto congelada**. | Lo que vio Presupuesto deja de coincidir con el sistema en la siguiente edición. |
| H-09 | El **pagado mensual se agrupa por la fecha de registro, no por la del giro**. `EjecutadoCalculo` usa `KDX_FIN_TMM_DESEMBOLSO.fec_pago`, que se graba al registrar el desembolso (`20260828_cheque_gerencia_devengado_girado.sql:120`). El giro se graba en `KDX_FIN_TMC_CHEQUE.fec_pagado` (línea 237). | Un cheque devengado en octubre y girado en diciembre no figura como pagado mientras está en la bolsa. Cuando se gira, aparece como **pagado en octubre, de forma retroactiva**. Afecta hoy al reporte mensual (ADR-027), al reporte de avance (ADR-028), al Kardex mensual y a `ejecucion-periodo`, que consume sigec-rtf. Se corrige en ADR-029; este módulo no depende de eso, porque mide devengado. |
| H-10 | Existe `FIN.KDX_FIN_TC_CIERRE_MENSUAL` (por convenio, `num_mes` de 1 a 36), pero **ningún SP la usa**: está huérfana. | Riesgo de crear una tercera tabla de cierre. Hay que reutilizarla o retirarla. |
| H-11 | Los desembolsos **no guardan el expediente SIAF**. | No se puede conciliar el devengado de KOFIX con el del SIAF ni seguir sus fases. |
| H-12 | La **auditoría de programación** no está implementada (ADR-009). | Los cambios de cronograma no dejan rastro en `AuditoriaService`, contra la regla de ADR-026. |

## Opciones consideradas

### Decisión principal: cómo gestionar los saldos no devengados

#### Opción A: mantener la situación actual (edición libre + reporte manual)
| Pros | Contras |
|---|---|
| Sin desarrollo. | No resuelve H-01 a H-12. |
| Total flexibilidad para el especialista. | Hay dos fuentes de verdad para el monto a certificar. |
| | Sin trazabilidad ni medición. Favorece la acumulación en diciembre. |

#### Opción B: exponer el versionado actual por ítem (solo consulta)
| Pros | Contras |
|---|---|
| Bajo costo: usa datos que ya existen. | Histórico fragmentado por ítem (H-01). |
| Visibilidad inmediata. | Sin motivo, origen/destino ni bloqueo (H-02, H-03, H-05). No resuelve H-08. |

#### Opción C: arrastre automático al mes siguiente
| Pros | Contras |
|---|---|
| Nada queda "flotando". Sin trabajo manual. | Infla el mes siguiente sin juicio técnico: la certificación sale sobreestimada. |
| Trazable si se registra. | Empuja todo en cascada hacia diciembre. |
| | No permite marcar "no se devengará en el año" para rebajar la certificación a tiempo. |

#### Opción D: cierre de programación + traslado trazable + versión por convenio + foto para certificación (**recomendada**)
| Pros | Contras |
|---|---|
| Una sola fuente de verdad: lo certificado sale del cronograma vigente. | Desarrollo en dos APIs, dos BD y el frontend. |
| Trazabilidad completa (origen, destino, motivo, autor) y auditoría. | Tarea mensual obligatoria para el especialista. |
| Se apoya en el cierre contable existente: no crea otro cierre. | La operación toca dos BD sin transacción común (ADR-010). |
| Mide con devengado: la cifra de un mes cerrado no cambia después. | Exige acordar fechas de corte y aprobadores con la UN. |
| Reutiliza el versionado por ítem y el reporte de ADR-028. | |

#### Opción E: llevar la programación a un sistema externo (hoja de Presupuesto)
| Pros | Contras |
|---|---|
| Sin desarrollo en KOFIX. | Separa la programación del cronograma de la OA, que es lo que se quiere unir. |
| | El especialista pierde el control del dato. |

### Decisión secundaria: con qué medida se calcula lo no ejecutado

| Opción | Pros | Contras |
|---|---|---|
| **Solicitado** | Coincide con el saldo reprogramable (D6). | No es una fase presupuestal. Cuenta solicitudes que aún no se devengaron. |
| **Pagado** (ADR-027) | Ya existe y tiene un solo cálculo. | No refleja la meta presupuestal: un cheque en la bolsa figuraría como no ejecutado aunque Presupuesto ya cumplió. Por H-09, la cifra de un mes cerrado cambia sola. |
| **Devengado** (**recomendada**) | Es la medida de Presupuesto (fase D) y la que se certifica. Es estable: la fecha de devengado no cambia. | Requiere una política hermana de `IPagoEfectivoPolicy` y no rotularla como "ejecutado". |

### Decisión secundaria: cómo obtener las fases del SIAF

En una búsqueda del 2026-11-11 **no se encontró documentación pública de un servicio del MEF
que consulte las fases de un expediente individual**. Los manuales del MEF describen la
consulta de las fases Devengado y Girado **dentro del SIAF web y del SIAF-Cliente**, que
requieren usuario de la Unidad Ejecutora. La Consulta Amigable y los datos abiertos publican
**agregados** (por pliego, meta o específica), no expedientes. Hay que confirmarlo con la OGTI
del MEF.

**El único canal disponible hoy es la consulta pública del MEF** (inspeccionada el
2026-11-11):

| Consulta | URL | Envío del formulario | Campos |
|---|---|---|---|
| Expediente administrativo | `https://apps2.mef.gob.pe/consulta-vfp-webapp/consultaExpediente.jspx` | `POST actionConsultaExpediente.jspx` | `anoEje` (año), `secEjec` (código de la UE, 6 dígitos), `expediente` (hasta 10 dígitos), `j_captcha` (5 caracteres) |
| Certificado | `.../consultaCertificado.jspx` | `POST actionConsultaCertificado.jspx` | `anoEje`, `secEjec`, `certificado`, `j_captcha` |
| EEFF y EEPP | `.../consultaEFEP.jspx` | — | Fuera del alcance |

**Las dos consultas exigen un CAPTCHA de imagen** (`Captcha.jpg`, se renueva con
`reloadCaptcha()`), así que el MEF la diseñó para consultas humanas. Automatizarla obliga a
**resolver o evadir el CAPTCHA**, con OCR o con un servicio de terceros. Eso va contra la
intención del MEF y puede vulnerar sus condiciones de uso. También es frágil: se rompe si
cambia el CAPTCHA o la pantalla. Por eso **no se automatiza la consulta**. Sí se usa como
**consulta asistida**: KOFIX guía al usuario a la página, el usuario resuelve el CAPTCHA y
transcribe o confirma las fases.

La consulta de certificados sirve además para **verificar el número de certificación** que se
registra en el requerimiento (D7).

**Qué devuelve la consulta** (prueba manual del 2026-11-11: año 2026, entidad 160,
expediente 7503):

- **Cabecera del expediente:**
  - Año.
  - Entidad: código y nombre ("160 · INSTITUTO NACIONAL DE INNOVACION AGRARIA").
  - Expediente.
  - Tipo de operación: código y nombre ("N · GASTO - ADQUISICION DE BIENES Y SERVICIOS").
  - Modalidad de compra ("CA · LEY DE CONTRATACIONES DEL ESTADO").
  - Tipo de proceso de selección (vacío en la prueba).
- **Detalle (una fila por registro de fase).** El ejemplo de la prueba fue:
  `G | C | 1 | 1 | 032 | 0003011 | 16/10/2026 | 00 | S/. | 16,500.00 | A | 16/10/2026 16:58:43 | 4269244558`

| Columna | Significado | En el ejemplo |
|---|---|---|
| Ciclo | Ciclo del SIAF | `G` (gasto) |
| Fase | Fase del gasto | `C` (compromiso). Las siguientes son `D` (devengado), `G` (girado) y `P` (pagado) |
| Sec / Corr | Secuencia de la fase y correlativo dentro de ella | `1` / `1` |
| Doc / Número | Tipo y número del documento que sustenta la fase | `032` / `0003011` |
| Fecha | Fecha de la fase | `16/10/2026` |
| FF | Fuente de financiamiento | `00` (recursos ordinarios) |
| Moneda / Monto | — | `S/.` / `16,500.00` |
| Est. | Estado del registro | `A` (aprobado) |
| Fecha proceso | Fecha y hora del registro en el SIAF | `16/10/2026 16:58:43` |
| Id Trx | Id de la transacción en el SIAF | `4269244558` |
| Enviado | Botón "Enviar" (`verificarEnvio()`); su función no se exploró | — |

- Un mismo expediente acumula **varias filas**: una por fase, y por cada secuencia y
  correlativo (p. ej. varios devengados parciales). En la prueba, el expediente solo
  tenía el compromiso: **aún no estaba devengado**.
- La tabla se puede **exportar a Excel y PDF**. El enlace (`expedientePaginate.jspx`) lleva
  el CAPTCHA ya resuelto como parámetro y vale solo en esa sesión. Por eso la exportación
  también requiere a la persona, pero le permite **descargar el Excel y subirlo a KOFIX**, sin
  transcribir.
- La entidad de esa prueba (160) es el INIA, no AGROIDEAS.

**Segunda prueba, con un expediente devengado y girado** (2026-11-11: año 2026, entidad
**1297 · PROGRAMA DE COMPENSACIONES PARA LA COMPETITIVIDAD**, expediente 484). La UE de
AGROIDEAS es la **1297**. El expediente devuelve **30 filas**. Resumen de las filas aprobadas
con monto:

| Fase | Sec | Doc / Número | Fecha | Monto |
|---|---|---|---|---|
| C (compromiso) | 1 | 032 / 0000336 | 10/02/2026 | 21,000.00 |
| D (devengado) | 2 | 027 / 167 | 01/03/2026 | 7,000.00 |
| G (girado) | 3 | 243 / 484.26.81.2601338 | 04/03/2026 | 7,000.00 |
| D | 4 | 027 / 170 | 27/03/2026 | 7,000.00 |
| G | 5 | 243 / 484.26.81.2602045 | 30/03/2026 | 7,000.00 |
| D | 6 | 027 / 173 | 30/04/2026 | 7,000.00 |
| G | 7 | 243 / 484.26.81.2602999 | 05/05/2026 | 560.00 |
| G | 8 | 243 / 484.26.81.2602998 | 05/05/2026 | 6,440.00 |

Total: compromiso 21,000; devengado 21,000 (3 × 7,000); girado 21,000.

Qué enseña esta prueba para el diseño:
1. **Cada secuencia (`Sec`) aparece en varias filas.** Es el historial de la operación:
   - una fila con estado `F` y fecha de proceso, **sin** Id Trx;
   - en los giros, una fila con estado `V`;
   - una fila `A` **con** documento, monto e Id Trx;
   - una fila `A` sin documento ni monto, con su propio Id Trx.

   **La fila que vale es la `A` con monto e Id Trx.** Sumar todas las filas contaría el monto
   dos o tres veces. `F` = **firmado** (confirmado por el owner). El significado de `V` sigue
   por confirmar con Tesorería (Punto abierto 8b).
2. **La secuencia es correlativa para todo el expediente**, no por fase: D2 → G3 → D4 → G5 →
   D6 → G7/G8.
3. **Un devengado puede girarse en varios giros** (D6 = G7 560.00 + G8 6,440.00, el mismo día).
4. **La consulta no indica qué devengado paga cada giro.** Solo se ve por el orden y los
   montos. Por eso la conciliación se hace **por expediente y por mes** (devengado de KOFIX
   frente a fase D del SIAF), no giro por giro.
5. **No aparece la fase P (pagado).** El giro (G) es la última fase que muestra esta consulta.
6. Hay filas con la columna FF vacía y otras con `00`. La fuente de financiamiento no es
   confiable en todas las filas.

| Opción | Pros | Contras |
|---|---|---|
| **S1 — Registro manual** del expediente y sus fases (por el especialista o Tesorería) | Inmediato, sin dependencias externas. | Carga manual; los datos pueden quedar atrasados. |
| **S1b — Consulta asistida en la consulta pública VFP del MEF** (KOFIX muestra el año, la UE y el expediente listos para copiar y abre la página; el usuario resuelve el CAPTCHA y registra las fases) | Usa el único canal público por expediente. Respeta el CAPTCHA. Reduce errores de transcripción. | Sigue siendo manual, expediente por expediente. |
| **S1c — Automatizar la consulta pública VFP** resolviendo el CAPTCHA (OCR o servicio externo) | Sería automático y por expediente. | Evade un control anti-automatización del MEF. Puede vulnerar sus condiciones de uso y bloquear la IP institucional. Frágil. **Se descarta.** |
| **S2 — Web scraping del SIAF web** con usuario institucional | Automático y por expediente. | Usa credenciales de una persona en un servidor (riesgo de seguridad y de responsabilidad). Puede violar las condiciones de uso del MEF. Frágil ante cambios de pantalla y captchas. **No se recomienda.** |
| **S3 — Scraping o descarga de la Consulta Amigable / datos abiertos** | Público, sin credenciales. | Solo agregados: sirve para conciliar totales por meta, no por expediente. |
| **S4 — Servicio oficial del MEF** (convenio de interoperabilidad, vía PIDE u otro canal) | La vía correcta: estable, autorizada y por expediente. | Depende de un trámite institucional con plazo incierto. Hay que confirmar que exista. `sel-api-general` ya integra SUNAT vía PIDE (su ADR 0007), así que hay experiencia. |
| **S5 — Importar reportes exportados del SIAF** (Excel o TXT que genera la UE) | Datos oficiales por expediente, sin scraping. | Proceso periódico manual (subir un archivo); el formato puede cambiar. |

**Recomendación SIAF:**
- **De inmediato: S1 + S1b.** El expediente se pide al registrar el desembolso y las fases se
  verifican con la consulta pública asistida.
- **S5** como carga masiva para conciliar.
- En paralelo, la UN inicia el **trámite de S4** ante el MEF. En la solicitud conviene citar
  que la consulta pública existe pero tiene CAPTCHA, y pedir un canal para sistemas.
- **S3** sirve como control de totales.
- **S1c y S2 se descartan** mientras no haya autorización expresa del MEF y de la OTI de
  AGROIDEAS.

## Decisión

Se adopta la **Opción D**, con el **devengado** como medida y el vínculo SIAF de forma
gradual (**S1 + S5 → S4**).

### D0 — Un solo dueño para cada dato y cada regla (revisión del 2026-11-11)
El owner observó que el diseño anterior dejaba la lógica dispersa. Además, **la versión 1
del cronograma siempre la registra la OA en el SEL**. Se fija este reparto:

- **Planificación (SEL):** cronograma, versiones, traslados y motivos. Concentra las reglas
  del cronograma:
  - total del ítem invariable;
  - meses pasados inmutables;
  - destino dentro de la vigencia;
  - reparto proporcional de PCC/OA;
  - tope de diciembre y límite de traslados.
- **Ejecución (KOFIX):** devengado, saldo no devengado, techo reprogramable, cierre contable
  y cierre de programación. KOFIX **pide** la reprogramación al SEL y no aplica reglas del
  cronograma.
- **La UI de KOFIX no tiene lógica de negocio.**

Hoy el cronograma lo escriben tres aplicaciones (`selv2`, sus ajustes y `sel-api-general`)
con dos significados de "versión" distintos. Además, PCC y OA no se recalculan en las
ediciones del SEL. Para resolverlo se presenta al equipo del SEL la propuesta
[`docs/propuestas/propuesta-sel-versionado-cronograma.md`](../propuestas/propuesta-sel-versionado-cronograma.md):
dos tablas, un catálogo, una columna nullable y SP en la BD del SEL.

- **Plan A (preferido, si el SEL lo aprueba):** las versiones y los traslados viven en el
  SEL según esa propuesta. D1, D2 y D8 se reemplazan por su sección 5. KOFIX solo llama a
  `POST convenios/{id}/reprogramaciones`.
- **Plan B (si se mantiene "solo SP"):** D1, D2 y D8 tal como están abajo, con los datos de
  la versión en KARDEX.

### D1 — (Plan B) La versión del convenio vive en KARDEX; las filas del cronograma siguen en el SEL
**Restricción:** en la BD del SEL no se crean tablas, solo SP. Se interpreta que tampoco se
agregan columnas ni tipos de tabla (TVP) a objetos existentes (Punto abierto 12).

- **En el SEL no cambia ningún esquema.** El cronograma sigue en `cronograma_marco_logico`,
  con el versionado que ya existe por ítem (`numero_version`, `estado`, `created_auth`,
  `created_at`). Se mantienen las consultas `MAX(numero_version)` actuales.
- **La versión del convenio y sus datos se guardan en KARDEX:**
  - `FIN.KDX_FIN_TMC_PROGRAMACION_VERSION`: `ide_postulante`, `num_version` (correlativo por
    convenio), `cod_tipo`, `num_anioCierre` / `num_mesCierre`, `ide_motivo`, `txt_sustento`,
    `cod_estado` (`PENDIENTE → APLICADA` o `FALLIDA`, D8), usuario y fechas.
  - `FIN.KDX_FIN_TMD_PROGRAMACION_VERSION_ITEM`: `ide_programacionVersion`, `ide_marcoLogico`,
    `num_versionSelAnterior` y `num_versionSelNueva`.
- **El vínculo con el SEL es la clave natural** (`marcoLogicoID`, `numero_version`). No hay
  FK entre bases (ADR-010). `mc-api-ejecucion` une los dos lados en memoria (API
  Composition).
- Tipos: `INICIAL`, `TRASLADO_CIERRE`, `REFORMULACION` y `AJUSTE`. `AJUSTE` cubre las
  ediciones del modal actual, permitidas solo en meses abiertos (D4). También registran su
  versión en KARDEX.
- Las versiones del SEL **sin** registro en KARDEX son el "histórico previo" (punto 0). Se
  listan por ítem y fecha, sin tipo ni motivo.
- **Cambios en `sel-api-general`, solo SP y código:**
  - SP `GENERAL.SEL_SP_R_ListarVersionesCronograma`: versiones por ítem de un convenio, con
    estado, autor, fecha y totales.
  - SP `GENERAL.SEL_SP_R_ObtenerCronogramaConvenio`: el cronograma de todos los ítems de un
    convenio en una sola llamada. Puede traer la versión vigente o una versión pedida por
    ítem. Reemplaza la llamada por ítem que hoy hace `cronogramas-mensuales`.
  - Endpoint de **guardado de varios ítems en una sola transacción**. Reutiliza en un bucle
    los SP de escritura que ya existen (`SEL_SP_U_DesactivarCronograma` y
    `SEL_SP_C_DetalleCronograma`) dentro de la unidad de trabajo actual. Así no hace falta un
    tipo de tabla.
  - En ese guardado:
    - **Concurrencia optimista:** recibe por ítem la versión base esperada y falla si la
      versión actual es otra.
    - **Idempotencia por contenido:** si el detalle recibido es igual al vigente, no crea otra
      versión y devuelve la actual.
    - **Corrección de H-06:** los meses con meta física 0 ya no se descartan en silencio.

### D2 — Cada traslado se registra con origen y destino (en KARDEX)
Se crea `FIN.KDX_FIN_TMD_PROGRAMACION_TRASLADO`: `ide_programacionVersion`,
`ide_marcoLogico`, `num_mesOrigen`, `num_mesDestino`, `num_metaFisica`, `imp_montoPcc` e
`imp_montoOa`. Un saldo puede repartirse en varios meses destino, con una fila por destino. Se
guarda como mes del convenio y se muestra como mes calendario.

### D3 — Lo no devengado se mide con el devengado
- **Saldo no devengado de un ítem en el mes M** = programado PCC vigente de M − **devengado**
  en M.
- **Devengado**: una transferencia cuenta por su fecha de registro. Un cheque cuenta desde
  `DEVENGADO`, por `fec_devengado`, aunque siga en la bolsa.
- Un solo cálculo: una política `IDevengadoPolicy`, hermana de `IPagoEfectivoPolicy`, en
  `EjecutadoCalculo` o en una calculadora paralela, sobre `KDX_FIN_SP_R_PAGOS_POSTULANTES`. A
  ese SP se le agregan `fec_devengado` y `fec_pagado` del cheque.
- En pantalla se rotula **"Devengado"**, nunca "Ejecutado". El "Ejecutado" de los listados y
  del Kardex sigue siendo el pagado (ADR-027).
- El programado sale de `POST programacion/reporte-mensual/detalle` (ADR-028), que se amplía
  para aceptar una **versión** o una fecha de corte (D7). El cálculo va en una calculadora pura
  en `Negocio`, como `ReporteMensualCalculo`.
- El saldo reprogramable de ADR 0012 D6 (`aprobado − solicitado`) se mantiene como **techo** de
  lo que se puede trasladar.

### D4 — El cierre de programación se apoya en el cierre contable
- **No se crea otro cierre contable.** El período M se puede cerrar para programación solo si
  M ya tiene cierre contable en `FIN.KDX_FIN_TC_CIERRES`. Así lo devengado de M ya no cambia.
- Lo que se registra es si **cada convenio resolvió sus saldos** del período. Se hace en
  `FIN.KDX_FIN_TC_CIERRE_PROGRAMACION` (`ide_postulante`, `num_anio`, `num_mes` calendario,
  estado `PENDIENTE → RESUELTO`, usuario y fecha).
- Sobre la tabla huérfana `FIN.KDX_FIN_TC_CIERRE_MENSUAL` (H-10): se adapta si sus columnas
  sirven, o se retira en el mismo script (Punto abierto 5).
- **Meses inmutables:** `PUT items/{id}/cronograma` rechaza cambios en meses con cierre
  contable. Todo cambio posterior pasa por traslado o reformulación.
- El guardado **conserva el programado de los meses pasados** (corrige H-07). El techo de D6
  se aplica solo a los meses abiertos.
- Calendario sugerido:
  - D1–D3: cierre contable de M.
  - D3–D5: el especialista resuelve sus saldos.
  - D5: corte y foto.
  - D6–D8: la UN envía a Presupuesto.
- Cada saldo se resuelve **trasladándolo** (D2) o marcándolo **"no se devengará en el año"**.
  Esto último es una señal para rebajar la certificación.
- Si en el corte queda un saldo sin resolver, se marca como *no devengado sin reprogramar*. No
  entra al requerimiento de M+1 y se alerta a la UN.

### D5 — La bolsa se muestra aparte y la anulación no reabre meses
- La bandeja muestra la **bolsa** de cada convenio: cheques en `DEVENGADO`, monto y días de
  espera, con alerta al pasar un umbral configurable.
- Sirve para presionar a la OA por su contrapartida. **No se traslada:** ya está devengado.
- Si un cheque se **anula** después del cierre (la OA nunca depositó), el devengado se
  revierte. **No se reabre el mes original.** El monto vuelve como saldo no devengado **en el
  mes de la anulación** y se traslada desde ahí, con motivo.

### D6 — Reglas de validación del traslado (en la API, no en los SP; ADR 0012 D7)
1. El total del ítem no cambia (si cambia, es `REFORMULACION`, con otro flujo).
2. Solo se trasladan saldos de meses con cierre contable.
3. El destino es posterior al período y está dentro de la vigencia del convenio (con las
   adendas de plazo).
4. **Tope de concentración en diciembre** (% del total anual del ítem). Se puede superar solo
   con evidencia de compra asegurada, adjunta vía `sel-api-archivos`.
5. Límite de traslados sucesivos del mismo saldo. Al superarlo, el ítem queda "en riesgo" y lo
   ve la UN.
6. Motivo obligatorio de un catálogo: clima, proveedor, trámite de la OA, falta de
   contrapartida de la OA, demora de AGROIDEAS, fuerza mayor u otro (con sustento).
7. Se corrige H-06: un detalle con meta física 0 y monto mayor a 0 se acepta o se rechaza con
   error explícito, nunca en silencio.

Días de corte, tope de diciembre, límite de traslados, umbral de días en la bolsa y tolerancia
van en **appsettings** y en `environment*.ts`, nunca fijos en el código.

### D7 — La foto del corte alimenta el requerimiento de certificación
- En el corte, `mc-api-ejecucion` congela `FIN.KDX_FIN_TMC_REQ_CERTIFICACION` + `_DET`:
  período M+1, especialista, convenio, ítem, monto PCC y **número de versión del convenio**
  usada.
- Estados: `BORRADOR → ENVIADO_UN → ENVIADO_PRESUPUESTO → CERTIFICADO`.
- Se registran el **número de certificación SIAF** y el monto certificado.
- La foto **no se recalcula**: un traslado posterior aparece como diferencia, no como un cambio
  silencioso.

### D8 — Reparto entre APIs, idempotencia y auditoría
- **`sel-api-general`:** solo escribe y lee las filas del cronograma (versiones por ítem),
  en una sola transacción por guardado.
- **`mc-api-ejecucion`:** versión del convenio, traslados, devengado, bolsa, cierre de
  programación, requerimiento, expedientes SIAF y orquestación. Es el único punto de entrada
  de KOFIX.
- **Sin transacción común entre las dos BD** (ADR-010). Como el SEL no puede guardar una clave
  de idempotencia (no hay tablas nuevas), **la intención se registra primero en KARDEX**:
  1. **KARDEX (transacción local):** se crea la versión en `PENDIENTE`, con sus traslados, la
     versión base esperada de cada ítem y la auditoría.
  2. **SEL:** se llama al guardado de varios ítems (D1), con concurrencia optimista e
     idempotencia por contenido.
  3. **KARDEX:** se marca `APLICADA` y se guarda el `numero_version` nuevo de cada ítem. Si el
     SEL rechazó el guardado (p. ej. otra persona cambió el ítem), se marca `FALLIDA` con el
     motivo.
  4. **Reintento seguro:** una versión que quedó `PENDIENTE` (p. ej. se cayó la red entre los
     pasos 2 y 3) se reintenta. Si el SEL ya la había aplicado, el contenido coincide, no se
     duplica y devuelve las versiones. La bandeja muestra las `PENDIENTE` con más de N
     minutos (configurable) y ofrece "Reintentar".
- Mientras una versión está `PENDIENTE`, el convenio no acepta otro traslado ni ajuste.
- **Sin caché** para cronogramas ni programado: el `IMemoryCache` de ADR-010 se limita a datos
  maestros.
- **Auditoría** de cada traslado, cada versión y cada cambio de estado del requerimiento, en la
  misma transacción (`RegistrarAuditEnTransaccionAsync`, ADR-026). Esto cierra el pendiente de
  ADR-009 (H-12).
- Tablas y SPs de KARDEX con la convención de ADR-003 (`FIN.KDX_FIN_T*`,
  `FIN.KDX_FIN_SP_[C|R|U]_*`).

### D9 — Expediente SIAF y fases
- `FIN.KDX_FIN_TMC_SOL_DESEMBOLSO` incorpora `cod_expedienteSiaf` y `num_anioSiaf`:
  - Se piden al registrar el desembolso o en cuanto Tesorería los asigna.
  - Son opcionales en el registro y obligatorios para el cierre de programación (Punto
    abierto 7).
- Se crea `FIN.KDX_FIN_TMD_SIAF_FASE`, una fila por registro de fase, con las columnas de la
  consulta del MEF:
  - **Datos de la consulta:** `num_anio`, `cod_secEjec`, `cod_expediente`, `cod_ciclo`,
    `cod_fase` (C, D, G, P), `num_secuencia`, `num_correlativo`, `cod_tipoDocumento`,
    `num_documento`, `fec_fase`, `cod_fuenteFinanciamiento`, `cod_moneda`, `imp_monto`,
    `cod_estado`, `fec_proceso` y `cod_idTransaccion`.
  - **Datos propios de KOFIX:** fuente (`MANUAL`, `IMPORTACION`, `SERVICIO`), fecha de la
    consulta y usuario.
  - Se guardan **todas** las filas (historial), con la marca `flg_vigente` en la fila `A`
    que tenga monto e Id Trx.
  - Clave única: año + UE + expediente + `cod_idTransaccion`. Las filas sin Id Trx usan año
    + UE + expediente + fase + secuencia + correlativo + estado + fecha de proceso. Así,
    reimportar el mismo Excel no duplica filas.
- La cabecera del expediente (tipo de operación, modalidad de compra, tipo de proceso) se
  guarda en `FIN.KDX_FIN_TMC_SIAF_EXPEDIENTE`, ligada a la solicitud de desembolso.
- **Devengado según el SIAF** = suma de las filas vigentes (estado `A`, con monto e Id Trx)
  de fase `D`, por mes de la columna Fecha. Es lo que se concilia contra el devengado de KOFIX,
  **por expediente y por mes**. **Girado según el SIAF** = lo mismo con la fase `G`; sirve
  para conciliar el pagado y la bolsa.
- La conciliación no empareja giro por giro: un devengado puede girarse en varios giros y la
  consulta no dice qué devengado paga cada giro.
- **Formato de importación** (verificado con la exportación del expediente 2026-1297-484,
  `consultaExpediente.xls`, 9 KB):
  - A pesar de la extensión `.xls`, **no es un libro de Excel**. Es **texto delimitado por
    tabulaciones**, UTF-8, con todos los campos entre comillas dobles (`""` para escapar).
  - Una fila de encabezado con las 14 columnas de la pantalla, en el mismo orden: `Ciclo`,
    `Fase`, `Sec`, `Corr`, `Doc`, `Numero`, `Fecha`, `FF`, `Moneda`, `Monto`, `Est.`,
    `Fecha Proceso`, `Id Trx`, `Enviado`.
  - `Id Trx` viene envuelto en HTML (`<label>4079873947</label>`): hay que quitar las
    etiquetas.
  - `Enviado` trae un **formulario HTML de varias líneas** dentro del campo (con saltos de
    línea CRLF). Se ignora. El lector debe respetar los saltos de línea dentro de comillas:
    no se puede leer línea por línea.
  - El monto viene con separador de miles (`21,000.00`) y las fechas en `dd/MM/yyyy` y
    `dd/MM/yyyy HH:mm:ss`.
  - **No incluye la cabecera del expediente** (año, entidad, número, tipo de operación). KOFIX
    toma el año, la UE y el expediente **del desembolso desde el que se sube el archivo**, no
    del archivo. Por eso la importación es siempre desde un expediente concreto.
  - Estados encontrados: `A`, `F`, `V` y vacío. Documentos: `032`, `027`, `243` y vacío.
  - Prueba de la regla de fila vigente sobre el archivo: 30 filas → 8 vigentes, una por
    secuencia. Totales C = D = G = 21,000.00, iguales a la pantalla.
- El botón "Enviar" de la columna `Enviado` envía `POST reenviarRespuestaById.jspx` con
  `controlTransferenciaId` = Id Trx. Por el nombre, **reenvía la respuesta de la transacción**;
  es una acción, no un dato. **KOFIX nunca la invoca.**
- **Conciliación:** se compara el devengado de KOFIX con la fase D del SIAF (fecha y monto) de
  cada expediente. Las diferencias aparecen en la bandeja y en una alerta nueva
  (`IReglaAlerta`).
- La fuente de las fases es intercambiable detrás de una interfaz (`ISiafFasesProvider`):
  - hoy: registro manual (S1), consulta asistida (S1b) e importación de archivos (S5);
  - mañana: el servicio oficial del MEF (S4), sin cambiar el resto.
  - La automatización con CAPTCHA (S1c) y el scraping del SIAF web (S2) no se implementan.
- **Consulta asistida (S1b):**
  - En el detalle del desembolso, el botón **"Verificar en el MEF"** muestra el año, el
    código de la UE y el expediente listos para copiar, y abre la consulta pública en una
    pestaña nueva.
  - El usuario resuelve el CAPTCHA. Después, de preferencia, **exporta el Excel de la
    consulta y lo sube a KOFIX**, que lo interpreta (fuente `IMPORTACION`). Si no, registra
    las fases a mano (fuente `MANUAL`). En ambos casos queda la marca "verificado en consulta
    pública", con usuario y fecha.
  - El código de la UE de AGROIDEAS (`secEjec`) y las URL de la consulta van en
    **appsettings**.
- El número de certificación del requerimiento (D7) se verifica igual, con la consulta de
  certificados.

### D10 — Navegación y acceso (ADR-019, ADR-028)
- **Traslado de saldos:** dentro de `/main/programacion-vigente/:id`.
- **Bandeja de cierre de programación:** menú nuevo `/main/cierre-programacion`, registrado
  en `FIN.KDX_TG_MENU`.
- **Requerimiento de certificación:** menú nuevo `/main/requerimiento-certificacion`.
- Acceso por menú (`[RequiereMenu]`) y por permiso propio: `CIERRE_PROGRAMACION` para
  resolver saldos y `GESTION_CERTIFICACION` para el requerimiento. Para ver todas las
  carteras, un permiso del módulo en la misma línea que `VER_TODOS_REPORTES`.
  **No se crea un rol "Responsable UN"** (ADR-028, decisión 4).
- La UI se construye con `@agroideas/ui` y el tema, en la arquitectura de tres capas de
  kofix-ejecucion.

### D11 — Pantallas
1. **Bandeja de cierre:** cartera por período; por convenio e ítem: programado, devengado,
   saldo no devengado, bolsa y estado. Semáforo con el criterio de ADR 0010 y los umbrales de
   ADR-028.
2. **Traslado de saldos:** distribución en meses destino, motivo y sustento, y vista previa
   vN frente a vN+1.
3. **Histórico de versiones:** línea de tiempo, comparación de dos versiones mes a mes,
   trazabilidad de cada traslado y exportación.
4. **Requerimiento de certificación:** consolidado, envío, número de certificación y
   comparación certificado frente a devengado.
5. **Expedientes SIAF:** fases por desembolso, importación de archivos y diferencias de
   conciliación.

## Plan por fases

| Fase | Alcance | Repos | Resuelve |
|---|---|---|---|
| **1 — Histórico en solo lectura** | SP `SEL_SP_R_ListarVersionesCronograma` y `SEL_SP_R_ObtenerCronogramaConvenio` con sus endpoints. Endpoint en mc-api y pantalla de histórico (todo es "histórico previo" hasta la Fase 3). | sel-api-general (solo SP + código), mc-api, kofix | H-04 |
| **2 — Devengado y bolsa** | `IDevengadoPolicy`, fechas del cheque en `PAGOS_POSTULANTES`, devengado mensual y bolsa. Se registra en ADR-029 junto con la corrección de H-09. | mc-api, kofix | Base de D3 y D5, H-09 |
| **3 — Modelo de versión del convenio** | Tablas `PROGRAMACION_VERSION` y `_VERSION_ITEM` en KARDEX. Guardado de varios ítems en el SEL (código, sin tablas), con concurrencia optimista e idempotencia por contenido. Flujo `PENDIENTE → APLICADA`. El guardado actual registra versiones `AJUSTE`, con auditoría. | sel-api-general (código), mc-api | H-01, H-02, H-06, H-12 |
| **4 — Cierre y traslado** | `CIERRE_PROGRAMACION` sobre el cierre contable, `PROGRAMACION_TRASLADO` (KARDEX), reglas D6, inmutabilidad, H-07, bandeja y traslado. | mc-api, kofix | H-03, H-05, H-07, H-10 |
| **5 — Requerimiento de certificación** | Foto del corte, estados, número de certificación y pantalla. | mc-api, kofix | H-08 |
| **6 — Expediente SIAF (S1 + S5)** · *mejora futura* | Campos de expediente, `SIAF_FASE`, registro manual, importación y alerta de conciliación. | mc-api, kofix | H-11 |
| **7 — Servicio del MEF (S4)** · *mejora futura* | Nuevo `ISiafFasesProvider` cuando el MEF habilite el canal. | mc-api | H-11 (automático) |
| **8 — Indicadores** | Traslados por OA y especialista, % concentrado en el IV trimestre, precisión, días en la bolsa e ítems en riesgo. | mc-api, kofix | Gestión de la UN |

Las Fases 6 y 7 (SIAF) quedan como **mejora futura** por decisión del owner (2026-11-11): el alcance inmediato es la reprogramación (Fases 1 a 4). El trámite ante el MEF para la
Fase 7 conviene iniciarlo ya, porque su plazo no depende del equipo.

## Consecuencias

### Positivas
- **Una sola fuente de verdad:** el monto a certificar sale del cronograma, congelado y
  trazable hasta su versión.
- **La medida correcta para cada pregunta:** devengado para la meta presupuestal, pagado para
  la OA, bolsa para lo que espera contrapartida. Ninguna se rotula como otra.
- **Cifras estables:** los meses cerrados no se reescriben y el devengado no cambia de mes.
- **Sin duplicar procesos:** se reutilizan el cierre contable, el reporte de ADR-028 y el
  versionado de `sel-api-general`.
- **Mejor ejecución presupuestal:** los saldos se trasladan pronto y repartidos, se frena la
  acumulación en diciembre y lo que no se devengará se avisa a tiempo para rebajar la
  certificación.
- **Conciliación con el SIAF:** cada desembolso queda vinculado a su expediente.
- **Auditoría completa** (OCI / Contraloría) y cierre del pendiente de ADR-009.

### Negativas / riesgos
- **Carga operativa:** tarea mensual con fecha límite y registro del expediente SIAF.
  Mitigación: resolución en lote e importación de archivos (S5).
- **Dos BD sin transacción común:** se mitiga registrando primero la intención en KARDEX, con
  idempotencia por contenido y concurrencia optimista en el SEL (D8). Un fallo deja la versión
  en `PENDIENTE`, visible y con reintento, sin datos inconsistentes.
- **Los datos de la versión (tipo, motivo, traslados) no están en el SEL:** otros
  consumidores del cronograma (p. ej. sigec) solo ven las versiones por ítem, sin motivo.
  Para el contexto tienen que consultar a KOFIX.
- **Cambio de comportamiento:** el modal ya no edita meses cerrados. Hay que comunicarlo.
- **Dos cifras de "avance" en pantalla** (devengado y pagado): requiere rótulos claros y una
  ayuda breve.
- **Dependencia del MEF:** sin S4, las fases se mantienen a mano o por archivo y pueden
  atrasarse.
- **Versiones previas por ítem:** su agrupación por convenio es aproximada y no tienen motivo.
- **Más superficie:** todas las tablas nuevas son de KARDEX: versión, versión por ítem,
  traslado, cierre de programación, requerimiento y, a futuro, SIAF. En el SEL solo hay dos
  SP de lectura y código. Además, una docena de endpoints nuevos con sus pruebas.

## Puntos abiertos
0. **Decisiones del owner (2026-11-11), ya aplicadas al diseño:**
   - **Mes cerrado = mes con cierre contable** (`KDX_FIN_TC_CIERRES`). Confirma D4.
   - **El traslado lo aprueba solo el especialista:** queda vigente al registrarlo, con
     motivo. Sin estados de aprobación ni bandeja de supervisor. La UN lo ve en el histórico
     y en las alertas.
   - **Un traslado mueve el monto PCC, la meta física y la contrapartida OA en proporción**,
     igual que `GuardarCronogramaAsync`. Resuelve el punto 10.
   - **Las versiones previas se muestran como "histórico previo"**, por ítem y fecha, sin
     migración. Resuelve el punto 4.
   - **El SIAF (Fases 6 y 7) es una mejora futura.** El alcance inmediato es la
     reprogramación (Fases 1 a 4).
   - **En la BD del SEL no se crean tablas, solo SP.** La versión del convenio y los
     traslados se guardan en KARDEX (D1, D2, D8).
1. ~~Quién aprueba el traslado~~ **Resuelto:** solo el especialista (punto 0).
2. **Fechas de corte** (D3, D5, D8) y si se cuentan en días hábiles.
3. **Traslados al año siguiente** en convenios multianuales: si requieren coordinar la
   programación multianual con Presupuesto.
4. ~~Versiones previas~~ **Resuelto:** se muestran como "histórico previo" (punto 0).
5. **Tabla huérfana `KDX_FIN_TC_CIERRE_MENSUAL`:** adaptarla o retirarla (H-10).
6. **Mes calendario con adendas:** confirmar que `fechaFirma` sigue siendo la base del mes 1
   cuando una adenda amplía el plazo.
7. **Expediente SIAF:**
   - ¿Uno por solicitud de desembolso o uno por detalle?
   - ¿Quién lo registra (especialista o Tesorería) y cuándo es obligatorio?
   - ¿Cómo se trata un cheque de gerencia, que se devenga en un momento y se gira en otro?
8. **Canal oficial del MEF (S4):** confirmar con la OGTI si existe un servicio de consulta de
   fases por expediente (vía PIDE u otro), con qué convenio y con qué plazo. Hoy solo existe
   la consulta pública VFP, con CAPTCHA.
8b. ~~Contenido de la respuesta de la consulta VFP~~ **Resuelto el 2026-11-11** con los
   expedientes 2026-160-7503 (solo compromiso) y 2026-1297-484 (compromiso, devengados y
   giros). Ver Contexto y D9. El formato de importación quedó fijado con la exportación del
   expediente 484 (D9). Queda pendiente:
   - confirmar con Tesorería el significado del estado `V` (`F` = firmado, ya confirmado) y
     de los tipos de documento (`032`, `027`, `243`);
   - consultar el expediente de un **desembolso a una OA por cheque de gerencia**, para ver
     si la fase G aparece al generar el cheque o recién cuando la OA deposita su contrapartida
     (eso define si la bolsa se ve en el SIAF).
8c. ~~Código de la Unidad Ejecutora~~ **Resuelto:** AGROIDEAS es la UE **1297 · PROGRAMA DE
   COMPENSACIONES PARA LA COMPETITIVIDAD**. Va en appsettings (`Siaf:SecEjec`).
9. **Formato de importación (S5):** qué reporte del SIAF exporta hoy la UE y con qué columnas.
10. ~~Contrapartida OA~~ **Resuelto:** el traslado mueve PCC, meta física y OA en proporción
    (punto 0). El requerimiento de certificación sigue incluyendo solo el monto PCC.
11. **Umbral de días en la bolsa** a partir del cual se alerta.
12. **Alcance de la restricción del SEL:** confirmar que "solo SP" excluye también agregar
    columnas a tablas existentes y crear tipos de tabla (TVP). El diseño ya lo asume y no los
    usa.

## Referencias
- `SEL_APIS/sel-api-general/sel-api-general.Negocio/Programacion/ProgramacionServicio.cs:117` — `GuardarCronogramaAsync`.
- `SEL_APIS/sel-api-general/Database/004_procedimientos.sql` — `SEL_SP_C_DetalleCronograma`,
  `SEL_SP_U_DesactivarCronograma`, `SEL_SP_R_ObtenerVersionActualCronograma`, mes calendario
  (`:1344`, `:2411`).
- `SEL_APIS/sel-api-general/docs/adr/0002-programacion-multianual-backend.md`, `ADR-001-poa-cronograma-asignacion.md`.
- `KOFIX_APP/mc-api-ejecucion/mc-api-ejecucion.Negocio/Services/ProgramacionService.cs:45` — cartera y saldo.
- `KOFIX_APP/mc-api-ejecucion/mc-api-ejecucion.Negocio/Services/Kardex/EjecutadoCalculo.cs` y `IPagoEfectivoPolicy` — pagado (ADR-027).
- `KOFIX_APP/mc-api-ejecucion/Database/20260828_cheque_gerencia_devengado_girado.sql:108-127, 228-240` — fechas de devengado y giro (H-09).
- `KOFIX_APP/mc-api-ejecucion/Database/kardex_setup_full.sql:389, 424` — `KDX_FIN_TC_CIERRE_MENSUAL` (huérfana) y `KDX_FIN_TC_CIERRES`.
- `KOFIX_APP/mc-api-ejecucion/Docs/` — ADR-003, 009, 010, 011, 019, 020, 026, 027, 028.
- MEF, consulta pública de expedientes y certificados (con CAPTCHA, inspeccionada el 2026-11-11):
  [consultaExpediente.jspx](https://apps2.mef.gob.pe/consulta-vfp-webapp/consultaExpediente.jspx),
  [consultaCertificado.jspx](https://apps2.mef.gob.pe/consulta-vfp-webapp/consultaCertificado.jspx).
- MEF, manuales y capacitaciones del SIAF:
  [conciliación de operaciones SIAF](https://www.mef.gob.pe/contenidos/siaf/manuales/MU_conciliacion_operaciones_siaf.pdf),
  [módulo administrativo SIAF](https://mef.gob.pe/contenidos/ogie/capacitacion/4_SIAF_administrativo_28042017.pdf),
  [comunicado 002-2023-OGTI (PIDE)](https://www.mef.gob.pe/contenidos/ogie/capacitacion/comunicado_002_2023_OGTI.pdf).
- Este monorepo: ADR 0010, ADR 0012 (H-02, D6, D7).
