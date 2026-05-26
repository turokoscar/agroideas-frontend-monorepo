# AGROIDEAS Frontend Monorepo — Agent Guide

## Overview

Nx 19.8.14 + Angular 18.2 monorepo unificando dos apps (kofix-ejecucion, sat-ui) bajo un design system común. Fase 2 de 5 en ejecución.

## Key commands (use `npx nx` — no npm scripts)

```sh
npx nx serve <app>                 # dev server (kofix-ejecucion | sat-ui)
npx nx build <project>             # production build
npx nx test <project>              # single project test
npx nx lint <project>              # single project lint
npx nx run-many -t lint,test,build # all projects
npx nx affected -t lint,test,build # changes only
npx nx graph                       # dependency graph
```

## Module boundaries (enforced by eslint)

Every `project.json` needs `scope:*` + `type:*` tags. Direction:
- `scope:kofix` ← `scope:shared` only (no cross-app deps)
- `scope:sat`   ← `scope:shared` only
- `type:app` / `type:feature` → `type:feature | ui | data-access | util`
- `type:ui`    → `type:ui | util` only
- `type:data-access` → `type:data-access | util` only
- `type:util`  → `type:util` only

Apps **must not** import `primeng`, `@angular/material`, `@angular/cdk`, `bootstrap`, `sweetalert2`, `leaflet` directly — consume via `@agroideas/*` libs.

## ESLint pinned stack (do NOT upgrade individually)

- `eslint 9.14.0` + `typescript-eslint 8.13.0` + `angular-eslint 18.4.3`
- `overrides` in `package.json` force transitive deps — all must move together
- `@typescript-eslint/ban-ts-comment` is **off for `**/*.html`** (flat config, last block wins)
- Config is flat (`eslint.config.js` at root)

## Design system tokens (@agroideas/theme)

Single source of truth for brand (MIDAGRI/INIA green `#346b00`). No hex outside this lib:
- `libs/theme/src/styles/tokens.css` — HSL CSS variables
- `libs/theme/src/styles/base.css` — imports fonts (Roboto, Material Symbols via Google Fonts CDN), `@tailwind`, shared component classes
- `libs/theme/src/tailwind-preset.js` — preset consumed by app tailwind configs

**App tailwind config pattern** (ref: `apps/sat-ui/tailwind.config.js`):
```js
const preset = require('../../libs/theme/src/tailwind-preset.js');
module.exports = { presets: [preset], content: ['apps/<app>/src/**/*.{html,ts}', 'libs/**/*.{html,ts}'] };
```

**App styles import** (in `apps/<app>/src/styles.scss` or `.css`):
```css
@import '../../../libs/theme/src/styles/base.css';
```

## Current state (what still needs building)

- **Both apps** (`kofix-ejecucion`, `sat-ui`) are Nx boilerplate only — no real code
- **`@agroideas/theme`** is implemented and validated on `sat-ui`
- **Libs** `ui`, `auth`, `feedback`, `http`, `security` are Nx scaffolding only (export a placeholder component)
- **`@agroideas/utils`** exports a stub `utils()` function
- All components use `standalone: true` (no NgModules)
- No `postcss.config.js` (Tailwind managed via Angular build config — do not add one)

## Nx generator quirk

Add `--projectNameAndRootFormat=as-provided` to generators, otherwise Nx 19.x derives duplicate names:
```sh
nx g @nx/angular:library mylib --directory=libs/mylib --projectNameAndRootFormat=as-provided
```

## Key references

- `docs/adr/0001-migracion-monorepo-frontend-agroideas.md` — full ADR with decisions
- `docs/plan-implementacion-monorepo.md` — phased implementation plan
- `docs/phase-0/version-pins.md` — why eslint/typescript-eslint are pinned with overrides
- `CONTRIBUTING.md` — generators and conventions summary
