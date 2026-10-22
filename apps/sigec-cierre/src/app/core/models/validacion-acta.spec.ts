import { Anexo21Datos } from './anexo21.model';
import { erroresBloqueantesActa, faltantesActa } from './validacion-acta';

const completa = (): Anexo21Datos => ({
  txtLocalidad: 'La Cascarilla', txtDistrito: 'Jaén', txtProvincia: 'Jaén', txtRegion: 'Cajamarca',
  fecInicioReunion: '2026-10-21T09:00', fecFinReunion: '2026-10-21T12:00', txtLocal: 'Local comunal', txtDireccionLocal: 'Plaza s/n',
  txtOrganizacion: 'Perfiles Coffee', txtProfesionalAgroideas: 'Rosa Quispe', codDniProfesional: '12345678', txtPlanNegocio: 'PNT café',
  bienes: [{ numOrden: 1, txtDescripcion: 'Despulpadora', txtUnidadMedida: 'unidad', canCantidad: 1, txtObservaciones: null, ideItemSel: 7, canProgramada: 1, canEjecutada: 1, impEjecutado: 10 }],
  servicios: [], txtPresidente: 'Juan Pérez',
  logros: [{ numOrden: 1, txtObjetivoEspecifico: 'Mejorar la calidad', txtLogroAlcanzado: 'Se mejoró' }],
  txtDificultades: null, txtNumeroConvenio: '48',
  asistentes: [{ numOrden: 1, txtNombres: 'Ana Ruiz', txtCargo: 'Socia', codDni: '87654321' }]
});

describe('validación del Acta', () => {
  it('un acta completa no tiene errores ni faltantes', () => {
    expect(erroresBloqueantesActa(completa())).toEqual([]);
    expect(faltantesActa(completa())).toEqual([]);
  });

  it('faltantes: mismos campos que CompletitudAnexo21, con el id de su control', () => {
    const a = { ...completa(), txtLocal: ' ', fecFinReunion: null, logros: [], asistentes: [], txtNumeroConvenio: null };
    expect(faltantesActa(a).map(f => f.id)).toEqual(['acta-hora-firma', 'acta-local', 'acta-logros', null, 'acta-asistentes']);
  });

  it('bloqueantes: celdas vacías de filas, DNI inválido o repetido y horario incoherente', () => {
    const a = completa();
    a.fecFinReunion = '2026-10-21T08:00';
    a.codDniProfesional = '12';
    a.servicios = [{ numOrden: 1, txtDescripcion: '', txtUnidadMedida: 'hora', canCantidad: -1, txtObservaciones: null, ideItemSel: null, canProgramada: null, canEjecutada: null, impEjecutado: null }];
    a.logros = [{ numOrden: 1, txtObjetivoEspecifico: '', txtLogroAlcanzado: 'x' }];
    a.asistentes = [
      { numOrden: 1, txtNombres: 'Ana', txtCargo: '', codDni: '87654321' },
      { numOrden: 2, txtNombres: 'Luis', txtCargo: 'Socio', codDni: '87654321' }
    ];
    expect(erroresBloqueantesActa(a).map(e => e.id)).toEqual([
      'acta-dni-profesional',
      'acta-hora-firma',
      'servicios-descripcion-0',
      'servicios-cantidad-0',
      'logro-objetivo-0',
      'asistente-cargo-0',
      'asistente-dni-0',
      'asistente-dni-1'
    ]);
  });
});
