import { accionesDisponibles, puedeEjecutar } from './acciones-cierre';

describe('acciones-cierre (espejo de MaquinaEstadosCierre)', () => {
  it('la UR y la UN registran la verificación en EN_VERIFICACION; la DE no', () => {
    expect(puedeEjecutar('RegistrarVerificacionCampo', 'EN_VERIFICACION', ['UR'])).toBe(true);
    expect(puedeEjecutar('RegistrarVerificacionCampo', 'EN_VERIFICACION', ['JEFE_UN'])).toBe(true);
    expect(puedeEjecutar('RegistrarVerificacionCampo', 'EN_VERIFICACION', ['DE'])).toBe(false);
  });

  it('fuera del estado de origen no hay acción, aunque el rol sea el correcto', () => {
    expect(puedeEjecutar('RegistrarVerificacionCampo', 'EN_EVALUACION_UN', ['UR'])).toBe(false);
  });

  it('en revisión legal la UAJ puede observar o remitir el proyecto de RDE', () => {
    expect(accionesDisponibles('EN_REVISION_UAJ', ['UAJ'])).toEqual(['ObservarUaj', 'RemitirProyectoRde']);
  });

  it('la OA solo presenta el Anexo 20 en ESPERA_ANEXO20', () => {
    expect(accionesDisponibles('ESPERA_ANEXO20', ['OA'])).toEqual(['PresentarAnexo20']);
    expect(accionesDisponibles('EN_VERIFICACION', ['OA'])).toEqual([]);
  });

  it('IniciarCierre no tiene estado de origen: nunca aparece sobre un expediente existente', () => {
    expect(accionesDisponibles('ESPERA_ANEXO20', ['UN'])).not.toContain('IniciarCierre');
  });
});
