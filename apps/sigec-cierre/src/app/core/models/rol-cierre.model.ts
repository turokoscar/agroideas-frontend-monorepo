/**
 * Roles del módulo de Cierre (ADR 0013, D2).
 *
 * `sel-api-seguridad` devuelve los roles con el texto exacto de `dbo.rol` de BD_SEL. Este
 * catálogo es el espejo de `RolesSigecCierre` (`SIGEC_CIERRE.Entidad/Cierre/RolesSigecCierre.cs`)
 * y, como allí, se compara sin distinguir mayúsculas. No se reutiliza el de `sigec-rtf`: el mismo
 * texto significa otra cosa en cada módulo ("Unidad de Monitoreo" es la UN en RTF y la USE aquí).
 *
 * Un rol que no está en el catálogo se descarta. Un usuario sin roles reconocidos no tiene
 * acceso al módulo (no cae a 'OA', a diferencia de `normalizarRol`).
 */
export type CierreRol = 'OA' | 'UN' | 'JEFE_UN' | 'UR' | 'DE' | 'UAJ' | 'USE' | 'ADMIN';

const ROLES_POR_TEXTO: Readonly<Record<string, CierreRol>> = {
  POSTULANTE: 'OA',
  'UNIDAD DE NEGOCIOS': 'UN',
  'JEFE DE UNIDAD DE NEGOCIOS': 'JEFE_UN',
  'UNIDAD REGIONAL': 'UR',
  'DIRECCIÓN EJECUTIVA': 'DE',
  'UNIDAD DE ASESORIA LEGAL': 'UAJ',
  'UNIDAD DE MONITOREO': 'USE',
  'SUPERVISOR DE MONITOREO': 'USE',
  'ESPECIALISTA DE MONITOREO': 'USE',
  'ADMINISTRADOR DEL SISTEMA': 'ADMIN'
};

/** Orden de presentación (y de prioridad para la etiqueta principal). */
const ORDEN: readonly CierreRol[] = ['ADMIN', 'JEFE_UN', 'UN', 'UR', 'DE', 'UAJ', 'USE', 'OA'];

/** Personal de AGROIDEAS: todos menos la OA (`RolesSigecCierre.PersonalCierre`). */
export const ROLES_PERSONAL: readonly CierreRol[] = ['UN', 'JEFE_UN', 'UR', 'DE', 'UAJ', 'USE', 'ADMIN'];

export const ETIQUETA_ROL: Readonly<Record<CierreRol, string>> = {
  OA: 'Organización Agraria',
  UN: 'Unidad de Negocios',
  JEFE_UN: 'Jefe de Unidad de Negocios',
  UR: 'Unidad Regional',
  DE: 'Dirección Ejecutiva',
  UAJ: 'Asesoría Jurídica',
  USE: 'Seguimiento y Evaluación',
  ADMIN: 'Administrador'
};

/** Convierte los roles de `sel-api-seguridad` en los del módulo, sin duplicados y en orden. */
export function mapearRolesCierre(roles: readonly string[] | null | undefined): CierreRol[] {
  const reconocidos = new Set<CierreRol>();
  for (const rol of roles ?? []) {
    const mapeado = ROLES_POR_TEXTO[rol?.trim().toUpperCase() ?? ''];
    if (mapeado) reconocidos.add(mapeado);
  }
  return ORDEN.filter(rol => reconocidos.has(rol));
}

export function tieneAlgunRol(roles: readonly CierreRol[], permitidos: readonly CierreRol[]): boolean {
  return roles.some(rol => permitidos.includes(rol));
}

/**
 * Página de inicio según los roles. Cada destino solo lo devuelve si el usuario puede
 * activarlo, para que un guard que rechaza nunca redirija a otra ruta que también lo rechace.
 */
export function rutaInicio(roles: readonly CierreRol[]): string {
  if (tieneAlgunRol(roles, ROLES_PERSONAL)) return '/bandeja';
  if (roles.includes('OA')) return '/mi-cierre';
  return '/sin-acceso';
}
