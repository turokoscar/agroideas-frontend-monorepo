import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ToastService } from '@agroideas/ui';
import { ActaCierreComponent } from './acta-cierre.component';
import { CierreApiService } from '../../../core/services/cierre-api.service';
import { Anexo21Dto } from '../../../core/models/anexo21.model';

function acta(extra: Partial<Anexo21Dto> = {}): Anexo21Dto {
  return {
    ideAnexo21: 0,
    ideCierreConvenio: 5,
    estAnexo21: 'BORRADOR',
    ideUsuario: 0,
    fecRegistro: '2026-10-20T00:00:00',
    fecModificacion: '2026-10-20T00:00:00',
    faltantes: ['Local de la reunión'],
    txtLocalidad: 'Perené',
    txtDistrito: 'Perené',
    txtProvincia: 'Chanchamayo',
    txtRegion: 'Junín',
    fecInicioReunion: null,
    fecFinReunion: null,
    txtLocal: null,
    txtDireccionLocal: null,
    txtOrganizacion: 'Cooperativa Bio Coffee Perú',
    txtProfesionalAgroideas: null,
    codDniProfesional: null,
    txtPlanNegocio: 'Mejora del café',
    bienes: [
      { numOrden: 1, txtDescripcion: 'Despulpadora', txtUnidadMedida: 'unidad', canCantidad: 2, txtObservaciones: null, ideItemSel: 901, canProgramada: 2, canEjecutada: 2, impEjecutado: 18000 }
    ],
    servicios: [],
    txtPresidente: null,
    logros: [{ numOrden: 1, txtObjetivoEspecifico: 'Renovar cafetales', txtLogroAlcanzado: '' }],
    txtDificultades: null,
    txtNumeroConvenio: '319',
    asistentes: [],
    ...extra
  };
}

/** Acta cargada en el componente (falla la prueba si no hay). */
function actual(c: ActaCierreComponent): Anexo21Dto {
  const a = c.acta();
  if (!a) throw new Error('El acta no se cargó');
  return a;
}

describe('ActaCierreComponent', () => {
  const api = { obtenerAnexo21: jest.fn(), guardarAnexo21: jest.fn(), descargarAnexo21: jest.fn(), registrarVerificacion: jest.fn() };
  const toast = { success: jest.fn(), info: jest.fn(), error: jest.fn() };

  function crear(nombreUsuario: string | null = 'Rosa Quispe') {
    TestBed.configureTestingModule({
      imports: [ActaCierreComponent],
      providers: [
        { provide: CierreApiService, useValue: api },
        { provide: ToastService, useValue: toast }
      ]
    });
    const fixture = TestBed.createComponent(ActaCierreComponent);
    fixture.componentRef.setInput('ideCierre', 5);
    fixture.componentRef.setInput('nombreUsuario', nombreUsuario);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    api.obtenerAnexo21.mockReturnValue(of(acta()));
  });

  it('carga la propuesta y sugiere al usuario como profesional de AGROIDEAS', () => {
    const fixture = crear();
    const c = fixture.componentInstance;
    expect(api.obtenerAnexo21).toHaveBeenCalledWith(5);
    expect(c.acta()?.txtProfesionalAgroideas).toBe('Rosa Quispe');
    expect(fixture.nativeElement.textContent).toContain('Despulpadora');
    expect(fixture.nativeElement.textContent).toContain('Local de la reunión');
  });

  it('resalta los ítems cuya cantidad verificada difiere de lo ejecutado en KOFIX', () => {
    const { componentInstance: c } = crear();
    const item = actual(c).bienes[0];
    expect(c.difiere(item)).toBe(false);
    item.canCantidad = 1;
    expect(c.difiere(item)).toBe(true);
    expect(c.difiere({ ...item, canEjecutada: null })).toBe(false);
  });

  it('las filas agregadas a mano se pueden quitar y se renumeran', () => {
    const { componentInstance: c } = crear();
    c.agregarItem('bienes');
    c.agregarItem('bienes');
    c.quitarItem('bienes', 1);
    expect(actual(c).bienes.map(b => b.numOrden)).toEqual([1, 2]);
    expect(c.sucio()).toBe(true);
  });

  it('no guarda con DNI repetidos ni con la firma otro día', () => {
    const { componentInstance: c } = crear();
    c.agregarAsistente();
    c.agregarAsistente();
    actual(c).asistentes.forEach(a => (a.codDni = '12345678'));
    c.guardar();
    expect(api.guardarAnexo21).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('DNI repetido', expect.stringContaining('12345678'));

    actual(c).asistentes[1].codDni = '87654321';
    actual(c).fecInicioReunion = '2026-10-20T10:00';
    actual(c).fecFinReunion = '2026-10-21T12:00';
    c.marcarSucio();
    c.guardar();
    expect(api.guardarAnexo21).not.toHaveBeenCalled();
  });

  it('registrar se habilita con el acta guardada, completa y el PDF elegido', () => {
    api.guardarAnexo21.mockReturnValue(of(acta({ ideAnexo21: 3, faltantes: [] })));
    const { componentInstance: c } = crear();
    expect(c.puedeRegistrar()).toBe(false);

    c.marcarSucio();
    c.guardar();
    expect(c.completa()).toBe(true);
    expect(c.puedeRegistrar()).toBe(false);

    const pdf = new File(['%PDF-'], 'acta.pdf', { type: 'application/pdf' });
    c.seleccionarArchivo({ target: { files: [pdf], value: 'x' } } as unknown as Event);
    expect(c.puedeRegistrar()).toBe(true);
  });

  it('al registrar avisa al expediente para que se recargue', () => {
    api.obtenerAnexo21.mockReturnValue(of(acta({ ideAnexo21: 3, faltantes: [] })));
    api.registrarVerificacion.mockReturnValue(of({ ideCierreConvenio: 5, estCierre: 'EN_EVALUACION_UN' }));
    const { componentInstance: c } = crear();
    const emitido = jest.fn();
    c.registrado.subscribe(emitido);

    const pdf = new File(['%PDF-'], 'acta.pdf', { type: 'application/pdf' });
    c.seleccionarArchivo({ target: { files: [pdf], value: 'x' } } as unknown as Event);
    c.registrar();

    expect(api.registrarVerificacion).toHaveBeenCalledWith(5, pdf);
    expect(emitido).toHaveBeenCalled();
  });

  it('muestra el rechazo de la API sin el código', () => {
    api.obtenerAnexo21.mockReturnValue(of(acta({ ideAnexo21: 3, faltantes: [] })));
    api.registrarVerificacion.mockReturnValue(
      throwError(() => ({ error: { mensaje: 'CIE_2005:La reunión de cierre figura el 25/10/2026 10:00: la verificación se registra después de realizarla.' } }))
    );
    const { componentInstance: c } = crear();
    c.seleccionarArchivo({ target: { files: [new File(['%PDF-'], 'a.pdf', { type: 'application/pdf' })], value: 'x' } } as unknown as Event);
    c.registrar();
    expect(toast.error).toHaveBeenCalledWith('No se pudo registrar la verificación', expect.stringMatching(/^La reunión de cierre/));
  });
});
