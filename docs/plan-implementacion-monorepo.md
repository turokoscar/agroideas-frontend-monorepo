# Plan de Implementación — Monorepo Frontend AGROIDEAS

> Documento operativo del [ADR 0001](./adr/0001-migracion-monorepo-frontend-agroideas.md).
> Estándar: **Nx (línea 19.x) + Angular 18**. Design system **agnóstico** (`@agroideas/ui`).
> Estrategia: extraer librerías **desde KOFIX** (referencia de diseño) y validarlas con
> KOFIX antes de migrar YACHACHIP.

## Principios de ejecución
- **Fases cortas e integrables**: cada fase deja el monorepo compilando y verde en CI.
- **KOFIX primero**: las librerías se extraen y validan con la app de referencia; YACHACHIP las consume después.
- **Feature freeze por módulo**: se congela el módulo en migración en el repo origen para evitar divergencia.
- **Límites desde el día 1**: `@nx/enforce-module-boundaries` activo antes de mover código de negocio.
- **Sin import directo de proveedor**: lint prohíbe `primeng`/`@angular/material` en `apps/*` (solo vía `@agroideas/ui`).

## Resumen de fases

| Fase | Objetivo | Duración estimada |
|---|---|---|
| 0 | Fundación del monorepo (re-scaffold Angular 18, estructura, CI, convenciones) | ✅ EJECUTADA |
| 1 | `@agroideas/theme`: tokens MIDAGRI unificados + preset Tailwind | ✅ EJECUTADA |
| 2 | Importar KOFIX como app `kofix-ejecucion` (lift & shift, compila en monorepo) | ✅ EJECUTADA |
| 3 | Extraer librerías compartidas desde KOFIX (`ui`, `auth`, `http`, `feedback`, `security`, `utils`) | ✅ EJECUTADA |
| 4 | Importar YACHACHIP como `sat-ui`, retirar Material, adoptar las librerías | ✅ EJECUTADA |
| 5 | Endurecimiento: boundaries, showcase, tests, CI/CD, decomiso de repos legados | 4–6 días |

> Estimaciones para 1–2 desarrolladores; ajustar según disponibilidad.

---

## Fase 0 — Fundación del monorepo  ✅ EJECUTADA (2026-05-25)

**Estado:** completada y verde. Workspace **Nx 19.8.14 + Angular 18.2** con 2 apps
(`kofix-ejecucion`, `sat-ui`) + 7 libs (`theme`, `ui`, `auth`, `http`, `feedback`,
`security`, `utils`), tags `scope:*`/`type:*`, `enforce-module-boundaries` activo y
ban de proveedores en `apps/*`. Verificado: `lint` (11), `build` (2 apps), `test` (8),
y bloqueo de dependencias inválidas probado. El scaffold previo (Angular 21) quedó
respaldado en `agroideas-frontend-monorepo.ng21-backup-*`.

**Aprendizajes / ajustes aplicados** (ver [`docs/phase-0/version-pins.md`](./phase-0/version-pins.md)):
- Generadores Nx 19.x requieren `--projectNameAndRootFormat=as-provided` (si no, derivan
  nombres/rutas duplicados: `theme-theme`, `libs/theme/theme`, `sat-ui-sat-ui`).
- Fijar el stack de lint: **eslint 9.14.0 ↔ typescript-eslint 8.13.0** (+ `overrides`),
  compatibles con `angular-eslint 18.4.3`.
- Desactivar `@typescript-eslint/ban-ts-comment` en `**/*.html` (regla TS sin `files`
  en el preset de Nx que se filtra al parser de plantillas).

**Objetivo:** dejar un monorepo Nx en Angular 18 limpio, con convenciones, CI y límites listos.

**Tareas**
1. Respaldar/eliminar el scaffold actual (Angular 21) — no contiene código de negocio ni commits.
2. Re-scaffold con Nx 19.x preset Angular + Angular 18:
   ```sh
   npx create-nx-workspace@^19 agroideas-frontend-monorepo \
     --preset=angular-monorepo --appName=kofix-ejecucion \
     --style=scss --e2eTestRunner=playwright --unitTestRunner=jest --ssr=false
   ```
