/**
 * Catálogo de roles de la aplicación.
 * Sincronizado con la matriz de base de datos SEG.KDX_SEG_TC_ROL_PERMISO.
 */
export const ROLES = {
    JEFE_UNIDAD_NEGOCIOS: 'Jefe de Unidad de Negocios',
    SUPERVISOR_MONITOREO: 'Supervisor de Monitoreo',
    ESPECIALISTA_MONITOREO: 'Especialista de Monitoreo',
    ADMINISTRADOR_SISTEMA: 'Administrador del sistema',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];
