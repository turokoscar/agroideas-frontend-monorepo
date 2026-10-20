import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ToastService } from '@agroideas/ui';
import { Anexo20CierreComponent } from './anexo20-cierre.component';
import { CierreService } from '../../../core/services/cierre.service';
import { RtfService } from '../../../core/services/rtf.service';
import { Anexo20Dto } from '../../../core/models';

function anexo(extra: Partial<Anexo20Dto> = {}): Anexo20Dto {
  return {
    ideAnexo20: 0,
    ideConvenio: 2388,
    ideCierreConvenio: null,
    estAnexo20: 'BORRADOR',
    canSociosTotal: 40,
    numAnexo20: null,
    fecRegistro: '2026-10-20T00:00:00',
    fecModificacion: '2026-10-20T00:00:00',
    faltantes: ['I. Financiamiento OA', 'IV. Metas (al menos una)'],
    txtOrganizacion: 'Cooperativa Bio Coffee Perú',
    txtPlanNegocio: 'Mejora de la calidad del café',
    txtRegion: 'Junín',
    txtProvincia: 'Chanchamayo',
    txtDistrito: 'Perené',
    txtCentroPoblado: null,
    txtNumeroConvenio: '319',
    fecInicioConvenio: '2023-04-03T00:00:00',
    fecFinConvenio: '2026-04-03T00:00:00',
    fecTerminoAdenda: null,
    impFinanciamientoAgroideas: 350000,
    impFinanciamientoOa: null,
    txtCadenaProductiva: 'Café',
    canSociasMujeres: 15,
    canSociosHombres: 25,
    numHectareas: 120,
    problematica: [],
    txtObjetivoGeneral: 'Mejorar la productividad',
    txtObjetivosEspecificos: '1. Renovar cafetales',
    metas: [],
    comercializacion: [],
    txtComentariosComercial: null,
    txtPracticaAmbiental: null,
    ...extra
  };
}