3. Inicializar git, `.editorconfig`, Prettier, ESLint (flat o `.eslintrc`), `tsconfig.base.json` con `paths` para `@agroideas/*`.
4. Definir convención de **tags** (`scope:*`, `type:*`) y activar `@nx/enforce-module-boundaries`.
5. Configurar regla de lint que prohíbe import de `primeng`/`@angular/material` en `apps/*`.
6. CI base: `nx affected -t lint,test,build` con `nx/affected` y caché.
7. `CONTRIBUTING.md` con generadores estándar (`nx g @nx/angular:lib`, convención de nombres).

**Entregables:** monorepo Angular 18 vacío que compila; CI verde; reglas de boundaries activas.

**Criterios de aceptación:** `nx run-many -t build,lint,test` pasa; intento de import cruzado entre apps falla en lint.

**Riesgos:** compatibilidad Nx↔Angular 18 → fijar versiones exactas (Nx 19.8.x + Angular 18.2.x).

---

## Fase 1 — `@agroideas/theme` (tokens y preset Tailwind)  ✅ EJECUTADA (2026-05-25)

**Estado:** completada y verde. `@agroideas/theme` con `styles/tokens.css` (variables
HSL MIDAGRI/INIA de KOFIX), `tailwind-preset.js` (mapeo a `hsl(var(--token))`, sin hex,
sombras premium, Roboto, plugins forms/container-queries) y `styles/base.css`
(`@tailwind` + tipografía + clases compartidas). Tailwind 3.4 añadido al workspace.
Validado en `sat-ui` (extiende el preset + importa `base.css`): el CSS generado contiene
`var(--primary)` y `--primary: 118 64% 22%`. `lint`/`test`/`build` verdes.
Detalle en el ADR 0001 → Registro de implementación.

**Objetivo:** una sola fuente de verdad de marca MIDAGRI, themeable por app.

**Tareas**
1. `nx g @nx/js:lib theme --directory=libs/theme --importPath=@agroideas/theme`.
2. Migrar las **variables CSS HSL** canónicas (paleta INIA de KOFIX: `--primary #346b00`, `--accent #fab50b`, jerarquía `surface`, `--sidebar-*`, estados) a `libs/theme/src/styles/_tokens.css`.
3. Crear **preset de Tailwind compartido** (`libs/theme/src/tailwind-preset.js`) que consume las variables CSS (estilo YACHACHIP) — **eliminar el hex hardcodeado**. Incluir `borderRadius`, `fontFamily` (Roboto), sombras `premium`/`card`/`pill`/`ambient`, plugins `@tailwindcss/forms` y `container-queries`.
4. Exponer base global (`base.css` con `@tailwind base/components/utilities` + tokens + tipografía).
5. Documentar override de tokens por app (cómo personalizar si una app necesita variar).

**Entregables:** `@agroideas/theme` con preset + tokens + estilos base.

**Criterios de aceptación:** un `tailwind.config.js` de app que extiende el preset renderiza la paleta MIDAGRI correcta.

**Riesgos:** drift de valores entre apps → a partir de aquí, ningún color hex se define fuera de `@agroideas/theme`.

---

## Fase 2 — Importar KOFIX como `apps/kofix-ejecucion`  ✅ EJECUTADA (2026-05-25)

**Estado:** completada y verde. KOFIX (~111 archivos, Clean Architecture) corre en el
monorepo consumiendo `@agroideas/theme`. Deps añadidas (PrimeNG 17.18, primeicons,
leaflet, sweetalert2, `@angular/localize`, `@types/leaflet`); se omitieron
`@ng-bootstrap`/`bootstrap` (declaradas pero sin uso). Build con `@angular/localize/init`,
`allowedCommonJsDependencies`, budgets 2MB, serve en :7100. Specs migrados Jasmine→Jest.
Override ESLint transitorio (proveedores permitidos + reglas heredadas a `warn`) a
revertir en Fase 3. Verificado: `lint` (11), `test` (8 · 56 de kofix), `build` (2 apps).
Detalle en el ADR 0001 → Registro de implementación.

**Objetivo:** traer la app de referencia al monorepo, compilando, **antes** de extraer librerías.

**Tareas**
1. `nx g @nx/angular:app kofix-ejecucion` (o adaptar la app generada en Fase 0).
2. Copiar `src/app` de `mc-ui-ejecucion` (Clean Architecture: `domain`/`data`/`presentation`/`shared`/`layout`).
3. Migrar dependencias al `package.json` raíz del monorepo: PrimeNG 17, primeicons, SweetAlert2, Leaflet, `@ng-bootstrap/ng-bootstrap`, Bootstrap.
4. Apuntar el `tailwind.config.js` de la app al **preset `@agroideas/theme`**; quitar tokens locales.
5. Migrar `environments`, rutas (`/login`, `/dashboard/*`), `app.config.ts` (providers de repositorios), interceptor y guard.
6. Conservar `target` ES2022 / `moduleResolution bundler`, `strictTemplates`, `@angular/localize/init`.
7. Verificar build y arranque (`nx serve kofix-ejecucion`, puerto 7100).

