# @agroideas/theme

Fuente de verdad única de la marca **MIDAGRI / INIA** para el portafolio AGROIDEAS:
tokens de diseño (variables CSS HSL) + preset de Tailwind compartido. Sin valores
hex de marca hardcodeados fuera de esta librería (ver ADR 0001, decisión D4).

## Contenido
| Archivo | Propósito |
|---|---|
| `src/styles/tokens.css` | Variables CSS (`--primary`, `--accent`, `--sidebar-*`, estados, surface…) |
| `src/styles/base.css` | Entrada global: fuentes, `@tailwind`, capa base, clases compartidas del DS |
| `src/tailwind-preset.js` | Preset Tailwind que mapea las clases a `hsl(var(--token))` |
| `src/lib/theme.ts` | Metadatos TS (`COLOR_TOKENS`, `THEME_ASSETS`) |

## Uso en una app

**1) Extender el preset** en `apps/<app>/tailwind.config.js`:

```js
const preset = require('../../libs/theme/src/tailwind-preset.js');

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [preset],
  content: [
    'apps/<app>/src/**/*.{html,ts}',
    'libs/**/*.{html,ts}', // para escanear las clases de @agroideas/ui
  ],
};
```

**2) Importar la base** en `apps/<app>/src/styles.scss` (o `.css`):

```css
@import '../../../libs/theme/src/styles/base.css';
```

Luego ya puedes usar las clases de marca: `bg-primary`, `text-accent`,
`bg-sidebar`, `shadow-premium`, `bg-surface-100`, `rounded-lg`, etc.

## Theming por aplicación (override de tokens)
Cada app puede ajustar la marca redefiniendo variables **después** de importar la base:

```css
@import '../../../libs/theme/src/styles/base.css';

:root {
  /* Ej.: una variante con primario más brillante para SAT */
  --primary: 100 54% 42%;
}
```

No redefinas colores con hex en `tailwind.config.js`: cambia el token CSS y todo el
sistema se actualiza de forma coherente.

## Notas
- Paleta canónica: primario INIA `#346b00`, accent `#fab50b`, sidebar `#008F49`.
- Se conservan alias de compatibilidad de KOFIX (`--primary_container`, `--verde-agro`, …)
  para facilitar su migración (Fase 2–3).
- Fuentes cargadas en `base.css`: **Roboto** y **Material Symbols Outlined**.
