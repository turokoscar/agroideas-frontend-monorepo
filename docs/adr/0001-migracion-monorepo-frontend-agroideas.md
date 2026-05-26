# ADR 0001: Migración a Monorepo Frontend AGROIDEAS y Estandarización del Design System

## Estado
Aceptado · **En ejecución** (Fase 0 ✅ · Fase 1 ✅ · Fase 2 ✅ — ver [Registro de implementación](#registro-de-implementación))

## Fecha
2026-05-25 (última actualización: 2026-05-25)

## Responsables
Equipo Frontend AGROIDEAS

## Repositorio
GitHub (privado): `turokoscar/agroideas-frontend-monorepo`

## Contexto

AGROIDEAS mantiene actualmente dos aplicaciones frontend Angular en repositorios
independientes, con stacks, arquitecturas y sistemas de diseño divergentes:

| Aspecto | KOFIX (`mc-ui-ejecucion`) | YACHACHIP (`app-sat-agroideas-ui`) |
|---|---|---|
| Rol | **Referencia de diseño** (más maduro) | Consumidor (heredará el diseño) |
| Angular | 18.2 | 17.3 |
| Librería UI | PrimeNG 17 + ng-bootstrap + Bootstrap 5 | Angular Material 17 + CDK |
| Estilos | Tailwind 3.4 + SweetAlert2 + SASS | Tailwind 3.4 (estilo shadcn: `clsx` + `tailwind-merge` + `tailwindcss-animate`) |
| Arquitectura | Clean Architecture (`domain`/`data`/`presentation`/`shared`/`layout`) | Feature-based (`core`/`features`/`layout`/`shared`) |
| Design system | Maduro: `ui-button`, `ui-card`, `ui-data-table`, `ui-filter-bar`, `ui-kpi`, `ui-map`, `ui-modal`, `ui-progress-bar`, `ui-status-pill` | Reducido: `button`, `card`, `badge`, `stat-card`, `status-badge` |
| Servicios compartidos | `AlertService`, `PermissionService` + `has-permission`, `ConvenioStateService`, `FileStorageService`; utils `currency`/`jwt`/`permissions`/`storage-keys` | `AuthService`, `DataService`, `jwt.interceptor`, `auth.guard` |
| Auth | JWT en `localStorage` (`kDX_TOKEN`), `auth.interceptor`, `authGuard` | JWT, `jwt.interceptor`, `auth.guard` |
| Tamaño | ~113 archivos TS, 15 páginas | ~26 archivos TS, 8 features |
| Tokens de marca | MIDAGRI/INIA verde `#346b00`, accent `#fab50b` (hex *hardcodeado* en `tailwind.config.js` **y** variables CSS HSL en `styles.css`) | Verde más brillante `100 54% 42%`, tema 100% dirigido por variables CSS |

Existe además un **scaffold de Nx ya iniciado** (`agroideas-frontend-monorepo`)
generado con **Nx 22.7.4 + Angular 21.2** (con SSR, Vitest, Playwright, ESLint
flat config). Contiene solo la app `sat-ui` con boilerplate (`nx-welcome`) y aún
no tiene commits.

### Problemas que motivan la decisión

1. **Inconsistencia visual y de marca** entre aplicaciones que deberían
   compartir la identidad MIDAGRI/AGROIDEAS.
2. **Duplicación de funcionalidad transversal**: autenticación JWT, interceptores,
   guards, utilidades y componentes de UI se reimplementan por separado y divergen.
3. **Doble librería de componentes** (PrimeNG vs Angular Material) que duplica
   peso de bundle, curva de aprendizaje y mantenimiento.
4. **Desalineación de versiones** (Angular 17 / 18 / 21) que impide compartir código.
5. **Tokens de diseño divergentes** y una fuente de verdad inconsistente dentro de
   KOFIX (hex en Tailwind vs variables CSS).

Este ADR continúa la línea del ADR 001 de KOFIX ("Estandarización de Arquitectura
Frontend y Alineación de Marca"), elevándolo de una sola app a **todo el portafolio
frontend de AGROIDEAS**.

## Decisiones

### D1 — Alcance: monorepo único con ambas aplicaciones
Se adopta un **monorepo Nx** (`agroideas-frontend-monorepo`) que albergará **ambas
aplicaciones** como `apps/*` y el código común como `libs/*`. KOFIX y YACHACHIP
consumirán librerías compartidas extraídas a partir de KOFIX (la referencia de diseño).

> Alternativas descartadas: (a) migrar solo YACHACHIP ahora — deja la fuente de
> verdad (KOFIX) fuera del monorepo y perpetúa la divergencia; (b) publicar una
> librería npm versionada — añade fricción de versionado/publicación sin los
> beneficios de refactor atómico y caché de Nx.

### D2 — Versión estándar: Angular 18 + Nx alineado
El monorepo se **re-scaffoldeará a Angular 18** (igualando a KOFIX, la app más
madura y la fuente del design system), con la versión de Nx compatible
(línea Nx 19.x). YACHACHIP sube de 17 → 18.

El scaffold actual en Angular 21 / Nx 22 se **descarta** (solo contiene boilerplate,
sin código de negocio ni commits). El salto a Angular 21 se planificará como una
actualización posterior unificada, una vez consolidado el monorepo.

> Motivo: portar un design system maduro (KOFIX) a Angular 21 *en simultáneo* con la
> unificación del monorepo multiplica el riesgo. Alinear primero en 18 permite mover
> código casi sin cambios de API y dejar la actualización de versión como un paso
> aislado y cacheable.

### D3 — Design system propio y agnóstico de librería
El paquete compartido **`@agroideas/ui`** será un design system basado en
**Tailwind + tokens MIDAGRI**, construido **a partir de los componentes `ui-*` de
KOFIX**. Expondrá una API propia, **agnóstica de la librería de componentes**:

- Las aplicaciones dependen **solo de `@agroideas/ui`**, nunca de PrimeNG ni de Material directamente.
- PrimeNG puede permanecer como **detalle de implementación interno opcional** de `@agroideas/ui` (p. ej. `RippleModule`, tabla base) sin filtrarse a las apps.
- **YACHACHIP retira Angular Material** y adopta `@agroideas/ui`.

> Alternativas descartadas: (a) estandarizar en PrimeNG completo — acopla todo el
> portafolio a un proveedor; (b) mantener ambas librerías indefinidamente — no
> resuelve la duplicación.

### D4 — Tokens de diseño unificados y dirigidos por variables CSS
Se establece una **única fuente de verdad de tokens** en `@agroideas/theme`:
- **Valores canónicos**: paleta MIDAGRI/INIA de KOFIX (verde primario `#346b00`,
  accent `#fab50b`, jerarquía de `surface`, sombras `premium`/`card`).
- **Mecanismo**: variables CSS HSL (`--primary`, `--sidebar-*`, etc.) + un **preset
  de Tailwind compartido** que las consume (adoptando el enfoque themeable de
  YACHACHIP). Se elimina el hex *hardcodeado* del `tailwind.config.js` de KOFIX.
- Esto habilita *theming* por aplicación mediante override de variables CSS sin
  duplicar configuración.

### D5 — Arquitectura de librerías y límites de módulos
Estructura objetivo de `libs/` y *tags* de Nx para gobernar dependencias:

```
agroideas-frontend-monorepo/
├── apps/
│   ├── kofix-ejecucion/        # ex mc-ui-ejecucion          (scope:kofix, type:app)
│   ├── sat-ui/                 # ex app-sat-agroideas-ui      (scope:sat,   type:app)
│   └── *-e2e/                  # Playwright
├── libs/
│   ├── theme/                  # @agroideas/theme  preset Tailwind + variables CSS + fuentes   (scope:shared, type:util)
│   ├── ui/                     # @agroideas/ui     design system (ui-button, ui-card, …)        (scope:shared, type:ui)
│   ├── auth/                   # @agroideas/auth   interceptor JWT, guard, token storage, login (scope:shared, type:data-access)
│   ├── http/                   # @agroideas/http   ResponseDto, base HTTP, manejo de errores    (scope:shared, type:data-access)
│   ├── feedback/               # @agroideas/feedback  AlertService (SweetAlert2)                (scope:shared, type:util)
│   ├── security/               # @agroideas/security  PermissionService + has-permission        (scope:shared, type:util)
│   └── utils/                  # @agroideas/utils  currency, jwt, storage-keys, cn(), helpers   (scope:shared, type:util)
```

**Reglas de límite (`@nx/enforce-module-boundaries`):**
- `type:app` puede depender de cualquier `type:*` compartido; **una app nunca depende de otra app**.
- `type:ui` solo puede depender de `type:util` (theme/utils). No depende de `data-access`.
- `type:data-access` no depende de `type:ui`.
- `scope:kofix` y `scope:sat` no se importan mutuamente; lo común vive en `scope:shared`.

## Consecuencias

### Positivas
- **Consistencia visual y de marca garantizada** en todo el portafolio AGROIDEAS desde un único origen de tokens y componentes.
- **Eliminación de duplicación** de auth, interceptores, guards, utilidades y UI.
- **Refactors atómicos** entre apps y libs, con **caché y grafo de dependencias de Nx** (builds/tests incrementales).
- **Una sola librería de componentes** efectiva, desacoplada del proveedor: cambiar PrimeNG/Material en el futuro se aísla dentro de `@agroideas/ui`.
- Base lista para incorporar **futuras apps AGROIDEAS** heredando el estándar.

### Negativas / costos
- **Esfuerzo de migración** de dos apps y extracción de ~7 librerías.
- **Re-scaffold** del monorepo (se descarta el scaffold en Angular 21).
- **YACHACHIP** debe reemplazar Angular Material por `@agroideas/ui` (reescritura de componentes que hoy usan Material).
- **Congelamiento parcial** de features durante ventanas de migración para evitar divergencia.
- Curva de aprendizaje de Nx (generadores, tags, caché) para el equipo.

### Riesgos y mitigaciones
| Riesgo | Mitigación |
|---|---|
| Regresiones visuales al portar `ui-*` | Página *styleguide/showcase* + revisión visual por componente antes de migrar páginas |
| Divergencia de ramas durante la migración | Migración por fases cortas, *feature freeze* por módulo, integración frecuente |
| Acoplamiento accidental entre apps | `@nx/enforce-module-boundaries` activo desde la Fase 0 |
| PrimeNG/Material filtrándose a las apps | API de `@agroideas/ui` agnóstica; lint que prohíbe import directo de `primeng`/`@angular/material` en `apps/*` |
| Subida de versión de YACHACHIP (17→18) introduce roturas | Migrar YACHACHIP **después** de validar las libs con KOFIX (misma versión 18) |

## Plan de implementación
El detalle por fases, tareas, entregables y criterios de aceptación se documenta en
[`docs/plan-implementacion-monorepo.md`](../plan-implementacion-monorepo.md).

## Registro de implementación

Esta sección registra cómo se materializaron las decisiones (las decisiones D1–D5
se mantienen como registro histórico; aquí se anota la realidad de ejecución).

### Fase 0 — Fundación ✅ (2026-05-25)
- **Versiones concretas** (precisa D2): **Nx 19.8.14 + Angular 18.2**. El scaffold previo
  en Angular 21 se descartó (respaldado en `*.ng21-backup-*`).
- Estructura creada: apps `kofix-ejecucion` + `sat-ui`; libs `theme`, `ui`, `auth`,
  `http`, `feedback`, `security`, `utils` con tags `scope:*`/`type:*` (implementa D5).
- `enforce-module-boundaries` activo + ban de `primeng`/`@angular/material`/etc. en
  `apps/*` (verificado con test negativo).
- **Pin del stack de lint**: `eslint 9.14.0` ↔ `typescript-eslint 8.13.0` (+ `overrides`)
  por compatibilidad con `angular-eslint 18.4.3`; `ban-ts-comment` desactivado en
  `**/*.html`. Detalle: [`docs/phase-0/version-pins.md`](../phase-0/version-pins.md).
- Verificado: `lint` (11), `build` (2 apps), `test` (8). Publicado en GitHub.

### Fase 1 — `@agroideas/theme` ✅ (2026-05-25)
- Implementación de D4 (tokens unificados, dirigidos por variables CSS):
  - `libs/theme/src/styles/tokens.css` — variables HSL canónicas MIDAGRI/INIA de KOFIX
    (primario `#346b00`, accent `#fab50b`, sidebar `#008F49`, surface, estados); incluye
    alias de compatibilidad de KOFIX (`--primary_container`, `--verde-agro`, …).
  - `libs/theme/src/tailwind-preset.js` — preset que mapea las clases a
    `hsl(var(--token) / <alpha>)`; **sin hex de marca hardcodeado** (elimina la
    inconsistencia de KOFIX). Sombras `premium/card/pill/ambient`, fuente Roboto,
    plugins `@tailwindcss/forms` y `container-queries`.
  - `libs/theme/src/styles/base.css` — `@tailwind` + tokens + tipografía + clases
    compartidas (`page-container`, `kpi-card`, `kardex-*`, `row-actions`, `cell-org`).
- Tailwind 3.4 añadido al workspace.
- **Validado** en `sat-ui` (extiende el preset + importa `base.css`): el CSS generado
  contiene `var(--primary)` y `--primary: 118 64% 22%`. `lint`/`test`/`build` verdes.

### Fase 2 — Importar KOFIX como `apps/kofix-ejecucion` ✅ (2026-05-25)
- Lift & shift de KOFIX (`src/app` completo, ~111 archivos: Clean Architecture
  `domain`/`data`/`presentation`/`shared`/`layout`, interceptor, guard, environments,
  assets, index.html) a `apps/kofix-ejecucion`.
- Dependencias añadidas al workspace: PrimeNG 17.18, primeicons 7, leaflet 1.9,
  sweetalert2 11, `@angular/localize` 18.2, `@types/leaflet`. **Se omitieron
  `@ng-bootstrap/ng-bootstrap` y `bootstrap`**: KOFIX las declaraba pero no las usa
  (además ng-bootstrap 20 exige Angular 21) → limpieza de dependencias muertas.
- Build configurado: polyfill `@angular/localize/init`, `allowedCommonJsDependencies`
  (sweetalert2, leaflet), budgets 2MB, `styles` = leaflet.css + primeng/primeicons +
  `@agroideas/theme/base.css`, serve en puerto 7100. Tailwind apunta al preset del tema.
- **Consume `@agroideas/theme`** (implementa D3/D4 a nivel de tokens): el CSS generado
  incluye `--primary: 118 64% 22%`.
- Ajustes transitorios (a saldar en Fase 3): override ESLint local que (a) permite
  imports de proveedores y (b) degrada a `warn` reglas de estilo/a11y del código
  heredado; conversión de specs Jasmine→Jest (`toBeTrue`→`toBe(true)`, `jasmine.*`).
- Verificado: `lint` (11, 0 errores), `test` (8 · 56 tests de kofix), `build` (2 apps).

### Pendiente
- Fase 3: extraer librerías compartidas desde KOFIX (`utils`, `ui`, `feedback`,
  `security`, `auth`/`http`) y reactivar la prohibición de proveedores en kofix.
- Fases 4–5 según el plan.

## Referencias
- ADR 001 KOFIX — Estandarización de Arquitectura Frontend y Alineación de Marca
- ADR 0002 KOFIX — Programación Multianual Frontend
- ADR 0003 KOFIX — Estandarización de Formularios Frontend
- Nx — Angular Monorepo, `enforce-module-boundaries`, buildable/publishable libs