**Entregables:** KOFIX funcionando dentro del monorepo, usando `@agroideas/theme`.

**Criterios de aceptación:** paridad funcional/visual con `mc-ui-ejecucion`; `nx build kofix-ejecucion` ok; unit tests migrados pasan.

**Riesgos:** rutas de assets/estilos SASS → ajustar `project.json` (`styles`, `assets`, `stylePreprocessorOptions`).

---

## Fase 3 — Extraer librerías compartidas desde KOFIX  ✅ EJECUTADA (2026-05-26)

**Estado:** completada y verde. Todas las utilidades, componentes UI unificados, alertas, directivas/servicios de permisos y el interceptor de autorización se extrajeron de `kofix-ejecucion` a las librerías transversales `@agroideas/*` consumiendo inyección de dependencias (`USER_PERMISSIONS_PROVIDER`, `AUTH_LOGOUT_HANDLER`) para desacoplar las aplicaciones.

**Objetivo:** convertir lo común de KOFIX en librerías; KOFIX pasa a **consumirlas** (validación in-place).

> Se ejecuta por sub-fases independientes; cada una deja KOFIX compilando.

**3.1 `@agroideas/utils`** — `currency`, `jwt.util`, `storage-keys`, `permissions`, y `cn()` (clsx + tailwind-merge, tomado de YACHACHIP). KOFIX importa desde la lib; se borran los originales.

**3.2 `@agroideas/ui` (design system agnóstico)** — portar `ui-button`, `ui-card`, `ui-data-table`, `ui-filter-bar`, `ui-kpi`, `ui-modal`, `ui-progress-bar`, `ui-status-pill`, `ui-map`.
- API pública propia (inputs/severities actuales de KOFIX) **sin filtrar PrimeNG/Material**.
- PrimeNG permitido **solo dentro de la lib** como detalle interno (p. ej. `RippleModule`, tabla base).
- Crear página **showcase/styleguide** (migrar la de KOFIX) como banco de pruebas visual.
- KOFIX reemplaza sus imports locales por `@agroideas/ui`.

**3.3 `@agroideas/feedback`** — `AlertService` (SweetAlert2) centralizado.

**3.4 `@agroideas/security`** — `PermissionService` + directiva `has-permission`.

**3.5 `@agroideas/auth` + `@agroideas/http`** — token storage (clave estandarizada), `auth.interceptor` (Bearer + manejo 401→login), `authGuard`, contrato `ResponseDto` y base HTTP/manejo de errores. Lo específico de dominio (repos de convenio/desembolso/etc.) permanece en la app.

**Entregables:** 6 librerías publicables internamente; KOFIX consumiendo todas.

**Criterios de aceptación:** KOFIX sin código común duplicado; `nx graph` muestra dependencias correctas; boundaries verdes; showcase renderiza todos los componentes.

**Riesgos:** sobre-extracción (mover lógica de dominio a libs) → mantener en libs solo lo verdaderamente transversal.

---

## Fase 4 — Importar YACHACHIP como `apps/sat-ui` y adoptar librerías  ✅ EJECUTADA (2026-05-26)

**Estado:** completada y verde. Migramos YACHACHIP a `apps/sat-ui` en Angular 18 (Standalone). Adoptamos la marca visual unificada de `@agroideas/theme` (MIDAGRI/INIA `#346b00`), reemplazamos todo lo harcodeado por archivos de configuración (`mock-data.config.ts` y entornos `environment.ts`), y sustituimos toda la interfaz por `@agroideas/ui` (`ui-button`, `ui-card`, `ui-status-pill`, `ui-data-table`, `ui-map`), retirando Angular Material del todo.

**Objetivo:** YACHACHIP hereda diseño y funcionalidad común; se retira Angular Material.

