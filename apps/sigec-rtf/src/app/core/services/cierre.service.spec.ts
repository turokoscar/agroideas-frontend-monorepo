import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { mensajeParaUsuario } from '@agroideas/utils';
import { CierreService } from './cierre.service';
import { environment } from '../../../environments/environment';

const API = environment.cierre.apiUrl;

describe('CierreService', () => {
  let service: CierreService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CierreService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('obtiene el Anexo 20 del convenio (postulanteId)', () => {
    let faltantes: string[] = [];
    service.obtenerAnexo20(2388).subscribe(a => (faltantes = a.faltantes));
    http.expectOne(`${API}/convenios/2388/anexos20`).flush({ respuesta: 'OK', mensaje: '', datos: { faltantes: ['IV. Metas (al menos una)'] } });
    expect(faltantes).toEqual(['IV. Metas (al menos una)']);
  });

  it('guarda el borrador con PUT', () => {
    service.guardarAnexo20(2388, { txtPracticaAmbiental: 'Compostaje' } as never).subscribe();
    const req = http.expectOne(`${API}/convenios/2388/anexos20`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ txtPracticaAmbiental: 'Compostaje' });
    req.flush({ respuesta: 'OK', mensaje: '', datos: {} });
  });

  it('si el PDF no se puede generar, el mensaje del sobre (que llega como Blob) se puede mostrar', async () => {
    const error = new Promise<unknown>(resolve => service.descargarAnexo20(2388).subscribe({ error: resolve }));
    const sobre = { respuesta: 'ERROR', mensaje: 'CIE_2010:Complete el Anexo 20 antes de generar el documento.', datos: null };
    http
      .expectOne(`${API}/convenios/2388/anexos20/documento`)
      .flush(new Blob([JSON.stringify(sobre)], { type: 'application/json' }), { status: 400, statusText: 'Bad Request' });

    expect(mensajeParaUsuario(await error, 'por defecto')).toBe('Complete el Anexo 20 antes de generar el documento.');
  });

  it('el expediente del convenio es el primero de GET /cierres, o null si aún no se abre', () => {
    let expediente: unknown = 'sin respuesta';
    service.obtenerExpediente(2388).subscribe(e => (expediente = e));
    const req = http.expectOne(r => r.url === `${API}/cierres`);
    expect(req.request.params.get('ideConvenio')).toBe('2388');
    req.flush({ respuesta: 'OK', mensaje: '', datos: { total: 0, items: [] } });
    expect(expediente).toBeNull();
  });
});
