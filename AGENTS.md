# AGROIDEAS Frontend Monorepo — Agent Guide

## Commands (use `npx nx` — no npm scripts)

```sh
npx nx serve kofix-ejecucion     # dev server on :7100
npx nx serve sat-ui              # dev server on :4200 (default)
npx nx test <project>            # Jest
npx nx test <project> -- --testPathPattern=<pattern>  # single file
npx nx test <project> -- -t "test name"               # single test
npx nx e2e <project>-e2e        # Playwright e2e
npx nx lint <project>
npx nx build <project>           # production build → dist/apps/<app>/browser/
npx nx run-many -t lint,test,build
npx nx affected -t lint,test,build
npx nx show projects             # list projects + tags
npx nx graph                     # dependency graph
npx nx reset                     # clear cache (after version/generator/config changes)
```

## Module boundaries

Enforced by `@nx/enforce-module-boundaries` via `project.json` tags:

| sourceTag | can depend on |
|-----------|--------------|
| `scope:shared` | `scope:shared` |
| `scope:kofix` | `scope:kofix`, `scope:shared` |
| `scope:sat` | `scope:sat`, `scope:shared` |
| `type:app` / `type:feature` | `feature`, `ui`, `data-access`, `util` |
| `type:ui` | `ui`, `util` |
| `type:data-access` | `data-access`, `util` |
| `type:util` | `util` only |

**Apps must not** import `primeng`, `@angular/material`, `@angular/cdk`, `bootstrap`, `sweetalert2`, `leaflet` directly — consume via `@agroideas/*` libs (`no-restricted-imports` in root `eslint.config.js`).

**Watch out:** `@agroideas/menu` has `tags: []` (empty — breaks boundary checks; add `scope:shared,type:ui` when using it).

## App architectures

- **kofix-ejecucion** (:7100): Clean Architecture — `domain/` (models, abstract repos, usecases), `data/` (repo impls, mappers), `presentation/` (pages lazy-loaded via `loadComponent`, components). Composition root (`app.config.ts`) binds abstract repos to impls via `useExisting`. Use cases are `@Injectable({providedIn:'root'})`. Style: `inlineStyleLanguage: "css"` (global) but most components use `.sass` files. Auth via shared `@agroideas/auth` interceptor. Real backend permission provider.
- **sat-ui** (:4200): Feature-based — `core/` (services, guards, interceptors), `features/` (dashboard, login, asignaciones, etc.), `shared/` (models, utils). Style: `inlineStyleLanguage: "scss"` (global SCSS + some `.css` component files). Auth via **local** `core/interceptors/jwt.interceptor.ts` (NOT `@agroideas/auth`). Permissions provider is a **stub** (`of([])`) — not wired to real backend.

## Lib state

| Lib | Status | Exports |
|-----|--------|---------|
| `theme` | done | `tokens.css` (HSL vars), `tailwind-preset.js`, `base.css`, `theme.ts` (metadata) |
| `ui` | done | 10 standalone components: button, card, kpi, modal, data-table, status-pill, progress-bar, filter-bar, map, pagination |
| `utils` | done | `cn`, `currency`, `date-formatter`, `jwt.util`, `permissions`, `response.dto`, `storage-keys`, `format-date` pipe |
| `security` | done | `PermissionService`, `HasPermissionDirective`, `permissionGuard` |
| `auth` | done | `authInterceptor` (HttpInterceptorFn), `AUTH_LOGOUT_HANDLER`, `AUTH_TOKEN_KEY` injection tokens |
| `feedback` | done | `AlertService` (SweetAlert2 wrapper with MIDAGRI theme) — methods: `show`, `toast`, `showResponse`, `confirm` |
| `menu` | partial | Exports stub component only. Real models (`MenuItem`, `MenuAgrupado`, `MenuRepository`) exist in `lib/` but are **not** exported via `index.ts`. Tags are empty. |
| `http` | scaffold | Only re-exports `ResponseDto` from `@agroideas/utils`; no own code |

## Gotchas

- **ESLint stack pinned** — `eslint 9.14.0` + `typescript-eslint 8.13.0` + `angular-eslint 18.4.3` must be upgraded together (enforced via `overrides` in `package.json`). Mismatches crash linting.
- `@typescript-eslint/ban-ts-comment` is **off for `**/*.html`** (Nx flat config leaks TS rules onto Angular templates).
- **Design system chain:** `libs/theme/src/styles/tokens.css` (HSL CSS vars) → `tailwind-preset.js` → `base.css`. No brand hex outside this lib. Apps wire `base.css` in `project.json` `styles` array (NOT `@import` in `.scss` — that leaves `@tailwind` unprocessed). No `postcss.config.js` (managed via Angular build).
- **kofix-ejecucion lint** passes with 0 errors but ~270 warnings (intentional Fase 2 debt; hardened in Fase 3). Its `eslint.config.js` has transitional overrides downgrading rules to `warn` and allowing direct provider imports during migration.
- **sat-ui** uses a local `jwt.interceptor.ts` (in `core/interceptors/`), NOT the shared `@agroideas/auth` interceptor. Its permissions provider is not connected to backend.
- **All components** are `standalone: true` (no NgModules).
- **Nx generators:** always pass `--projectNameAndRootFormat=as-provided` or Nx 19.x duplicates names.
- **In Angular templates,** literal `@` (e.g. `@agroideas`) must be escaped as `&#64;` (NG5002).
- **kofix-ejecucion** needs `@angular/localize/init` polyfill — do not remove. Also allows `sweetalert2` and `leaflet` as CommonJS deps.
- **TypeScript 5.5.2** — not 5.6+.
- **Prettier:** `singleQuote: true` (`.prettierrc`).
- **Playwright e2e** projects exist: `kofix-ejecucion-e2e`, `sat-ui-e2e`. Run with `npx nx e2e <project>`.
- **No CI/CD** — no GitHub workflows, Jenkinsfile, husky, or lint-staged.

## References

- `CONTRIBUTING.md` — generator commands and tag reference
- `docs/adr/0001-migracion-monorepo-frontend-agroideas.md` — full ADR
- `docs/adr/0002-modernizacion-sat-ui-buenas-practicas-angular.md`
- `docs/adr/0003-unificacion-visual-reusabilidad-sat-ui.md`
- `docs/plan-implementacion-monorepo.md` — phased plan (Fase 5 hardening is next)
- `docs/phase-0/version-pins.md` — why the lint stack is pinned
