# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This is the `sigec-rtf` app inside the AGROIDEAS Nx/Angular monorepo. Read the root
`CLAUDE.md` first for workspace-wide commands, module-boundary rules, and the design-system
flow — this file only covers what's specific to this app. **`README.md` in this directory is
the authoritative reference** for routes, services, lib usage, and API contracts; don't
duplicate it here, re-read it when those details matter.

## What this app is

SIGEC RTF ("Reporte Técnico Financiero", `:4300`, `scope:sigec`) — lets Postulantes (OA)
register physical/financial progress on their convenios ("pasos críticos"), and lets UN
units evaluate the incoming reports ("evaluación de gabinete"). A separate ADMIN role
manages system parameters and compliance reports.

Feature-based structure (`core/` + `features/` + `layout/app-shell/`), not the Clean
Architecture split used by `apps/kofix-ejecucion` — see root CLAUDE.md's "The other three
apps" section.

## Commands

```sh
npx nx serve sigec-rtf     # :4300
npx nx lint sigec-rtf
npx nx test sigec-rtf
npx nx test sigec-rtf -- --testPathPattern=oa-registro
npx nx build sigec-rtf     # dist/apps/sigec-rtf/browser/
```

Requires three backend APIs running to exercise real flows: `apiAuth` (sel-api-seguridad,
:7101), `apiUrl` (sigec-api-rtf, :7300), `apiGeneral` (:7080) — see `environments/` for URLs.

## Things not obvious from the README

- **`AuthService` (`core/services/auth.service.ts`) does its own role mapping**, separate
  from `@agroideas/auth`'s `mapSelUsuario` — it translates the full Spanish role strings from
  `sel-api-seguridad` into the short `UserRole` used by route guards (`POSTULANTE`, `UN`,
  `ADMIN`). Any unrecognized backend role falls back to `POSTULANTE` explicitly, to avoid
  guard redirect loops. `UserRole` also declares `DE`/`UAJ`/`USE`/`TECNICO` for
  `roleGuard([...])` on the UN/gabinete and admin routes, but no backend role currently maps
  to them — don't assume they're reachable in practice.
- **No `UR` actor**: field verification (Anexo 19) lives inside `UnGabineteComponent`, not a
  separate role/route — see `adr/0010-unificacion-rol-ur-en-un-rtf.md` before adding anything
  that assumes a distinct UR user.
- **`features/documentacion-rtf/`** (a modal component) isn't in the README's feature tree —
  it's shared upload/preview UI pulled into `oa-registro` and `un-gabinete`, not a routed
  feature.
- **`@agroideas/feedback`'s `AlertService` is not used here** — this app's toasts/alerts go
  through `@agroideas/ui`'s `ToastService` instead. Don't introduce `AlertService` calls in
  this app; follow the existing `ToastService` pattern.
- **This app has its own lint debt tracked separately from kofix's**: see
  `adr/0011-estado-deuda-tecnica-lint-sigec-rtf.md` and `adr/plan-remediacion-lint.md`. Its
  `eslint.config.js` downgrades `no-explicit-any`, `no-unused-vars`, `no-empty-function`,
  `no-non-null-assertion`, and three template a11y rules to `warn` — same shape as kofix's
  override, don't assume it's fully clean.
- **App-local ADRs live in `apps/sigec-rtf/adr/`**, separate from the monorepo's
  `docs/adr/`. The legal-deadline ADRs (ADR-012), Admin Panel ADR (ADR-013), and the full RTF
  state-machine/deadline-escalation ADR (ADR-018 — `ENVIADO`/`SUBSANADO`/`EN_DESACATO`/
  `PLAZO_INICIAL_NOTIFICACION`/`PLAZO_LIMITE_NOTARIAL`/`BLOQUEO_DEFINITIVO`, all 10 phases done
  and live-verified as of 2026-09-22) live in the *backend* repo (`sigec-api-rtf`), not here or
  in `docs/adr/` — don't go looking for them in this repo. This app has **no local ADR for that
  work**; the README's "Máquina de estados del RTF" table is the frontend-facing summary.
- **`un-gabinete`'s "Marcar convenio como resuelto" button is fully wired**, not a placeholder —
  it calls `UnGabineteService.marcarConvenioResuelto()` → `POST rtfs/{id}/marcar-convenio-resuelto`
  (only reachable on `BLOQUEO_DEFINITIVO`, gated to UN/ADMIN roles server-side) and always shows a
  toast (success or error), never silently. If you see it referred to as a placeholder in old
  session notes, that was true only before 2026-09-22.
- **`ENVIADO`/`SUBSANADO` are real backend states but you will basically never observe them** —
  the backend resolves them to `EN_REVISION` within the same HTTP request that creates them
  (no manual "asignar UN" step exists, by explicit decision). They exist only so
  `SRT_TMD_ACTIVIDAD` has a distinct audit row; don't build any UI that expects to catch an RTF
  "sitting" in either state.
- **`GlobalErrorHandler`** is app-specific (`core/error-handler.ts`), not shared — don't
  confuse it with anything in `@agroideas/feedback`.
