# SIGEC RTF — Reporte Técnico Financiero

**Módulo de Reporte y Validación** del sistema SIGEC. Permite a los Postulantes registrar el avance físico y financiero de sus convenios, y a las unidades UN/DE/UAJ/USE evaluar los reportes entrantes.

## Datos generales

| | |
|---|---|
| **Puerto dev** | `:4300` (`npx nx serve sigec-rtf`) |
| **Tags** | `scope:sigec`, `type:app` |
| **Estilo** | `scss` |
| **Auth** | `@agroideas/auth` interceptor + `AUTH_LOGOUT_HANDLER` factory en `app.config.ts`; `GlobalErrorHandler` propio (`core/error-handler.ts`) |
| **Layout** | `UiAppShellComponent` (`@agroideas/ui`) — slots: `[shell-brand]`, `[shell-nav]`, `[shell-user]`, `[shell-header]` |
| **APIs** | `apiAuth` (:7101), `apiUrl` (:7300), `apiGeneral` (:7080) |

## Arquitectura

```
core/
  error-handler.ts  GlobalErrorHandler
  guards/       auth.guard.ts — exporta authGuard y roleGuard(...)
  models/       DTOs del dominio (convenio, paso crítico, RTF, UR, cartas,
                control de plazo, checklist/anexos, parámetros del sistema, etc.)
  pipes/        format-convenio.pipe.ts
  services/     auth.service.ts, rtf.service.ts, oa-rtf.service.ts,
                un-gabinete.service.ts, paso-critico.service.ts,
                convenio-general.service.ts, notificacion.service.ts,
                admin.service.ts
features/
  login/        Login con credenciales sel-api-seguridad
  oa-dashboard/ Dashboard principal del postulante (pasos críticos, KPIs)
  bandeja-oa/   Bandeja de RTF del postulante
  oa-registro/  Formulario de registro de paso crítico — tabs R1/T1/R2/F1,
                Anexos (informes técnicos y documentos sustentatorios del
                Instructivo AGROIDEAS) y Anexo 17 (vista previa, descarga y
                adjunto de la copia firmada; el circuito de firma es físico/
                externo al sistema, ver ADR-014)
  oa-enviar/    Envío de RTF a UN
  oa-observaciones/ Visualización de observaciones
  reportes/     ReporteFisicoComponent (3.1), ReporteFinancieroComponent (3.2)
  un-dashboard/ Dashboard de la unidad UN
  un-gabinete/  Evaluación de gabinete: evaluación por ítem (meta/indicador)
                con categoría y subsanabilidad, checklist de admisibilidad del
                Instructivo AGROIDEAS, Anexo 18 (Informe de Comprobación),
                verificación de campo opcional (Anexo 19, ver ADR-010), y la
                bandeja de plazos/escalamiento por incumplimiento (Carta
                Recordatoria → En Desacato → Carta Notarial → Bloqueo
                Definitivo, ver "Máquina de estados del RTF" abajo) con el
                botón "Marcar convenio como resuelto" (acción manual e
                irreversible de la UN, con confirmación)
  admin/        Panel de administración (rol ADMIN): parámetros del sistema,
                reporte de cumplimiento de plazos, reporte de productividad UN
  documentacion-rtf/ Modal compartido de subida/previsualización de documentos,
                usado desde oa-registro y un-gabinete (no es una ruta propia)
layout/
  app-shell/    AppShellComponent — llena los slots de UiAppShellComponent
  notificacion-bell/ NotificacionBellComponent
```

## Modelos de sesión

`AuthService` (`core/services/auth.service.ts`) consume `sel-api-seguridad` y mapea los roles
del backend (texto completo en español) a un `UserRole` corto usado por rutas/guards:

```
POSTULANTE                    → POSTULANTE
UNIDAD DE MONITOREO           → UN
UNIDAD DE NEGOCIOS            → UN
ADMINISTRADOR DEL SISTEMA     → ADMIN
(cualquier rol no reconocido) → POSTULANTE (fallback explícito, evita ciclos de redirección)
```

