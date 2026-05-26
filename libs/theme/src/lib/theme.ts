/**
 * @agroideas/theme — API TypeScript del design system.
 *
 * El tema se aplica vía CSS (`styles/tokens.css`, `styles/base.css`) y el preset
 * Tailwind (`tailwind-preset.js`). Este módulo expone metadatos útiles para
 * consumidores TS (p. ej. validación o documentación de tokens).
 */

/** Nombres de los tokens de color semánticos (clases Tailwind disponibles). */
export const COLOR_TOKENS = [
  'primary',
  'secondary',
  'tertiary',
  'accent',
  'muted',
  'destructive',
  'success',
  'warning',
  'danger',
  'info',
  'card',
  'popover',
  'surface',
  'sidebar',
  'background',
  'foreground',
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

/** Rutas (relativas a la raíz del workspace) de los recursos de estilo del tema. */
export const THEME_ASSETS = {
  tokens: 'libs/theme/src/styles/tokens.css',
  base: 'libs/theme/src/styles/base.css',
  preset: 'libs/theme/src/tailwind-preset.js',
} as const;
