import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NEVER, of, throwError } from 'rxjs';
import { ToastService } from '@agroideas/ui';
import { ExpedienteComponent } from './expediente.component';
import { CierreApiService } from '../../core/services/cierre-api.service';
import { AuthService } from '../../core/services/auth.service';
import { CierreDetalleDto } from '../../core/models/cierre.model';
import { PlazoDto } from '../../core/models/plazo.model';
import { CierreRol } from '../../core/models/rol-cierre.model';

const detalle: CierreDetalleDto = {
  ideCierreConvenio: 12,
  ideConvenio: 43829,
  estCierre: 'EN_EVALUACION_UN',
  fecInicio: '2026-10-01T10:00:00',
  fecDerivacionDE: null,
  txtContingencia: null,
  fecDerivacionUAJ: null,
  fecCierreFormal: null,
  txtNumeroConvenio: '0051-2026',
  fecFirmaConvenio: null,
  txtOrganizacion: 'Asociación Wishlaj Marca',
  codUbigeo: '020101',
  fecFinVigencia: '2026-09-30T00:00:00',
  idePasoCriticoUltimo: 6,
  ideRtfUltimo: 30007,
  fecPresentacionUltimoRtf: '2026-10-01T09:00:00',
  fecRecepcionAnexo20: '2026-10-01T09:00:00',
  flgDeOficio: false,
  tipOrigen: 'EVENTO_RTF',
  fecVerificacionCampo: '2026-10-10T10:00:00',
  fecRemisionProyectoRde: null,
  txtNumeroRde: null,
  fecEmisionRde: null,
  ideUsuarioCierre: null,
  flgSelSincronizado: null,
  fecSelSincronizado: null,
  canIntentosSel: 0,
  txtErrorSel: null,
  documentos: [
    { ideDocumento: 1, ideCierreConvenio: 12, tipDocumento: 'ANEXO_20', codArchivo: 'a', txtNombreArchivo: 'anexo20.pdf', ideUsuario: 1, fecRegistro: '2026-10-01T09:00:00' }
  ]
};

