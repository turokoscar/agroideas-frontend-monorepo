import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { ToastService } from '@agroideas/ui';
import { InformeEvaluacionComponent } from './informe-evaluacion.component';
import { CierreApiService } from '../../../core/services/cierre-api.service';
import { Anexo22Dto, nuevoIndicador } from '../../../core/models/anexo22.model';
import { PlazoDto } from '../../../core/models/plazo.model';
import { CambiosPendientesService } from '../../../core/services/cambios-pendientes.service';
import { environment } from '../../../../environments/environment';

function anexo(extra: Partial<Anexo22Dto> = {}): Anexo22Dto {
  return {
    ideAnexo22: 0, ideCierreConvenio: 5, estAnexo22: 'BORRADOR', numVersion: 1, ideUsuario: 0,
    fecRegistro: '2026-10-20T00:00:00', fecModificacion: '2026-10-20T00:00:00', faltantes: ['VII. Logros'], unidadesMedidaSel: [],
    txtOrganizacion: 'Cooperativa Bio Coffee Perú', txtPlanNegocio: 'Mejora del café', txtRegion: 'Junín', txtProvincia: 'Chanchamayo',
    txtDistrito: 'Perené', txtCentroPoblado: null, txtNumeroConvenio: '319', fecInicioConvenio: null, fecFinConvenio: null,
    fecTerminoAdenda: null, txtCadenaProductiva: 'Café', canSociasMujeres: 10, canSociosHombres: 20, numHectareas: 50,
    codRuc: '20602684726', problematica: [], txtObjetivoGeneral: null, txtObjetivosEspecificos: null,
    produccion: [], txtAnalisisProduccion: null, precios: [], txtAnalisisPrecios: null, comercializacion: [],
    txtAnalisisComercializacion: null, ingresos: [], txtAnalisisIngresos: null, objetivosEspecificos: [],
    txtAnalisisObjetivos: null,
    financiamiento: [{ tipFuente: 'AGROIDEAS', impAprobado: 350000, impEjecutado: 300000, txtOrigen: 'SEL_GENERAL+KOFIX' }],
    txtAnalisisFinanciamiento: null, bienes: [], servicios: [], txtAnalisisItems: null, monitoreo: [], practicaAmbiental: [],
    txtLogros: null, txtLeccionesAprendidas: null, txtDificultades: null, txtConclusiones: null, txtRecomendaciones: null,
    tipResultado: null,
    ...extra
  };
}

const plazo = (fecLimite: string): PlazoDto => ({
  idePlazo: 1, ideCierreConvenio: 5, tipPlazo: 'EVALUACION_UN', fecInicio: '2026-07-01T00:00:00', canDias: 90, fecLimite,
  codDepartamento: null, codProvincia: null, estPlazo: 'VIGENTE', fecCierre: null, txtContingencia: null, fecRegistro: '2026-07-01T00:00:00'
});

/** Fila abierta en el modal (falla la prueba si no hay). */
function filaEnEdicion(c: InformeEvaluacionComponent) {
  const edicion = c.edicion();
  if (!edicion) throw new Error('No hay una fila en edición');
  return edicion.fila;
}

