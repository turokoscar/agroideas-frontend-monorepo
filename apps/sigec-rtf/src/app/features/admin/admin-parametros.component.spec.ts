import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AdminParametrosComponent } from './admin-parametros.component';
import { environment } from '../../../environments/environment';
import { ApiResponse, ParametroSistemaDto } from '../../core/models';

describe('AdminParametrosComponent', () => {
  let httpMock: HttpTestingController;
  const apiUrl = environment.apiUrl;
  const ok = <T>(datos: T): ApiResponse<T> => ({ respuesta: 'OK', mensaje: 'OK', datos });

  const parametrosIniciales: ParametroSistemaDto[] = [
    { codParametro: 'CORREO_UN_CENTRAL', valParametro: 'un@agroideas.gob.pe', txtDescripcion: 'Correo central de la UN' },
    { codParametro: 'PLAZO_PRESENTACION_DIAS', valParametro: '15', txtDescripcion: 'Plazo de presentación' },
    { codParametro: 'PLAZO_SUBSANACION_DIAS', valParametro: '10', txtDescripcion: 'Plazo de subsanación' }
  ];

  function crearComponente() {
    TestBed.configureTestingModule({
      imports: [AdminParametrosComponent],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])]
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(AdminParametrosComponent);
    fixture.detectChanges();
    httpMock.expectOne(`${apiUrl}/admin/parametros-sistema`).flush(ok(parametrosIniciales));
    return fixture;
  }

  afterEach(() => httpMock.verify());

  it('sorts the known keys in the fixed display order (plazos antes que correos)', () => {
    const fixture = crearComponente();

    const orden = fixture.componentInstance.filas().map(f => f.codParametro);

    expect(orden).toEqual(['PLAZO_PRESENTACION_DIAS', 'PLAZO_SUBSANACION_DIAS', 'CORREO_UN_CENTRAL']);
  });

  it('hayCambios is false until a value is edited', () => {
    const fixture = crearComponente();

    expect(fixture.componentInstance.hayCambios()).toBe(false);

    const fila = fixture.componentInstance.filas()[0];
    fixture.componentInstance.actualizarValor(fila, '20');

    expect(fixture.componentInstance.hayCambios()).toBe(true);
  });

  it('guardarCambios only PUTs the rows that actually changed', () => {
    const fixture = crearComponente();
    const [primeraFila] = fixture.componentInstance.filas();
    fixture.componentInstance.actualizarValor(primeraFila, '20');

    fixture.componentInstance.guardarCambios();

    const req = httpMock.expectOne(`${apiUrl}/admin/parametros-sistema/${primeraFila.codParametro}`);
    expect(req.request.body).toEqual({ valParametro: '20' });
    req.flush(ok('OK'));

    // Recarga tras guardar.
    httpMock.expectOne(`${apiUrl}/admin/parametros-sistema`).flush(ok(parametrosIniciales));
  });

  it('guardarCambios does nothing when there are no pending changes', () => {
    const fixture = crearComponente();

    fixture.componentInstance.guardarCambios();

    httpMock.expectNone(req => req.method === 'PUT');
  });
});