describe('Anexo20CierreComponent', () => {
  const cierre = {
    obtenerAnexo20: jest.fn(), guardarAnexo20: jest.fn(), descargarAnexo20: jest.fn(), obtenerExpediente: jest.fn(), listarPlazos: jest.fn()
  };
  const rtfService = { uploadEvidencia: jest.fn() };
  const toast = { success: jest.fn(), info: jest.fn(), error: jest.fn() };

  function crear(entradas: { rtfId?: number | null; editable?: boolean } = {}) {
    TestBed.configureTestingModule({
      imports: [Anexo20CierreComponent],
      providers: [
        { provide: CierreService, useValue: cierre },
        { provide: RtfService, useValue: rtfService },
        { provide: ToastService, useValue: toast }
      ]
    });
    const fixture = TestBed.createComponent(Anexo20CierreComponent);
    fixture.componentRef.setInput('ideConvenio', 2388);
    fixture.componentRef.setInput('rtfId', entradas.rtfId === undefined ? 30003 : entradas.rtfId);
    fixture.componentRef.setInput('editable', entradas.editable ?? true);
    fixture.detectChanges();
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    cierre.obtenerAnexo20.mockReturnValue(of(anexo()));
    cierre.obtenerExpediente.mockReturnValue(of(null));
    cierre.listarPlazos.mockReturnValue(of([]));
  });

  it('carga la propuesta precargada del SEL y lista lo que falta', () => {
    const fixture = crear();
    expect(cierre.obtenerAnexo20).toHaveBeenCalledWith(2388);
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Cooperativa Bio Coffee Perú');
    expect(texto).toContain('IV. Metas (al menos una)');
    expect(fixture.componentInstance.completo()).toBe(false);
  });

  it('agregar una meta marca el formulario con cambios y numera las filas', () => {
    const { componentInstance: c } = crear();
    c.agregarMeta();
    c.agregarMeta();
    c.quitarMeta(0);
    expect(c.anexo()?.metas.map(m => m.numOrden)).toEqual([1]);
    expect(c.sucio()).toBe(true);
  });

  it('al guardar completo queda listo para descargar', () => {
    const guardado = anexo({ ideAnexo20: 15, faltantes: [], numAnexo20: '0015-2026' });
    cierre.guardarAnexo20.mockReturnValue(of(guardado));
    const { componentInstance: c } = crear();

    c.marcarSucio();
    c.guardar();

    expect(cierre.guardarAnexo20).toHaveBeenCalledWith(2388, expect.objectContaining({ ideConvenio: 2388 }));
    expect(c.completo()).toBe(true);
    expect(toast.success).toHaveBeenCalled();
  });

  it('con cambios sin guardar no se puede descargar', () => {
    cierre.obtenerAnexo20.mockReturnValue(of(anexo({ ideAnexo20: 15, faltantes: [] })));
    const { componentInstance: c } = crear();
    expect(c.completo()).toBe(true);
    c.marcarSucio();
    expect(c.completo()).toBe(false);
  });

  it('adjunta el PDF firmado como evidencia INFORME_CIERRE_PNT del RTF', () => {
    rtfService.uploadEvidencia.mockReturnValue(of({}));
    const fixture = crear();
    const c = fixture.componentInstance;
    const emitido = jest.fn();
    c.adjuntado.subscribe(emitido);

    const pdf = new File(['%PDF-'], 'anexo20-firmado.pdf', { type: 'application/pdf' });
    c.seleccionarArchivo({ target: { files: [pdf], value: 'x' } } as unknown as Event);
    c.adjuntar();

    expect(rtfService.uploadEvidencia).toHaveBeenCalledWith(30003, 0, 'INFORME_CIERRE_PNT', pdf);
    expect(emitido).toHaveBeenCalled();
  });

  it('rechaza archivos que no son PDF', () => {
    const { componentInstance: c } = crear();
    c.seleccionarArchivo({ target: { files: [new File(['x'], 'foto.jpg', { type: 'image/jpeg' })], value: 'x' } } as unknown as Event);
    expect(c.archivo()).toBeNull();
    expect(toast.error).toHaveBeenCalledWith('Formato no permitido', expect.any(String));
  });

  it('si el módulo de Cierre no responde, muestra el error sin bloquear el RTF', () => {
    cierre.obtenerAnexo20.mockReturnValue(throwError(() => ({ status: 0 })));
    const fixture = crear();
    expect(fixture.componentInstance.error()).toContain('No se pudo cargar el Anexo 20');
    expect(fixture.nativeElement.textContent).toContain('Puede seguir registrando el RTF');
  });

  it('presentado o con el RTF no editable queda en solo lectura', () => {
    cierre.obtenerAnexo20.mockReturnValue(of(anexo({ estAnexo20: 'PRESENTADO' })));
    expect(crear().componentInstance.soloLectura()).toBe(true);
    TestBed.resetTestingModule();
    cierre.obtenerAnexo20.mockReturnValue(of(anexo()));
    expect(crear({ editable: false }).componentInstance.soloLectura()).toBe(true);
  });

  it('la contrapartida que viene del SEL no se edita; si el SEL no la tiene, la escribe la OA', () => {
    cierre.obtenerAnexo20.mockReturnValue(of(anexo({ impFinanciamientoOa: 71283 })));
    expect(crear().componentInstance.contrapartidaDelSel()).toBe(true);
    TestBed.resetTestingModule();
    cierre.obtenerAnexo20.mockReturnValue(of(anexo()));
    expect(crear().componentInstance.contrapartidaDelSel()).toBe(false);
  });

  it('RTF enviado sin el Anexo 20: el formulario sigue editable y el PDF firmado se entrega a la UN', () => {
    cierre.obtenerExpediente.mockReturnValue(of({
      ideCierreConvenio: 8, ideConvenio: 2388, estCierre: 'ESPERA_ANEXO20', fecInicio: '2026-10-01T00:00:00', flgDeOficio: false, fecRecepcionAnexo20: null
    }));
    cierre.listarPlazos.mockReturnValue(of([
      { idePlazo: 1, tipPlazo: 'ANEXO20', canDias: 30, fecLimite: '2026-11-15T23:59:59', estPlazo: 'VIGENTE' }
    ]));
    const fixture = crear({ editable: false });
    const c = fixture.componentInstance;

    expect(cierre.listarPlazos).toHaveBeenCalledWith(8);
    expect(c.entregaALaUn()).toBe(true);
    expect(c.soloLectura()).toBe(false);
    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('15/11/2026');
    expect(texto).toContain('Entregar el PDF firmado a la UN');
    expect(fixture.nativeElement.querySelector('input[type="file"]')).toBeNull();
  });

  it('sin expediente en espera, con el RTF enviado sigue en solo lectura', () => {
    cierre.obtenerExpediente.mockReturnValue(of({
      ideCierreConvenio: 8, ideConvenio: 2388, estCierre: 'EN_VERIFICACION', fecInicio: '2026-10-01T00:00:00', flgDeOficio: false, fecRecepcionAnexo20: null
    }));
    const c = crear({ editable: false }).componentInstance;
    expect(c.entregaALaUn()).toBe(false);
    expect(c.soloLectura()).toBe(true);
    expect(cierre.listarPlazos).not.toHaveBeenCalled();
  });
});

