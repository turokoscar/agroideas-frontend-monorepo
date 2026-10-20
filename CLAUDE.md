# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Nx 19.8.14 + Angular 18.2 monorepo that unifies AGROIDEAS' Angular frontends under one
design system. It supersedes two legacy single-repo UIs being migrated in:
`KOFIX_APP/mc-ui-ejecucion` → `apps/kofix-ejecucion`, and
`YACHAP_APP/app-sat-agroideas-ui` → `apps/sat-ui`.

Migration is phased (see `docs/adr/0001-*.md` and `docs/plan-implementacion-monorepo.md`).
**Done:** Fase 0 (foundation), Fase 1 (`@agroideas/theme`), Fase 2 (KOFIX imported).
**In progress (Fase 3):** `ui`, `auth`, `feedback`, `security`, `utils` are populated and
consumed across all four apps (`kofix-ejecucion`, `sat-ui`, `sigec-rtf`, `sigec-cierre`) —
none of them imports PrimeNG/SweetAlert2/Leaflet/Material/CDK/Bootstrap directly anymore
(enforced as `error` by `no-restricted-imports` in root `eslint.config.js`). **Still
pending:** `@agroideas/http` and `@agroideas/menu` are unused Nx scaffolding — no app
consumes either yet (see "State of the libs" below).

## Commands

Use `npx nx` — there are no npm scripts.

```sh
npx nx serve kofix-ejecucion             # :7100 (port in project.json; default config `local`)
npx nx serve sat-ui                      # :4200 (Angular default)
npx nx serve sigec-rtf --port=4300       # no port in project.json — without the flag it
                                         #   takes :4200 and collides with sat-ui
npx nx serve sigec-cierre                # :4400 (port in project.json)
```

No CI/CD is configured (no GitHub workflows, Jenkinsfile, husky, or lint-staged) — lint/test/build
are run manually or via the commands above.

Run a single test file / single test:
```sh
npx nx test kofix-ejecucion -- --testPathPattern=permission.service
npx nx test kofix-ejecucion -- -t "should grant admin"
```

After changing versions, generators, or eslint config, clear the cache: `npx nx reset`.

### Build configurations & deployment
Environments are swapped via `fileReplacements` in each app's `project.json`:
- `kofix-ejecucion`: `development`, `local` (→ `environment.local.ts`, the serve default),
  `quality` (→ `environment.quality.ts`), `production`.
- `sigec-rtf`, `sigec-cierre`: `development`, `quality` (→ `environment.quality.ts`, relative URLs),
  `production`.
- `sat-ui`: only `development` / `production`.

Deployment is via multi-stage Dockerfiles at the repo root (node:20 build → nginx SPA):
`Dockerfile` (kofix-ejecucion, `quality`), `Dockerfile.sat-ui` (`production`),
`Dockerfile.sigec-rtf-ui` (`quality`). sigec-rtf's `environment.quality.ts` uses **relative**
URLs (`/api/v1`, `/api-seguridad/...`, `/api-general/...`) that the container's Nginx
reverse-proxies to `sigec-rtf-api:8080` (Docker network) and `test.agroideas.gob.pe`, because
the RTF API has no CORS outside Development — keep those paths and the Nginx `location`
blocks in sync when adding an endpoint base.

## Architecture — the big picture

### Workspace layout & module boundaries
- `apps/{kofix-ejecucion, sat-ui, sigec-rtf, sigec-cierre}` (scopes `kofix`/`sat`/`sigec`) —
  apps in different scopes never import each other.
- `libs/{theme,ui,auth,http,feedback,security,utils,menu}` — all `scope:shared`, imported as
  `@agroideas/*`.
- Every `project.json` carries `scope:*` + `type:*` tags. `@nx/enforce-module-boundaries`
  (root `eslint.config.js`) enforces direction:
  - `scope:kofix|sat|sigec` → same scope or `scope:shared` only.
  - `type:app|feature` → `feature | ui | data-access | util`.
  - `type:ui` → `ui | util`; `type:data-access` → `data-access | util`; `type:util` → `util`.
  - `apps/sigec-cierre` and `apps/sigec-rtf` are `scope:sigec`; `kofix-ejecucion` is
    `scope:kofix`; `sat-ui` is `scope:sat` (untagged projects would skip the constraint — an
    empty `tags: []` does **not**, it blocks every lib import — but every app in this
    workspace is tagged).
