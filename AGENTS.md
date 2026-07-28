# AGROIDEAS Frontend Monorepo — Agent Guide

**Canonical instruction file.** `CLAUDE.md` is stale — says libs are scaffolding (they are not — see table below) and omits SIGEC apps.

## Commands (use `npx nx` — no npm scripts)

```sh
npx nx serve kofix-ejecucion     # dev server on :7100
npx nx serve sat-ui              # dev server on :4200 (default)
npx nx serve sigec-rtf           # dev server on :4300
npx nx serve sigec-cierre        # dev server on :4400
npx nx test <project>            # Jest
npx nx test <project> -- --testPathPattern=<pattern>
npx nx test <project> -- -t "test name"
npx nx e2e <project>-e2e        # Playwright e2e
npx nx lint <project>
npx nx build <project>           # → dist/apps/<app>/browser/
npx nx run-many -t lint,test,build
npx nx affected -t lint,test,build
npx nx show projects
npx nx graph
npx nx reset                     # clear cache (after version/generator/config changes)
```

**Docker build:** `npx nx build kofix-ejecucion --configuration=quality` (see `Dockerfile`).

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

**Watch out:** `sigec-cierre` has `tags: []` (empty — breaks boundary checks; needs `scope:kofix,type:app`). `@agroideas/menu` exports `MenuItem`/`MenuAgrupado` via `index.ts` but `MenuRepository` (in `domain/repositories/`) is not exported.

## App architectures

- **kofix-ejecucion** (:7100, `scope:kofix`): Clean Architecture — `domain/` (models, abstract repos, usecases), `data/` (repo impls, mappers), `presentation/` (pages lazy-loaded via `loadComponent`). Composition root (`app.config.ts`) binds abstract repos to impls via `useExisting`. `inlineStyleLanguage: "css"` (global, but most components use `.sass`). Auth via shared `@agroideas/auth` interceptor. Real backend permission provider. Talks to three .NET APIs (`apiSeguridad`, `apiEjecucion`, `apiGeneral`). Needs `@angular/localize/init` polyfill. Allows `sweetalert2` and `leaflet` as CommonJS deps.
- **sat-ui** (:4200, `scope:sat`): Feature-based — `core/` (services, guards, interceptors), `features/`, `shared/`. `inlineStyleLanguage: "scss"`. Auth via local `core/interceptors/jwt.interceptor.ts` (NOT `@agroideas/auth` interceptor, though it imports `AUTH_LOGOUT_HANDLER` from that lib). Permissions provider is a stub (`of([])`).
- **sigec-rtf** (:4300, `scope:kofix`): Feature-based with `core/` (guards, services) and `features/` (login, oa-dashboard, reportes, etc.). `inlineStyleLanguage: "scss"`. Newer app, follows SAT-like structure.
- **sigec-cierre** (:4400, tags empty): Feature-based with `core/` and `features/` (login, cierre-registro). Same structure as sigec-rtf but **tags are missing** — add `scope:kofix,type:app`.

## Lib state

| Lib | Status | Exports |
|-----|--------|---------|
| `theme` | done | `tokens.css` (HSL vars), `tailwind-preset.js`, `base.css`, `theme.ts` |
| `ui` | done | 10 standalone components: button, card, kpi, modal, data-table, status-pill, progress-bar, filter-bar, map, pagination |
| `utils` | done | `cn`, `currency`, `date-formatter`, `jwt.util`, `permissions`, `response.dto`, `storage-keys`, `format-date` pipe, `roles` |
| `security` | done | `PermissionService`, `HasPermissionDirective`, `permissionGuard` |
| `auth` | done | `authInterceptor` (HttpInterceptorFn), `AUTH_LOGOUT_HANDLER`, `AUTH_TOKEN_KEY` injection tokens |
| `feedback` | done | `AlertService` (SweetAlert2 wrapper) — methods: `show`, `toast`, `showResponse`, `confirm` |
| `menu` | done | Exports stub component + `MenuItem`/`MenuAgrupado`. `MenuRepository` (in `domain/repositories/`) is not exported via `index.ts`. |
| `http` | scaffold | Only re-exports `ResponseDto` from `@agroideas/utils`; no own code |

## Gotchas

- **ESLint stack pinned** — `eslint 9.14.0` + `typescript-eslint 8.13.0` + `angular-eslint 18.4.3` must be upgraded together (enforced via `overrides` in `package.json`). Mismatches crash linting.
- `@typescript-eslint/ban-ts-comment` is **off for `**/*.html`** (Nx flat config leaks TS rules onto Angular templates).
- **Design system chain:** `libs/theme/src/styles/tokens.css` (HSL CSS vars) → `tailwind-preset.js` → `base.css`. No brand hex outside this lib. Apps wire `base.css` in `project.json` `styles` array (NOT `@import` in `.scss` — that leaves `@tailwind` unprocessed). No `postcss.config.js` (managed via Angular build).
- **kofix-ejecucion lint** passes with 0 errors but ~270 warnings (intentional Fase 2 debt). Its `eslint.config.js` has transitional overrides downgrading rules to `warn` and allowing direct provider imports.
- **sat-ui** uses a local `jwt.interceptor.ts`, NOT the shared `@agroideas/auth` interceptor. Its permissions provider is not connected to backend.
- **All components** are `standalone: true` (no NgModules).
- **Nx generators:** always pass `--projectNameAndRootFormat=as-provided` or Nx 19.x duplicates names.
- **In Angular templates,** literal `@` (e.g. `@agroideas`) must be escaped as `&#64;` (NG5002).
- **TypeScript 5.5.2** — not 5.6+.
- **Prettier:** `singleQuote: true` (`.prettierrc`).
- **No CI/CD** — no GitHub workflows, Jenkinsfile, husky, or lint-staged.
- **sigec-cierre** has `tags: []` in its `project.json` — this breaks `@nx/enforce-module-boundaries`. When referencing it, add `scope:kofix,type:app` tags.

## References

- `CONTRIBUTING.md` — generator commands and tag reference
- `docs/adr/0001-migracion-monorepo-frontend-agroideas.md` — full ADR
- `docs/adr/0002-modernizacion-sat-ui-buenas-practicas-angular.md`
- `docs/adr/0003-unificacion-visual-reusabilidad-sat-ui.md`
- `docs/plan-implementacion-monorepo.md` — phased plan
- `docs/phase-0/version-pins.md` — why the lint stack is pinned
