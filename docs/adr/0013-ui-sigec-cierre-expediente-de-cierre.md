# ADR 0013: UI de Cierre de Convenio (`apps/sigec-cierre`) y Anexo 20 en `apps/sigec-rtf` — análisis situacional y plan

## Estado
Propuesto · Ninguna fase iniciada. Ver el [Plan de implementación por fases](#plan-de-implementación-por-fases)
y el [Registro de implementación](#registro-de-implementación).

## Fecha
2026-10-20 · Estado verificado contra el código el 2026-10-20 (`nx run-many -t lint,test,build -p sigec-cierre`:
lint sin errores, 2/2 tests, build de 571 kB).

## Responsables
Equipo Frontend AGROIDEAS · Owner del módulo: Oscar Pazos

## Aplica a
- `apps/sigec-cierre` — **casi todo el trabajo**: hoy es un cascarón.
- `apps/sigec-rtf` — el Anexo 20 se presenta con el último RTF (decisión del owner del 20/10/2026), más el hito
  de cierre en el dashboard de la OA.
- `SIGEC/sigec-api-cierre` (repo hermano, rama `opazos`) — **sin cambios previstos**: la API está completa
  (Fases 0–7 de su ADR-001). Es la fuente de verdad del flujo, los roles y los plazos.
- `SIGEC/sigec-api-rtf` — sin cambios: la regla V3 (commit `a05bfe3`) ya exige el Anexo 20 al enviar el RTF del
  último paso crítico y el aviso `eventos-rtf` (commit `ba874f2`) ya abre el expediente de cierre.
- `SIGEC/sigec-pcc` — prototipo Lovable (React, datos simulados) usado **solo como referencia de flujo y UX**.

## Contexto

### La API: completa
`sigec-api-cierre` (ASP.NET Core 8, prefijo `api/v1`, sobre MIDAGRI `{ respuesta, mensaje, datos }`, errores
`CIE_NNNN:detalle`) implementa el cierre de punta a punta:

```
ESPERA_ANEXO20 ──(OA presenta Anexo 20 / vence el plazo: de oficio)──┐
                                                                     ▼
EN_VERIFICACION ──(UR o UN registra el Acta, Anexo 21)──► EN_EVALUACION_UN
EN_EVALUACION_UN ──(UN firma el Anexo 22 y deriva)──► DERIVADO_DE
DERIVADO_DE ──(DE traslada)──► EN_REVISION_UAJ
EN_REVISION_UAJ ──(UAJ observa)──► OBSERVADO_UAJ ──(UN subsana)──► DERIVADO_DE
EN_REVISION_UAJ ──(UAJ remite Informe Legal y Proyecto de RDE)──► PROYECTO_RDE_REMITIDO
PROYECTO_RDE_REMITIDO ──(DE carga la RDE)──► CERRADO (estado 77 en BD_SEL)
```

- 41 endpoints en 19 controladores, entre ellos: la bandeja por rol (`GET /cierres/pendientes`, con semáforo de
  plazo y `acciones` disponibles por expediente), el detalle (`GET /cierres/{id}`, `…/plazos`, `…/auditorias`,
  `…/envios`, `…/documentos/{tipo}`), los Anexos 20, 21 y 22 (formulario, precarga, PDF/A generado y presentación),
  las acciones del flujo (`verificaciones`, `derivaciones`, `observaciones`, `subsanaciones`, `proyectos-rde`,
  `rdes`, `sincronizaciones-sel`), notificaciones, evaluaciones de impacto (USE), feriados y parámetros.
- Plazos: 30 días calendario para el Anexo 20 (ubigeo de la OA), 90 para la UN y 20 para la UAJ (sede de Lima),
  con el calendario de feriados de gob.pe. La DE no tiene plazo (`SIN_PLAZO`).
- Roles: el texto exacto de `dbo.rol` de BD_SEL (`RolesSigecCierre`): `Postulante`, `Unidad de Negocios`,
  `Jefe de Unidad de Negocios`, `Unidad regional`, `Dirección ejecutiva`, `Unidad de Asesoria Legal`,
  `Unidad de Monitoreo`/`Supervisor de Monitoreo`/`Especialista de Monitoreo` (USE) y
  `Administrador del sistema`. Un usuario puede tener varios.

### La UI: un cascarón
`apps/sigec-cierre` tiene login, el shell (`UiAppShellComponent`), un guard y una página placeholder que dice
"Formulario de Cierre de Convenio no habilitado temporalmente". No consume ningún endpoint de la API de cierre.

### Cómo se presenta hoy el Anexo 20
- `sigec-api-rtf` (regla V3) bloquea el envío del RTF del último paso crítico sin una evidencia
  `INFORME_CIERRE_PNT`.
- Al recibir `eventos-rtf`, `sigec-api-cierre` toma ese PDF del RTF (`IdeArchivoInformeCierre`), abre el expediente
  en `EN_VERIFICACION` y marca su formulario como `PRESENTADO`. Si el expediente esperaba en `ESPERA_ANEXO20`,
  reenviar el RTF con el PDF lo actualiza.
- `apps/sigec-rtf` solo ofrece "Informe de cierre del PNT" como un PDF suelto en la pestaña Anexos. **Nadie usa**
  el formulario estructurado de cierre (`GET/PUT /convenios/{id}/anexos20`, con precarga del SEL y lista de
  `faltantes`) ni el PDF/A oficial que genera (`…/anexos20/documento`).

### El prototipo `sigec-pcc`
Seis vistas con estado simulado y selector de rol. Lo útil para RTF ya se llevó a `sigec-rtf` y a `@agroideas/ui`
(Gantt, `ui-countdown-banner`, `ui-dropzone`, `ui-file-chip`, `ui/pdf-viewer`, Conforme/Observado, cartas). Para el
cierre propone **una vista de expediente con un stepper de etapas**, una tarjeta por etapa y anillos de plazo, pero
con varios errores de actor y plazo frente a la API (ver H-07).

## Hallazgos

### H-01 — Bucle de redirección para todo el personal 🔴
`mapSelUsuario` → `normalizarRol` toma solo `roles[0]` en mayúsculas (`"UNIDAD DE NEGOCIOS"`), que no coincide con
ningún valor de `UserRole` (`'UN' | 'UR' | 'DE' | …`). `roleGuard` redirige entonces a `/cierre/registrar`, que
exige `POSTULANTE` y vuelve a redirigir, sin fin. Es el mismo defecto que `sigec-rtf` resolvió con
`ROLES_SIGEC_RTF` (`apps/sigec-rtf/src/app/core/services/auth.service.ts`). Además se ignoran los demás roles del
usuario, y la API trabaja con el conjunto.

**Ojo:** el mapeo no puede copiarse de RTF: allí `Unidad de Monitoreo` equivale a la UN; en cierre es la USE.

### H-02 — Configuración de entorno incorrecta 🔴
`environment.ts` apunta a `https://localhost:7400/api`. La API usa el prefijo `api/v1` (`ConvencionPrefijoRuta`).
`environment.prod.ts` apunta a `localhost`. No hay configuración `quality`, ni Dockerfile, ni puerto de `serve`
(arranca en 4200 y choca con `sat-ui`). La API de cierre solo habilita CORS en Development.

### H-03 — Ninguna pantalla del flujo existe 🔴
Ninguno de los 41 endpoints tiene pantalla: ni la bandeja, ni el detalle, ni los Anexos 21 y 22, ni las acciones
de la DE y la UAJ, ni notificaciones, ni la USE, ni la administración.

### H-04 — El placeholder confunde actores 🟠
Se titula "Cierre de Convenio (Anexo 22)" y se muestra a la OA. El Anexo 22 lo elabora la UN; la OA presenta el
Anexo 20, y lo hace desde `sigec-rtf`.

### H-05 — El Anexo 20 estructurado no llega a la OA 🟠
Ver "Cómo se presenta hoy el Anexo 20". La OA arma su PDF fuera del sistema, sin la precarga del SEL ni el formato
oficial que la API ya genera. ADR-001 de la API lo deja pendiente: "en el frontend, enlazar el formulario del
Anexo 20 de Cierre desde la pantalla del último RTF".

### H-06 — Detalles menores 🟡
- Indicador "Servicio Activo" fijo en el header; no consulta `/health`.
- `index.html` con `lang="en"` y título `sigec-cierre`.
- Rutas eager; `sigec-rtf` usa `loadComponent`.
- `nx-welcome.component.ts` (873 líneas) es código muerto.
- `base.css` entra dos veces: en `styles` de `project.json` y con `@import` en `styles.scss` (igual en `sigec-rtf`).
- Solo 2 tests (`app.component.spec.ts`).

### H-07 — El prototipo acierta en la forma y falla en el fondo
| Prototipo | API real |
|---|---|
| Anexo 20 en cierre: cuadro de texto y PDF | Formulario estructurado; se presenta con el último RTF |
| Anexo 21 solo de la UR | La UR **o** la UN; precarga de ítems ejecutados (KOFIX), logros, asistentes y acta escaneada |
| Anexo 22: tabla de 4 variables, Δ% resaltado si \|Δ\| > 20 % | 6 secciones (`PRODUCCION`, `PRECIO`, `COMERCIALIZACION`, `INGRESO`, `OBJETIVO`, `AMBIENTAL`); desviación crítica solo si cae más de 20 % (`UmbralDesviacionCritica = -20`); cada dato con su `OrigenDato` (SEL, RTF, KOFIX, Manual); versiones por ronda de la UAJ |
| Dictamen Conforme / Con Observaciones / No Ejecutado | **Coincide** con `ResultadoEvaluacion` |
| 90 días a cargo de la DE | 90 días de la **UN**; la contingencia se exige al derivar con el plazo vencido |
| La UAJ redacta y sube la RDE | La UAJ observa o remite Informe Legal + Proyecto de RDE; la **DE** carga la RDE |
| Sin ciclo de observaciones | `OBSERVADO_UAJ → subsanación → DERIVADO_DE`, con plazo de la UAJ nuevo en cada ingreso |
| Cierre bloqueado hasta el Anexo 18 | El expediente lo abre `eventos-rtf` o el worker de respaldo; no hay nada que bloquear |
| Sin estado 77 ni cargo de notificación | Sincronización con BD_SEL (con reintento) y cargo de notificación de la RDE |

### Lo que ya está bien y se conserva
- Shell compartido (`UiAppShellComponent`), interceptor de `@agroideas/auth`, mapeo de sesión con
  `sel-usuario.mapper.ts`, tokens de `@agroideas/theme`.
- `@agroideas/ui` ya tiene casi todo lo necesario: `ui-data-table`, `ui-pagination`, `app-ui-status-pill`,
  `ui-countdown-banner`, **`ui-countdown-ring`** (en la lib y sin uso en ninguna app), `ui-dropzone`, `ui-file-chip`,
  `ui-modal`, `ui-kpi`, `ToastService`, `@agroideas/ui/pdf-viewer`.
- `@agroideas/utils`: `error-message` (formato `CIE_NNNN:detalle`), `response.dto`, `date-formatter`,
  `convenio-number`.

## Decisiones

### D1 — El Anexo 20 vive en `sigec-rtf`; `sigec-cierre` lo muestra en solo lectura
Decisión del owner (20/10/2026). En el RTF del **último paso crítico**, `sigec-rtf` muestra el bloque "Informe de
Cierre del PNT (Anexo 20)": llenar el formulario de cierre (secciones I–III de solo lectura desde el SEL, IV–VI
editables), ver `faltantes`, descargar el PDF/A, firmarlo fuera del sistema y subirlo como `INFORME_CIERRE_PNT` con
el flujo de evidencias existente. El último paso se detecta en la UI con
`oa-rtf.service` → `postulantes/{id}/pasos-criticos` (el de mayor número), para avisar antes de que la regla V3
rechace el envío. `sigec-cierre` no tiene ninguna acción para la OA sobre el Anexo 20.

### D2 — Modelo de roles: códigos propios, todos los roles del usuario
`AuthUser.roles: CierreRol[]` (no un único `role`), con
`CierreRol = 'OA' | 'UN' | 'JEFE_UN' | 'UR' | 'DE' | 'UAJ' | 'USE' | 'ADMIN'`, mapeados desde el texto exacto de
`RolesSigecCierre` sin distinguir mayúsculas. Un rol no reconocido se descarta; un usuario sin roles reconocidos
no entra (pantalla "Sin acceso al módulo" con cierre de sesión), en vez de caer a `POSTULANTE` como en RTF. El
guard recibe un conjunto de roles y redirige a una ruta que el usuario **sí** puede activar (su página de inicio
por rol), nunca a una ruta fija.

La UI decide qué **mostrar** con los roles; la API decide qué se **puede hacer**. Las acciones de un expediente se
habilitan solo si vienen en `acciones` de la bandeja o se derivan de la misma tabla que `MaquinaEstadosCierre`;
un 403 de la API se muestra tal cual, sin reintentar.

### D3 — Una vista de expediente con stepper para todos los roles
Idea central tomada del prototipo. En lugar de una página por rol, `/expedientes/:id` muestra:
1. **Cabecera**: convenio, OA, estado (`app-ui-status-pill`), de oficio, sincronización con el SEL.
2. **Stepper** de 6 etapas: Anexo 20 → Verificación (Acta) → Evaluación UN → Dirección Ejecutiva → Revisión UAJ →
   RDE. La ronda de observaciones se muestra como "Observado · ronda N" sobre la etapa UAJ.
3. **Una tarjeta por etapa**: completada (insignia y documentos), activa (resaltada, con su plazo en
   `ui-countdown-ring` y el formulario o la acción **solo si el usuario puede ejecutarla**) o futura (atenuada).
4. **Pestañas secundarias**: documentos, plazos, auditoría y notificaciones enviadas.

La OA ve la misma pantalla en solo lectura, para su único expediente.

### D4 — La bandeja es la entrada del personal; paginación y contadores como en las demás APIs
`/bandeja`: pestañas por semáforo (Vencido, Por vencer, En plazo, Sin plazo) sobre `GET /cierres/pendientes`, y
"Todos" sobre `GET /cierres` (filtros de estado y convenio). Cada fila: convenio, OA, estado, días restantes y la
acción principal ("Registrar acta", "Trasladar a UAJ"…), que abre el expediente.

**Cómo lo resuelven hoy las demás APIs** (revisado el 20/10/2026):
- **Listados:** todas devuelven el mismo `DatosPaginados<T>` `{ total, items }` dentro de `datos`
  (`sigec-api-rtf`, `sel-api-general`, `sigec-api-cierre`), con `pagina`/`cantidad` en la consulta. En la UI,
  `sigec-rtf` lo modela como `DatosPaginados<T>` (`core/models/datos-paginados.model.ts`).
- **Pestañas:** `sigec-rtf/bandeja-oa` agrupa estados por pestaña (`estados=` CSV), pide **solo la pestaña activa**,
  no muestra contadores por pestaña y busca en el cliente sobre la lista ya cargada (ADR-013/014 de RTF).
- **Contadores y KPIs:** salen de un endpoint de resumen aparte, calculado en el servidor: `GET /un/dashboard` y
  `GET /postulantes/{id}/dashboard` en RTF (`DashboardUnData`: `totalRtfs`, `aprobados`, `vencidos`…), y
  `GET /convenios/resumen-ejecutivo` en KOFIX. Nunca se cuentan páginas en el cliente.

**Para cierre:** el semáforo lo calcula `BandejaCierreServicio.Clasificar` en C# **después** de la consulta
paginada, así que la API no puede filtrar por semáforo. Pero la bandeja es lo que espera una acción **del
usuario**, que es poco: la UI pide `GET /cierres/pendientes?pagina=1&cantidad=100` (el máximo de
`ValidadoresCierre`), agrupa por `tipSemaforo` en el cliente y muestra contadores exactos, con búsqueda en el
cliente como `bandeja-oa`. Si `total` supera 100, sigue paginando y lo avisa. "Todos" usa la paginación del
servidor con `ui-pagination`. Si más adelante se quiere un tablero (KPIs del módulo), se agrega
`GET /cierres/resumen` en la API siguiendo el patrón de `/un/dashboard` (D9).

### D5 — Cliente de la API tipado y errores visibles
`core/services/cierre-api.service.ts` (y servicios por agregado si crece) desenvuelve el sobre MIDAGRI y lanza el
`mensaje`. Los modelos espejan los DTO de `SIGEC_CIERRE.Entidad` en `core/models/`. Los errores se muestran con
`ToastService`/`AlertService` usando `error-message` de `@agroideas/utils`; nunca se tragan ni se sustituyen por
datos vacíos (misma regla que la API). Un 409 (concurrencia optimista de `AplicarAsync`) recarga el expediente y
avisa que otro usuario lo cambió.

### D6 — Estructura de la app: igual que `sigec-rtf`
`core/` (guards, services, models, interceptores si hicieran falta) + `features/` (una carpeta por pantalla) +
`layout/app-shell/`. Rutas con `loadComponent`. Componentes standalone con signals; specs Jest junto a cada
servicio y a cada componente con lógica. Ningún import directo de PrimeNG, Leaflet, pdf.js, etc. (regla del
monorepo).

### D7 — Despliegue: el patrón de `sigec-rtf` en `AGROIDEAS/despliegue`
Calidad es el VPS con Docker Compose descrito en `AGROIDEAS/despliegue/README.md`: Nginx Proxy Manager publica
**un subdominio por aplicación** (`sigec-rtf.oscar-pazos.com` → `sigec-rtf-ui:80`) y los contenedores se hablan por
nombre en la red `apps-net`. La API de cierre aún no está desplegada; se replica lo que ya existe para RTF:

| Pieza | RTF (existe) | Cierre (nuevo) |
|---|---|---|
| Dockerfile de la API (en `despliegue/`) | `Dockerfile.sigec-rtf-api` | `Dockerfile.sigec-cierre-api` (proyectos `SIGEC_CIERRE.*`, zona horaria de Lima) |
| Secretos | `sigec-rtf.env` (+ `.example`) | `sigec-cierre.env` (+ `.example`): conexión a `SIGEC_CIERRE`, `JwtSettings__Secret`, `InternalService__Secret`, API Keys de SEL y RTF, `Smtp__*` |
| Script | `deploy_sigec_rtf.sh` | `deploy_sigec_cierre.sh`: `git archive` de la rama `opazos`, `schema.sql` si la BD no existe, migraciones en orden (`LC_ALL=C sort`) y `cierre_procedures.sql` + `datos_iniciales.sql` siempre (con `sqlcmd -I`), `up -d --build` |
| Servicios en `docker-compose.apps.yml` | `sigec-rtf-api`, `sigec-rtf-ui` | `sigec-cierre-api` (`:8080`), `sigec-cierre-ui` (`:80`) |
| Dockerfile de la UI (monorepo) | `Dockerfile.sigec-rtf-ui` | `Dockerfile.sigec-cierre-ui`: `/api/v1/` → `sigec-cierre-api:8080`; `/api-seguridad/` y `/api-general/` → `test.agroideas.gob.pe` |
| Proxy Manager | `sigec-rtf.oscar-pazos.com` | `sigec-cierre.oscar-pazos.com` → `sigec-cierre-ui:80` |

Conexiones entre servicios en Calidad:
- `sigec-rtf.env` necesita `ExternalServices__CierreApiUrl=http://sigec-cierre-api:8080/api/v1/` (hoy no lo
  tiene: sin él, RTF no avisa a cierre y los expedientes solo se abren con el worker de respaldo, cada 6 h).
- `sigec-cierre.env`: `RtfApiUrl=http://sigec-rtf-api:8080/api/v1/`, `ExecutionApiUrl=http://kofix-app:8080/api/`,
  `ArchivosApiUrl=http://sel-api-archivos:8080/`, y SEL general y seguridad en `test.agroideas.gob.pe`, igual que
  `sigec-rtf.env.example`.
- `sigec-rtf` suma `apiCierre` a sus `environment`: `https://localhost:7400/api/v1` en local y `/api-cierre/api/v1/`
  en Calidad, con `location /api-cierre/` → `sigec-cierre-api:8080/` en `Dockerfile.sigec-rtf-ui`.

### D7b — Sesión: un login por aplicación
Cada aplicación guarda la sesión en el `localStorage` **de su propio origen** (dominio + puerto). Como en Calidad
cada UI tiene su subdominio (y en local su puerto: 4300 y 4400), el token que guarda `sigec-rtf` no lo ve
`sigec-cierre`: cuando la OA pulse "Ver mi cierre" en `sigec-rtf`, `sigec-cierre` le pedirá iniciar sesión otra vez.
Esto **no afecta al Anexo 20**, que se llena dentro de `sigec-rtf` y llama a la API de cierre con el token de
`sigec-rtf`.

Se acepta el segundo login: la OA va a `sigec-cierre` solo para consultar, y el personal entra directo a
`sigec-cierre`. Alternativas si molesta en la práctica:
- **Mismo subdominio con rutas** (`sigec.oscar-pazos.com/rtf/` y `/cierre/`, cada app con su `base-href` y un
  Nginx delante): comparten `localStorage` y basta un login. Es un cambio de despliegue, no de código de negocio.
- **Pasar el token en la URL**: descartado, porque el token queda en el historial y en los logs.

### D8 — Diseño: tokens del monorepo, no el del prototipo
Se toman del prototipo la estructura y las interacciones (stepper, tarjetas por etapa, anillos de plazo, tabla de
variaciones, bandeja con pestañas). Se descartan su estética (glass, Inter, verde `#0B4619`, lucide, confeti), el
selector de rol, los simuladores y el generador de API Keys. Todo con `@agroideas/theme`, Roboto, Material Symbols
y componentes de `@agroideas/ui`. Si un patrón se repite entre `sigec-rtf` y `sigec-cierre` (stepper, insignia de
origen de dato), se sube a `@agroideas/ui` en la fase que lo necesite por segunda vez, no antes.

### D9 — Sin cambios en las APIs
Todo lo de este ADR se resuelve con los endpoints existentes. Si una fase descubre que falta algo (p. ej. totales
por semáforo), se registra como punto abierto y se resuelve en el repo de la API con su propio ADR.

## Plan de implementación por fases

Cada fase deja lint, test y build en verde (`npx nx run-many -t lint,test,build -p <app>`) y se commitea por
separado. Las fases 0 y A son independientes; de la 2 en adelante dependen de la 1.

### Fase 0 — Saneamiento de `sigec-cierre` 🔴
- Modelo de roles de D2 (`auth.service.ts`, `auth.guard.ts`) con specs: cada texto de `RolesSigecCierre`, varios
  roles, rol desconocido, sesión vieja guardada con el formato anterior (se descarta y pide re-login).
- `environment.ts` → `https://localhost:7400/api/v1`; nuevo `environment.quality.ts`; `fileReplacements` y
  configuración `quality` en `project.json`; `serve` en el puerto 4400.
- Rutas con `loadComponent`; página de inicio por rol; pantalla "Sin acceso al módulo".
- Quitar `nx-welcome.component.ts`, el placeholder del Anexo 22 y el indicador fijo "Servicio Activo".
- `index.html`: `lang="es"`, título "SIGEC · Cierre de Convenios". Quitar el `@import` duplicado de `base.css`.

**Criterio de aceptación:** un usuario de cada rol entra sin bucles y llega a su página de inicio; un usuario sin
rol de cierre ve "Sin acceso"; `nx serve sigec-cierre` levanta en :4400 sin `--port`.

### Fase A — Anexo 20 en `sigec-rtf` 🔴
- `apiCierre` en los `environment` de `sigec-rtf` y `location /api-cierre/` en `Dockerfile.sigec-rtf-ui`.
- `cierre-anexo20.service.ts` (`GET/PUT /convenios/{id}/anexos20`, `GET …/documento`) con spec.
- Bloque "Informe de Cierre del PNT (Anexo 20)" en `oa-registro`, visible solo en el último paso crítico:
  formulario (I–III solo lectura, IV metas, V comercialización, VI práctica ambiental), checklist de `faltantes`,
  descarga del PDF/A, carga del PDF firmado como `INFORME_CIERRE_PNT` y aviso antes de enviar si falta.
- Hito "Cierre" al final del Gantt de `oa-dashboard` con el estado del expediente
  (`GET /cierres?ideConvenio=`) y enlace a `sigec-cierre`.
- Banner `ui-countdown-banner` cuando el expediente está en `ESPERA_ANEXO20`: plazo de 30 días e instrucción de
  reenviar el RTF con el anexo.

**Criterio de aceptación:** con las APIs locales, la OA llena el Anexo 20, descarga el PDF, lo sube, envía el
último RTF y el expediente de cierre nace en `EN_VERIFICACION` con ese PDF; el dashboard muestra el hito.

### Fase 1 — Núcleo: bandeja, expediente y notificaciones 🔴
- Cliente de la API y modelos (D5): sobre, paginación, `CierreDto`, `ExpedientePendienteDto`, plazos, auditoría,
  documentos, envíos, notificaciones.
- `/bandeja` (D4) con `ui-data-table`, `ui-pagination` y `app-ui-status-pill`.
- `/expedientes/:id` (D3): cabecera, stepper, tarjetas por etapa en solo lectura y pestañas secundarias; visor de
  PDF para los documentos.
- `/mi-cierre` para la OA: su expediente, o un estado vacío "Tu cierre se abrirá al enviar el último RTF" con
  enlace a `sigec-rtf`.
- Campana de notificaciones con el patrón de `sigec-rtf/layout/notificacion-bell` (`GET/PUT /notificaciones`).
- "Iniciar expediente" para la UN (`POST /cierres`).

**Criterio de aceptación:** cada rol ve su bandeja con el semáforo correcto y abre un expediente con su historia
completa; la OA ve el suyo; las notificaciones se marcan como leídas.

### Fase 2 — Verificación de campo: Acta (Anexo 21) — UR y UN 🟠
- Tarjeta activa de `EN_VERIFICACION`: formulario del Anexo 21 (datos generales, ítems precargados con programado y
  pagado como referencia y ejecutado editable, logros, asistentes que se agregan y quitan), guardado parcial
  (`PUT …/anexos21`), descarga del acta para imprimir, carga del PDF escaneado y registro
  (`POST …/verificaciones`).

**Criterio de aceptación:** la UR o la UN registra el acta y el expediente pasa a `EN_EVALUACION_UN`.

### Fase 3 — Evaluación de la UN (Anexo 22) y derivación a la DE 🟠
- Formulario del Anexo 22 con precarga, por secciones; tablas de indicadores por año con la variación frente al año
  base, desviación crítica en `--destructive` solo si cae más de 20 %, e insignia de `OrigenDato` por fila.
- Resultado de la evaluación (`CONFORME / CON_OBSERVACIONES / NO_EJECUTADO`).
- Descarga del PDF, carga del firmado (`POST …/anexos22`) e historial de versiones (`…/versiones`).
- `ui-countdown-ring` de 90 días; "Derivar a la DE" (`POST …/derivaciones`, `destino: "DE"`) con texto de
  contingencia obligatorio si el plazo venció.

**Criterio de aceptación:** la UN elabora, firma y deriva; con el plazo vencido no se puede derivar sin
contingencia.

### Fase 4 — DE y UAJ: revisión legal, subsanación y RDE 🟠
- DE: "Trasladar a la UAJ" (`derivaciones`, `destino: "UAJ"`), "Cargar RDE" (`rdes`), cargo de notificación
  (`documentos`, `CARGO_NOTIFICACION_RDE`) y "Reintentar sincronización con el SEL" (`sincronizaciones-sel`).
- UAJ: `ui-countdown-ring` de 20 días; "Observar" (`observaciones`) o "Remitir Informe Legal y Proyecto de RDE"
  (`proyectos-rde`, dos PDF).
- UN: subsanación (`subsanaciones`) respondiendo todas las observaciones de la última ronda, con el Anexo 22 de la
  nueva versión firmado.
- Banner de cierre con el estado de sincronización del estado 77.

**Criterio de aceptación:** un expediente recorre DE → UAJ → observación → subsanación → DE → UAJ → Proyecto de
RDE → RDE → `CERRADO` desde la UI, y el estado 77 se ve sincronizado o con opción de reintento.

### Fase 5 — USE y administración 🟡
- USE: `/evaluaciones-impacto` con los Anexos 22 firmados, resultado y cantidad de indicadores con desviación
  crítica.
- Administrador: feriados (CRUD e importación desde gob.pe) y parámetros de plazos.

**Criterio de aceptación:** la USE y el administrador operan sus pantallas.

### Fase D — Despliegue en Calidad (`AGROIDEAS/despliegue` + monorepo) 🟠
Puede hacerse en cuanto exista la Fase 0; conviene antes de probar la Fase A en Calidad.
- En `despliegue/`: `Dockerfile.sigec-cierre-api`, `sigec-cierre.env.example`, `deploy_sigec_cierre.sh`, servicios
  `sigec-cierre-api` y `sigec-cierre-ui` en `docker-compose.apps.yml`, `ExternalServices__CierreApiUrl` en
  `sigec-rtf.env.example` y sección "SIGEC Cierre" en el `README.md` (D7).
- En el monorepo: `Dockerfile.sigec-cierre-ui`, y `location /api-cierre/` en `Dockerfile.sigec-rtf-ui`.
- Actualizar `CLAUDE.md`/`AGENTS.md` (puertos, configuraciones, Dockerfiles).

**Criterio de aceptación:** `deploy_sigec_cierre.sh` deja la API respondiendo `/health` desde `sigec-cierre-ui` y
`sigec-rtf-api`, la UI servida en `sigec-cierre.oscar-pazos.com`, y un envío del último RTF en Calidad abre el
expediente de cierre sin esperar al worker de respaldo.

### Resumen

| Fase | App | Alcance | Depende de |
|---|---|---|---|
| 0 | sigec-cierre | Saneamiento: roles, entornos, rutas | — |
| A | sigec-rtf | Anexo 20 en el último RTF, hito de cierre | — |
| 1 | sigec-cierre | Bandeja, expediente con stepper, notificaciones | 0 |
| 2 | sigec-cierre | Acta (Anexo 21) | 1 |
| 3 | sigec-cierre | Anexo 22 y derivación a la DE | 1 |
| 4 | sigec-cierre | DE, UAJ, subsanación, RDE, estado 77 | 3 |
| 5 | sigec-cierre | USE y administración | 1 |
| D | despliegue + monorepo | API y UI de cierre en Calidad, conexión RTF ↔ cierre | 0 |

## Alternativas consideradas
- **Una página por rol** (como `sigec-rtf`: `oa-*`, `un-*`). Descartada: el expediente es uno y pasa por seis
  actores; con una vista única cada etapa se implementa una vez y todos ven la misma historia.
- **Anexo 20 dentro de `sigec-cierre`** (como el prototipo). Descartada por el owner: la norma y la regla V3 lo
  atan al último RTF, y la OA no debe cambiar de aplicación para enviarlo.
- **Reutilizar el mapeo de roles de RTF** o subirlo tal cual a `@agroideas/auth`. Descartada: el mismo rol
  significa cosas distintas en cada módulo (`Unidad de Monitoreo`). Se puede compartir la mecánica (lista de roles
  → códigos), no el catálogo.
- **Portar el prototipo React.** Descartada: otro framework, datos simulados y reglas de negocio equivocadas
  (H-07).

## Consecuencias

### Positivas
- La API de cierre, ya terminada, pasa a ser usable por todos sus actores.
- La OA arma el Anexo 20 con la precarga del SEL y el formato oficial, en la misma pantalla del último RTF.
- Se corrige el bucle de redirección que hoy deja fuera a todo el personal.

### Negativas / riesgos
- `sigec-rtf` pasa a depender de la API de cierre (local y Calidad). Si no responde, el bloque del Anexo 20 debe
  mostrar el error y no impedir el resto del registro del RTF.
- `sigec-rtf` y `sigec-cierre` piden login por separado (D7b).
- El Anexo 22 es el formulario más grande del módulo (seis tablas de indicadores, versiones): la Fase 3 es la más
  costosa.

## Puntos abiertos
1. **Un solo login para `sigec-rtf` y `sigec-cierre`.** Se acepta el segundo login (D7b); se revisa si los
   usuarios lo piden, con la opción de servir ambas UIs bajo un mismo subdominio.
2. **Tablero de cierre.** Si se quieren KPIs del módulo (expedientes por estado, vencidos, cerrados en el año),
   hace falta `GET /cierres/resumen` en la API (D4, D9). La bandeja no lo necesita.

### Resueltos
- **Nombre y puerto de la API de cierre en Calidad** (20/10/2026): `sigec-cierre-api:8080`, siguiendo
  `AGROIDEAS/despliegue` (D7).
- **Contadores de la bandeja** (20/10/2026): se cuentan en el cliente sobre la bandeja completa, que cabe en una
  página de 100 (D4).

## Referencias
- `SIGEC/sigec-api-cierre/docs/adr/ADR-001_Estado_Situacional_Cierre.md` — flujo, máquina de estados, plazos, fases.
- `SIGEC/sigec-api-cierre/docs/adr/ADR-003_Fuentes_Datos_Anexo22.md` — fuentes de cada campo del Anexo 22.
- `SIGEC/sigec-api-cierre/CLAUDE.md` — reglas de autorización, bandeja y documentos.
- `SIGEC/sigec-api-rtf/docs/ADR-019_Integracion_Cierre_de_Convenio.md` — regla V3 y aviso `eventos-rtf`.
- `SIGEC/sigec-pcc/src/routes/cierre.tsx`, `bandeja.tsx` — prototipo de referencia.
- `apps/sigec-rtf/src/app/core/services/auth.service.ts` — antecedente del bucle de redirección.
- `apps/sigec-rtf/src/app/features/bandeja-oa/` y `SIGEC/sigec-api-rtf/SIGEC_RTF.Api/Controladores/RtfController.cs`
  — patrón de pestañas, paginación y dashboard.
- `AGROIDEAS/despliegue/README.md`, `docker-compose.apps.yml`, `deploy_sigec_rtf.sh` — despliegue en Calidad.

## Registro de implementación
_Sin fases iniciadas._
