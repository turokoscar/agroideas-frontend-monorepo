# KOFIX Ejecución — Sistema Kardex

**App de ejecución y seguimiento de planes** del sistema KOFIX. Gestión de convenios, cartera, programación, desembolsos, rendiciones, kardex y alertas.

## Datos generales

| | |
|---|---|
| **Puerto dev** | `:7100` (`npx nx serve kofix-ejecucion`) |
| **Tags** | `scope:kofix`, `type:app` |
| **Estilo** | `css` global, `.sass` en componentes |
| **Auth** | `@agroideas/auth` interceptor + `AUTH_LOGOUT_HANDLER` + `AUTH_TOKEN_KEY` (`STORAGE_KEYS.TOKEN`) |
| **Layout** | `UiAppShellComponent` (`@agroideas/ui`) con `[colapsadoEscritorio]` para colapso a íconos |
| **Polyfills** | `zone.js` + `@angular/localize/init` |
| **Allowed CommonJS** | `sweetalert2`, `leaflet` |
| **Build configs** | `production` (default), `quality` (file replacement → `environment.quality.ts`), `local` (file replacement → `environment.local.ts`) |

## Arquitectura — Clean Architecture (3 capas)

```
domain/
  models/          Modelos puros (convenio, desembolso, rendicion, etc.)
  repositories/    Interfaces abstractas (AuthRepository, ConvenioRepository, ...)
  usecases/        Logica de negocio @Injectable({providedIn:'root'})
data/
  mappers/         DTO del API → modelo del dominio
  repositories/    Implementaciones concretas (HttpClient + environments)
presentation/
  pages/           Páginas routing lazy con loadComponent
  components/      Componentes reutilizables de presentación
  layout/
    app.layout.component.ts   AppLayoutComponent — llena slots de UiAppShellComponent
    app.menu.component.ts     Menú de navegación
shared/
  services/        Estado app-específico (convenio-state, export, file-storage)
```

**Composición root** (`app.config.ts`): cada repositorio abstracto se bindea a su impl con `useExisting`, formando un singleton compartido. Los UseCases son `@Injectable({providedIn:'root'})` y se auto-resuelven.

## Rutas principales

| Ruta | Página | Permiso |
|---|---|---|
| `/login` | `LoginPageComponent` | — |
| `/main/home` | `HomeComponent` | `ACCESO_APP` |
| `/main/convenios` | `ConvenioListPageComponent` | `ACCESO_APP` |
| `/main/convenios/:id` | `ConvenioDetailPageComponent` | `ACCESO_APP` |
| `/main/cartera` | `CarteraPageComponent` | `GESTION_CARTERA` |
| `/main/programacion-vigente` | `ProgramacionVigentePageComponent` | `ACCESO_APP` |
| `/main/programacion-vigente/:id` | `ProgramacionVigenteDetailPageComponent` | `ACCESO_APP` |
| `/main/ejecucion` | `EjecucionPageComponent` | `ACCESO_APP` |
| `/main/ejecucion/:id` | `EjecucionDetailPageComponent` | `ACCESO_APP` |
| `/main/ejecucion/:id/gastos-f1` | `GastosF1PageComponent` | `ACCESO_APP` |
| `/main/kardex` | `KardexPageComponent` | `ACCESO_KARDEX` |
| `/main/alertas` | `AlertasPageComponent` | `MONITOREO_ALERTAS` |
| `/main/bandeja-aprobacion` | `BandejaAprobacionPageComponent` | `MONITOREO_ALERTAS` |
| `/main/reportes` | `ReportesPageComponent` | `ACCESO_APP` |
| `/main/gestion-menus` | `GestionMenusPageComponent` | `GESTION_CARTERA` |
| `/main/styleguide` | `StyleguidePageComponent` | — |

## Repositorios

```
AuthRepository          — login/logout, sesión, permisos del backend
ConvenioRepository      — CRUD de convenios
DesembolsoRepository    — desembolsos asociados a convenios
NoObjecionRepository    — no objeciones técnicas
ProgramacionRepository  — programación de actividades
RendicionRepository     — rendiciones de gastos
CarteraRepository       — gestión de cartera
KardexRepository        — kardex de productos/insumos
AlertaRepository        — alertas y monitoreo
CatalogoRepository      — catálogos generales (ubigeo, etc.)
SunatRepository         — consulta RUC/DNI
MenuRepository         — gestión dinámica de menús
```

## Contrato de APIs

| Variable entorno | URL |
|---|---|
| `apiSeguridad` | `https://test.agroideas.gob.pe/api-seguridad/api` |
| `apiEjecucion` | `https://localhost:7102/api` |
| `apiArchivos` | `https://localhost:7295` |

## Dependencias de libs

```
@agroideas/auth      — authInterceptor, AUTH_LOGOUT_HANDLER, AUTH_TOKEN_KEY
@agroideas/ui        — UiAppShellComponent, ui-button, ui-card, ui-modal,
                       ui-data-table, ui-pagination, ui-select-search,
                       ui-map (Leaflet), ui-dropzone, ui-file-chip, ui-pdf-viewer,
                       ToastService
@agroideas/utils     — PERMISSIONS, STORAGE_KEYS, cn, currency, date-formatter,
                       jwt.util, response.dto, format-date pipe, roles
@agroideas/feedback  — AlertService
@agroideas/security  — USER_PERMISSIONS_PROVIDER, permissionGuard, HasPermissionDirective
@agroideas/theme     — base.css (HSL tokens + Tailwind preset)
```

## Desarrollo

```sh
npx nx serve kofix-ejecucion              # :7100 (default config: local)
npx nx serve kofix-ejecucion --configuration=production
npx nx lint kofix-ejecucion
npx nx test kofix-ejecucion
npx nx build kofix-ejecucion                       # dist/apps/kofix-ejecucion/browser/
npx nx build kofix-ejecucion --configuration=quality  # environment.quality.ts
```

**Target lint:** pasa con 0 errores y ~259 warnings (deuda de estilo intencional, reglas `no-explicit-any`/`no-unused-vars` bajadas a `warn` en `apps/kofix-ejecucion/eslint.config.js`).