`UserRole` también admite `DE`, `UAJ`, `USE` y `TECNICO` (usados por guards/rutas), pero
ningún rol de `sel-api-seguridad` se mapea a ellos hoy — solo `POSTULANTE`, `UN` y `ADMIN`
están realmente en uso.

El almacenamiento usa `STORAGE_KEYS.SAT_TOKEN` y `STORAGE_KEYS.SAT_USER_SESSION` de `@agroideas/utils`.

## Máquina de estados del RTF

`est_rtf` (fuente de verdad en `sigec-api-rtf`, `EstadoRtf.cs`) tiene 15 valores. El frontend
solo se preocupa de mapearlos a label/color — no reimplementa ninguna transición ni gating de
plazos, eso vive enteramente en el backend (`MaquinaEstadosRtf`/`DeadlineWorker`/
`ControlPlazoServicio`, ver ADR-018 en el repo del backend).

| Estado | Quién lo ve | Notas |
|---|---|---|
| `PENDIENTE`, `EN_EDICION` | OA | Editable, aún no enviado |
| `ENVIADO` | — | Transitorio: se resuelve a `EN_REVISION` en la misma petición HTTP del envío; nunca aparece en un `GET`. Distingue el envío inicial de `SUBSANADO` solo en `SRT_TMD_ACTIVIDAD` (auditoría) |
| `SUBSANADO` | — | Igual que `ENVIADO` pero para el reenvío tras `OBSERVADO` |
| `EN_REVISION`, `AUDITADO_CAMPO`, `IN_REVISION_UN` | UN | Evaluación interna (bandeja de gabinete) |
| `OBSERVADO` | OA | Editable — la OA debe subsanar y reenviar |
| `APROBADO`, `RECHAZADO` | — | Terminales |
| `VENCIDO` | OA (editable) | Venció el plazo de 15 días para presentar (o 10 para subsanar); espera Carta de Notificación de la UN |
| `PLAZO_INICIAL_NOTIFICACION` | OA (editable) | UN registró la Carta Recordatoria; nueva prórroga corriendo |
| `EN_DESACATO` | UN | Venció la prórroga de la Carta Recordatoria sin reenvío; corresponde registrar la Carta Notarial |
| `PLAZO_LIMITE_NOTARIAL` | OA (editable) | UN registró la Carta Notarial; plazo perentorio de hasta 30 días |
| `BLOQUEO_DEFINITIVO` | UN | Terminal — venció la Carta Notarial; la UN puede confirmar la Resolución del Convenio desde la bandeja de `un-gabinete` |

Los labels/colores de cada estado están duplicados a propósito en 3 lugares (sin un mapa único
compartido salvo `RtfService.rtfStatusLabel`, que cubre `oa-registro`):
`un-gabinete.component.ts` (`ESTADO_LABELS`/`estadoPillStatus`, la implementación de referencia),
`bandeja-oa.component.ts` (`statusLabel`/`estadoPillStatus`, folded en el tab "Vencido") y
`oa-dashboard.component.ts` (`statusLabel`/`statusColorClass`/`statusDotClass`).

## Rutas

| Ruta | Componente | Roles |
|---|---|---|
| `/login` | `LoginComponent` | — |
| `/rtf/dashboard` | `OaDashboardComponent` | `POSTULANTE` |
| `/rtf/bandeja` | `BandejaOAComponent` | `POSTULANTE` |
| `/rtf/pasos-criticos/registrar` | `OaRegistroComponent` | `POSTULANTE` |
| `/rtf/pasos-criticos/:idpc/registrar` | `OaRegistroComponent` | `POSTULANTE` |
| `/rtf/pasos-criticos/enviar` | `OaEnviarComponent` | `POSTULANTE` |
| `/rtf/pasos-criticos/observaciones` | `OaObservacionesComponent` | `POSTULANTE` |
| `/rtf/reportes/metas-fisicas` | `ReporteFisicoComponent` | `POSTULANTE` |
| `/rtf/reportes/metas-financieras` | `ReporteFinancieroComponent` | `POSTULANTE` |
| `/rtf/dashboard-un` | `UnDashboardComponent` | `UN, DE, UAJ, USE, ADMIN` |
| `/rtf/evaluacion-gabinete` | `UnGabineteComponent` | `UN, DE, UAJ, USE, ADMIN` |
| `/rtf/admin` | `AdminComponent` | `ADMIN` |
| `/rtf/admin/parametros` | `AdminParametrosComponent` | `ADMIN` |
| `/rtf/admin/cumplimiento-plazos` | `AdminCumplimientoPlazosComponent` | `ADMIN` |
| `/rtf/admin/productividad-un` | `AdminProductividadUnComponent` | `ADMIN` |