**Tareas**
1. `nx g @nx/angular:app sat-ui`; subir de Angular 17 → 18.
2. Copiar `src/app` (`core`/`features`/`layout`/`shared`).
3. Apuntar Tailwind al preset `@agroideas/theme` (reemplaza tokens locales con verde divergente).
4. **Reemplazar Angular Material** por `@agroideas/ui`:
   - `button`→`ui-button`, `card`→`ui-card`, `badge`/`status-badge`→`ui-status-pill`, `stat-card`→`ui-kpi`.
   - Componentes Material sin equivalente directo (datepicker, select, dialog, etc.): añadirlos a `@agroideas/ui` o resolver con primitivas del DS.
5. Adoptar `@agroideas/auth`/`@agroideas/http` (reemplaza `auth.service`/`data.service`/`jwt.interceptor`/`auth.guard` locales) y `@agroideas/feedback`/`@agroideas/security`/`@agroideas/utils`.
6. Migrar features (`asignaciones`, `asistentes`, `dashboard`, `evidencias`, `informes`, `login`, `organizaciones`, `sincronizacion`) consumiendo el DS.
7. Retirar `@angular/material`, `@angular/cdk` del `package.json` cuando no queden usos.

**Entregables:** YACHACHIP en el monorepo, sin Material, con look & feel MIDAGRI unificado.

**Criterios de aceptación:** `nx build sat-ui` ok; cero imports de `@angular/material`; paridad funcional; tests pasan; revisión visual aprobada.

**Riesgos:** *gaps* de componentes (Material → DS) → inventariar componentes Material usados al inicio de la fase y priorizar su equivalente en `@agroideas/ui`.

---

## Fase 5 — Endurecimiento y decomiso

**Objetivo:** consolidar calidad, automatización y cierre de repos legados.

**Tareas**
1. Endurecer `enforce-module-boundaries` y la regla anti-proveedor; revisar `nx graph`.
2. Showcase/styleguide como documentación viva del DS (opcional: Storybook).
3. Cobertura de tests en librerías compartidas (especialmente `ui`, `auth`).
4. CI/CD: pipelines `nx affected`, caché remota (Nx Cloud opcional), `nx release` si se versionan libs.
5. Documentar onboarding y convenciones en `README`/`CONTRIBUTING`.
6. Archivar/decomisar `mc-ui-ejecucion` y `app-sat-agroideas-ui` (read-only) tras periodo de estabilización.
7. Backlog: actualización unificada Angular 18 → 21 como iniciativa separada.

**Entregables:** monorepo productivo, CI/CD afectado, repos legados archivados.

**Criterios de aceptación:** ambos apps despliegan desde el monorepo; `nx affected` opera; documentación publicada.

---

## Tabla de mapeo de componentes (KOFIX → DS → YACHACHIP)

| `@agroideas/ui` | Origen KOFIX | Reemplaza en YACHACHIP |
|---|---|---|
| `ui-button` | `ui-button` | `button` + botones Material |
| `ui-card` | `ui-card` | `card` |
| `ui-status-pill` | `ui-status-pill` | `badge`, `status-badge` |
| `ui-kpi` | `ui-kpi` | `stat-card` |
| `ui-data-table` | `ui-data-table` | tablas Material |
| `ui-modal` | `ui-modal` | dialogs Material |
| `ui-filter-bar` / `ui-progress-bar` / `ui-map` | idem | (nuevos en YACHACHIP) |

## Inventario de librerías objetivo

| Librería | Import path | Tags | Contenido |
|---|---|---|---|
| theme | `@agroideas/theme` | `scope:shared,type:util` | preset Tailwind, variables CSS, fuentes |
| ui | `@agroideas/ui` | `scope:shared,type:ui` | design system `ui-*` |
| auth | `@agroideas/auth` | `scope:shared,type:data-access` | JWT, interceptor, guard, login |
| http | `@agroideas/http` | `scope:shared,type:data-access` | `ResponseDto`, base HTTP, errores |
| feedback | `@agroideas/feedback` | `scope:shared,type:util` | `AlertService` (SweetAlert2) |
| security | `@agroideas/security` | `scope:shared,type:util` | `PermissionService` + `has-permission` |
| utils | `@agroideas/utils` | `scope:shared,type:util` | `currency`, `jwt`, `storage-keys`, `cn()` |

## Métricas de éxito
- 0 imports directos de `primeng`/`@angular/material` en `apps/*`.
- 1 sola fuente de tokens de marca (`@agroideas/theme`).
- Reducción de duplicación de auth/UI/utils (objetivo: lo común vive solo en `libs/`).
- Builds incrementales con `nx affected` en CI.
- Paridad visual y funcional verificada por app contra su versión legada.
