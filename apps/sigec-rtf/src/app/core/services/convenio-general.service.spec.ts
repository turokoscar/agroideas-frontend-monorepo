import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ConvenioGeneralService } from './convenio-general.service';
import { environment } from '../../../environments/environment';
import { ApiResponse, ConvenioResumenDto } from '../models';

describe('ConvenioGeneralService', () => {
  let service: ConvenioGeneralService;
  let httpMock: HttpTestingController;
  const apiGeneral = environment.apiGeneral;

  const ok = <T>(datos: T): ApiResponse<T> => ({ respuesta: 'OK', mensaje: 'OK', datos });

  const buildConvenio = (overrides: Partial<ConvenioResumenDto> = {}): ConvenioResumenDto => ({
    id: 2242,
    numeroConvenio: '0048-2022-ST',
    ruc: '20605569481',
    razonSocial: 'ASOCIACION DE PRODUCTORES',
    fechaFirma: '2022-06-23T00:00:00',
    ...overrides
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ConvenioGeneralService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('obtenerPorIds', () => {
    it('does not call the backend for an empty id list', done => {
      service.obtenerPorIds([]).subscribe(mapa => {
        expect(mapa.size).toBe(0);
        done();
      });
      httpMock.expectNone(req => req.url.startsWith(`${apiGeneral}/convenios/por-ids`));
    });

    it('sends unique ids as a comma-separated query param and indexes the result by id', () => {
      let resultado: Map<number, ConvenioResumenDto> | undefined;
      service.obtenerPorIds([2242, 3000]).subscribe(mapa => (resultado = mapa));

      const req = httpMock.expectOne(r => r.url === `${apiGeneral}/convenios/por-ids`);
      expect(req.request.params.get('ids')).toBe('2242,3000');
      req.flush(ok([buildConvenio(), buildConvenio({ id: 3000, numeroConvenio: '0100-2023-ST' })]));

      expect(resultado?.size).toBe(2);
      expect(resultado?.get(2242)?.razonSocial).toBe('ASOCIACION DE PRODUCTORES');
    });

    it('resolves to an empty map instead of throwing when the request fails', () => {
      let resultado: Map<number, ConvenioResumenDto> | undefined;
      service.obtenerPorIds([2242]).subscribe(mapa => (resultado = mapa));

      httpMock.expectOne(r => r.url === `${apiGeneral}/convenios/por-ids`).flush('boom', { status: 500, statusText: 'Server Error' });

      expect(resultado?.size).toBe(0);
    });
  });
});
