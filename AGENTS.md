# AGROIDEAS Frontend Monorepo — Agent Guide

## Commands (use `npx nx` — no npm scripts)

```sh
npx nx serve kofix-ejecucion     # dev server on :7100
npx nx serve sat-ui              # dev server on :4200 (default)
npx nx test <project>            # single project (Jest)
npx nx test <project> -- --testPathPattern=<pattern>  # single file
npx nx test <project> -- -t "test name"               # single test
npx nx lint <project>            # lint one project
npx nx build <project>           # production build (outputs: dist/apps/<app>/browser/)
npx nx run-many -t lint,test,build
npx nx affected -t lint,test,build
npx nx graph                     # dependency graph
npx nx show projects             # list all projects with tags
npx nx reset                     # clear Nx cache (after version/generator/config changes)
```

## Module boundaries

Enforced by `@nx/enforce-module-boundaries` in root `eslint.config.js` via tags on each `project.json`:

| sourceTag | can depend on |
|-----------|--------------|
| `scope:shared` | `scope:shared` |
| `scope:kofix` | `scope:kofix`, `scope:shared` |
| `scope:sat` | `scope:sat`, `scope:shared` |
| `type:app` / `type:feature` | `feature`, `ui`, `data-access`, `util` |
| `type:ui` | `ui`, `util` |
| `type:data-access` | `data-access`, `util` |
| `type:util` | `util` only |

**Apps must not** import `primeng`, `@angular/material`, `@angular/cdk`, `bootstrap`, `sweetalert2`, `leaflet` directly — consume via `@agroideas/*` libs (`no-restricted-imports` in `apps/**`).

**Watch out:** `@agroideas/menu` has `tags: []` (empty — breaks module boundaries; needs fixing).

## ESLint pinned stack (do NOT upgrade individually)

- `eslint 9.14.0` + `typescript-eslint 8.13.0` + `angular-eslint 18.4.3`, forced via `overrides` in `package.json`
- `@typescript-eslint/ban-ts-comment` is **off for `**/*.html`** (Nx flat config leaks TS rules onto templates)
- `apps/kofix-ejecucion/eslint.config.js` has ~270 warnings as intentional Fase 2 transition debt (to be hardened in Fase 3)

## Design system chain (`@agroideas/theme`)

Single source of truth for MIDAGRI/INIA green `#346b00`. No hex outside this lib:
1. `libs/theme/src/styles/tokens.css` — HSL CSS variables
2. `libs/theme/src/tailwind-preset.js` — maps Tailwind classes to `hsl(var(--x) / <alpha>)`
3. `libs/theme/src/styles/base.css` — `@tailwind` directives + fonts (Google Fonts CDN)

**Each app wires it two ways:**
- `tailwind.config.js`: `presets: [require('../../libs/theme/src/tailwind-preset.js')]`
- `base.css` added to build's `styles` array in `project.json` (NOT `@import`ed from `.scss` — that would leave `@tailwind` unprocessed)
- No `postcss.config.js` (managed via Angular build)

## Current state of the workspace

| Project | Status |
|---------|--------|
| `@agroideas/theme` | Fully implemented |
| `@agroideas/ui` | 9 real components (button, card, kpi, modal, data-table, status-pill, progress-bar, filter-bar, map), 1 dead scaffold |
| `@agroideas/utils` | Fully implemented (currency, date-formatter, storage-keys, permissions, jwt.util, cn, response.dto, pipes) |
| `@agroideas/auth` | `authInterceptor` real, `AUTH_LOGOUT_HANDLER` injection token, dead scaffold |
| `@agroideas/feedback` | `AlertService` real (SweetAlert2 wrapper), dead scaffold |
| `@agroideas/security` | 3 real: `PermissionService`, `HasPermissionDirective`, `permissionGuard` |
| `@agroideas/http` | Scaffolding (only re-exports `ResponseDto` from utils) |
| `@agroideas/menu` | Scaffolding (has model + abstract repo, `tags: []` empty — breaks boundaries) |
| `kofix-ejecucion` | Full Clean Architecture (domain/data/presentation), 10 pages, 10 repos, 19 use cases |
| `sat-ui` | Real login/auth flow, 7 feature pages (mostly stub shells) |
| `*-e2e` | Playwright boilerplate only |

## Critical conventions & gotchas

- **All components are `standalone: true`** (no NgModules)
- **Nx generators:** always pass `--projectNameAndRootFormat=as-provided` or Nx 19.x duplicates names
- **kofix-ejecucion composition root** (`app.config.ts`): binds abstract repos via `useExisting` pattern; use cases are `@Injectable({providedIn:'root'})` and auto-resolve
- **In Angular templates**, literal `@` (e.g. `@agroideas`) must be escaped as `&#64;` (NG5002)
- **kofix-ejecucion** needs `@angular/localize/init` polyfill in its build `polyfills` — do not remove
- **Prettier:** `singleQuote: true` (`.prettierrc`)
- **TypeScript 5.5.2** — not 5.6+

## References

- `CONTRIBUTING.md` — generator commands and tag reference
- `docs/adr/0001-migracion-monorepo-frontend-agroideas.md` — full ADR
- `docs/plan-implementacion-monorepo.md` — phased plan
- `docs/phase-0/version-pins.md` — why lint stack is pinned
