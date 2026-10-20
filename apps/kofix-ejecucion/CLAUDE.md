# CLAUDE.md — apps/kofix-ejecucion

Read the root `CLAUDE.md` first; this file only covers what is specific to this app.

## Clean Architecture (3 layers)
This app was lifted from the mature KOFIX UI and is the reference implementation. Understanding
it requires reading across these layers:
- `domain/` — pure TS: `models/`, abstract `repositories/` (interfaces), and `usecases/`
  (`@Injectable({providedIn:'root'})` plain classes). **Pages talk only to usecases.**
- `data/` — `repositories/` concrete impls (HttpClient + `environments/environment.ts`
  endpoints) and `mappers/` (API DTO → domain model).
- `presentation/` — `pages/` (routed, lazy via `loadComponent`) and `components/`.
- `shared/services/` — now only app-specific state, not cross-cutting concerns: `file-storage`,
  `convenio-state`, `export`. `AlertService`, `PermissionService`, the `has-permission`
  directive, and the `jwt`/`currency`/`storage-keys`/`permissions` utils have all moved to
  `@agroideas/feedback`, `@agroideas/security`, and `@agroideas/utils` respectively — don't
  recreate them here.
- `layout/` — `AppLayoutComponent` fills `UiAppShellComponent`'s slots (see root CLAUDE.md);
  `app.menu.component.ts` renders the nav from `MenuRepository`. Both have specs now
  (`app.layout.component.spec.ts`, `app.menu.component.spec.ts`).
- **Composition root:** `app.config.ts` binds each abstract repository to its impl with
  `{ provide: XRepository, useExisting: XRepositoryImpl }`. Don't re-provide these elsewhere.

## Gotchas
- **Transitional ESLint override** (`apps/kofix-ejecucion/eslint.config.js`): it downgrades
  inherited style rules (`no-explicit-any`, `no-unused-vars`, `no-non-null-assertion`, etc.) to
  `warn`. It does **not** touch `no-restricted-imports` — direct PrimeNG/SweetAlert2/Leaflet
  imports are still an `error` and kofix has none. kofix lint passes with 0 errors but 259
  warnings (tracked debt, to shrink as this code moves into `@agroideas/ui`/`@agroideas/utils`;
  mostly `no-explicit-any`/`no-unused-vars` now — the a11y template rules
  (`label-has-associated-control`, `interactive-supports-focus`, `click-events-have-key-events`)
  were fully resolved under [ADR 0008](../../docs/adr/0008-remediacion-ui-kofix-ejecucion.md)
  Fase 2 and no longer occur).
- Needs the `@angular/localize/init` polyfill (in its build `polyfills`) — do not remove it.
