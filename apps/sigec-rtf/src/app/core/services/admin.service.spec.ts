import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminService } from './admin.service';
import { environment } from '../../../environments/environment';
import { ApiResponse, ParametroSistemaDto, ReporteCumplimientoPlazosDto, ReporteProductividadUnItemDto } from '../models';

describe('AdminService', () => {
  let service: AdminService;
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;

  const ok = <T>(datos: T): ApiResponse<T> => ({ respuesta: 'OK', mensaje: 'OK', datos });

  const buildParametro = (overrides: Partial<ParametroSistemaDto> = {}): ParametroSistemaDto => ({
    codParametro: 'PLAZO_PRESENTACION_DIAS',
    valParametro: '15',
    txtDescripcion: 'Plazo legal para presentar el RTF',
    ...overrides
  });

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('starts with an empty parametros signal', () => {
    expect(service.parametros()).toEqual([]);
  });

  describe('listarParametros', () => {
    it('populates the signal on success', () => {
      const parametros = [buildParametro(), buildParametro({ codParametro: 'CORREO_UN_CENTRAL', valParametro: 'un@agroideas.gob.pe' })];

      service.listarParametros().subscribe();
      httpMock.expectOne(`${apiUrl}/admin/parametros-sistema`).flush(ok(parametros));

      expect(service.parametros()).toEqual(parametros);
    });

    it('propagates the error instead of swallowing it', () => {
      let error: unknown;
      service.listarParametros().subscribe({ error: err => (error = err) });

      httpMock.expectOne(`${apiUrl}/admin/parametros-sistema`).flush('boom', { status: 401, statusText: 'Unauthorized' });

      expect(error).toBeDefined();
    });
  });

  describe('actualizarParametro', () => {
    it('sends the new value as PUT to the parametro-specific endpoint', () => {
      service.actualizarParametro('PLAZO_PRESENTACION_DIAS', '20').subscribe();

      const req = httpMock.expectOne(`${apiUrl}/admin/parametros-sistema/PLAZO_PRESENTACION_DIAS`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ valParametro: '20' });
      req.flush(ok('OK'));
    });

    it('propagates a validation error from the backend', () => {
      let error: any;
      service.actualizarParametro('PLAZO_PRESENTACION_DIAS', '-5').subscribe({ error: err => (error = err) });

      httpMock.expectOne(`${apiUrl}/admin/parametros-sistema/PLAZO_PRESENTACION_DIAS`).flush(
        { respuesta: 'ERROR', mensaje: 'El parámetro debe ser un número entero de días mayor a cero.', datos: null },
        { status: 400, statusText: 'Bad Request' }
      );

      expect(error.error.mensaje).toContain('mayor a cero');
    });
  });

  describe('obtenerReporteCumplimientoPlazos', () => {
    it('sends desde/hasta as query params and returns the report', () => {
      const reporte: ReporteCumplimientoPlazosDto = {
        fechaDesde: '2026-09-01',
        fechaHasta: '2026-09-30',
        rtfsVencidos: 3,
        cartasNotificacion: 2,
        cartasNotariales: 1,
        bloqueosDefinitivos: 0
      };
      let resultado: ReporteCumplimientoPlazosDto | undefined;

      service.obtenerReporteCumplimientoPlazos('2026-09-01', '2026-09-30').subscribe(r => (resultado = r));

      httpMock.expectOne(`${apiUrl}/admin/reportes/cumplimiento-plazos?desde=2026-09-01&hasta=2026-09-30`).flush(ok(reporte));

      expect(resultado).toEqual(reporte);
    });

    it('propagates a validation error from the backend', () => {
      let error: any;
      service.obtenerReporteCumplimientoPlazos('2026-09-30', '2026-09-01').subscribe({ error: err => (error = err) });

      httpMock.expectOne(`${apiUrl}/admin/reportes/cumplimiento-plazos?desde=2026-09-30&hasta=2026-09-01`).flush(
        { respuesta: 'ERROR', mensaje: "La fecha 'hasta' no puede ser anterior a la fecha 'desde'.", datos: null },
        { status: 400, statusText: 'Bad Request' }
      );

      expect(error.error.mensaje).toContain('anterior');
    });
  });

  describe('obtenerReporteProductividadUn', () => {
    it('sends desde/hasta as query params and returns the items', () => {
      const items: ReporteProductividadUnItemDto[] = [
        { ideUsuario: 7, txtUsuario: 'jperez', expedientesAtendidos: 4, promedioDias: 3.5, tasaObservacion: 25 }
      ];
      let resultado: ReporteProductividadUnItemDto[] | undefined;

      service.obtenerReporteProductividadUn('2026-09-01', '2026-09-30').subscribe(r => (resultado = r));

      httpMock.expectOne(`${apiUrl}/admin/reportes/productividad-un?desde=2026-09-01&hasta=2026-09-30`).flush(ok(items));

      expect(resultado).toEqual(items);
    });

    it('propagates the error instead of swallowing it', () => {
      let error: unknown;
      service.obtenerReporteProductividadUn('2026-09-01', '2026-09-30').subscribe({ error: err => (error = err) });

      httpMock.expectOne(`${apiUrl}/admin/reportes/productividad-un?desde=2026-09-01&hasta=2026-09-30`)
        .flush('boom', { status: 500, statusText: 'Server Error' });

      expect(error).toBeDefined();
    });
  });
});
