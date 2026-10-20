import { CierreRol, ROLES_PERSONAL, mapearRolesCierre, rutaInicio, tieneAlgunRol } from './rol-cierre.model';

describe('rol-cierre.model', () => {
  describe('mapearRolesCierre', () => {
    it.each<[string, CierreRol]>([
      ['Postulante', 'OA'],
      ['Unidad de Negocios', 'UN'],
      ['Jefe de Unidad de Negocios', 'JEFE_UN'],
      ['Unidad regional', 'UR'],
      ['Dirección ejecutiva', 'DE'],
      ['Unidad de Asesoria Legal', 'UAJ'],
      ['Unidad de Monitoreo', 'USE'],
      ['Supervisor de Monitoreo', 'USE'],
      ['Especialista de Monitoreo', 'USE'],
      ['Administrador del sistema', 'ADMIN']
    ])('mapea "%s" (texto de RolesSigecCierre) a %s', (texto, esperado) => {
      expect(mapearRolesCierre([texto])).toEqual([esperado]);
    });

    it('no distingue mayúsculas ni espacios alrededor, como la API', () => {
      expect(mapearRolesCierre(['  UNIDAD REGIONAL ', 'dirección EJECUTIVA'])).toEqual(['UR', 'DE']);
    });

    it('conserva todos los roles del usuario, sin duplicados y en el orden del catálogo', () => {
      expect(mapearRolesCierre(['Unidad de Monitoreo', 'Unidad de Negocios', 'Supervisor de Monitoreo', 'Unidad de Negocios']))
        .toEqual(['UN', 'USE']);
    });

    it('descarta los roles que el módulo no reconoce', () => {
      expect(mapearRolesCierre(['Analista Kardex', 'Unidad regional'])).toEqual(['UR']);
    });

    it('no convierte a OA a quien no tiene roles reconocidos (a diferencia de normalizarRol)', () => {
      expect(mapearRolesCierre(['Analista Kardex'])).toEqual([]);
      expect(mapearRolesCierre([])).toEqual([]);
      expect(mapearRolesCierre(null)).toEqual([]);
      expect(mapearRolesCierre(undefined)).toEqual([]);
    });
  });

  describe('tieneAlgunRol', () => {
    it('es verdadero si comparte al menos un rol', () => {
      expect(tieneAlgunRol(['UR', 'USE'], ['DE', 'USE'])).toBe(true);
    });

    it('es falso si no comparte ninguno o no tiene roles', () => {
      expect(tieneAlgunRol(['OA'], ROLES_PERSONAL)).toBe(false);
      expect(tieneAlgunRol([], ['OA'])).toBe(false);
    });
  });

  describe('rutaInicio', () => {
    it.each<CierreRol>(['UN', 'JEFE_UN', 'UR', 'DE', 'UAJ', 'USE', 'ADMIN'])('envía al personal (%s) a la bandeja', rol => {
      expect(rutaInicio([rol])).toBe('/bandeja');
    });

    it('envía a la OA a su expediente', () => {
      expect(rutaInicio(['OA'])).toBe('/mi-cierre');
    });

    it('prioriza la bandeja si el usuario es OA y personal a la vez', () => {
      expect(rutaInicio(['UN', 'OA'])).toBe('/bandeja');
    });

    it('envía a "sin acceso" a quien no tiene roles del módulo', () => {
      expect(rutaInicio([])).toBe('/sin-acceso');
    });
  });
});