describe('InformeEvaluacionComponent', () => {
  const api = {
    obtenerAnexo22: jest.fn(), listarVersionesAnexo22: jest.fn(), guardarAnexo22: jest.fn(),
    descargarAnexo22: jest.fn(), descargarVersionAnexo22: jest.fn(), presentarAnexo22: jest.fn(), derivar: jest.fn(), obtenerRequisitosDerivacion: jest.fn()
  };
  const requisitos = (rtfAprobado: boolean, contingencia = false) => ({
    flgPuedeDerivar: rtfAprobado,
    requisitos: [
      { txtCodigo: 'ANEXO22_FIRMADO', txtDescripcion: 'Informe de Evaluación (Anexo 22) firmado', flgCumple: true, txtDetalle: null },
      {
        txtCodigo: 'ULTIMO_RTF_APROBADO', txtDescripcion: 'Último RTF del convenio aprobado', flgCumple: rtfAprobado,
        txtDetalle: rtfAprobado ? null : 'El último RTF (30005) está en estado EN_REVISION: debe estar APROBADO antes de elevar el expediente a la DE.'
      }
    ],
    flgContingenciaRequerida: contingencia,
    fecLimitePlazo: null,
    ideRtfUltimo: 30005,
    estRtfUltimo: rtfAprobado ? 'APROBADO' : 'EN_REVISION'
  });
  const toast = { success: jest.fn(), info: jest.fn(), error: jest.fn() };

  function crear(plazoUn: PlazoDto | null = null) {
    TestBed.configureTestingModule({
      imports: [InformeEvaluacionComponent],
      providers: [{ provide: CierreApiService, useValue: api }, { provide: ToastService, useValue: toast }]
    });
    const fixture = TestBed.createComponent(InformeEvaluacionComponent);
    fixture.componentRef.setInput('ideCierre', 5);
    fixture.componentRef.setInput('plazoUn', plazoUn);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    // El paso abierto se recuerda por expediente: cada prueba empieza en el primero.
    localStorage.clear();
    // jsdom no implementa scrollIntoView, que acompaña al foco del campo.
    Element.prototype.scrollIntoView = jest.fn();
    api.obtenerAnexo22.mockReturnValue(of(anexo()));
    api.listarVersionesAnexo22.mockReturnValue(of([]));
    api.obtenerRequisitosDerivacion.mockReturnValue(of(requisitos(true)));
  });

  it('con el último RTF sin aprobar avisa desde el borrador y, ya firmado, no deja derivar', () => {
    api.obtenerRequisitosDerivacion.mockReturnValue(of(requisitos(false)));
    const borrador = crear();
    borrador.componentInstance.irAPaso('firma');
    borrador.detectChanges();
    expect(borrador.nativeElement.textContent).toContain('El último RTF (30005) está en estado EN_REVISION');
    TestBed.resetTestingModule();

    api.obtenerAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, faltantes: [], estAnexo22: 'FIRMADO' })));
    const firmado = crear();
    expect(firmado.componentInstance.puedeDerivar()).toBe(false);
    const boton = Array.from(firmado.nativeElement.querySelectorAll('ui-button button') as NodeListOf<HTMLButtonElement>)
      .find(b => b.textContent?.includes('Derivar a la Dirección Ejecutiva'));
    expect(boton?.disabled).toBe(true);
  });

  it('la contingencia la decide la API (plazo vencido según los requisitos)', () => {
    api.obtenerRequisitosDerivacion.mockReturnValue(of(requisitos(true, true)));
    expect(crear(plazo('2099-12-31T23:59:59')).componentInstance.plazoVencido()).toBe(true);
  });

  it('carga la propuesta, muestra los datos del SEL y, al firmar, lo que falta por paso', () => {
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    expect(api.obtenerAnexo22).toHaveBeenCalledWith(5);
    expect(el.textContent).toContain('Cooperativa Bio Coffee Perú');
    expect(el.textContent).not.toContain('Escriba los logros (VII).');

    fixture.componentInstance.irAPaso('firma');
    fixture.detectChanges();
    expect(el.textContent).toContain('Conclusiones y resultado');
    expect(el.textContent).toContain('Escriba los logros (VII).');
  });

  it('cada faltante abre su paso, lleva a su campo y lo marca; la marca se va al completarlo', () => {
    const fixture = crear();
    const el: HTMLElement = fixture.nativeElement;
    // Como en la app: cada ciclo de la aplicación pinta el componente (el paso nuevo se pinta antes de enfocar el campo).
    fixture.autoDetectChanges();
    fixture.componentInstance.irAPaso('firma');
    fixture.detectChanges();
    const enlace = Array.from(el.querySelectorAll('button')).find(b => b.textContent?.includes('Escriba las conclusiones (X).')) as HTMLButtonElement;
    enlace.click();
    fixture.detectChanges();
    TestBed.inject(ApplicationRef).tick();

    expect(fixture.componentInstance.paso()).toBe('conclusiones');
    const conclusiones = el.querySelector('#a22-conclusiones') as HTMLElement;
    expect(document.activeElement).toBe(conclusiones);
    expect(conclusiones.getAttribute('aria-invalid')).toBe('true');
    expect(el.querySelector('#a22-conclusiones-error')?.textContent).toContain('Escriba las conclusiones (X).');
    expect(el.querySelector('#a22-resultado')?.getAttribute('aria-invalid')).toBe('true');

    const informe = fixture.componentInstance.anexo();
    if (informe) informe.txtConclusiones = 'El PNT cumplió sus metas.';
    fixture.componentInstance.marcarSucio();
    fixture.detectChanges();
    expect(conclusiones.getAttribute('aria-invalid')).toBeNull();
  });

  it('agregar un indicador abre el modal y la fila se agrega solo al aceptar', () => {
    const { componentInstance: c } = crear();
    c.agregarFila('precios');
    expect(c.edicion()?.indice).toBeNull();
    expect(c.anexo()?.precios.length).toBe(0);

    c.aceptarIndicador({ ...filaEnEdicion(c), txtConcepto: 'Precio en chacra' });
    expect(c.edicion()).toBeNull();
    expect(c.anexo()?.precios.map(p => [p.numOrden, p.txtConcepto, p.txtOrigen])).toEqual([[1, 'Precio en chacra', 'MANUAL']]);
    expect(c.sucio()).toBe(true);
  });

  it('editar trabaja sobre una copia: cancelar no cambia la fila', () => {
    api.obtenerAnexo22.mockReturnValue(of(anexo({ precios: [{ ...nuevoIndicador(1), txtConcepto: 'Original' }] })));
    const { componentInstance: c } = crear();
    c.editarFila('precios', 0);
    filaEnEdicion(c).txtConcepto = 'Cambiado';
    c.edicion.set(null);
    expect(c.anexo()?.precios[0].txtConcepto).toBe('Original');

    c.editarFila('precios', 0);
    c.aceptarIndicador({ ...filaEnEdicion(c), txtConcepto: 'Corregido' });
    expect(c.anexo()?.precios[0].txtConcepto).toBe('Corregido');
  });

  it('quitar renumera las filas manuales', () => {
    api.obtenerAnexo22.mockReturnValue(of(anexo({ precios: [nuevoIndicador(1), nuevoIndicador(2)] })));
    const { componentInstance: c } = crear();
    c.quitarFila('precios', 0);
    expect(c.anexo()?.precios.map(p => p.numOrden)).toEqual([1]);
  });

  it('de la contrapartida solo se edita lo ejecutado; el aprobado viene del SEL', () => {
    api.obtenerAnexo22.mockReturnValue(
      of(anexo({
        financiamiento: [
          { tipFuente: 'AGROIDEAS', impAprobado: 285132, impEjecutado: 200000, txtOrigen: 'SEL_GENERAL+KOFIX' },
          { tipFuente: 'ORGANIZACION', impAprobado: 71283, impEjecutado: 0, txtOrigen: 'SEL_GENERAL+MANUAL' }
        ]
      }))
    );
    const fixture = crear();
    fixture.componentInstance.irAPaso('financiera');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('input[aria-label="Aprobado de la organización"]')).toBeNull();
    expect(el.querySelector('input[aria-label="Ejecutado de la organización"]')).not.toBeNull();
    expect(el.textContent).toContain('71,283.00');
    expect(el.textContent).toContain('SEL + UN');
  });

  it('presentar exige el informe guardado, completo y el PDF; luego avisa al expediente', () => {
    api.guardarAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, faltantes: [] })));
    api.presentarAnexo22.mockReturnValue(of({ ideCierreConvenio: 5 }));
    const { componentInstance: c } = crear();
    const cambio = jest.fn();
    c.cambio.subscribe(cambio);

    c.marcarSucio();
    c.guardar();
    expect(c.completo()).toBe(true);

    const pdf = new File(['%PDF-'], 'anexo22.pdf', { type: 'application/pdf' });
    c.archivo.set(pdf);
    c.presentar();

    expect(api.presentarAnexo22).toHaveBeenCalledWith(5, pdf);
    expect(cambio).toHaveBeenCalled();
  });

  it('firmado queda en solo lectura y ofrece derivar a la DE', () => {
    api.obtenerAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, faltantes: [], estAnexo22: 'FIRMADO' })));
    const fixture = crear();
    expect(fixture.componentInstance.firmado()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Derivar a la Dirección Ejecutiva');
    expect(fixture.nativeElement.textContent).not.toContain('Guardar informe');
  });

  it('con el plazo de la UN vencido, derivar exige la contingencia', () => {
    api.obtenerAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, faltantes: [], estAnexo22: 'FIRMADO' })));
    api.derivar.mockReturnValue(of({ ideCierreConvenio: 5, estCierre: 'DERIVADO_DE' }));
    api.obtenerRequisitosDerivacion.mockReturnValue(of(requisitos(true, true)));
    const { componentInstance: c } = crear(plazo('2026-01-01T23:59:59'));
    expect(c.plazoVencido()).toBe(true);

    c.abrirDerivar();
    c.derivar();
    expect(api.derivar).not.toHaveBeenCalled();

    c.contingencia = 'Demora en la información de KOFIX';
    c.derivar();
    expect(api.derivar).toHaveBeenCalledWith(5, 'DE', 'Demora en la información de KOFIX');
  });

  it('dentro del plazo deriva sin contingencia', () => {
    api.obtenerAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, faltantes: [], estAnexo22: 'FIRMADO' })));
    api.derivar.mockReturnValue(of({ ideCierreConvenio: 5 }));
    const { componentInstance: c } = crear(plazo('2099-12-31T23:59:59'));
    c.abrirDerivar();
    c.derivar();
    expect(api.derivar).toHaveBeenCalledWith(5, 'DE', null);
  });

  it('descarga el PDF firmado de una versión anterior', () => {
    api.listarVersionesAnexo22.mockReturnValue(of([{ numVersion: 1, codArchivo: 'x', ideUsuario: 3, fecRegistro: '2026-10-15T10:00:00' }]));
    api.descargarVersionAnexo22.mockReturnValue(of(new Blob(['%PDF-'], { type: 'application/pdf' })));
    URL.createObjectURL = jest.fn().mockReturnValue('blob:version');
    URL.revokeObjectURL = jest.fn();
    const clic = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);
    const fixture = crear();
    const boton = Array.from(fixture.nativeElement.querySelectorAll('ui-button button') as NodeListOf<HTMLButtonElement>)
      .find(b => b.textContent?.includes('PDF firmado'));
    boton?.click();

    expect(api.descargarVersionAnexo22).toHaveBeenCalledWith(5, 1);
    expect(clic).toHaveBeenCalled();
    expect(fixture.componentInstance.descargandoVersion()).toBeNull();
    clic.mockRestore();
  });

  describe('autoguardado y barra de acciones (ADR 0015, Fase 1)', () => {
    const espera = environment.evaluacion.esperaAutoguardadoMs;
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    /** Edita un texto como lo haría ngModel: sobre el objeto del formulario, y avisa. */
    function escribir(c: InformeEvaluacionComponent, texto: string) {
      const informe = c.anexo();
      if (informe) informe.txtConclusiones = texto;
      c.marcarSucio();
    }

    it('guarda el borrador solo tras la espera sin editar, sin toasts, y lo muestra en la barra', () => {
      api.guardarAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, faltantes: ['X. Conclusiones'] })));
      const fixture = crear();
      const c = fixture.componentInstance;

      escribir(c, 'Primer');
      jest.advanceTimersByTime(espera - 1);
      escribir(c, 'Primer párrafo');
      jest.advanceTimersByTime(espera - 1);
      expect(api.guardarAnexo22).not.toHaveBeenCalled();

      jest.advanceTimersByTime(1);
      expect(api.guardarAnexo22).toHaveBeenCalledTimes(1);
      expect(c.sucio()).toBe(false);
      expect(c.guardado()).toBe(true);
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.info).not.toHaveBeenCalled();
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).toContain('Guardado a las');
    });

    it('el guardado automático no pisa lo escrito (la API recorta los textos)', () => {
      api.guardarAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, txtConclusiones: 'Cumplió', faltantes: [] })));
      const { componentInstance: c } = crear();

      escribir(c, 'Cumplió ');
      jest.advanceTimersByTime(espera);

      expect(c.anexo()?.txtConclusiones).toBe('Cumplió ');
      expect(c.anexo()?.ideAnexo22).toBe(9);
      expect(c.anexo()?.faltantes).toEqual([]);
    });

    it('lo que se escribe mientras se guarda no se pierde y vuelve a guardarse', () => {
      const respuesta = new Subject<Anexo22Dto>();
      api.guardarAnexo22.mockReturnValueOnce(respuesta).mockReturnValue(of(anexo({ ideAnexo22: 9 })));
      const { componentInstance: c } = crear();

      escribir(c, 'Uno');
      c.guardar();
      escribir(c, 'Uno y dos');
      respuesta.next(anexo({ ideAnexo22: 9, txtConclusiones: 'Uno' }));
      respuesta.complete();

      expect(c.anexo()?.txtConclusiones).toBe('Uno y dos');
      expect(c.sucio()).toBe(true);
      jest.advanceTimersByTime(espera);
      expect(api.guardarAnexo22).toHaveBeenCalledTimes(2);
      expect(c.sucio()).toBe(false);
    });

    it('si el guardado automático falla, avisa en la barra y sigue con cambios pendientes', () => {
      api.guardarAnexo22.mockReturnValue(throwError(() => ({ status: 500 })));
      const fixture = crear();
      const c = fixture.componentInstance;

      escribir(c, 'Texto');
      jest.advanceTimersByTime(espera);
      fixture.detectChanges();

      expect(c.errorAutoguardado()).toBe(true);
      expect(c.sucio()).toBe(true);
      expect(toast.error).not.toHaveBeenCalled();
      expect(fixture.nativeElement.textContent).toContain('No se pudo guardar automáticamente');
    });

    it('firmado no se guarda solo', () => {
      api.obtenerAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, estAnexo22: 'FIRMADO', faltantes: [] })));
      const { componentInstance: c } = crear();

      c.marcarSucio();
      jest.advanceTimersByTime(espera);

      expect(api.guardarAnexo22).not.toHaveBeenCalled();
    });

    it('avisa de los cambios pendientes al salir hasta que se guardan, y deja de hacerlo al destruirse', () => {
      api.guardarAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9 })));
      const fixture = crear();
      const cambios = TestBed.inject(CambiosPendientesService);

      escribir(fixture.componentInstance, 'Texto');
      expect(cambios.hayCambios()).toBe(true);
      jest.advanceTimersByTime(espera);
      expect(cambios.hayCambios()).toBe(false);

      escribir(fixture.componentInstance, 'Otro texto');
      fixture.destroy();
      expect(cambios.hayCambios()).toBe(false);
      jest.advanceTimersByTime(espera);
      expect(api.guardarAnexo22).toHaveBeenCalledTimes(1);
    });

    it('el avance cuenta los requisitos completos', () => {
      const { componentInstance: c } = crear();
      const total = c.avance().total;
      expect(c.avance().cumplidos).toBe(1); // solo la ejecución de AGROIDEAS (4.1), que viene de KOFIX

      escribir(c, 'El PNT cumplió sus metas.');
      expect(c.avance()).toEqual({ cumplidos: 2, total });
    });
  });

  describe('pasos del formulario (ADR 0015, Fase 2)', () => {
    const titulos = (el: HTMLElement) => Array.from(el.querySelectorAll('h5')).map(h => h.textContent?.trim());

    it('muestra solo el paso activo, con el avance de cada uno, y se recorre con Siguiente y Anterior', () => {
      const fixture = crear();
      const c = fixture.componentInstance;
      const el: HTMLElement = fixture.nativeElement;

      expect(titulos(el)).toContain('II. Análisis de indicadores de resultados');
      expect(titulos(el)).toContain('VI. Práctica ambiental');
      expect(titulos(el)).not.toContain('IV. Ejecución financiera');
      expect(c.pasosStepper().map(p => [p.key, p.status, p.subtitle])).toEqual([
        ['indicadores', 'current', 'II, III y VI · 0 de 5'],
        ['financiera', 'pending', 'IV · 1 de 3'],
        ['conclusiones', 'pending', 'VII a XI · 0 de 5'],
        ['firma', 'pending', 'Con el informe completo']
      ]);

      expect(c.pasoAnterior()).toBeNull();
      c.moverPaso(1);
      fixture.detectChanges();
      expect(titulos(el)).toContain('IV. Ejecución financiera');
      expect(titulos(el)).not.toContain('II. Análisis de indicadores de resultados');
      expect(c.pasoAnterior()).toBe('indicadores');
    });

    it('en las conclusiones, el resultado va primero', () => {
      const fixture = crear();
      fixture.componentInstance.irAPaso('conclusiones');
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const resultado = el.querySelector('#a22-resultado') as HTMLElement;
      const logros = el.querySelector('#a22-logros') as HTMLElement;
      expect(resultado.compareDocumentPosition(logros) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('recuerda el último paso de cada expediente', () => {
      crear().componentInstance.irAPaso('conclusiones');
      TestBed.resetTestingModule();

      expect(crear().componentInstance.paso()).toBe('conclusiones');
    });

    it('firmado se lee de corrido, sin pasos', () => {
      api.obtenerAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, faltantes: [], estAnexo22: 'FIRMADO' })));
      const el: HTMLElement = crear().nativeElement;

      expect(el.querySelector('ui-stepper')).toBeNull();
      expect(titulos(el)).toEqual(expect.arrayContaining([
        'II. Análisis de indicadores de resultados', 'IV. Ejecución financiera', 'VI. Práctica ambiental', 'VII a XI. Conclusiones de la evaluación'
      ]));
    });
  });

  describe('panel de consulta y 4.2 plegada (ADR 0015, Fase 3)', () => {
    it('al editar, la I y la V van plegadas en "Datos del convenio"; centro poblado y adenda se leen del SEL, sin editarse', () => {
      const fixture = crear();
      const el: HTMLElement = fixture.nativeElement;
      const panel = Array.from(el.querySelectorAll('button[aria-expanded]')).find(b => b.textContent?.includes('Datos del convenio')) as HTMLButtonElement;
      const titulos = () => Array.from(el.querySelectorAll('h5')).map(h => h.textContent?.trim());

      expect(titulos()).not.toContain('I. Información general');
      expect(panel.textContent).toContain('Cooperativa Bio Coffee Perú');
      panel.click();
      fixture.detectChanges();
      expect(titulos()).toEqual(expect.arrayContaining(['I. Información general', 'V. Reporte final de monitoreo (RTF por paso crítico)']));
      expect(el.textContent).toContain('No registrado en el SEL');
      expect(el.textContent).toContain('Sin adenda de plazo en el SEL');

      fixture.componentInstance.irAPaso('conclusiones');
      fixture.detectChanges();
      expect(el.querySelector('#a22-centro-poblado')).toBeNull();
      expect(el.querySelector('#a22-adenda')).toBeNull();
    });

    it('la 4.2 muestra sus totales y el detalle se abre a pedido', () => {
      api.obtenerAnexo22.mockReturnValue(of(anexo({
        bienes: [
          { numOrden: 1, txtDescripcion: 'Secador solar', txtUnidadMedida: 'Unidad', canProgramada: 12, impProgramado: 60000, canEjecutada: 10, impEjecutado: 50000, ideItemSel: 256, txtOrigen: 'SEL_GENERAL+KOFIX' }
        ]
      })));
      const fixture = crear();
      fixture.componentInstance.irAPaso('financiera');
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;

      expect(el.textContent).toContain('Bienes (1)');
      expect(el.textContent).toContain('ejecutado S/ 50,000.00 de 60,000.00');
      expect(el.textContent).not.toContain('Secador solar');
      const detalle = Array.from(el.querySelectorAll('button[aria-expanded]')).find(b => b.textContent?.includes('Ver el detalle')) as HTMLButtonElement;
      detalle.click();
      fixture.detectChanges();
      expect(el.textContent).toContain('Secador solar');
    });

    it('firmado muestra la I, la V y la 4.2 completas, sin plegar', () => {
      api.obtenerAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, faltantes: [], estAnexo22: 'FIRMADO' })));
      const el: HTMLElement = crear().nativeElement;
      expect(el.textContent).toContain('I. Información general');
      expect(el.textContent).toContain('V. Reporte final de monitoreo');
      expect(el.textContent).toContain('Sin bienes programados.');
      expect(el.textContent).not.toContain('Datos del convenio');
    });

    it('una sección sin indicadores ocupa una línea y deja agregarlos (información constatada en campo)', () => {
      const fixture = crear();
      const el: HTMLElement = fixture.nativeElement;
      const precios = Array.from(el.querySelectorAll('.border-dashed')).find(b => b.textContent?.includes('Sin indicadores de precios.')) as HTMLElement;

      expect(precios.textContent).toContain('verificación de campo');
      expect(el.querySelectorAll('app-tabla-indicadores').length).toBe(0);
      const agregar = precios.querySelector('ui-button button') as HTMLButtonElement;
      expect(agregar.textContent).toContain('Agregar indicador');
      agregar.click();
      expect(fixture.componentInstance.edicion()?.seccion).toBe('precios');

      const sinAgregar = Array.from(el.querySelectorAll('.border-dashed')).find(b => b.textContent?.includes('El SEL no registra indicadores de producción.')) as HTMLElement;
      expect(sinAgregar.querySelector('ui-button')).toBeNull();
    });
  });

  describe('ayuda en los textos (ADR 0015, Fase 4)', () => {
    it('cada texto dice qué se espera, crece, cuenta los caracteres y no pasa del límite de la API', () => {
      const fixture = crear();
      fixture.componentInstance.irAPaso('conclusiones');
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const conclusiones = el.querySelector('#a22-conclusiones') as HTMLTextAreaElement;

      expect(el.querySelector('#a22-conclusiones-ayuda')?.textContent).toContain('coherente con el resultado');
      expect(conclusiones.getAttribute('aria-describedby')).toBe('a22-conclusiones-ayuda');
      expect(conclusiones.hasAttribute('appcrecer')).toBe(true);
      expect(conclusiones.getAttribute('maxlength')).toBe(String(environment.evaluacion.longitudTexto));
      expect(conclusiones.closest('.form-field')?.textContent).toContain('0 / 8,000');

      fixture.componentInstance.validacion.mostrar.set(true);
      fixture.detectChanges();
      expect(conclusiones.getAttribute('aria-describedby')).toBe('a22-conclusiones-ayuda a22-conclusiones-error');
    });

    it('firmado no muestra ayudas ni contadores', () => {
      api.obtenerAnexo22.mockReturnValue(of(anexo({ ideAnexo22: 9, faltantes: [], estAnexo22: 'FIRMADO' })));
      const el: HTMLElement = crear().nativeElement;
      expect(el.querySelector('#a22-conclusiones-ayuda')).toBeNull();
      expect(el.textContent).not.toContain('/ 8,000');
    });
  });
});
