/**
 * Claves de `localStorage` usadas por la aplicación.
 * Fuente única para evitar strings mágicos repetidos por el código.
 */
export const STORAGE_KEYS = {
    TOKEN: 'kDX_TOKEN',
    REFRESH_TOKEN: 'kDX_REFRESH_TOKEN',
    PERMISSIONS: 'kDX_PERMISSIONS',
} as const;
