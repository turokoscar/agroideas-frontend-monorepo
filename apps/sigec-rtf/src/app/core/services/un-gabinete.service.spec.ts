import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UnGabineteService } from './un-gabinete.service';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../models';

describe('UnGabineteService', () => {
  let service: UnGabineteService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  const ok = <T>(datos: T): ApiResponse<T> => ({ respuesta: 'OK', mensaje: 'OK', datos });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(UnGabineteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('loadBandejaUn', () => {
    const estadosCsv = 'EN_REVISION,AUDITADO_CAMPO,IN_REVISION_UN,VENCIDO,PLAZO_INICIAL_NOTIFICACION,PLAZO_LIMITE_NOTARIAL';

    it('resuelve los 6 estados de la bandeja en una sola llamada (no 6 por separado)', () => {
      let resultado: unknown;
      service.loadBandejaUn().subscribe(items => (resultado = items));

      httpMock.expectOne(`${apiUrl}/rtfs?estados=${estadosCsv}&cantidad=1000`).flush(ok({
        total: 3,
        items: [{ ideRtf: 1 }, { ideRtf: 2 }, { ideRtf: 3 }] as any
      }));

      expect(service.unRtfList()).toHaveLength(3);
      expect(resultado).toBe(service.unRtfList());
    });

    it('propaga el error si la llamada falla', () => {
      let error: unknown;
      service.loadBandejaUn().subscribe({ error: (e) => (error = e) });

      httpMock.expectOne(`${apiUrl}/rtfs?estados=${estadosCsv}&cantidad=1000`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error).toBeTruthy();
    });
  });

  describe('loadRtfCompleto', () => {
    it('ADR-012: puebla cabecera/evidencias desde /completo, y T1/R2/F1 desde sus endpoints dedicados', () => {
      service.loadRtfCompleto(10001).subscribe();

      httpMock.expectOne(`${apiUrl}/rtfs/10001/completo`).flush(ok({
        cabecera: { ideRtf: 10001, estRtf: 'IN_REVISION_UN', idePasoCritico: 55 },
        evidencias: [{ ideEvidencia: 1 }]
      }));

      httpMock.expectOne(`${apiUrl}/pasos-criticos/55/metas?ideRtf=10001`).flush(ok([{ id: 1 }]));
      httpMock.expectOne(`${apiUrl}/pasos-criticos/55/indicadores?ideRtf=10001`).flush(ok([{ id: 1 }]));
      httpMock.expectOne(`${apiUrl}/rtfs/10001/gastos-f1`).flush(ok([{ ideGastoF1: 1 }]));

      expect(service.cabeceraSeleccionada()?.ideRtf).toBe(10001);
      expect(service.rtfStatus()).toBe('IN_REVISION_UN');
      expect(service.metas()).toHaveLength(1);
      expect(service.indicadores()).toHaveLength(1);
      expect(service.evidencias()).toHaveLength(1);
      expect(service.gastosF1()).toHaveLength(1);
    });

    it('ADR-012: no carga T1/R2 si la cabecera aún no tiene idePasoCritico resuelto', () => {
      service.loadRtfCompleto(10002).subscribe();

      httpMock.expectOne(`${apiUrl}/rtfs/10002/completo`).flush(ok({
        cabecera: { ideRtf: 10002, estRtf: 'EN_REVISION' },
        evidencias: []
      }));
      httpMock.expectOne(`${apiUrl}/rtfs/10002/gastos-f1`).flush(ok([]));

      expect(service.metas()).toHaveLength(0);
      expect(service.indicadores()).toHaveLength(0);
    });
  });

  describe('sincronizarGastosF1', () => {
    it('refresca el snapshot de gastos F1', () => {
      service.sincronizarGastosF1(10001).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/rtfs/10001/gastos-f1/sincronizacion`);
      expect(req.request.method).toBe('POST');
      req.flush(ok([{ ideGastoF1: 1 }, { ideGastoF1: 2 }]));

      expect(service.gastosF1()).toHaveLength(2);
    });
  });

  describe('acciones sobre IN_REVISION_UN', () => {
    it('aprobarUn limpia unSelectedRtfId', () => {
      service.unSelectedRtfId.set(10001);
      service.aprobarUn(10001).subscribe();
      httpMock.expectOne(`${apiUrl}/un/rtfs/10001/aprobaciones`).flush(ok({}));

      expect(service.unSelectedRtfId()).toBeNull();
    });

    it('rechazarUn limpia unSelectedRtfId', () => {
      service.unSelectedRtfId.set(10001);
      service.rechazarUn(10001).subscribe();
      httpMock.expectOne(`${apiUrl}/un/rtfs/10001/rechazos`).flush(ok({}));

      expect(service.unSelectedRtfId()).toBeNull();
    });

    it('devolverUn limpia unSelectedRtfId y envía la observación como body', () => {
      service.unSelectedRtfId.set(10001);
      service.devolverUn(10001, 'Falta sustento').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/un/rtfs/10001/devoluciones-un`);
      expect(req.request.body).toBe(JSON.stringify('Falta sustento'));
      req.flush(ok({}));

      expect(service.unSelectedRtfId()).toBeNull();
    });
  });

  describe('Anexo 18', () => {
    it('cargarAnexo18 guarda el informe si existe', () => {
      service.cargarAnexo18(10001).subscribe();
      httpMock.expectOne(`${apiUrl}/un/rtfs/10001/informe-comprobacion`).flush(ok({ ideInforme: 1, ideRtf: 10001 } as any));

      expect(service.anexo18()?.ideInforme).toBe(1);
    });

    it('cargarAnexo18 deja el signal en null si aún no existe', () => {
      service.anexo18.set({ ideInforme: 1 } as any);

      service.cargarAnexo18(10001).subscribe();
      httpMock.expectOne(`${apiUrl}/un/rtfs/10001/informe-comprobacion`).flush(ok(null));

      expect(service.anexo18()).toBeNull();
    });

    it('guardarAnexo18 envía ideRtf junto al informe y actualiza el signal', () => {
      service.guardarAnexo18(10001, { txtNumeroInforme: 'IC-001' }).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/un/rtfs/10001/informe-comprobacion`);
      expect(req.request.body).toEqual({ txtNumeroInforme: 'IC-001', ideRtf: 10001 });
      req.flush(ok({ ideInforme: 5, ideRtf: 10001, txtNumeroInforme: 'IC-001' } as any));

      expect(service.anexo18()?.ideInforme).toBe(5);
    });
  });

  describe('Cartas', () => {
    it('cargarCartas guarda el listado', () => {
      service.cargarCartas(10001).subscribe();
      httpMock.expectOne(`${apiUrl}/rtfs/10001/cartas`).flush(ok([{ ideCarta: 1 } as any]));

      expect(service.cartas()).toHaveLength(1);
    });

    it('registrarCarta agrega la carta nueva al listado existente sin perder las anteriores', () => {
      service.cartas.set([{ ideCarta: 1 } as any]);

      service.registrarCarta(10001, 'CARTA_NOTARIAL', 'CN-002', '2026-09-09', 30, new File(['x'], 'c.pdf')).subscribe();

      const req = httpMock.expectOne(`${apiUrl}/rtfs/10001/cartas`);
      expect(req.request.body).toBeInstanceOf(FormData);
      req.flush(ok({ ideCarta: 2 } as any));

      expect(service.cartas().map(c => c.ideCarta)).toEqual([1, 2]);
    });

    it('descargarCarta pide un blob', () => {
      let resultado: Blob | undefined;
      service.descargarCarta(10001, 2).subscribe(blob => (resultado = blob));

      const req = httpMock.expectOne(`${apiUrl}/rtfs/10001/cartas/2/descarga`);
      expect(req.request.responseType).toBe('blob');
      const blob = new Blob(['contenido']);
      req.flush(blob);

      expect(resultado).toBe(blob);
    });
  });
});
