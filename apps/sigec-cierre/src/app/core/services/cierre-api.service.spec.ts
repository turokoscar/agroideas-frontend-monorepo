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
});
