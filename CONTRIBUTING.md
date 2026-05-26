# Contribuir — Monorepo Frontend AGROIDEAS

Monorepo Nx (Angular 18) que unifica las apps frontend de AGROIDEAS bajo un design
system común. Ver [ADR 0001](./docs/adr/0001-migracion-monorepo-frontend-agroideas.md)
y el [plan por fases](./docs/plan-implementacion-monorepo.md).

## Estructura

```
apps/
  kofix-ejecucion/   # scope:kofix, type:app   (referencia de diseño)
  sat-ui/            # scope:sat,   type:app   (hereda el design system)
libs/
  theme/             # @agroideas/theme     scope:shared, type:util       tokens + preset Tailwind
  ui/                # @agroideas/ui        scope:shared, type:ui         design system (ui-*)
  auth/              # @agroideas/auth      scope:shared, type:data-access JWT, interceptor, guard
  http/              # @agroideas/http      scope:shared, type:data-access ResponseDto, base HTTP
  feedback/          # @agroideas/feedback  scope:shared, type:util       AlertService (SweetAlert2)
  security/          # @agroideas/security  scope:shared, type:util       permisos + has-permission
  utils/             # @agroideas/utils     scope:shared, type:util       currency, jwt, storage-keys, cn()
```

## Convención de tags (límites de módulos)

Cada proyecto declara en su `project.json` un `scope:*` y un `type:*`.
Las reglas se aplican con `@nx/enforce-module-boundaries` (ver `eslint.config.js`):

| sourceTag | puede depender de |
|---|---|
| `scope:shared` | `scope:shared` |
| `scope:kofix` | `scope:kofix`, `scope:shared` |
| `scope:sat` | `scope:sat`, `scope:shared` |
| `type:app` / `type:feature` | `type:feature`, `type:ui`, `type:data-access`, `type:util` |
| `type:ui` | `type:ui`, `type:util` |
| `type:data-access` | `type:data-access`, `type:util` |
| `type:util` | `type:util` |

**Invariantes**
- Una app **nunca** importa otra app; lo común vive en `scope:shared`.
- `apps/*` **no** importan `primeng`, `@angular/material`, `@angular/cdk`, `bootstrap`,
  `sweetalert2` ni `leaflet` directamente: se consumen vía `@agroideas/*`.

## Generadores estándar

```sh
# Librería Angular (componentes/servicios)
nx g @nx/angular:library <nombre> --directory=libs/<nombre> \
  --importPath=@agroideas/<nombre> --tags=scope:shared,type:<ui|data-access|util> \
  --standalone --style=scss --unitTestRunner=jest

# Librería TS pura (utils, theme)
nx g @nx/js:library <nombre> --directory=libs/<nombre> \
  --importPath=@agroideas/<nombre> --tags=scope:shared,type:util --bundler=none

# App
nx g @nx/angular:application <nombre> --directory=apps/<nombre> \
  --tags=scope:<kofix|sat>,type:app --style=scss --routing --ssr=false
```

## Comandos frecuentes

```sh
nx serve kofix-ejecucion          # dev server
nx build sat-ui                   # build de una app
nx run-many -t lint,test,build    # todo el workspace
nx affected -t lint,test,build    # solo lo afectado por tus cambios
nx graph                          # grafo de dependencias
nx show projects                  # lista de proyectos + tags
```

## Reglas de estilo y marca
- Ningún color hex fuera de `@agroideas/theme` (variables CSS + preset Tailwind).
- Componentes de UI reutilizables van en `@agroideas/ui`, no en las apps.
- Lógica de dominio (repos de convenio, desembolso, etc.) permanece en su app.
