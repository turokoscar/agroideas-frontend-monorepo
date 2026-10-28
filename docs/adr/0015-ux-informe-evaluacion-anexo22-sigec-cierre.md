# ADR 0015: UX del Informe de Evaluación (Anexo 22) en `apps/sigec-cierre` — análisis situacional y plan

## Estado
Propuesto · pendiente de la decisión del owner sobre los [puntos abiertos](#puntos-abiertos). Ver el
[Plan de implementación por fases](#plan-de-implementación-por-fases).

## Fecha
2026-10-28 · Auditoría hecha en el navegador (`localhost:4400`, usuario de la UN, expediente 1 · convenio
`0046-2024-ST`, estado `EN_EVALUACION_UN`, Anexo 22 en borrador, versión 1) y sobre el código de
`features/expediente/informe-evaluacion/`.

## Responsables
Equipo Frontend AGROIDEAS · Owner del módulo: Oscar Pazos

## Aplica a
- `apps/sigec-cierre` — `InformeEvaluacionComponent`, `TablaIndicadoresComponent`, `IndicadorModalComponent` y
  `validacion-anexo22.ts`. **Casi todo el trabajo.**
- `libs/ui` — solo si hace falta una pieza que no existe (barra de acciones fija, área de texto que crece); se
  reutilizan `ui-stepper`, `ui-tabs`, `ui-state` y `ui-info-tooltip`, que ya están.
- `SIGEC/sigec-api-cierre` — **solo si el owner aprueba la Fase 6** (`CompletitudAnexo22`), y para revisar el origen
  de los ejecutados en 0 (Fase 0).
- El PDF oficial del Anexo 22 **no cambia**: el formato I a XI se conserva en el documento que se firma.

## Contexto
La Etapa 3 la trabaja el especialista de la Unidad de Negocios, que tiene **90 días calendario** para evaluar la
ejecución del PNT, firmar el Anexo 22 y elevar el Expediente Único a la DE. El ADR 0014 ya centró el expediente en la
etapa activa (D5) y agregó validación por campo (D6), pero el formulario del Anexo 22 sigue siendo, según el owner,
"demasiado extenso".

La auditoría confirma la percepción, con un matiz: **el problema no es la cantidad de campos, sino su reparto.**

### Lo que el especialista llena

| Tipo | Cantidad | Detalle |
|---|---|---|
| Textos obligatorios | 11 | Análisis 2.1, 2.2, 2.3, 2.4, III, 4.1 y 4.2; VII Logros, VIII Lecciones, X Conclusiones, XI Recomendaciones |
| Texto opcional | 1 | IX Dificultades |
| Datos sueltos | 3 | Centro poblado, término con adenda, ejecutado de la organización (4.1) |
| Decisión | 1 | Resultado de la evaluación (3 opciones) |
| Filas manuales | opcionales | Indicadores de 2.2, 2.3, 2.4 y III (modal) |

### Dónde está (alto medido en el navegador, viewport de 927 px)

| Desde (px) | Sección | Editable |
|---|---|---|
| 0 | Aviso de desviaciones + lista de 11 faltantes | — |
| 258 | I. Información general (unos 580 px) | 2 campos; el resto viene del SEL |
| 836 | II. Indicadores: 4 tablas de 17–18 columnas + 4 análisis | 4 textos |
| 2291 | III. Objetivos específicos: 1 tabla + análisis | 1 texto |
| 2650 | IV. Ejecución financiera: 3 tablas (4.1, bienes, servicios) + 2 análisis | 1 monto, 2 textos |
| 3708 | V. Monitoreo (RTF por paso crítico) | nada |
| 3954 | VI. Práctica ambiental | comentarios por fila |
| 4165 | VII a XI y resultado | 5 textos, 1 decisión |
| 4752 | Guardar / Descargar / Presentar firmado | acciones |

Total: **unos 5.000 px, 5,4 pantallas**, 11 secciones y 9 tablas. Cerca de la mitad del alto es información de solo
lectura (SEL, KOFIX, RTF).

## Hallazgos

### H-01 — Todo el formato oficial en una sola columna, sin navegación 🔴
Las secciones I a XI se muestran en el orden del PDF, sin índice, pasos ni avance por sección. El especialista
desplaza la página una y otra vez para ubicarse, y no sabe cuánto le falta en cada bloque.

### H-02 — El trabajo se puede perder 🔴
"Guardar informe" es el único botón para guardar, y está a unos 4.700 px del inicio. No hay guardado automático ni
aviso al salir de la página. El aviso "Hay cambios sin guardar" también está solo al final. Son 11 textos largos (la
API admite hasta 8.000 caracteres cada uno): cerrar la pestaña o que expire la sesión significa perderlos.

### H-03 — Lo de solo lectura ocupa el camino 🟠
La sección I, la V y las tablas de bienes y servicios (4.2) son contexto que se consulta, no algo que se trabaje, pero
están intercaladas entre los campos editables.

### H-04 — Tablas de indicadores de 17–18 columnas 🟠
N°, Concepto, Unidad, (columna propia), LB, programado y ejecutado de 3 años, Resultado, Var. vs LB y Origen, con
encabezado de dos niveles y números de 12 px. Siete tablas así. La tabla tiene `min-w-[980px]`: en pantallas angostas
aparece scroll horizontal.

### H-05 — El resaltado de desviación crítica satura 🟠
Se pinta la fila entera. En el expediente auditado, las 5 filas de producción están en rojo con −100 % en los tres
años: cuando todo está resaltado, nada destaca. (Ver también el punto abierto 1: esos valores pueden ser un problema de
datos.)

### H-06 — La lista de faltantes recibe al usuario como un error 🟠
Al abrir el formulario aparece un bloque ámbar con 11 pendientes, antes de que el especialista haga nada. Funciona
como navegación (cada uno lleva a su campo), pero en la primera visita se lee como "lo hiciste mal" y duplica lo que
haría un avance por sección.

### H-07 — Análisis obligatorio en secciones vacías 🟠
2.2 Precios, 2.3 Comercialización y 2.4 Ingresos no tienen indicadores en este convenio y aun así exigen su análisis
(`CompletitudAnexo22` en la API y `faltantesAnexo22` en la UI). El especialista termina escribiendo "no aplica" para
poder avanzar.

### H-08 — Los análisis no guían 🟡
Todos se llaman "Análisis *", sin decir qué debe contener cada uno ni cuánto espacio queda. Las áreas de texto tienen 3
o 4 líneas y no crecen; con textos reales (Logros, Dificultades) aparece scroll dentro del campo.

### H-09 — El cierre del flujo no se explica 🟡
El orden real es guardar → descargar → firmar fuera del sistema → subir el PDF → presentar. "Descargar para firmar"
aparece deshabilitado sin decir por qué junto a él; el motivo está más abajo, junto a otro botón. El resultado de la
evaluación, la decisión más importante del informe, queda al final, entre los textos.

### H-10 — Detalles menores 🟡
- El contador del plazo (`ui-countdown-banner`) es grande y verde aun con 68 días por delante; compite con el
  formulario.
- Las notas de origen de los datos ("Datos del SEL: no se editan aquí") van en texto de 11 px, poco visible.

### Lo que está bien y se conserva
- La validación por campo de la Fase 5 del ADR 0014: mensaje bajo el campo, `aria-invalid` y foco al primer error.
- La edición de indicadores en un modal (`IndicadorModalComponent`): la tabla es demasiado ancha para editar en línea.
- La etiqueta de origen por fila (`SEL + RTF`, `KOFIX`, `MANUAL`).
- El estado de la versión ("Borrador · versión 1") y el historial de versiones firmadas.

## Decisiones

### D1 — El formulario se trabaja en pasos; el PDF no cambia
El Anexo 22 se reparte en **cuatro pasos** con `ui-stepper` (ya está en `@agroideas/ui`), cada uno con su avance
(por ejemplo, "2 de 3"):

| Paso | Secciones | Qué hace el especialista |
|---|---|---|
| 1. Indicadores | II (2.1 a 2.4), III, VI | Revisa los indicadores, agrega los manuales y escribe 5 análisis |
| 2. Ejecución financiera | IV (4.1 y 4.2) | Registra lo ejecutado por la organización y escribe 2 análisis |
| 3. Conclusiones | VII a XI y resultado | Escribe 5 textos y elige el resultado |
| 4. Firmar y presentar | — | Descarga, firma, sube y presenta (D6) |

Los pasos se recorren libremente (no es un asistente que obligue a ir en orden), y el paso activo se recuerda por
expediente para volver donde se quedó. La sección I y la V no son un paso: van al panel de consulta (D3). Con el
informe firmado (`ro`) se mantiene una vista continua de solo lectura.

### D2 — El trabajo no se pierde
- **Barra de acciones fija** al pie del formulario: Guardar, estado del guardado ("Guardado hace 2 min" /
  "Cambios sin guardar") y avance general ("9 de 13").
- **Guardado automático del borrador** con `PUT /anexos22`, que ya acepta borradores incompletos, tras una espera
  desde la última edición. La espera va en `environment*.ts` (`evaluacion.esperaAutoguardadoMs`), no fija en el
  código (regla del owner).
- **Aviso al salir** con cambios sin guardar (`canDeactivate` en `/expedientes/:id` y `beforeunload`).

### D3 — Lo de solo lectura se consulta, no se recorre
Un panel **"Datos del convenio"** reúne la sección I (organización, RUC, plan, vigencia, socios, problema, objetivos)
y la V (monitoreo), plegado por defecto en la parte superior del formulario. Centro poblado y término con adenda, que
sí se editan, pasan al paso 3 junto a los demás datos que llena la UN. Las tablas de bienes y servicios de la 4.2
quedan en su paso, pero plegadas, con un resumen visible (total programado, ejecutado y %).

### D4 — Tablas compactas con detalle por año
La tabla de indicadores muestra por defecto **Concepto, Unidad, LB, Programado (último año), Ejecutado, Var. y
Origen**. El detalle de los tres años se abre al expandir la fila. La desviación crítica se marca **solo en la celda
de variación** (tono e icono), no en la fila entera. Objetivo: sin scroll horizontal a 1366 px.

### D5 — El avance reemplaza a la lista de faltantes
Cada paso del stepper muestra cuántos obligatorios le faltan. La lista de faltantes deja de aparecer al abrir el
formulario y se muestra solo al intentar descargar o presentar (o con "Revisar lo que falta"). Cada faltante lleva al
paso y al campo. Las reglas no cambian: `faltantesAnexo22` sigue siendo el espejo de `CompletitudAnexo22`.

### D6 — Firmar y presentar es un paso con sus sub-pasos a la vista
El paso 4 muestra los tres sub-pasos (descargar el PDF, firmarlo, subir el firmado) con su estado, y el motivo de cada
botón deshabilitado junto a él. El resultado de la evaluación encabeza el paso 3, no lo cierra.

### D7 — Cada análisis dice qué se espera
Texto de ayuda breve por análisis (con `ui-info-tooltip` o bajo la etiqueta), áreas de texto que crecen con el
contenido y contador de caracteres frente al límite de la API (8.000, `ValidadoresAnexo22.MaximoTexto`), que va en
`AppSettings` como los demás límites.

### D8 — Sin cambios de reglas, salvo la Fase 6
El ADR es de presentación: no cambia la máquina de estados, los plazos ni el PDF. La única regla que podría cambiar es
la de H-07, y solo si el owner la aprueba (Fase 6), porque exige tocar `CompletitudAnexo22` en la API.

## Plan de implementación por fases

Cada fase deja lint, test y build en verde (`npx nx run-many -t lint,test,build -p sigec-cierre`, y `ui` si se toca),
se revisa en el navegador con el usuario de la UN local (incluido el espaciado, D6b del ADR 0014) y se commitea por
separado.

### Fase 0 — Verificar los ejecutados en 0 (punto abierto 1) 🔴
- Revisar en `sigec-api-cierre` de dónde salen `numEjecAnio1..3` de los indicadores `SEL + RTF` y por qué el expediente
  1 los recibe en 0 en los tres años.
- Si es un defecto de datos o de integración, se corrige en la API (fuera de este ADR, con su propio registro). Si son
  datos reales, se documenta y la Fase 3 resuelve la saturación visual.
- No cambia la UI.
- ✅ 28/10/2026: eran dos defectos de integración, corregidos en sigec-api-cierre y sigec-api-rtf (ver Registro).

**Criterio de aceptación:** se sabe si los ejecutados en 0 del expediente 1 son reales o un defecto, con la causa
anotada en el Registro.

### Fase 1 — No perder el trabajo (H-02, D2) 🔴
- Barra de acciones fija con Guardar, estado del guardado y avance general.
- Guardado automático del borrador con `evaluacion.esperaAutoguardadoMs` en `AppSettings` y los tres `environment*.ts`.
  No se dispara mientras haya un guardado en curso ni con el informe firmado.
- `canDeactivate` en `/expedientes/:id` y `beforeunload` con cambios sin guardar.
- Pruebas: autoguardado tras la espera, sin guardados en paralelo, aviso al salir.
- ✅ Implementada el 28/10/2026 (ver Registro).

**Criterio de aceptación:** al escribir un análisis y cerrar la pestaña tras la espera configurada, al volver el texto
está; al intentar salir antes, el navegador avisa. El botón Guardar está visible sin desplazarse en cualquier punto del
formulario.

### Fase 2 — Pasos y avance (H-01, H-06, H-09, D1, D5, D6) 🔴
- `ui-stepper` con los cuatro pasos de D1 y su avance; paso activo recordado por expediente.
- La lista de faltantes solo al descargar o presentar; `validacion.enfocar(id)` cambia primero al paso del campo.
- Paso 4 "Firmar y presentar" con sus sub-pasos y los motivos de cada botón deshabilitado. El resultado encabeza el
  paso 3.
- Vista continua de solo lectura con el informe firmado.
- Pruebas: avance por paso, navegación del faltante al paso y al campo, vista firmada.
- ✅ Implementada el 28/10/2026 (ver Registro); el criterio de altura se cumple en los pasos 2 a 4, no en el 1 (queda para la Fase 3).

**Criterio de aceptación:** a 1366×768, cada paso cabe en unas 2 pantallas (frente a 5,4 de hoy); al pulsar un
faltante, se abre su paso con el foco en el campo.

### Fase 3 — Panel de consulta y tablas compactas (H-03, H-04, H-05, D3, D4) 🟠
- Panel "Datos del convenio" plegable con las secciones I y V; centro poblado y adenda al paso 3.
- Bienes y servicios de la 4.2 plegados con su resumen.
- `TablaIndicadoresComponent` en modo compacto con detalle por año expandible y desviación marcada solo en la celda.
- Pruebas: expandir y plegar filas, resaltado por celda, teclado.
- ✅ Implementada el 28/10/2026 (ver Registro). Sin scroll horizontal a 1366 px; el paso 1 sigue largo (2.044 px).

**Criterio de aceptación:** ninguna tabla del Anexo 22 tiene scroll horizontal a 1366 px; un indicador crítico se
distingue de uno normal sin que la fila entera cambie de color.

### Fase 4 — Ayuda en los análisis (H-08, H-10, D7) 🟡
- Texto de ayuda por análisis (contenido a validar con la UN, punto abierto 3).
- Áreas de texto que crecen y contador frente a `evaluacion.longitudTexto` (8.000) en `AppSettings`.
- `ui-countdown-banner` en versión compacta mientras el plazo no esté por vencer (`plazos.diasAvisoPrevio`).
- Notas de origen como insignias en lugar de texto de 11 px.

- ✅ Implementada el 28/10/2026 (ver Registro). Las ayudas son una redacción inicial: falta validarlas (punto abierto 3).

**Criterio de aceptación:** cada análisis dice qué se espera de él; un texto largo se lee completo sin scroll interno;
el contador avisa antes de llegar al límite de la API.

### Fase 5 — Medir con un especialista 🟡
- Sesión con un especialista de la UN sobre un expediente real en QA: tiempo para completar el informe y dudas que
  surjan, frente al formulario anterior.
- Ajustes menores que salgan de la sesión.

**Criterio de aceptación:** el especialista completa el borrador sin pedir ayuda sobre dónde está cada campo; los
hallazgos se anotan en el Registro.

### Fase 6 — Análisis opcional en secciones sin indicadores (H-07) ⚪ condicional
Solo si el owner lo aprueba (punto abierto 2).
- **API:** `CompletitudAnexo22` deja de exigir el análisis de 2.2, 2.3 o 2.4 (y quizá III) cuando la sección no tiene
  indicadores; el PDF muestra "No aplica" en ese caso. Pruebas.
- **UI:** `faltantesAnexo22` con la misma regla; el análisis de una sección vacía se muestra como opcional.

**Criterio de aceptación:** un convenio sin indicadores de precios se presenta sin escribir el análisis 2.2, y el PDF
lo muestra como "No aplica".

### Resumen

| Fase | Alcance | Repos | Depende de |
|---|---|---|---|
| 0 | Verificar los ejecutados en 0 | API (lectura) | — |
| 1 | Barra fija, autoguardado y aviso al salir | UI | — |
| 2 | Pasos, avance y paso de firma | UI | 1 (la barra muestra el avance) |
| 3 | Panel de consulta y tablas compactas | UI | 2 |
| 4 | Ayuda en los análisis | UI | — |
| 5 | Medir con un especialista | — | 1 a 4 |
| 6 | Análisis opcional en secciones vacías | API + UI | decisión del owner |

Las fases 1 y 2 son las de más impacto: atacan la pérdida de trabajo y la longitud. La 0 es una consulta corta y
conviene hacerla primero, porque si los ejecutados son un defecto cambia el número de desviaciones críticas que ve el
especialista. La 4 es independiente y puede ir en paralelo.

## Alternativas consideradas
- **Pestañas en lugar de stepper.** Descartada como opción principal: las pestañas no muestran avance ni orden, y el
  Anexo 22 tiene un orden natural que termina en la firma. Si el stepper no cabe en móvil, `ui-tabs` es el respaldo.
- **Índice lateral fijo con la página larga.** Descartada: ayuda a ubicarse, pero mantiene las 5,4 pantallas y el
  guardado al final.
- **Asistente estricto (no avanzar sin completar el paso).** Descartada: el especialista llena el informe en varias
  sesiones y en el orden que le llegan los datos; bloquearlo empeoraría la experiencia.
- **Editar las tablas en línea.** Descartada (como en el ADR 0014): la tabla es demasiado ancha; el modal se mantiene.
- **Reordenar el PDF.** Descartada: el formato I a XI es oficial.

## Consecuencias

### Positivas
- El especialista ve una sección de trabajo a la vez y sabe cuánto le falta.
- El trabajo escrito no se pierde.
- Las desviaciones críticas vuelven a destacar.
- La barra fija y el área de texto que crece pueden pasar a `libs/ui` para el Acta (Anexo 21) y para RTF.

### Negativas / riesgos
- El autoguardado multiplica los `PUT /anexos22`; la espera debe ser razonable y no guardar en paralelo.
- `TablaIndicadoresComponent` cambia de forma: hay que revisar también su uso en solo lectura (informe firmado).
- El cambio de pasos debe convivir con la validación por campo (foco y scroll a un campo que está en otro paso).
- La Fase 6, si se aprueba, toca la API y el PDF: hay que desplegarla junto con la UI.

## Puntos abiertos
1. **Ejecutados en 0 (Fase 0):** en el expediente 1, los 5 indicadores de producción tienen ejecutado 0 en los tres
   años (−100 %), con origen `SEL + RTF`. ¿Defecto de datos o de integración, o datos reales?
2. **Análisis en secciones vacías (Fase 6):** ¿se permite presentar sin el análisis de una sección sin indicadores, o
   el formato exige escribir siempre algo? Requiere decisión del owner, y quizá consultar a la UN o a USE.
3. **Contenido de las ayudas (Fase 4):** qué se espera de cada análisis; conviene redactarlo con un especialista de la
   UN o con el Instructivo.
4. **Espera del autoguardado (Fase 1):** valor inicial propuesto, 3 s desde la última edición; ajustable por ambiente.

## Referencias
- `docs/adr/0013-ui-sigec-cierre-expediente-de-cierre.md` — flujo y fases de la app.
- `docs/adr/0014-ux-y-reutilizacion-visual-sigec-cierre.md` — D5 (etapa activa), D6 (validación por campo), D6b
  (espaciado).
- `apps/sigec-cierre/src/app/features/expediente/informe-evaluacion/` — formulario, tabla y modal de indicadores.
- `apps/sigec-cierre/src/app/core/models/validacion-anexo22.ts` — espejo de las reglas de completitud.
- `SIGEC/sigec-api-cierre/SIGEC_CIERRE.Negocio/Anexo22/CompletitudAnexo22.cs` y `ValidadoresAnexo22.cs` — reglas y
  límites de la API.

## Registro de implementación

### Fase 0 — 2026-10-28: los ejecutados en 0 son un defecto de integración (causa en el código; falta confirmar con datos)
**Causa.** `PrecargaAnexo22.EjecutadoPorAnioAsync` (sigec-api-cierre) suma la `MetaEjecutada` de
`GET pasos-criticos/{id}/indicadores` de la API RTF **sin el parámetro `ideRtf`**
(`ClienteRtfUsuario.ListarAvanceAsync`). Desde el ADR-009 de RTF, el avance que reporta la OA se guarda en
`SIGEC_RTF.rtf.SRT_TMD_AVANCE_INDICADOR`, ligado al RTF, y `PasoCriticoServicio.ListarIndicadoresPorPasoCriticoAsync`
solo lo aplica cuando recibe `ideRtf`. Sin él devuelve lo que tiene BD_SEL, que ya no se actualiza: `MetaEjecutada` es
`decimal` no nulo, así que llega **0** (no `null`) y la precarga lo toma como ejecutado real. De ahí el −100 % en los
tres años y las 5 "desviaciones críticas" del expediente 1.

**Alcance.** Afecta a todo Anexo 22 con indicadores `SEL + RTF` (secciones 2.1 y VI), a la evaluación de impacto de la
USE (`EvaluacionImpactoDtos`, que lee los mismos valores) y al PDF. Un borrador guardado conserva los 0 hasta que se
vuelva a guardar: `Anexo22Servicio.GuardarAsync` rearma los datos del sistema desde las fuentes en cada guardado. Un
Anexo 22 ya **firmado** con estos valores no se corrige solo.

**Confirmación con datos (BD local, 28/10/2026).** El expediente 1 es el convenio `13348`. Tiene 3 RTF: 20004
(paso 63602, `VENCIDO`), 20005 (paso 63603, `PLAZO_INICIAL_NOTIFICACION`) y 30005 (paso 63604, `APROBADO`), y
**ninguno tiene avances de indicador ni de metas guardados**. El 30005 parece un dato sembrado a mano: se registró el
06/10 con fecha de envío del 02/10 y no tiene PDF. En toda la BD local hay un solo avance de indicador (1 de los 3 RTF
aprobados).

Hay entonces **dos defectos**, y el que se ve en este expediente es el segundo:
1. **`ideRtf` no se envía** (latente): cuando la OA sí reporta avances, Cierre los ignora y toma lo de BD_SEL. Está
   confirmado en el código; con los datos locales no se reproduce en este expediente porque no hay avances.
2. **"Sin reporte" llega como 0**: sin avance guardado, RTF devuelve el `MetaEjecutada` no nulo de BD_SEL (0) y Cierre lo
   toma como ejecutado real. En el expediente 1 eso produce el −100 % en los tres años y las 5 desviaciones críticas,
   cuando lo correcto es "sin dato" (—), que no cuenta como desviación.

El owner confirmó (28/10/2026) que no hay avances porque `sigec-rtf` sigue en desarrollo, y que la validación se aplica
igual porque Cierre debe consumir esa información: **por cada año se consolida lo reportado en los RTF de todos sus pasos
críticos.**

**Corrección implementada (28/10/2026, sin commit).**
- **sigec-api-rtf:** `PasoCriticoIndicadorDto` gana `avanceReportado` (campo nuevo; lo demás no cambia).
  `ListarIndicadoresPorPasoCriticoAsync` lo pone en `true` solo cuando el indicador tiene avance guardado en el RTF
  consultado. Prueba: `PasoCriticoAvanceTests.ListarIndicadoresPorPasoCriticoAsync_MarcaComoReportadoSoloLoGuardadoEnElRtf`.
  371 pruebas en verde.
- **sigec-api-cierre:** `IFuenteAvanceIndicadores.ListarAvanceAsync(pasoCriticoId, ideRtf)` y el cliente envían
  `?ideRtf=`. `PrecargaAnexo22.EjecutadoPorAnioAsync` toma de cada paso crítico **su RTF final, el último enviado**
  (`FecEnvio` y fuera de `PENDIENTE`/`EN_EDICION`; un RTF en escalada nunca se envió). Un paso sin RTF enviado no aporta,
  y solo se suma lo marcado como `AvanceReportado`. Si un año no tiene nada reportado, el ejecutado queda en `null`
  (no hay desviación), no en 0. Pruebas: `Proponer_ConsolidaPorAnioElRtfFinalDeCadaPasoCritico` y
  `Proponer_LoQueLaOaNoReportoQuedaSinEjecutado_NoEnCero`. 387 pruebas en verde.
- **Despliegue:** las dos APIs juntas. El cliente de Cierre ignora el campo si RTF todavía no lo envía, y entonces
  todo quedaría "sin reporte".
- **Datos existentes:** el borrador del expediente 1 conserva los 0 hasta el próximo guardado (que rearma los datos desde
  las fuentes). Un Anexo 22 ya firmado no se recalcula.

### Fase 1 — 2026-10-28: barra de acciones fija, guardado automático y aviso al salir (sin commit)
- **Barra fija** (`sticky bottom-0`) al pie del Anexo 22 mientras se edita: Guardar, Descargar para firmar, estado del
  guardado ("Guardando…", "Cambios sin guardar", "Guardado a las HH:mm", "No se pudo guardar automáticamente…",
  "Aún no se ha guardado", con `aria-live`) y avance "N de 13 completos". El avance sale de `requisitosAnexo22`
  (nuevo en `validacion-anexo22.ts`; `faltantesAnexo22` ahora filtra esa lista, mismas reglas). No se usa
  `ui-progress-bar`: pinta en rojo por debajo del 25 %, y un borrador recién empezado se leería como error (H-06).
- **Guardado automático** del borrador tras `evaluacion.esperaAutoguardadoMs` (3.000 ms en los tres `environment*.ts`)
  sin editar, con el mismo `PUT /anexos22`. Sin toasts; un fallo queda en la barra. No corre con el informe firmado ni
  mientras hay otro guardado en curso.
- **No se pisa lo escrito.** La API recorta los textos (`NormalizacionAnexo22`): si la respuesta reemplazara el
  formulario, se perdería el espacio recién tecleado, o todo lo escrito mientras viajaba la petición. Por eso el
  guardado automático, y el manual si se editó mientras se guardaba, solo toman de la respuesta `ideAnexo22`,
  `estAnexo22`, `numVersion` y `faltantes`, y vuelven a programar el guardado si hubo ediciones entretanto. El guardado
  manual sin ediciones intermedias sigue reemplazando todo (rearma los datos del sistema).
- **Aviso al salir:** `CambiosPendientesService` (registro de formularios con cambios y `beforeunload`) y
  `cambiosPendientesGuard` (`canDeactivate` en `/expedientes/:id`, con `window.confirm`).
- **Pruebas:** 7 nuevas en `informe-evaluacion.component.spec.ts` (espera, sin pisar textos, ediciones durante el
  guardado, fallo, firmado, aviso al salir y al destruir, avance). sigec-cierre: 231 pruebas, lint y build en verde.
- **Navegador:** la barra queda fija al pie al desplazarse por el formulario del expediente 1. No se probó escribiendo,
  para no modificar el borrador local.

### Fase 2 — 2026-10-28: pasos, avance y paso de firma (sin commit)
- **Cuatro pasos** con `ui-stepper` (D1): Indicadores (II, III y VI), Ejecución financiera (IV), Conclusiones y
  resultado (VII a XI) y Firmar y presentar. Cada uno muestra su avance ("II, III y VI · 0 de 5"); el de firma dice si
  está listo. Se recorren en cualquier orden: `ui-stepper` gana la entrada `freeNavigation` (los pendientes también son
  botones; prueba en `libs/ui`). Anterior y Siguiente van en la barra fija. El último paso de cada expediente se
  recuerda en `localStorage` (con `try/catch`: si no hay almacenamiento, solo no se recuerda).
- **Requisitos por paso:** `requisitosAnexo22` asigna a cada requisito su `paso` (5, 3 y 5, prueba incluida). La lista
  de faltantes deja de abrir el formulario: va al paso 4, agrupada por paso. Cada faltante abre su paso y enfoca el
  campo: `ValidacionFormulario` acepta `mostrarCampo(id)`, que se llama antes de enfocar (el Acta no lo usa).
- **Paso 4 (D6):** cuatro sub-pasos con su estado: completar y guardar (con lo que falta), descargar el PDF, firmarlo y
  subirlo, y presentarlo. Cada botón deshabilitado dice por qué junto a él. El aviso del último RTF sin aprobar pasa a
  este paso, y el de desviación crítica al paso 1.
- **Resultado primero** en el paso 3. Con el informe firmado, todo se lee de corrido sin pasos, en el orden del formato
  (el monitoreo V y el resultado son plantillas que se pintan en uno u otro lugar).
- **Sección I y V**, por ahora arriba del stepper: pasan al panel de consulta en la Fase 3.
- **Pruebas:** 4 adaptadas y 4 nuevas en `informe-evaluacion.component.spec.ts`, más 1 en `validacion-anexo22.spec.ts`
  y 1 en `ui-stepper.component.spec.ts`. sigec-cierre: 236 pruebas; `ui`: 62. Lint y build en verde.
- **Navegador (expediente 1, 1472×927):** alto desde el stepper hasta el pie de cada paso: 2.236 px (paso 1), 1.209,
  674 y 939. Los pasos 2 a 4 caben en 1–1,3 pantallas; el 1 ocupa unas 2,4, por sus 6 tablas de indicadores. La I y la
  V suman 875 px antes del stepper. Las dos cosas se resuelven en la Fase 3. Un faltante del paso 4 abre el paso 3 con
  el foco en el campo, visible.

### Fase 3 — 2026-10-28: panel de consulta y tablas compactas (sin commit)
- **Panel "Datos del convenio"** (D3): al editar, la I y la V van plegadas en una barra que muestra la organización y el
  convenio y se abre a pedido (`aria-expanded`). Centro poblado y término con adenda, que sí llena la UN, pasan al paso
  3, tras el resultado. Con el informe firmado, la I (con esos dos datos) y la V vuelven a su lugar. La I, sus datos de
  la UN y la V son plantillas que se pintan en uno u otro lugar.
- **4.2 plegada:** se ven los totales de bienes y de servicios (cantidad y ejecutado frente a programado, con %) y el
  detalle se abre a pedido. Firmado, se ve completa.
- **`TablaIndicadoresComponent` compacta** (D4): de 17–18 columnas a 10–11 (`min-w` de 980 a 720 px). Muestra la línea
  base, el programado del último año con meta, el ejecutado (el resultado al cierre o el de ese año), la variación de
  ese año y la variación frente a la LB. La unidad va bajo el concepto. Un botón por fila (`aria-expanded`,
  `aria-controls`) abre los tres años y el resultado. La desviación crítica se marca solo en la celda de variación
  (tono e ícono); si es de otro año, la celda lo dice ("Crítica en otro año").
- **Pruebas:** en `tabla-indicadores.component.spec.ts`, 1 reemplazada (resaltado por celda) y 1 nueva (resumen y
  detalle por año); en `informe-evaluacion.component.spec.ts`, 3 nuevas (panel y datos de la UN en el paso 3, 4.2
  plegada con sus totales, firmado completo). sigec-cierre: 240 pruebas; lint y build en verde.
- **Navegador (expediente 1, ventana de 1366×768, área visible de 1366×625):**
  - **Scroll horizontal: ninguno**, en ningún paso ni con la 4.2 abierta. La tabla de indicadores mide 950 px y cabe
    entera. ✅
  - **Antes del stepper:** 126 px, frente a 875 de la Fase 2. ✅
  - **Alto por paso**, desde el stepper hasta el pie: paso 1, 2.044 px (3,3 áreas visibles); paso 2, 756 (1,2);
    paso 3, 771 (1,2); paso 4, 939 (1,5). Los pasos 2 a 4 cumplen el criterio de la Fase 2; el 1 no.
  - **Por qué el paso 1 sigue largo:** tiene seis bloques. La 2.1 (5 filas) ocupa 405 px. Cada sección vacía (2.2, 2.3,
    2.4 y III) ocupa unos 240–254 px entre la tabla vacía con su encabezado, "Agregar indicador" y su análisis
    obligatorio; son unos 1.000 px en total. La VI ocupa 163 px.
  - Los −100 % del expediente 1 siguen porque el borrador local guarda los 0 anteriores a la Fase 0 (se corrigen al
    guardarlo con las APIs actualizadas).
- **Secciones sin indicadores (28/10/2026, a pedido del owner):** una sección vacía ya no dibuja la tabla con su
  encabezado. Muestra una línea con "Sin indicadores de …" y, en las secciones manuales (2.2, 2.3, 2.4 y III), el botón
  **Agregar indicador**, con la aclaración de que sirve para la información que la verificación de campo constata aunque
  no se haya reportado (por ejemplo, ventas). El owner pidió conservar esa opción. La 2.1 y la VI vienen del SEL y no
  admiten filas nuevas: su línea solo informa. Su análisis sigue siendo obligatorio (eso es la Fase 6). Prueba nueva en
  `informe-evaluacion.component.spec.ts`; sigec-cierre: 241 pruebas, lint y build en verde.
  - Medido en el navegador: cada sección vacía pasa de unos 250 a 189 px, y el paso 1 de 2.044 a 1.747 px. Los pasos 2
    a 4 no cambian (756, 771 y 939 px) y sigue sin haber scroll horizontal. La ventana no aceptó el cambio a 1366 px en
    esta medición (quedó en 1680×927), pero los altos de los pasos 2 a 4 coinciden con los medidos a 1366: el ancho
    casi no influye.

### Fase 4 — 2026-10-28: ayuda en los textos, áreas que crecen y plazo compacto (sin commit)
- **Una sola plantilla para los 12 textos del informe** (`#campoTexto`): los 5 análisis de los indicadores, los 2 de la
  IV y los de VII a XI. Antes cada uno repetía su marcado.
- **Ayuda bajo la etiqueta** de cada texto, desde `AYUDA_TEXTO_ANEXO22` (`core/models/ayuda-anexo22.ts`). Es una
  **redacción inicial a validar con la UN o con el Instructivo** (punto abierto 3). Se enlaza con `aria-describedby`:
  `CampoInvalidoDirective` gana la entrada `ayudaId` y encadena la ayuda y el error, porque dos enlaces sobre el mismo
  atributo se pisarían. Con el informe firmado no se muestran ayudas ni contadores.
- **Áreas que crecen:** directiva `CrecerDirective` (`textarea[appCrecer]`). `rows` es el alto mínimo; crece hasta
  480 px y después desplaza por dentro. Se ajusta tras cada render solo si el texto cambió, porque ngModel escribe sin
  eventos.
- **Contador y límite:** "N / 8.000" bajo cada texto, en ámbar desde el 90 %, y `maxlength` con
  `evaluacion.longitudTexto` (8.000 en los tres `environment*.ts`, igual a `ValidadoresAnexo22.MaximoTexto`).
- **Plazo compacto** (`expediente.component.html`, todas las etapas): mientras el plazo no esté por vencer
  (`plazos.diasAvisoPrevio`), una línea ("Evaluación de la UN: quedan 68 días · vence el 04/01/2027"). El
  `ui-countdown-banner` queda para cuando está por vencer o vencido.
- **Notas de origen:** "Datos del SEL: no se editan aquí" (11 px) pasa a una insignia junto al título de la I; la nota
  de la 4.1 sube a 12 px.
- **Pruebas:** `crecer.directive.spec.ts` (nuevo: crece, tope y desplazamiento, también con ngModel), 2 en
  `informe-evaluacion.component.spec.ts` (ayuda, `aria-describedby`, `maxlength`, contador y vista firmada) y 1 en
  `expediente.component.spec.ts` (plazo en una línea o contador grande). sigec-cierre: 245 pruebas; lint y build en
  verde. El build estricto detectó un índice sin tipo en la plantilla que Jest dejó pasar; se corrigió con `ayudaDe()`.
- **Navegador (expediente 1):** el plazo se ve en una línea. En el paso 3, Logros (1.319 caracteres, precargado del
  Acta) se lee entero (224 px, sin desplazamiento interno), con su ayuda y su contador.

### Cambio de alcance — 2026-10-28: centro poblado y término con adenda se leen del SEL (sin commit)
**Decisión del owner.** Ningún anexo registra estos dos datos: son del SEL y, si están mal, se corrigen allí. Se
muestran en **solo lectura** en los Anexos 20, 21 y 22 y, si el SEL no los tiene, se indica ("No registrado en el SEL",
"Sin adenda de plazo en el SEL"). Esto reemplaza lo dicho en D3 y en el registro de la Fase 3 ("pasan al paso 3"):
la UN ya no los edita.
- **Origen en el SEL:** centro poblado = `dbo.proyecto.localidad`. Término con adenda = `fechaTermino` de la última
  ampliación activa de **plazo** (`convenio_incentivo_ampliacion`, `tipoAmpliacionID = 1`, `estado = 1`, por
  `numeroAmpliacion`). El tipo 2, "Modificación del contenido", no cambia la fecha.
- **sel-api-general:** `GENERAL.SEL_SP_R_ObtenerDatosGeneralesPorPostulante` (`Database/004_procedimientos.sql`)
  devuelve `CentroPoblado` y `FechaTerminoAdenda`, y `DatosGeneralesConvenioDto` los expone. Aplicado en `BD_SEL_DEV`
  y probado con el 13348. 93 pruebas en verde.
- **sigec-api-cierre:** `DatosGeneralesConvenioExternoDto` recibe los dos campos. `DatosDelSel.Aplicar` los fija en
  los Anexos 20 y 22, así que lo que envíe la OA o la UN se descarta: `ComposicionAnexo22` los toma del sistema y el
  Anexo 20 ya los reemplazaba al guardar. `PrecargaAnexo22` deja de leer el Anexo 20 y pierde esa dependencia.
- **Acta (Anexo 21):** su "localidad" es el lugar de la reunión y funciona como una dirección; no es el centro
  poblado (aclaración del owner). Ya no se precarga con el centro poblado del Anexo 20: queda vacía para quien llena
  el Acta. Sigue siendo obligatoria.
- **Pruebas de la API:** las de los Anexos 20 y 22 verifican que se usa el dato del SEL aunque la OA o la UN envíen
  otro, y la composición del Anexo 22 verifica lo mismo; la del Acta, que la localidad no se propone. 387 pruebas en
  verde.
- **sigec-cierre:** el Anexo 22 los muestra en la I (en el panel "Datos del convenio"), sin campos; el paso 3 ya no los
  tiene. **sigec-rtf:** el Anexo 20 de la OA los muestra en el bloque de datos del SEL y quita sus dos campos. Pruebas:
  sigec-cierre 245 y sigec-rtf 207, con lint y build en verde.
- **Despliegue, en este orden:** el SP en la BD_SEL de cada ambiente y sel-api-general; luego sigec-api-cierre; luego
  sigec-cierre y sigec-rtf. Si la API de cierre sube antes que el SP, los dos datos quedan vacíos.
- **Datos ya guardados:** un Anexo 20 o 22 guardado conserva lo que registró la OA hasta que se vuelva a guardar. Las
  columnas de `SIGEC_CIERRE` se mantienen, sin migración.
- **Calidad del dato:** en `BD_SEL_DEV` solo 484 de 9.729 proyectos tienen `localidad`. En el 13348 dice
  "Huancayo - Huancayo - Junín", que se parece más a una ubicación que a un centro poblado. No hay ninguna ampliación
  registrada.
