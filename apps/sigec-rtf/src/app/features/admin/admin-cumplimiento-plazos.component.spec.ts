import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminCumplimientoPlazosComponent } from './admin-cumplimiento-plazos.component';
import { environment } from '../../../environments/environment';
import { ApiResponse, ReporteCumplimientoPlazosDto } from '../../core/models';

describe('AdminCumplimientoPlazosComponent', () => {
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const ok = <T>(datos: T): ApiResponse<T> => ({ respuesta: 'OK', mensaje: 'OK', datos });

  const reporte: ReporteCumplimientoPlazosDto = {
    fechaDesde: '2026-08-16',
    fechaHasta: '2026-09-15',
    rtfsVencidos: 4,
    cartasNotificacion: 2,
    cartasNotariales: 1,
    bloqueosDefinitivos: 0
  };

  function crearComponente() {
    TestBed.configureTestingModule({
      imports: [AdminCumplimientoPlazosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AdminCumplimientoPlazosComponent);
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('queries the report for the default 30-day range on init', () => {
    const fixture = crearComponente();
    fixture.detectChanges();

    const req = httpMock.expectOne(req => req.url.startsWith(`${apiUrl}/admin/reportes/cumplimiento-plazos`));
    req.flush(ok(reporte));

    expect(fixture.componentInstance.reporte()).toEqual(reporte);
  });

  it('does not call the backend when hasta is before desde', () => {
    const fixture = crearComponente();
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.startsWith(`${apiUrl}/admin/reportes/cumplimiento-plazos`)).flush(ok(reporte));

    fixture.componentInstance.desde.set('2026-09-30');
    fixture.componentInstance.hasta.set('2026-09-01');
    fixture.componentInstance.consultar();

    httpMock.expectNone(req => req.url.startsWith(`${apiUrl}/admin/reportes/cumplimiento-plazos`));
  });

  it('surfaces the backend error message on failure', () => {
    const fixture = crearComponente();
    fixture.detectChanges();

    httpMock.expectOne(req => req.url.startsWith(`${apiUrl}/admin/reportes/cumplimiento-plazos`)).flush(
      { respuesta: 'ERROR', mensaje: 'boom', datos: null },
      { status: 500, statusText: 'Server Error' }
    );

    expect(fixture.componentInstance.cargando()).toBe(false);
    expect(fixture.componentInstance.reporte()).toBeNull();
  });
});