- Apps **must not** import `primeng`, `@angular/material`/`@angular/cdk`, `bootstrap`,
  `sweetalert2`, `leaflet`, `chart.js`, `pdfjs-dist` directly — those are banned as `error`
  in `apps/**` via `no-restricted-imports` in root `eslint.config.js` and must be consumed through
  `@agroideas/*` libs. `kofix-ejecucion` fully complies (0 direct imports left); its
  transitional ESLint override (see below) only relaxes style/a11y rules, not this one.

### Shared shell & auth mapping
- `UiAppShellComponent` (`libs/ui/src/lib/ui-app-shell/`) owns the responsive sidebar:
  static at `md+`, off-canvas with backdrop below it, closes on `NavigationEnd` and `Escape`.
  Its only input is `colapsadoEscritorio` (default `false`) — an optional desktop icon-only
  collapse; the shell just applies the width, the host app owns the signal and decides what
  to hide inside its projected slots. Apps fill the
  `[shell-brand] [shell-nav] [shell-user] [shell-header]` slots and pass the page through
  the default slot. `sigec-rtf`, `sigec-cierre`, `sat-ui`, and now `kofix-ejecucion` are all
  laid out this way (one layout component each, no separate sidebar component).
  `kofix-ejecucion` migrated off its own PrimeNG `LayoutService`/`AppTopbarComponent`/
  `AppSidebarComponent` onto this shared shell (`apps/kofix-ejecucion/src/app/layout/`);
  that also retired the last hardcoded sidebar hex (`#008F49`) in favor of theme tokens.
- `libs/auth/src/lib/sel-usuario.mapper.ts` is the single source of truth for the
  `sel-api-seguridad` login contract (port 7101, fields `nombres` / `apellidoPaterno` /
  `apellidoMaterno`). `sigec-rtf` and `sigec-cierre` map their session through it; `sat-ui`
  talks to a different backend (7081, `txtNombres`) and is not a consumer.

### Design system flow (`@agroideas/theme`)
Single source of truth for the MIDAGRI/INIA brand. **No brand hex exists outside this lib.**
The chain is: CSS variables → Tailwind preset → app build.
- `libs/theme/src/styles/tokens.css` — HSL CSS variables (`--primary` = INIA green `#346b00`, etc.).
- `libs/theme/src/tailwind-preset.js` — maps Tailwind classes to `hsl(var(--token) / <alpha>)`.
- `libs/theme/src/styles/base.css` — `@tailwind` directives + fonts (Roboto, Material Symbols
  via Google Fonts CDN) + shared component classes (`kpi-card`, `kardex-*`, `row-actions`…).

Each app wires the theme two ways (see `apps/sat-ui` and `apps/kofix-ejecucion`):
1. `tailwind.config.js`: `presets: [require('../../libs/theme/src/tailwind-preset.js')]`
   with `content: ['apps/<app>/src/**/*.{html,ts}', 'libs/**/*.{html,ts}']`.
2. `base.css` is added to the build's `styles` array in `project.json` (NOT `@import`ed from
   `.scss`, which would leave `@tailwind` unprocessed). Per-app token overrides: redefine the
   CSS variable, never add hex to the Tailwind config.

### Inside `apps/kofix-ejecucion` — Clean Architecture (3 layers)
`domain/` → `data/` → `presentation/`, pages talk only to usecases, and `app.config.ts` is the
composition root. Details and app-specific gotchas: `apps/kofix-ejecucion/CLAUDE.md`.

### The other three apps — feature-based, not Clean Architecture
Unlike kofix-ejecucion, `sat-ui`, `sigec-rtf`, and `sigec-cierre` use a flatter
`core/` (guards, services, interceptors) + `features/` (one folder per screen/flow) +
`layout/app-shell/` structure — no `domain/data/presentation` split.
- **sat-ui** (`:4200`, `scope:sat`): its own backend (port 7081, fields `txtNombres`/
  `codUsuario`) — does **not** use `sel-usuario.mapper.ts`. Its `permissionGuard` provider is
  a stub (`of([])` in `app.config.ts`), not wired to a real backend yet.
