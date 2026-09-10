# SIGEC RTF — Reporte Técnico Financiero

**Módulo de Reporte y Validación** del sistema SIGEC. Permite a los Postulantes registrar el avance físico y financiero de sus convenios, y a las unidades UN/DE/UAJ/USE evaluar los reportes entrantes.

## Datos generales

| | |
|---|---|
| **Puerto dev** | `:4300` (`npx nx serve sigec-rtf`) |
| **Tags** | `scope:kofix`, `type:app` |
| **Estilo** | `scss` |
| **Auth** | `@agroideas/auth` interceptor + `AUTH_LOGOUT_HANDLER` factory en `app.config.ts` |
| **Layout** | `UiAppShellComponent` (`@agroideas/ui`) — slots: `[shell-brand]`, `[shell-nav]`, `[shell-user]`, `[shell-header]` |
| **APIs** | `apiAuth` (:7101), `apiUrl` (:7300), `apiGeneral` (:7080) |

## Arquitectura

```
core/
  guards/       auth.guard.ts, role.guard.ts
  models/       DTOs del dominio (convenio, paso crítico, RTF, UR, etc.)
  pipes/        format-convenio.pipe.ts
  services/     auth.service.ts, rtf.service.ts, oa-rtf.service.ts,
                un-gabinete.service.ts, paso-critico.service.ts,
                convenio-general.service.ts, notificacion.service.ts
features/
  login/        Login con credenciales sel-api-seguridad
  oa-dashboard/ Dashboard principal del postulante (pasos críticos, KPIs)
  bandeja-oa/   Bandeja de RTF del postulante
  oa-registro/ Formulario de registro de paso crítico
  oa-enviar/    Envío de RTF a UR
  oa-observaciones/ Visualización de observaciones
  reportes/     ReporteFisicoComponent (3.1), ReporteFinancieroComponent (3.2)
  un-dashboard/ Dashboard de la unidad UN
  un-gabinete/  Evaluación de gabinete (Anexo 19)
layout/
  app-shell/    AppShellComponent — llena los slots de UiAppShellComponent
  notificacion-bell/ NotificacionBellComponent
```

## Modelos de sesión

`AuthService` (`core/services/auth.service.ts`) consume `sel-api-seguridad` y mapea los roles del backend (`"UNIDAD DE MONITOREO"`, `"UNIDAD DE NEGOCIOS"`, `"ADMINISTRADOR DEL SISTEMA"`) a los roles internos de la app:

```
POSTULANTE  → postulante del convenio
UN / DE / UAJ / USE → evaluador de RTF
TECNICO
```

El almacenamiento usa `STORAGE_KEYS.SAT_TOKEN` y `STORAGE_KEYS.SAT_USER_SESSION` de `@agroideas/utils`.

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
| `/rtf/dashboard-un` | `UnDashboardComponent` | `UN, DE, UAJ, USE` |
| `/rtf/evaluacion-gabinete` | `UnGabineteComponent` | `UN, DE, UAJ, USE` |

**Nota ADR-010:** No existe un actor `UR` separado — la verificación de campo (Anexo 19) es parte de `UnGabineteComponent`, para el mismo especialista UN.

## Dependencias de libs

```
@agroideas/auth    — authInterceptor, AUTH_LOGOUT_HANDLER, mapSelUsuario
@agroideas/ui      — UiAppShellComponent, ui-button, ui-card, ui-status-pill,
                     ui-kpi, ui-progress-bar, ui-modal, ui-filter-bar,
                     ui-data-table, ui-pagination, ui-select-search,
                     ui-countdown, ui-dropzone, ui-file-chip, ui-pdf-viewer,
                     ToastService
@agroideas/utils   — STORAGE_KEYS, cn, currency, date-formatter, jwt.util,
                     permissions, response.dto, format-date pipe, roles
@agroideas/feedback — AlertService
@agroideas/theme   — base.css (HSL tokens + Tailwind preset)
```

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
