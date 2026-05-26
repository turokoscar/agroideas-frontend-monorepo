/**
 * Catálogo de permisos de la aplicación.
 *
 * Los permisos son la ÚNICA fuente de verdad para las decisiones de acceso en
 * el frontend; los emite el backend (`GET /auth/permisos`, derivados de la
 * matriz rol→permiso `SEG.KDX_SEG_TC_ROL_PERMISO`). Los roles del JWT se usan
 * solo para mostrar identidad, nunca para autorizar.
 *
 * Mantener sincronizado con la matriz del backend.
 */
export const PERMISSIONS = {
    ACCESO_APP: 'ACCESO_APP',
    ACCESO_KARDEX: 'ACCESO_KARDEX',
    MONITOREO_ALERTAS: 'MONITOREO_ALERTAS',
    GESTION_CARTERA: 'GESTION_CARTERA',
    ACTIVAR_CHEQUES: 'ACTIVAR_CHEQUES',
    CIERRE_CONTABLE: 'CIERRE_CONTABLE',
    OPERACIONES_FINANCIERAS: 'OPERACIONES_FINANCIERAS',
    REGISTRO_PROGRAMACION: 'REGISTRO_PROGRAMACION',
    VER_TODOS_CONVENIOS: 'VER_TODOS_CONVENIOS',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