**Nota ADR-010:** No existe un actor `UR` separado — la verificación de campo (Anexo 19) es parte de `UnGabineteComponent`, para el mismo especialista UN.

## Dependencias de libs

```
@agroideas/auth    — authInterceptor, AUTH_LOGOUT_HANDLER, mapSelUsuario,
                     SelLoginResponse, SelUsuarioDto
@agroideas/ui      — UiAppShellComponent, UIButtonComponent, UIModalComponent,
                     UiStatusPillComponent, UiProgressBarComponent,
                     UiFilterBarComponent, UiDataTableComponent,
                     UiPaginationComponent, UiCountdownBannerComponent,
                     UiDropzoneComponent, UiFileChipComponent,
                     UiPdfViewerComponent, ToastService
@agroideas/utils   — STORAGE_KEYS, ResponseDto, formatConvenioNumber
@agroideas/theme   — base.css (HSL tokens + Tailwind preset)
```

`@agroideas/feedback` (`AlertService`) no se usa en esta app — los toasts/alertas pasan por
`ToastService` de `@agroideas/ui`.

## Contrato de APIs

| Variable entorno | URL |
|---|---|
| `apiAuth` | `https://localhost:7101/api/Auth` |
| `apiUrl` | `https://localhost:7300/api/v1` |
| `apiGeneral` | `https://localhost:7080/api/v2` |

## Desarrollo

```sh
npx nx serve sigec-rtf          # :4300
npx nx lint sigec-rtf
npx nx test sigec-rtf
npx nx build sigec-rtf           # dist/apps/sigec-rtf/browser/
```

## Referencias

ADRs propios de esta app, en `apps/sigec-rtf/adr/`:
- `0010-unificacion-rol-ur-en-un-rtf.md` — por qué no existe un actor UR separado.
- `0011-estado-deuda-tecnica-lint-sigec-rtf.md` y `plan-remediacion-lint.md` — deuda de lint.
- `0012-t1-r2-bd-sel-y-snapshot-f1.md` — snapshot F1 y datos de sel-api-general.
- `0013-filtros-busqueda-bandeja-evaluacion-gabinete.md` — filtros de bandeja/gabinete.
- `0014-pliego-observaciones-oa-y-rediseno-bandeja.md` — pliego de observaciones real con
  atención por ítem, gate de reenvío en `oa-registro` y rediseño de `bandeja-oa` (implementado
  por completo el 17/09/2026; consume `sigec-api-rtf` ADR-016).
- `0015-rediseno-institucional-pantalla-login.md` — rediseño institucional (MIDAGRI/AGROIDEAS)
  de `/login`: ayudas contextuales por tipo de usuario, toggle mostrar/ocultar contraseña,
  aviso regulatorio de acceso/auditoría y cobertura de specs para `LoginComponent`.

Los ADR-012 (plazos legales del Instructivo SEL), ADR-013 (Panel de Administración) y ADR-018
(máquina de estados completa, bandeja de plazos de la UN y Resolución de Convenio — la fuente de
verdad de la tabla "Máquina de estados del RTF" arriba, con las 10 fases de su implementación
verificadas en vivo) viven en el repositorio del backend (`sigec-api-rtf`), no en este monorepo.
