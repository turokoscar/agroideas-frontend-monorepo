import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { mensajeParaUsuario } from '@agroideas/utils';
import { CierreApiService } from './cierre-api.service';
import { ExpedientePendienteDto } from '../models/cierre.model';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

function pendiente(ideCierreConvenio: number): ExpedientePendienteDto {
  return {
    ideCierreConvenio,
    ideConvenio: 1000 + ideCierreConvenio,
    estCierre: 'EN_VERIFICACION',
    fecInicio: '2026-10-01T00:00:00',
    txtNumeroConvenio: null,
    txtOrganizacion: null,
    flgDeOficio: false,
    flgSelSincronizado: null,
    tipPlazo: null,
    fecLimitePlazo: null,
    numDiasRestantes: null,
    tipSemaforo: 'SIN_PLAZO',
    acciones: ['RegistrarVerificacionCampo']
  };
}

describe('CierreApiService', () => {
  let service: CierreApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CierreApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('desenvuelve el sobre MIDAGRI', () => {
    let total: number | undefined;
    service.listar({ estado: 'CERRADO', ideConvenio: 43829, pagina: 2, cantidad: 10 }).subscribe(d => (total = d.total));

    const req = http.expectOne(r => r.url === `${API}/cierres`);
    expect(req.request.params.get('estado')).toBe('CERRADO');
    expect(req.request.params.get('ideConvenio')).toBe('43829');
    expect(req.request.params.get('pagina')).toBe('2');
    expect(req.request.params.get('cantidad')).toBe('10');
    req.flush({ respuesta: 'OK', mensaje: '', datos: { total: 3, items: [] } });

    expect(total).toBe(3);
  });

  it('omite los filtros vacíos', () => {
    service.listar().subscribe();
    const req = http.expectOne(r => r.url === `${API}/cierres`);
    expect(req.request.params.has('estado')).toBe(false);
    expect(req.request.params.has('ideConvenio')).toBe(false);
    req.flush({ respuesta: 'OK', mensaje: '', datos: { total: 0, items: [] } });
  });

  it('relanza un sobre ERROR con la forma que lee mensajeParaUsuario', () => {
    let mensaje = '';
    service.obtener(9).subscribe({ error: e => (mensaje = mensajeParaUsuario(e, 'por defecto')) });
    http.expectOne(`${API}/cierres/9`).flush({ respuesta: 'ERROR', mensaje: 'CIE_3001:No tiene acceso al expediente.', datos: null });
    expect(mensaje).toBe('No tiene acceso al expediente.');
  });

  it('los errores HTTP de la API llegan con su mensaje sin el código', () => {
    let mensaje = '';
    service.iniciar(43829).subscribe({ error: e => (mensaje = mensajeParaUsuario(e, 'por defecto')) });
    const req = http.expectOne(`${API}/cierres`);
    expect(req.request.body).toEqual({ ideConvenio: 43829 });
    req.flush({ respuesta: 'ERROR', mensaje: 'CIE_2003:Aún no corresponde abrir el expediente.', datos: null }, { status: 409, statusText: 'Conflict' });
    expect(mensaje).toBe('Aún no corresponde abrir el expediente.');
  });

  describe('listarTodosLosPendientes', () => {
    it('con una sola página hace una sola petición', () => {
      let items: ExpedientePendienteDto[] = [];
      service.listarTodosLosPendientes().subscribe(r => (items = r));

      const req = http.expectOne(r => r.url === `${API}/cierres/pendientes`);
      expect(req.request.params.get('cantidad')).toBe(String(environment.paginacion.cantidadMaxima));
      req.flush({ respuesta: 'OK', mensaje: '', datos: { total: 2, items: [pendiente(1), pendiente(2)] } });

      expect(items.map(i => i.ideCierreConvenio)).toEqual([1, 2]);
    });

    it('si el total supera una página, trae el resto para que los contadores sean exactos', () => {
      let items: ExpedientePendienteDto[] = [];
      service.listarTodosLosPendientes().subscribe(r => (items = r));

      http
        .expectOne(r => r.url === `${API}/cierres/pendientes` && r.params.get('pagina') === '1')
        .flush({ respuesta: 'OK', mensaje: '', datos: { total: 2 * environment.paginacion.cantidadMaxima + 5, items: [pendiente(1)] } });
      http
        .expectOne(r => r.params.get('pagina') === '2')
        .flush({ respuesta: 'OK', mensaje: '', datos: { total: 2 * environment.paginacion.cantidadMaxima + 5, items: [pendiente(2)] } });
      http
        .expectOne(r => r.params.get('pagina') === '3')
        .flush({ respuesta: 'OK', mensaje: '', datos: { total: 2 * environment.paginacion.cantidadMaxima + 5, items: [pendiente(3)] } });

      expect(items.map(i => i.ideCierreConvenio)).toEqual([1, 2, 3]);
    });
  });

  it('descarga el documento como Blob', () => {
    let tipo = '';
    service.descargarDocumento(5, 'ANEXO_20').subscribe(b => (tipo = b.type));
    const req = http.expectOne(`${API}/cierres/5/documentos/ANEXO_20`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF-'], { type: 'application/pdf' }));
    expect(tipo).toBe('application/pdf');
  });

  it('registra la verificación con el acta en multipart (campo "archivo")', () => {
    const acta = new File(['%PDF-'], 'acta.pdf', { type: 'application/pdf' });
    service.registrarVerificacion(5, acta).subscribe();
    const req = http.expectOne(`${API}/cierres/5/verificaciones`);
    expect(req.request.method).toBe('POST');
    expect((req.request.body as FormData).get('archivo')).toBe(acta);
    req.flush({ respuesta: 'OK', mensaje: '', datos: { ideCierreConvenio: 5, estCierre: 'EN_EVALUACION_UN' } });
  });

  it('el error de un PDF (que llega como Blob) se puede mostrar con su mensaje', async () => {
    const error = new Promise<unknown>(resolve => service.descargarAnexo21(5).subscribe({ error: resolve }));
    const sobre = { respuesta: 'ERROR', mensaje: 'CIE_3001:No tiene acceso al expediente.', datos: null };
    http
      .expectOne(`${API}/cierres/5/anexos21/documento`)
      .flush(new Blob([JSON.stringify(sobre)], { type: 'application/json' }), { status: 403, statusText: 'Forbidden' });
    expect(mensajeParaUsuario(await error, 'por defecto')).toBe('No tiene acceso al expediente.');
  });

  it('presenta el Anexo 22 firmado en multipart y deriva con destino y contingencia', () => {
    const pdf = new File(['%PDF-'], 'a22.pdf', { type: 'application/pdf' });
    service.presentarAnexo22(5, pdf).subscribe();
    const presentar = http.expectOne(`${API}/cierres/5/anexos22`);
    expect(presentar.request.method).toBe('POST');
    expect((presentar.request.body as FormData).get('archivo')).toBe(pdf);
    presentar.flush({ respuesta: 'OK', mensaje: '', datos: {} });

    service.derivar(5, 'DE', 'Contingencia').subscribe();
    const derivar = http.expectOne(`${API}/cierres/5/derivaciones`);
    expect(derivar.request.body).toEqual({ destino: 'DE', txtContingencia: 'Contingencia' });
    derivar.flush({ respuesta: 'OK', mensaje: '', datos: {} });
  });

  it('Fase 4: observar, subsanar, remitir el proyecto, suscribir la RDE y registrar el cargo', () => {
    service.observar(6, ['Obs 1']).subscribe();
    expect(http.expectOne(`${API}/cierres/6/observaciones`).request.body).toEqual({ observaciones: ['Obs 1'] });

    service.subsanar(6, [{ ideObservacion: 9, txtRespuesta: 'Listo' }]).subscribe();
    expect(http.expectOne(`${API}/cierres/6/subsanaciones`).request.body).toEqual({ respuestas: [{ ideObservacion: 9, txtRespuesta: 'Listo' }] });

    const informe = new File(['%PDF-'], 'il.pdf', { type: 'application/pdf' });
    const proyecto = new File(['%PDF-'], 'prde.pdf', { type: 'application/pdf' });
    service.remitirProyectoRde(6, informe, proyecto).subscribe();
    const remitir = http.expectOne(`${API}/cierres/6/proyectos-rde`).request.body as FormData;
    expect([remitir.get('informeLegal'), remitir.get('proyectoRde')]).toEqual([informe, proyecto]);

    service.suscribirRde(6, '045-2026', '2026-10-20', informe).subscribe();
    const rde = http.expectOne(`${API}/cierres/6/rdes`).request.body as FormData;
    expect([rde.get('txtNumeroRde'), rde.get('fecEmisionRde'), rde.get('archivo')]).toEqual(['045-2026', '2026-10-20', informe]);

    service.registrarCargoNotificacion(6, informe).subscribe();
    const cargo = http.expectOne(`${API}/cierres/6/documentos`).request.body as FormData;
    expect(cargo.get('tipoDocumento')).toBe('CARGO_NOTIFICACION_RDE');

    service.reintentarSincronizacionSel(6).subscribe();
    expect(http.expectOne(`${API}/cierres/6/sincronizaciones-sel`).request.method).toBe('POST');
    http.match(() => true).forEach(r => r.flush({ respuesta: 'OK', mensaje: '', datos: {} }));
  });

  it('Fase 5: evaluaciones de impacto, feriados y parámetros', () => {
    service.listarEvaluacionesImpacto({ cadena: ' Café ', region: '', pagina: 2, cantidad: 10 }).subscribe();
    const ev = http.expectOne(r => r.url === `${API}/evaluaciones-impacto`);
    expect([ev.request.params.get('cadena'), ev.request.params.get('region'), ev.request.params.get('pagina')]).toEqual(['Café', null, '2']);

    service.listarFeriados(2026).subscribe();
    expect(http.expectOne(r => r.url === `${API}/feriados`).request.params.get('anio')).toBe('2026');

    service.crearFeriados([]).subscribe();
    expect(http.expectOne(r => r.url === `${API}/feriados` && r.method === 'POST').request.body).toEqual({ feriados: [] });

    service.desactivarFeriado(3).subscribe();
    expect(http.expectOne(`${API}/feriados/3`).request.method).toBe('DELETE');

    service.proponerFeriadosGobPe(2027).subscribe();
    expect(http.expectOne(`${API}/importaciones-feriados`).request.body).toEqual({ anio: 2027 });

    service.actualizarParametro('CORREO_UAJ', 'a@x.pe').subscribe();
    const par = http.expectOne(`${API}/parametros/CORREO_UAJ`);
    expect([par.request.method, par.request.body]).toEqual(['PUT', { valor: 'a@x.pe' }]);
    http.match(() => true).forEach(r => r.flush({ respuesta: 'OK', mensaje: '', datos: [] }));
  });

  it('descarga el PDF firmado de una versión del Anexo 22', () => {
    let pdf: Blob | undefined;
    service.descargarVersionAnexo22(6, 2).subscribe(b => (pdf = b));
    const req = http.expectOne(`${API}/cierres/6/anexos22/versiones/2/documento`);
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob(['%PDF-']));
    expect(pdf).toBeInstanceOf(Blob);
  });
});

