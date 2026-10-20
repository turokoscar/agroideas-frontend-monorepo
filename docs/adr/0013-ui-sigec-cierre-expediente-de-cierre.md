# ADR 0013: UI de Cierre de Convenio (`apps/sigec-cierre`) y Anexo 20 en `apps/sigec-rtf` — análisis situacional y plan

## Estado
Aceptado · **Fases 0, 1, A, 2 y 3 implementadas** (20/10/2026) · Fases 4, 5 y D pendientes. Ver el
[Plan de implementación por fases](#plan-de-implementación-por-fases) y el
[Registro de implementación](#registro-de-implementación).

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

### Fase 0 — 2026-10-20
- **Roles (D2, H-01):** `core/models/rol-cierre.model.ts` con `CierreRol`, el catálogo espejo de
  `RolesSigecCierre` (sin distinguir mayúsculas), `ROLES_PERSONAL`, `ETIQUETA_ROL`, `mapearRolesCierre` y
  `rutaInicio` (personal → `/bandeja`, OA → `/mi-cierre`, sin roles → `/sin-acceso`). `AuthUser.roles` reemplaza a
  `role`; `AuthService` expone `roles`, `inicio` y `etiquetaRol`. Las sesiones guardadas con el formato anterior se
  descartan (un re-login).
- **Guards:** devuelven `UrlTree` en lugar de navegar. `roleGuard` recibe un conjunto de roles y, si rechaza, envía a
  `rutaInicio`, que solo devuelve rutas que el usuario puede activar.
- **Rutas:** todas con `loadComponent`; la raíz redirige con `redirectTo` funcional a `AuthService.inicio()`; `**`
  vuelve a la raíz. Páginas nuevas: `bandeja` y `mi-cierre` (estados vacíos que la Fase 1 llena) y `sin-acceso`
  (fuera del shell, con cierre de sesión). El login navega a `inicio()`.
- **Shell:** menú filtrado por roles; insignia con el rol principal y todos los roles en el `title`; se quitó el
  indicador fijo "Servicio Activo".
- **Entornos (H-02):** `apiUrl` con `api/v1`; nuevo `environment.quality.ts` con rutas relativas; configuración
  `quality` en `project.json`; `serve` y `serve-static` en el puerto 4400.
- **Limpieza (H-04, H-06):** se borraron `nx-welcome.component.ts` y el placeholder `cierre-registro`;
  `index.html` con `lang="es"` y título; `styles.scss` sin el `@import` duplicado de `base.css` (`sigec-rtf`
  conserva el suyo: fuera del alcance).
- **Pruebas:** `rol-cierre.model.spec.ts`, `auth.service.spec.ts` y `auth.guard.spec.ts`; este último recorre las
  rutas reales de la app con cada rol y comprueba que nadie entra en un bucle. `nx run-many -t lint,test,build
  -p sigec-cierre`: lint sin errores ni advertencias, 53/53 pruebas, build de producción y de `quality` (503 kB
  iniciales; antes 571 kB).
- `CLAUDE.md` y `AGENTS.md` actualizados (puerto, configuraciones, catálogo de roles).

### Fase 1 — 2026-10-20
- **Configuración (decisión del owner, 20/10/2026):** todo valor ajustable vive en los `environment*.ts`, tipados con
  `environments/app-settings.model.ts` (`AppSettings`): `deviceId`, `paginacion.cantidadPorPagina`,
  `paginacion.cantidadMaxima` (debe coincidir con `ValidadoresCierre.CantidadMaxima` de la API),
  `notificaciones.intervaloRefrescoMs` y `notificaciones.cantidadEnCampana`. Los catálogos que espejan contratos
  de la API (estados, tipos de documento, etiquetas) siguen en `core/models/`.
- **Cliente de la API (D5):** `CierreApiService` con el operador `desenvolver()` (un sobre `ERROR` con 200 se relanza
  con la forma que lee `mensajeParaUsuario`) y `listarTodosLosPendientes()`, que pagina hasta traer la bandeja
  completa. Modelos en `core/models/` (`cierre`, `plazo`, `notificacion`, `api`).
- **Etapas (D3):** `core/models/etapas-cierre.ts` (puro) arma las seis etapas desde el estado, los documentos
  vigentes y los plazos; el ciclo `OBSERVADO_UAJ` es una nota sobre la etapa UAJ. El número de ronda de
  observaciones queda para la Fase 4 (necesita `GET …/observaciones`).
- **Pantallas:** `/bandeja` (pestañas por semáforo con contadores exactos, búsqueda en el cliente, "Todos" con
  paginación del servidor y filtro de estado, "Iniciar expediente" para UN/Jefe UN); `/expedientes/:id`
  (cabecera, estado 77, stepper, tarjetas por etapa con `ui-countdown-ring`, pestañas de documentos, plazos,
  bitácora y correos enviados —esta última solo para el personal—, visor de PDF); `/mi-cierre` reutiliza el
  expediente para la OA. Campana de notificaciones en el header (sin endpoint de conteo: el total sale de
  `soloNoLeidas=true&cantidad=1`; el polling sobrevive a errores).
- **Limitación conocida:** en "Todos" la búsqueda de texto filtra solo la página cargada (la API no tiene filtro
  de texto en `GET /cierres`); los filtros de estado sí van al servidor.
- **`@agroideas/ui`:** `ui-countdown-ring` usaba `var(--primary)` como color, pero los tokens son componentes HSL
  sueltos: el anillo no se pintaba (ninguna app lo usaba). Ahora usa `hsl(var(--token))`.
- **Bundle:** el contenedor de toasts va en el shell (lazy) y no en `AppComponent`, para no arrastrar el barrel de
  `@agroideas/ui` al bundle inicial (544 kB; 665 kB si se pone en `AppComponent`). Se agregan los assets de pdf.js
  a `project.json`, como en `sigec-rtf`.
- **Pruebas:** 98/98 (etapas, servicios, bandeja, expediente, mi-cierre) y 44/44 en `ui`; lint sin advertencias;
  build de producción y `quality`. `nx serve sigec-cierre` levanta en :4400 contra las APIs locales; falta la
  prueba manual con un usuario de cada rol.

### Fase A — 2026-10-20
- **Configuración:** `cierre.apiUrl`, `cierre.urlApp` y `cierre.tamanoMaximoPdfMb` en los `environment*.ts` de
  `sigec-rtf` (Calidad: `/api-cierre/api/v1` y `https://sigec-cierre.oscar-pazos.com`).
- **`CierreService`** (sigec-rtf): Anexo 20 (`GET/PUT /convenios/{id}/anexos20`, `…/documento`), expediente del
  convenio (`GET /cierres?ideConvenio=`) y sus plazos. El error del PDF llega como Blob y se convierte al sobre con
  `FileReader` para mostrar su mensaje.
- **Último paso crítico:** `ultimoPasoCritico()` toma el de mayor mes de fin, porque el dashboard de RTF no expone
  el número del paso; la regla V3 de la API sigue siendo la fuente de verdad.
- **`oa-registro`:** pestaña "Anexo 20 · Cierre" solo en el último paso crítico, con `Anexo20CierreComponent`
  (secciones I–III del SEL en solo lectura; financiamiento OA, centro poblado, adenda, metas, comercialización y
  práctica ambiental editables; faltantes; descarga del PDF/A solo con el formulario guardado y completo; carga del
  PDF firmado como evidencia `INFORME_CIERRE_PNT`). Banner y bloqueo antes de enviar si falta el PDF firmado, y el
  error de envío muestra ahora el mensaje de la API (antes decía siempre "No se pudo enviar"). Si la API de Cierre no
  responde, el bloque lo dice y el resto del RTF sigue funcionando.
- **`oa-dashboard`:** hito "Cierre de convenio" al final del cronograma con el estado del expediente y enlace a
  `sigec-cierre/mi-cierre` (otro origen: pide login, D7b), y `ui-countdown-banner` del plazo del Anexo 20 cuando el
  expediente está en `ESPERA_ANEXO20`.
- **`Dockerfile.sigec-rtf-ui`:** `location /api-cierre/` → `sigec-cierre-api:8080` con resolución diferida
  (`resolver 127.0.0.11` + variable): el contenedor de RTF arranca aunque la API de Cierre aún no esté desplegada
  (Fase D). Validado con `nginx -t`.
- **Pruebas:** 201/201 en sigec-rtf (nuevas: `paso-critico.model`, `cierre.service`, `anexo20-cierre`); lint sin
  errores y sin advertencias nuevas (104, las mismas de antes); build de producción. Falta la prueba manual con una
  OA cuyo último paso crítico aún no tenga RTF enviado.

### Fase 2 — 2026-10-20
- **Acciones por etapa:** `core/models/acciones-cierre.ts` es la copia en el cliente de la tabla de
  `MaquinaEstadosCierre` (acción → estados de origen → roles); `puedeEjecutar()` decide qué formulario mostrar
  en la etapa activa. La API vuelve a validar cada acción. Si la API cambia su tabla, hay que actualizar esta copia.
- **`ActaCierreComponent`** (dentro de la tarjeta de la etapa de verificación, solo para UR, UN y Jefe UN en
  `EN_VERIFICACION`): reunión (lugar, inicio, firma el mismo día, local, profesional de AGROIDEAS —propuesto con el
  nombre del usuario— y su DNI); bienes y servicios precargados con programado, ejecutado y pagado de KOFIX como
  referencia y la cantidad verificada editable (resaltada si difiere de lo ejecutado), más filas a mano; presidente,
  logros por objetivo (propuestos desde el Anexo 20) y dificultades; asistentes. Valida en el cliente el horario y
  los DNI repetidos; guarda el borrador, descarga el PDF/A para imprimir y registra el acta escaneada
  (`POST …/verificaciones`, con confirmación). Al registrar, el expediente se recarga en `EN_EVALUACION_UN`.
- **API:** `obtenerAnexo21`, `guardarAnexo21`, `descargarAnexo21` y `registrarVerificacion` en
  `CierreApiService`; `leerErrorBlob` convierte el error de una descarga (un Blob) al sobre MIDAGRI, y se aplica
  también a `descargarDocumento`.
- **Configuración:** `archivos.tamanoMaximoPdfMb` en `AppSettings`.
- **Pruebas:** 117/117 (nuevas: `acciones-cierre`, `acta-cierre` y casos de `cierre-api.service` y del
  expediente); lint sin advertencias; build. Falta la prueba manual con un usuario de Unidad regional sobre uno de
  los expedientes locales en `EN_VERIFICACION`.

### Fase 2 (ajuste) — 2026-10-20: presidente y objetivos desde el SEL
Pedido del owner al revisar la pantalla: en "SEGUNDO", el presidente y el objetivo de cada logro se eligen del SEL.
Requirió cambios en las dos APIs, porque `…/representantes-legales` de sel-api-general aplica control de cartera y la
Unidad regional recibía una lista vacía:
- **sel-api-general** (`desarrollo`, commit `3c2fda3`, ADR 010 ampliado): `datos-generales` incluye
  `representantesLegales` (solo nombre y cargo) con la lectura global por rol.
- **sigec-api-cierre** (`opazos`, commit `50b0d91`, ADR-003 ampliado): `Anexo21Dto` expone
  `representantesLegalesSel` y `objetivosEspecificosSel`; propone al representante con cargo de presidente y los
  objetivos del marco lógico (o los del Anexo 20 si el SEL no los tiene); al guardar exige que el valor esté en la
  lista cuando el SEL la tiene (`CIE_1006`).
- **sigec-cierre:** selectores con esas opciones; si el SEL no tiene la lista, campo de texto con un aviso.
  119/119 pruebas, lint sin advertencias.
- Para verlo en local hay que reiniciar sel-api-general y sigec-api-cierre.

### Fase 2 (ajuste) — 2026-10-20: el acta sigue el formato oficial
A partir del formato del Instructivo (páginas 107–108) que compartió el owner:
- **PDF (sigec-api-cierre, commit `6647de3`):** "Bienes e insumos adquiridos" imprime al menos 10 filas (servicios
  sigue en 5) y "Dificultades" pasa de un recuadro a 4 renglones. Se ajustó el espaciado para que la página 1 termine
  en el párrafo de cierre y las firmas empiecen en la página 2, como el formato. Verificado renderizando el PDF.
- **Formulario (sigec-cierre):** mismo orden y títulos que el acta (lugar y participantes → PRIMERO → SEGUNDO →
  Dificultades → cierre y firmas) con los estilos de formulario de kofix (`form-card-flat`, `form-section-title`,
  `form-field`, `form-label`, `form-input`/`form-select`/`form-textarea`, `form-file-upload` + `ui-file-chip`).
  La firma se captura como hora ("siendo las … horas del mismo día") sobre el día de inicio de la reunión.
  121/121 pruebas.

### Fase 3 — 2026-10-20
- **`InformeEvaluacionComponent`** (etapa de evaluación de la UN, solo UN/Jefe UN en `EN_EVALUACION_UN`): secciones I a
  XI del Anexo 22 con los estilos de formulario de kofix. Lo que viene del SEL, RTF y KOFIX es de solo lectura
  (información general, problema y objetivos, 2.1, ejecución de AGROIDEAS, bienes y servicios, monitoreo y las
  filas de VI); la UN escribe los análisis, las filas manuales de 2.2–2.4 y III, la contrapartida de la OA, la
  actividad y los comentarios de VI, VII a XI y el resultado.
- **`TablaIndicadoresComponent`**: línea base, programado y ejecutado por año, resultado, variación frente a lo
  programado (por año) y frente a la línea base, calculadas en vivo; la fila con desviación crítica se resalta e
  indica su origen (SEL + RTF, SEL + KOFIX, Manual). El umbral (−20 %) está en `AppSettings.evaluacion`
  (`umbralDesviacionCriticaPct`) y debe coincidir con `VariacionIndicador` de la API.
- **Firma y derivación:** guardar, descargar el PDF (solo completo y guardado), presentar el firmado
  (`POST …/anexos22`, con confirmación), historial de versiones firmadas y "Derivar a la Dirección Ejecutiva"
  (`POST …/derivaciones`, `destino: "DE"`), que exige la contingencia si venció el plazo de la UN. La API valida
  además que el último RTF esté aprobado.
- La subsanación (`OBSERVADO_UAJ`) reutilizará este componente en la Fase 4.
- **Pruebas:** 140/140 (nuevas: `anexo22.model`, `tabla-indicadores`, `informe-evaluacion` y casos de la API y del
  expediente); lint sin advertencias; build. Falta la prueba manual con un expediente en `EN_EVALUACION_UN`.

### Fase 3 (ajuste) — 2026-10-20: contrapartida de la OA desde el marco lógico
Indicación del owner: la contrapartida se obtiene del marco lógico del SEL, como el aporte de AGROIDEAS
(`marco_logico.aporteOpa` / `aportePcc`, estructura 5; son montos).
- **sel-api-general** (`desarrollo`, `a4e54e5` y `e65878f`): `datos-generales` devuelve `MontoAprobadoOa` (suma de
  `aporteOpa` o `proyecto.progEntidad`) y los ítems, `MontoAprobadoOa` por ítem. Requiere volver a ejecutar
  `Database/004_procedimientos.sql` en cada ambiente (en local ya está aplicado).
- **sigec-api-cierre** (`opazos`, `5ce50aa`, ADR-003 P-G resuelto): en 4.1 el aprobado de la organización viene del
  SEL y el ejecutado lo escribe la UN (origen `SEL_GENERAL+MANUAL`); el "Financiamiento OA" del Anexo 20 también.
- **UI:** en sigec-cierre el aprobado de la contrapartida es de solo lectura (se quitó "Agregar contrapartida") y
  el origen se muestra como "SEL + UN"; en sigec-rtf el "Financiamiento OA" del Anexo 20 se bloquea cuando viene del
  SEL.

### Fase 3 (ajuste) — 2026-10-20: los indicadores se editan en un modal
Pedido del owner: la tabla de indicadores es muy ancha para editar en línea. `TablaIndicadoresComponent` queda de
solo lectura (con editar y quitar por fila) y `IndicadorModalComponent` concentra el alta y la edición: concepto,
unidad, destino/objetivo/actividad según la sección, línea base, programado y ejecutado por año con la variación en
vivo, resultado, medio de verificación y comentarios. El modal trabaja sobre una copia (cancelar no cambia la fila).
En las filas del SEL de la sección VI solo habilita la actividad y los comentarios. 146/146 pruebas.

### Fase 3 (ajuste) — 2026-10-20: aviso previo de los requisitos para elevar a la DE
Al probar la derivación del expediente 6, la API la rechazó porque el último RTF (30005) estaba EN_REVISION; la UI
solo se enteraba al intentarlo.
- **sigec-api-cierre** (`opazos`, `42787d7`): `GET /cierres/{id}/derivaciones/requisitos` devuelve cada requisito
  (Anexo 22 firmado, último RTF aprobado —salvo de oficio sin RTF—) con el mismo mensaje con que la derivación
  rechaza, el RTF y su estado, y si se exigirá contingencia. La derivación y la consulta usan la misma evaluación
  (`EvaluarRequisitosDeAsync`).
- **sigec-cierre:** el informe consulta los requisitos al cargar; con el RTF sin aprobar avisa desde el borrador, y ya
  firmado muestra la lista con ✔/✖ y deja "Derivar" deshabilitado mientras falte algo. La exigencia de contingencia
  la decide la API. 148/148 pruebas.
- En local se aprobó a mano el RTF 30005 (`SIGEC_RTF.rtf.SRT_TMC_RTF`, de EN_REVISION a APROBADO) para continuar
  las pruebas de la derivación.

