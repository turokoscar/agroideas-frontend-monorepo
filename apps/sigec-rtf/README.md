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
                Instructivo AGROIDEAS, Anexo 18 (Informe de Comprobación) y
                verificación de campo opcional (Anexo 19, ver ADR-010)
  admin/        Panel de administración (rol ADMIN): parámetros del sistema,
                reporte de cumplimiento de plazos, reporte de productividad UN
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

Los ADR-012 (plazos legales del Instructivo SEL) y ADR-013 (Panel de Administración) que
motivaron el rol `ADMIN` y sus reportes viven en el repositorio del backend
(`sigec-api-rtf`), no en este monorepo.
