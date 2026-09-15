import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminProductividadUnComponent } from './admin-productividad-un.component';
import { environment } from '../../../environments/environment';
import { ApiResponse, ReporteProductividadUnItemDto } from '../../core/models';

describe('AdminProductividadUnComponent', () => {
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const ok = <T>(datos: T): ApiResponse<T> => ({ respuesta: 'OK', mensaje: 'OK', datos });

  const items: ReporteProductividadUnItemDto[] = [
    { ideUsuario: 7, txtUsuario: 'jperez', expedientesAtendidos: 4, promedioDias: 3.5, tasaObservacion: 25 }
  ];

  function crearComponente() {
    TestBed.configureTestingModule({
      imports: [AdminProductividadUnComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AdminProductividadUnComponent);
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('queries the report for the default 30-day range on init', () => {
    const fixture = crearComponente();
    fixture.detectChanges();

    const req = httpMock.expectOne(req => req.url.startsWith(`${apiUrl}/admin/reportes/productividad-un`));
    req.flush(ok(items));

    expect(fixture.componentInstance.items()).toEqual(items);
  });

  it('does not call the backend when hasta is before desde', () => {
    const fixture = crearComponente();
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.startsWith(`${apiUrl}/admin/reportes/productividad-un`)).flush(ok(items));

    fixture.componentInstance.desde.set('2026-09-30');
    fixture.componentInstance.hasta.set('2026-09-01');
    fixture.componentInstance.consultar();

    httpMock.expectNone(req => req.url.startsWith(`${apiUrl}/admin/reportes/productividad-un`));
  });

  it('clears the table and surfaces the backend error message on failure', () => {
    const fixture = crearComponente();
    fixture.detectChanges();
    httpMock.expectOne(req => req.url.startsWith(`${apiUrl}/admin/reportes/productividad-un`)).flush(ok(items));
    expect(fixture.componentInstance.items()).toEqual(items);

    fixture.componentInstance.consultar();
    httpMock.expectOne(req => req.url.startsWith(`${apiUrl}/admin/reportes/productividad-un`)).flush(
      { respuesta: 'ERROR', mensaje: 'boom', datos: null },
      { status: 500, statusText: 'Server Error' }
    );

    expect(fixture.componentInstance.cargando()).toBe(false);
    expect(fixture.componentInstance.items()).toEqual([]);
  });
});
