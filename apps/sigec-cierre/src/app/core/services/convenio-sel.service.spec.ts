import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConvenioSelDto, ConvenioSelService, buscaEnCartera } from './convenio-sel.service';
import { environment } from '../../../environments/environment';

const convenio = (id: number, numeroConvenio: string, fechaFirma: string): ConvenioSelDto =>
  ({ id, numeroConvenio, ruc: '20605569481', razonSocial: `OA ${id}`, fechaFirma });

describe('buscaEnCartera', () => {
  it('limita a la cartera solo si el único rol del personal es la UN', () => {
    expect(buscaEnCartera(['UN'])).toBe(true);
    expect(buscaEnCartera(['UN', 'OA'])).toBe(true);
    expect(buscaEnCartera(['JEFE_UN'])).toBe(false);
    expect(buscaEnCartera(['UN', 'USE'])).toBe(false);
    expect(buscaEnCartera(['ADMIN', 'JEFE_UN'])).toBe(false);
  });
});

describe('ConvenioSelService', () => {
  let service: ConvenioSelService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ConvenioSelService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('la UN busca en sus convenios asignados', () => {
    let items: ConvenioSelDto[] = [];
    service.buscar('perfiles', ['UN']).subscribe(r => (items = r));

    const req = http.expectOne(r => r.url === `${environment.apiGeneral}/convenios/asignados`);
    expect(req.request.params.get('busqueda')).toBe('perfiles');
    expect(req.request.params.get('cantidad')).toBe(String(environment.busquedaConvenios.cantidadSugerencias));
    req.flush({ respuesta: 'OK', mensaje: '', datos: { total: 1, items: [convenio(2242, '48', '2026-06-23T00:00:00')] } });

    expect(items.map(c => c.id)).toEqual([2242]);
  });

  it('el Jefe de la UN busca en todos, con el texto recortado', () => {
    service.buscar('  20605569481 ', ['JEFE_UN']).subscribe();

    const req = http.expectOne(r => r.url === `${environment.apiGeneral}/convenios/todos`);
    expect(req.request.params.get('busqueda')).toBe('20605569481');
    req.flush({ respuesta: 'OK', mensaje: '', datos: { total: 0, items: [] } });
  });
});
