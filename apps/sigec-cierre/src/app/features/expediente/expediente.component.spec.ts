import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ToastService } from '@agroideas/ui';
import { ExpedienteComponent } from './expediente.component';
import { CierreApiService } from '../../core/services/cierre-api.service';
import { AuthService } from '../../core/services/auth.service';
import { CierreDetalleDto } from '../../core/models/cierre.model';
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
    descargarDocumento: jest.fn()
  };
  const toast = { error: jest.fn() };

  function crear(roles: CierreRol[] = ['UN']) {
    TestBed.configureTestingModule({
      imports: [ExpedienteComponent],
      providers: [
        provideRouter([]),
        { provide: CierreApiService, useValue: api },
        { provide: ToastService, useValue: toast },
        { provide: AuthService, useValue: { roles: () => roles } }
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
});
