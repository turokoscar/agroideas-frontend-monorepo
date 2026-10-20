# CLAUDE.md — apps/sigec-cierre

Read the root `CLAUDE.md` first; this file only covers what is specific to this app.

UI of `SIGEC/sigec-api-cierre` (`api/v1`), being built under
[ADR 0013](../../docs/adr/0013-ui-sigec-cierre-expediente-de-cierre.md) (phased plan and
implementation log there). Same auth backend and `sel-usuario` mapper as sigec-rtf, but:

- **Own role catalog** (`core/models/rol-cierre.model.ts`): users keep *all* their roles
  (`AuthUser.roles: CierreRol[]`), unknown roles are dropped (no fallback to OA), and guards
  redirect to `rutaInicio(roles)`, which only returns routes the user can activate (`/bandeja`,
  `/mi-cierre`, `/sin-acceso`). Don't copy RTF's role map: "Unidad de Monitoreo" is UN in RTF but
  USE in Cierre.
- **Every tunable value** (page sizes, polling intervals, `deviceId`…) goes in the
  `environment*.ts` files, typed by `environments/app-settings.model.ts` — never hardcoded in
  services/components (owner's rule).
- The OA never presents the Anexo 20 here: it goes with the last RTF in `apps/sigec-rtf`.