describe('ExpedienteComponent', () => {
  const api = {
    obtener: jest.fn(),
    listarPlazos: jest.fn(),
    listarAuditorias: jest.fn(),
    listarEnvios: jest.fn(),
    descargarDocumento: jest.fn(),
    // El acta (Fase 2) se prueba en su propio spec; aquí basta con que no responda.
    obtenerAnexo21: jest.fn().mockReturnValue(NEVER),
    // Lo mismo para el Anexo 22 (Fase 3).
    obtenerAnexo22: jest.fn().mockReturnValue(NEVER),
    listarVersionesAnexo22: jest.fn().mockReturnValue(NEVER),
    obtenerRequisitosDerivacion: jest.fn().mockReturnValue(NEVER),
    listarObservaciones: jest.fn().mockReturnValue(of([])),
    obtenerAnexo20: jest.fn().mockReturnValue(NEVER)
  };
  const toast = { error: jest.fn() };

  function crear(roles: CierreRol[] = ['UN']) {
    TestBed.configureTestingModule({
      imports: [ExpedienteComponent],
      providers: [
        provideRouter([]),
        { provide: CierreApiService, useValue: api },
        { provide: ToastService, useValue: toast },
        { provide: AuthService, useValue: { roles: () => roles, user: () => ({ nombre: 'Rosa Quispe' }) } }
      ]
    });
    const fixture = TestBed.createComponent(ExpedienteComponent);
    fixture.componentRef.setInput('id', '12');
    fixture.detectChanges();
    // El effect que carga el expediente corre en el primer ciclo; el segundo pinta lo cargado.
    fixture.detectChanges();
    return fixture;
  }

  beforeEach(() => {
    jest.clearAllMocks();
    api.obtener.mockReturnValue(of(detalle));
    api.listarPlazos.mockReturnValue(
      of([{ idePlazo: 1, ideCierreConvenio: 12, tipPlazo: 'EVALUACION_UN', fecInicio: '2026-10-01T00:00:00', canDias: 90, fecLimite: '2026-12-30T23:59:59', codDepartamento: null, codProvincia: null, estPlazo: 'VIGENTE', fecCierre: null, txtContingencia: null, fecRegistro: '2026-10-01T00:00:00' }])
    );
  });

  it('carga el detalle y los plazos del id de la ruta y arma las seis etapas', () => {
    const fixture = crear();
    const c = fixture.componentInstance;

    expect(api.obtener).toHaveBeenCalledWith(12);
    expect(api.listarPlazos).toHaveBeenCalledWith(12);
    expect(c.etapas().map(e => e.situacion)).toEqual(['completada', 'completada', 'activa', 'pendiente', 'pendiente', 'pendiente']);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Convenio 0051-2026');
    expect(texto).toContain('En evaluación de la UN');
    expect(texto).toContain('Informe de Cierre del PNT (Anexo 20)');
  });

  it('como página muestra "Volver a la bandeja" aunque el router pase la entrada en undefined', () => {
    const fixture = crear();
    fixture.componentRef.setInput('mostrarVolver', undefined);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Volver a la bandeja');

    fixture.componentRef.setInput('mostrarVolver', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Volver a la bandeja');
  });

  it('muestra el mensaje de la API si no puede cargar el expediente', () => {
    api.obtener.mockReturnValue(throwError(() => ({ error: { mensaje: 'CIE_3001:No tiene acceso a este expediente.' } })));
    const fixture = crear(['OA']);
    expect(fixture.componentInstance.error()).toBe('No tiene acceso a este expediente.');
    expect(fixture.nativeElement.textContent).toContain('No tiene acceso a este expediente.');
  });

  it('carga la bitácora solo al abrir su pestaña, y una sola vez', () => {
    api.listarAuditorias.mockReturnValue(of([]));
    const { componentInstance: c } = crear();

    expect(api.listarAuditorias).not.toHaveBeenCalled();
    c.cambiarPestana('bitacora');
    c.cambiarPestana('documentos');
    c.cambiarPestana('bitacora');
    expect(api.listarAuditorias).toHaveBeenCalledTimes(1);
  });

  it('la pestaña de correos enviados es solo para el personal (la API responde 403 a la OA)', () => {
    const personal = crear(['UN']);
    expect(personal.nativeElement.textContent).toContain('Correos enviados');
    TestBed.resetTestingModule();
    const oa = crear(['OA']);
    expect(oa.nativeElement.textContent).not.toContain('Correos enviados');
  });

  it('abre el documento en el visor con una URL local del Blob', () => {
    const crearUrl = jest.fn().mockReturnValue('blob:local/1');
    Object.assign(URL, { createObjectURL: crearUrl, revokeObjectURL: jest.fn() });
    api.descargarDocumento.mockReturnValue(of(new Blob(['%PDF-'], { type: 'application/pdf' })));
    const { componentInstance: c } = crear();

    c.verDocumento(detalle.documentos[0]);

    expect(api.descargarDocumento).toHaveBeenCalledWith(12, 'ANEXO_20');
    expect(c.visor()).toEqual({ abierto: true, nombre: 'anexo20.pdf', url: 'blob:local/1' });
  });

  it('en EN_VERIFICACION muestra el acta a la UR, pero no a la DE', () => {
    api.obtener.mockReturnValue(of({ ...detalle, estCierre: 'EN_VERIFICACION' }));
    const ur = crear(['UR']);
    expect(ur.nativeElement.querySelector('app-acta-cierre')).not.toBeNull();
    TestBed.resetTestingModule();
    api.obtener.mockReturnValue(of({ ...detalle, estCierre: 'EN_VERIFICACION' }));
    const de = crear(['DE']);
    expect(de.nativeElement.querySelector('app-acta-cierre')).toBeNull();
  });

  it('en EN_EVALUACION_UN muestra el Informe de Evaluación a la UN, pero no a la UR', () => {
    expect(crear(['UN']).nativeElement.querySelector('app-informe-evaluacion')).not.toBeNull();
    TestBed.resetTestingModule();
    expect(crear(['UR']).nativeElement.querySelector('app-informe-evaluacion')).toBeNull();
  });

  it.each<[string, CierreRol, string]>([
    ['DERIVADO_DE', 'DE', 'app-traslado-uaj'],
    ['EN_REVISION_UAJ', 'UAJ', 'app-revision-uaj'],
    ['OBSERVADO_UAJ', 'UN', 'app-subsanacion'],
    ['PROYECTO_RDE_REMITIDO', 'DE', 'app-suscripcion-rde'],
    ['CERRADO', 'DE', 'app-cargo-notificacion']
  ])('en %s muestra a %s su acción (%s) y a la OA ninguna', (estado, rol, selector) => {
    api.obtener.mockReturnValue(of({ ...detalle, estCierre: estado }));
    expect(crear([rol]).nativeElement.querySelector(selector)).not.toBeNull();
    TestBed.resetTestingModule();
    api.obtener.mockReturnValue(of({ ...detalle, estCierre: estado }));
    expect(crear(['OA']).nativeElement.querySelector(selector)).toBeNull();
  });

  it('cerrado sin sincronizar, ofrece a la DE reintentar el estado 77', () => {
    api.obtener.mockReturnValue(of({ ...detalle, estCierre: 'CERRADO', flgSelSincronizado: false, canIntentosSel: 2 }));
    expect(crear(['DE']).componentInstance.puedeReintentarSel()).toBe(true);
    TestBed.resetTestingModule();
    api.obtener.mockReturnValue(of({ ...detalle, estCierre: 'CERRADO', flgSelSincronizado: false, canIntentosSel: 2 }));
    expect(crear(['UN']).componentInstance.puedeReintentarSel()).toBe(false);
  });

  it('con observaciones de la UAJ muestra la pestaña con el historial por ronda', () => {
    api.listarObservaciones.mockReturnValue(of([
      { ideObservacion: 1, ideCierreConvenio: 12, numRonda: 1, numOrden: 1, txtObservacion: 'Falta el acta', ideUsuario: 1,
        fecRegistro: '2026-10-20T10:00:00', txtRespuesta: 'Se adjuntó', ideUsuarioRespuesta: 2, fecRespuesta: '2026-10-21T10:00:00' }
    ]));
    const fixture = crear(['UN']);
    const pestana = [...fixture.nativeElement.querySelectorAll('[role="tab"]')].find((t: HTMLElement) => t.textContent?.includes('Observaciones UAJ'));
    expect(pestana?.textContent).toContain('1');
    fixture.componentInstance.cambiarPestana('observaciones');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Se adjuntó');
  });

  it('en ESPERA_ANEXO20 la UN puede presentar el Anexo 20 y la OA solo ve la indicación', () => {
    api.obtener.mockReturnValue(of({ ...detalle, estCierre: 'ESPERA_ANEXO20' }));
    expect(crear(['UN']).nativeElement.querySelector('app-presentacion-anexo20')).not.toBeNull();
    TestBed.resetTestingModule();
    api.obtener.mockReturnValue(of({ ...detalle, estCierre: 'ESPERA_ANEXO20' }));
    const oa = crear(['OA']).nativeElement as HTMLElement;
    expect(oa.querySelector('app-presentacion-anexo20')).toBeNull();
    expect(oa.textContent).toContain('entregue el PDF');
  });

  it('un plazo que aún no empieza muestra desde cuándo corre, no un anillo lleno', () => {
    const c = crear(['UN']).componentInstance;
    const futuro = new Date(Date.now() + 400 * 86_400_000).toISOString();
    const plazo = { canDias: 30, fecInicio: futuro, fecLimite: new Date(Date.now() + 430 * 86_400_000).toISOString() } as PlazoDto;
    expect(c.aunNoCorre(plazo)).toBe(true);
    expect(c.aunNoCorre({ ...plazo, fecLimite: new Date(Date.now() + 10 * 86_400_000).toISOString() })).toBe(false);
  });
});

