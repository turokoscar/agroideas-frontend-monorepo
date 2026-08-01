# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Nx 19.8.14 + Angular 18.2 monorepo that unifies AGROIDEAS' Angular frontends under one
design system. It supersedes two legacy single-repo UIs being migrated in:
`KOFIX_APP/mc-ui-ejecucion` → `apps/kofix-ejecucion`, and
`YACHAP_APP/app-sat-agroideas-ui` → `apps/sat-ui`.

Migration is phased (see `docs/adr/0001-*.md` and `docs/plan-implementacion-monorepo.md`).
**Done:** Fase 0 (foundation), Fase 1 (`@agroideas/theme`), Fase 2 (KOFIX imported).
**Next:** Fase 3 — extract shared libs (`ui`, `auth`, `http`, `feedback`, `security`,
`utils`) out of KOFIX and have apps consume them.

## Commands

Use `npx nx` — there are no npm scripts.

```sh
npx nx serve kofix-ejecucion        # dev server on :7100 (sat-ui defaults to :4200)
npx nx build <project>              # production build
npx nx lint <project>              # lint one project
npx nx test <project>              # unit tests (Jest) for one project
npx nx run-many -t lint,test,build  # everything
npx nx affected -t lint,test,build  # only what your changes touched
npx nx graph                        # dependency graph
```

Run a single test file / single test:
```sh
npx nx test kofix-ejecucion -- --testPathPattern=permission.service
npx nx test kofix-ejecucion -- -t "should grant admin"
```

After changing versions, generators, or eslint config, clear the cache: `npx nx reset`.

## Architecture — the big picture

### Workspace layout & module boundaries
- `apps/kofix-ejecucion` (`scope:kofix`) and `apps/sat-ui` (`scope:sat`) — never import each other.
- `libs/{theme,ui,auth,http,feedback,security,utils}` — all `scope:shared`, imported as `@agroideas/*`.
- Every `project.json` carries `scope:*` + `type:*` tags. `@nx/enforce-module-boundaries`
  (root `eslint.config.js`) enforces direction:
  - `scope:kofix|sat|sigec` → `scope:shared` only.
  - `type:app|feature` → `feature | ui | data-access | util`.
  - `type:ui` → `ui | util`; `type:data-access` → `data-access | util`; `type:util` → `util`.
  - `apps/sigec-cierre` is `scope:sigec`; `sigec-rtf` and `kofix-ejecucion` still carry no
    tags (untagged projects skip the constraint — an empty `tags: []` does **not**, it blocks
    every lib import).
- Apps **must not** import `primeng`, `@angular/material`/`@angular/cdk`, `bootstrap`,
  `sweetalert2`, `leaflet` directly — those are banned in `apps/**` and must be consumed
  through `@agroideas/*` libs. (Exception below: kofix-ejecucion during migration.)

### Shared shell & auth mapping
- `UiAppShellComponent` (`libs/ui/src/lib/ui-app-shell/`) owns the responsive sidebar:
  static at `md+`, off-canvas with backdrop below it, closes on `NavigationEnd` and `Escape`.
  It has no inputs — one single shape for every app. Apps fill the
  `[shell-brand] [shell-nav] [shell-user] [shell-header]` slots and pass the page through
  the default slot. `sigec-rtf`, `sigec-cierre` and `sat-ui` are laid out identically this
  way (one layout component each, no separate sidebar component). `kofix-ejecucion` keeps
  its PrimeNG `LayoutService` — it was already responsive.
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
This app was lifted from the mature KOFIX UI and is the reference implementation. Understanding
it requires reading across these layers:
- `domain/` — pure TS: `models/`, abstract `repositories/` (interfaces), and `usecases/`
  (`@Injectable({providedIn:'root'})` plain classes). **Pages talk only to usecases.**
- `data/` — `repositories/` concrete impls (HttpClient + `environments/environment.ts`
  endpoints) and `mappers/` (API DTO → domain model).
- `presentation/` — `pages/` (routed, lazy via `loadComponent`) and `components/`.
- `shared/` — `services/` (`AlertService` over SweetAlert2, `PermissionService`),
  `directives/` (`has-permission`), `utils/` (`jwt`, `currency`, `storage-keys`, `permissions`).
- `layout/` — app shell (sidebar + topbar).
- **Composition root:** `app.config.ts` binds each abstract repository to its impl with
  `{ provide: XRepository, useExisting: XRepositoryImpl }`. Don't re-provide these elsewhere.

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
- `@typescript-eslint/ban-ts-comment` is turned **off for `**/*.html`** in root
  `eslint.config.js` (a fileless TS rule from the Nx preset leaks onto Angular templates).
- **Nx generators:** always pass `--projectNameAndRootFormat=as-provided`, or Nx 19.x derives
  duplicated names/paths (`theme-theme`, `libs/theme/theme`).
- **No `postcss.config.js`** — Tailwind is wired through the Angular build; do not add one.
- In Angular templates, a literal `@` (e.g. `@agroideas`) must be escaped as `&#64;` (NG5002).
- **kofix-ejecucion has a transitional ESLint override** (`apps/kofix-ejecucion/eslint.config.js`):
  it allows direct provider imports and downgrades inherited style/a11y rules to `warn`. This is
  deliberate for the lift-and-shift and must be reverted in Fase 3 once code moves into `@agroideas/ui`.
  kofix lint passes with 0 errors but ~270 warnings (tracked debt).
- KOFIX specs were converted Jasmine→Jest (`toBeTrue()`→`toBe(true)`, `jasmine.createSpy`→
  `jest.fn`, `jasmine.objectContaining`→`expect.objectContaining`). Keep new specs Jest-native.
- All components are `standalone: true` (no NgModules). `kofix-ejecucion` needs the
  `@angular/localize/init` polyfill (in its build `polyfills`) — do not remove it.

## State of the libs (as of Fase 2)
`@agroideas/theme` is implemented and consumed by both apps. `ui`, `auth`, `http`, `feedback`,
`security` are still Nx scaffolding (a placeholder component); `@agroideas/utils` is a stub.
Populating them is Fase 3.

## Key references
- `docs/adr/0001-migracion-monorepo-frontend-agroideas.md` — decisions + implementation log.
- `docs/plan-implementacion-monorepo.md` — phased plan with acceptance criteria.
- `docs/phase-0/version-pins.md` — why the lint stack is pinned.
- `CONTRIBUTING.md` — tag conventions and generator commands.
- `AGENTS.md` — short companion guide (keep in sync with this file).