- **sigec-rtf** (`:4300`, `scope:sigec`): has its own `CLAUDE.md`. Session comes from
  `sel-api-seguridad` (port 7101) through the shared `sel-usuario` mapper (see below).
- **sigec-cierre** (`:4400`, `scope:sigec`): UI of `SIGEC/sigec-api-cierre`, built under ADR 0013;
  its own role catalog and settings rules are in `apps/sigec-cierre/CLAUDE.md`.

All four apps wire `provideHttpClient(withInterceptors([authInterceptor]))` from
`@agroideas/auth` in their `app.config.ts` — kofix-ejecucion is not the only consumer of the
shared interceptor.

### Auth & backend
- JWT stored in `localStorage` (key `kDX_TOKEN`); `auth.interceptor.ts` attaches the Bearer
  token and redirects to `/login` on 401; `authGuard` protects authenticated routes.
- kofix-ejecucion talks to three .NET APIs (configured in `environments/environment.ts`):
  `apiSeguridad` (auth), `apiEjecucion` (business), `apiGeneral` (catalogs). These live as
  sibling repos under `AGROIDEAS/` (`*-api*`, `SEL_APIS/`) and must be running for full flows.

## Critical conventions & gotchas

- **Pinned lint stack — upgrade together, never individually:** `eslint 9.14.0` +
  `typescript-eslint 8.13.0` + `angular-eslint 18.4.3`, forced via `overrides` in
  `package.json`. Mismatches crash linting. Rationale: `docs/phase-0/version-pins.md`.
  TypeScript is also pinned (`~5.5.2`, not 5.6+) for the same compatibility reason.
- `@typescript-eslint/ban-ts-comment` is turned **off for `**/*.html`** in root
  `eslint.config.js` (a fileless TS rule from the Nx preset leaks onto Angular templates).
- **Nx generators:** always pass `--projectNameAndRootFormat=as-provided`, or Nx 19.x derives
  duplicated names/paths (`theme-theme`, `libs/theme/theme`).
- **No `postcss.config.js`** — Tailwind is wired through the Angular build; do not add one.
- In Angular templates, a literal `@` (e.g. `@agroideas`) must be escaped as `&#64;` (NG5002).
- **kofix-ejecucion has a transitional ESLint override** that relaxes style rules to `warn` but
  never `no-restricted-imports` — see `apps/kofix-ejecucion/CLAUDE.md`.
- KOFIX specs were converted Jasmine→Jest (`toBeTrue()`→`toBe(true)`, `jasmine.createSpy`→
  `jest.fn`, `jasmine.objectContaining`→`expect.objectContaining`). Keep new specs Jest-native.
- All components are `standalone: true` (no NgModules).

## State of the libs (Fase 3 in progress)
**Heavy `ui` components have their own entry points** — `@agroideas/ui/chart` (Chart.js),
`@agroideas/ui/map` (Leaflet) and `@agroideas/ui/pdf-viewer` (pdf.js), mapped in
`tsconfig.base.json` and **not** re-exported from the `@agroideas/ui` barrel. Every app imports
the barrel from its shell, so anything exported there lands in the initial bundle of all four
apps; keep heavy providers out of it and never add module-level side effects (e.g.
`Chart.register`, `GlobalWorkerOptions.workerSrc`) to `ui` components. `chart.js` and
`pdfjs-dist` are banned in `apps/**` like `leaflet`. pdf.js assets (worker, `cmaps/`,
`standard_fonts/`) are copied from `node_modules/pdfjs-dist` via `assets` in the consuming
app's `project.json` (today only `sigec-rtf`) — never commit copies to `public/`.

`@agroideas/http` is still Nx scaffolding (an unused placeholder component) — nothing
depends on it yet. `@agroideas/menu` exports `MenuItem`/`MenuAgrupado` models and a menu
component stub from `index.ts`, but its `MenuRepository` (in `domain/repositories/`) is not
exported and no app consumes the lib yet — treat it the same as `http`, not as a populated lib.

## Key references
- `docs/adr/0001-migracion-monorepo-frontend-agroideas.md` — decisions + implementation log.
- `docs/plan-implementacion-monorepo.md` — phased plan with acceptance criteria.
- `docs/phase-0/version-pins.md` — why the lint stack is pinned.
- `CONTRIBUTING.md` — tag conventions and generator commands.
- `AGENTS.md` — short companion guide (keep in sync with this file).
