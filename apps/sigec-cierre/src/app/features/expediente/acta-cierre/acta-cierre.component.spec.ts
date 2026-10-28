import { ApplicationRef } from '@angular/core';
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
    faltantes: ['DNI del profesional de AGROIDEAS'],
    txtLocalidad: 'Perené',
    txtDistrito: 'Perené',
    txtProvincia: 'Chanchamayo',
    txtRegion: 'Junín',
    fecInicioReunion: null,
    fecFinReunion: null,
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
    fecFirmaConvenio: '2023-04-03T00:00:00',
    asistentes: [],
    representantesLegalesSel: [],
    objetivosEspecificosSel: [],
    unidadesMedidaSel: [],
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
    // jsdom no implementa scrollIntoView, que acompaña al foco del primer error.
    Element.prototype.scrollIntoView = jest.fn();
    api.obtenerAnexo21.mockReturnValue(of(acta()));
  });

  it('carga la propuesta y sugiere al usuario como profesional de AGROIDEAS', () => {
    const fixture = crear();
    const c = fixture.componentInstance;
    expect(api.obtenerAnexo21).toHaveBeenCalledWith(5);
    expect(c.acta()?.txtProfesionalAgroideas).toBe('Rosa Quispe');
    expect(fixture.nativeElement.textContent).toContain('Despulpadora');
    expect(fixture.nativeElement.textContent).toContain('Indique el DNI del profesional.');
  });

  it('resalta los ítems cuya cantidad verificada difiere de lo ejecutado en KOFIX', () => {
    const { componentInstance: c } = crear();
    const item = actual(c).bienes[0];
    expect(c.difiere(item)).toBe(false);
    item.canCantidad = 1;
    expect(c.difiere(item)).toBe(true);
    expect(c.difiere({ ...item, canEjecutada: null })).toBe(false);
  });

  it('agregar un bien abre un modal; los errores se marcan por campo al intentar agregar', () => {
    const fixture = crear();
    const c = fixture.componentInstance;
    c.abrirItem('bienes');
    fixture.detectChanges();
    expect(c.nuevoItem()?.lista).toBe('bienes');
    expect(c.errorItem('item-descripcion')).toBeNull();

    c.agregarItem();
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(actual(c).bienes).toHaveLength(1);
    expect(c.errorItem('item-descripcion')).toBe('Indique la descripción.');
    expect(c.errorItem('item-cantidad')).toBe('Indique la cantidad verificada.');
    expect(el.querySelector('#item-unidad')?.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('#item-unidad-error')?.textContent).toContain('Indique la unidad de medida.');
    expect(document.activeElement?.id).toBe('item-descripcion');

    c.nuevoItem.update(n => n && { ...n, txtDescripcion: ' Mochila fumigadora ', txtUnidadMedida: 'unidad', canCantidad: 3, txtObservaciones: ' ' });
    expect(c.errorItem('item-descripcion')).toBeNull();
    c.agregarItem();
    expect(c.nuevoItem()).toBeNull();
    expect(actual(c).bienes[1]).toMatchObject({ numOrden: 2, txtDescripcion: 'Mochila fumigadora', canCantidad: 3, txtObservaciones: null, ideItemSel: null });
    expect(c.sucio()).toBe(true);
  });

  it('las filas agregadas a mano se pueden quitar y se renumeran', () => {
    const { componentInstance: c } = crear();
    for (const descripcion of ['Mochila', 'Balanza']) {
      c.abrirItem('bienes');
      c.nuevoItem.update(n => n && { ...n, txtDescripcion: descripcion, txtUnidadMedida: 'unidad', canCantidad: 1 });
      c.agregarItem();
    }
    c.quitarItem('bienes', 1);
    expect(actual(c).bienes.map(b => [b.numOrden, b.txtDescripcion])).toEqual([[1, 'Despulpadora'], [2, 'Balanza']]);
    expect(c.sucio()).toBe(true);
  });

  it('no guarda con DNI repetidos ni con la firma otro día', () => {
    const { componentInstance: c } = crear();
    c.agregarAsistente();
    c.agregarAsistente();
    actual(c).asistentes.forEach(a => (a.codDni = '12345678'));
    c.guardar();
    expect(api.guardarAnexo21).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith('Corrija los campos marcados', expect.stringContaining('impiden guardar'));
    expect(c.errorDe('asistente-dni-1')).toBe('DNI repetido.');

    actual(c).asistentes[1].codDni = '87654321';
    actual(c).fecInicioReunion = '2026-10-20T10:00';
    actual(c).fecFinReunion = '2026-10-21T12:00';
    c.marcarSucio();
    c.guardar();
    expect(api.guardarAnexo21).not.toHaveBeenCalled();
  });

  it('al guardar con errores marca cada campo (aria-invalid y mensaje) y lleva el foco al primero', () => {
    const fixture = crear();
    const c = fixture.componentInstance;
    c.agregarAsistente();
    fixture.detectChanges();
    c.guardar();
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();

    const el: HTMLElement = fixture.nativeElement;
    // El logro de la propuesta tiene objetivo pero no texto: es el primer campo que impide guardar.
    const logro = el.querySelector('#logro-texto-0') as HTMLElement;
    expect(logro.getAttribute('aria-invalid')).toBe('true');
    expect(logro.classList).toContain('form-invalid');
    expect(logro.getAttribute('aria-describedby')).toBe('logro-texto-0-error');
    expect(el.querySelector('#logro-texto-0-error')?.textContent).toContain('Describa el logro alcanzado.');
    expect(el.querySelector('#logro-objetivo-0')?.getAttribute('aria-invalid')).toBeNull();
    expect(el.querySelector('#asistente-nombres-0')?.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(logro);
    expect(api.guardarAnexo21).not.toHaveBeenCalled();
  });

  it('los faltantes no impiden guardar el borrador, pero quedan marcados; la marca se va al completar el campo', () => {
    api.guardarAnexo21.mockImplementation((_: number, datos: object) => of({ ...acta(), ...datos, ideAnexo21: 3 }));
    const fixture = crear();
    const c = fixture.componentInstance;
    actual(c).logros.forEach(l => ((l.txtObjetivoEspecifico = 'Mejorar la calidad'), (l.txtLogroAlcanzado = 'Se mejoró')));
    c.marcarSucio();
    c.guardar();
    fixture.detectChanges();
    expect(api.guardarAnexo21).toHaveBeenCalled();
    expect(c.errorDe('acta-dni-profesional')).toBe('Indique el DNI del profesional.');

    actual(c).codDniProfesional = '41234567';
    c.marcarSucio();
    fixture.detectChanges();
    expect(c.errorDe('acta-dni-profesional')).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('#acta-dni-profesional')?.getAttribute('aria-invalid')).toBeNull();
  });

  it('cada faltante de la lista lleva a su campo', () => {
    const fixture = crear();
    const enlace = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(b =>
      b.textContent?.includes('Indique el DNI del profesional.')
    ) as HTMLButtonElement;
    enlace.click();
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();
    expect(document.activeElement?.id).toBe('acta-dni-profesional');
    expect(fixture.componentInstance.errorDe('acta-dni-profesional')).not.toBeNull();
  });

  it('registrar se habilita con el acta guardada, completa y el PDF elegido', () => {
    api.guardarAnexo21.mockReturnValue(of(acta({ ideAnexo21: 3, faltantes: [] })));
    const { componentInstance: c } = crear();
    expect(c.puedeRegistrar()).toBe(false);
    actual(c).logros.forEach(l => ((l.txtObjetivoEspecifico = 'Mejorar la calidad'), (l.txtLogroAlcanzado = 'Se mejoró')));

    c.marcarSucio();
    c.guardar();
    expect(c.completa()).toBe(true);
    expect(c.puedeRegistrar()).toBe(false);

    const pdf = new File(['%PDF-'], 'acta.pdf', { type: 'application/pdf' });
    c.archivo.set(pdf);
    expect(c.puedeRegistrar()).toBe(true);
  });

  it('al registrar avisa al expediente para que se recargue', () => {
    api.obtenerAnexo21.mockReturnValue(of(acta({ ideAnexo21: 3, faltantes: [] })));
    api.registrarVerificacion.mockReturnValue(of({ ideCierreConvenio: 5, estCierre: 'EN_EVALUACION_UN' }));
    const { componentInstance: c } = crear();
    const emitido = jest.fn();
    c.registrado.subscribe(emitido);

    const pdf = new File(['%PDF-'], 'acta.pdf', { type: 'application/pdf' });
    c.archivo.set(pdf);
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
    c.archivo.set(new File(['%PDF-'], 'a.pdf', { type: 'application/pdf' }));
    c.registrar();
    expect(toast.error).toHaveBeenCalledWith('No se pudo registrar la verificación', expect.stringMatching(/^La reunión de cierre/));
  });

  it('con datos del SEL, presidente y objetivos son selectores con sus opciones', () => {
    api.obtenerAnexo21.mockReturnValue(
      of(
        acta({
          txtPresidente: 'JUAN PEREZ',
          representantesLegalesSel: [
            { txtNombres: 'ANA ROJAS', txtCargo: 'TESORERA' },
            { txtNombres: 'JUAN PEREZ', txtCargo: 'PRESIDENTE' }
          ],
          objetivosEspecificosSel: ['Renovar cafetales', 'Mejorar la calidad']
        })
      )
    );
    const fixture = crear();
    const selects = fixture.nativeElement.querySelectorAll('select') as NodeListOf<HTMLSelectElement>;
    const textos = Array.from(selects).map(s => Array.from(s.options).map(o => o.textContent?.trim()));

    expect(textos).toContainEqual(['Seleccione un representante legal…', 'ANA ROJAS — TESORERA', 'JUAN PEREZ — PRESIDENTE']);
    expect(textos).toContainEqual(['Seleccione un objetivo específico…', 'Renovar cafetales', 'Mejorar la calidad']);
  });

  it('con el catálogo del SEL, la unidad del ítem se elige y las observaciones van en un textarea', () => {
    api.obtenerAnexo21.mockReturnValue(of(acta({ unidadesMedidaSel: ['Kilogramo (kg)', 'unidad'] })));
    const fixture = crear();
    fixture.componentInstance.abrirItem('servicios');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const unidad = el.querySelector('#item-unidad') as HTMLSelectElement;

    expect(unidad.tagName).toBe('SELECT');
    expect(Array.from(unidad.options).map(o => o.textContent?.trim())).toEqual(['Seleccione una unidad…', 'Kilogramo (kg)', 'unidad']);
    expect(el.querySelector('#item-observaciones')?.tagName).toBe('TEXTAREA');
  });

  it('sin datos del SEL, presidente y objetivo se escriben', () => {
    const fixture = crear();
    expect(fixture.nativeElement.querySelectorAll('select').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('El SEL no registra representantes legales');
  });

  it('la hora de firma se guarda en el mismo día del inicio y se mueve con él', () => {
    const { componentInstance: c } = crear();
    c.cambiarHoraFirma('12:30');
    expect(actual(c).fecFinReunion).toBeNull();

    c.cambiarInicio('2026-10-20T09:30');
    c.cambiarHoraFirma('12:30');
    expect(actual(c).fecFinReunion).toBe('2026-10-20T12:30');
    expect(c.horaFirma()).toBe('12:30');

    c.cambiarInicio('2026-10-22T08:00');
    expect(actual(c).fecFinReunion).toBe('2026-10-22T12:30');
    expect(c.validacion.bloqueantes().some(e => e.id === 'acta-hora-firma')).toBe(false);
  });

  it('sigue el orden del formato oficial: reunión, PRIMERO, SEGUNDO, dificultades, cierre y firmas', () => {
    const titulos = Array.from(crear().nativeElement.querySelectorAll('.form-section-title') as NodeListOf<HTMLElement>).map(t =>
      t.textContent?.trim()
    );
    expect(titulos).toEqual([
      'Lugar, fecha y participantes de la reunión',
      'Primero',
      'Segundo',
      'Dificultades',
      'Cierre del acta y firmas',
      'Registrar la verificación de campo'
    ]);
  });
});

