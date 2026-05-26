# Fase 0 — Pines de versión del stack de linting

## Contexto
`create-nx-workspace@19.8.14` (Angular 18) declara rangos abiertos para el stack de
ESLint (`eslint: ^9.8.0`, `typescript-eslint: ^8.0.0`). Al instalar, npm resolvió a
las últimas publicadas (`eslint@9.39.4`, `typescript-eslint@8.60.0`), **fuera de la
combinación que tolera `angular-eslint@18.4.3`** (el correcto para Angular 18).

Esto provocó dos fallos de `nx lint`:
1. `@typescript-eslint/ban-ts-comment` → `Cannot read properties of undefined (reading 'at')`
   sobre archivos `.html` (typescript-eslint demasiado nuevo para angular-eslint 18).
2. Tras bajar typescript-eslint a 8.13: `@typescript-eslint/no-unused-expressions` →
   `reading 'allowShortCircuit'` (typescript-eslint 8.13 demasiado viejo para eslint 9.39).

## Solución aplicada
Emparejar **eslint 9.14.0 ↔ typescript-eslint 8.13.0** (versiones contemporáneas a
angular-eslint 18.4.3) y forzar las transitivas con `overrides` en `package.json`:

```jsonc
// package.json
"devDependencies": {
  "@eslint/js": "9.14.0",
  "eslint": "9.14.0",
  "@typescript-eslint/utils": "8.13.0",
  "typescript-eslint": "8.13.0"
},
"overrides": {
  "eslint": "9.14.0",
  "@eslint/js": "9.14.0",
  "typescript-eslint": "8.13.0",
  "@typescript-eslint/eslint-plugin": "8.13.0",
  "@typescript-eslint/parser": "8.13.0",
  "@typescript-eslint/utils": "8.13.0",
  "@typescript-eslint/type-utils": "8.13.0",
  "@typescript-eslint/typescript-estree": "8.13.0",
  "@typescript-eslint/scope-manager": "8.13.0",
  "@typescript-eslint/types": "8.13.0",
  "@typescript-eslint/visitor-keys": "8.13.0"
}
```

## Fix adicional en `eslint.config.js`
Los presets `flat/typescript` de `@nx/eslint-plugin@19.8.14` incluyen reglas TS
**sin `files`** (aplican a todo, incluidos `.html`). `ban-ts-comment` revienta sobre
el AST del parser de plantillas. Se desactiva esa regla en `**/*.html` (bloque final
del `eslint.config.js`, gana por precedencia de flat config):

```js
{ files: ['**/*.html'], rules: { '@typescript-eslint/ban-ts-comment': 'off' } }
```

## Estado verificado (2026-05-25)
- `nx run-many -t lint` → 11 proyectos ✔
- `nx run-many -t build` → 2 apps ✔
- `nx run-many -t test` → 8 proyectos ✔
- `enforce-module-boundaries` bloquea dependencias inválidas (probado: `type:ui` ✗→ `type:data-access`).

> Al actualizar Nx/Angular en el futuro, revalidar este trío
> (eslint ↔ typescript-eslint ↔ angular-eslint) y ajustar los pines/overrides.
