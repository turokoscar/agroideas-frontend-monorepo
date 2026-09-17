import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { STORAGE_KEYS } from '@agroideas/utils';
import { SelLoginResponse, SelUsuarioDto } from '@agroideas/auth';
import { AuthService, LoginResult } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const buildUsuario = (overrides: Partial<SelUsuarioDto> = {}): SelUsuarioDto => ({
    id: 1,
    dni: '12345678',
    nombres: 'Piero',
    apellidoPaterno: 'Yataco',
    apellidoMaterno: 'Figueroa',
    email: 'pyataco@agroideas.gob.pe',
    usuario: 'pyataco',
    telefono: null,
    sigla: 'PY',
    foto: null,
    roles: [],
    ...overrides
  });

  const buildRespuesta = (usuario: SelUsuarioDto): SelLoginResponse => ({
    respuesta: 'OK',
    mensaje: 'OK',
    datos: {
      accessToken: 'token-123',
      refreshToken: 'refresh-123',
      expiresIn: 3600,
      user: usuario
    }
  });

  function configurar() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  beforeEach(() => {
    localStorage.clear();
    configurar();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('starts with no user when localStorage is empty', () => {
    expect(service.user()).toBeNull();
    expect(service.isLoggedIn).toBe(false);
  });

  it('maps a user without recognized roles to POSTULANTE and persists the session', () => {
    let resultado: LoginResult | undefined;
    service.login('pyataco', 'secreto').subscribe(ok => (resultado = ok));

    const req = httpMock.expectOne(`${environment.apiAuth}/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ username: 'pyataco', password: 'secreto', deviceId: 'web-admin' });
    req.flush(buildRespuesta(buildUsuario({ roles: ['Algún otro rol'] })));

    expect(resultado?.success).toBe(true);
    expect(service.user()?.role).toBe('POSTULANTE');
    expect(service.user()?.nombre).toBe('Piero Yataco Figueroa');
    expect(localStorage.getItem(STORAGE_KEYS.SAT_TOKEN)).toBe('token-123');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.SAT_USER_SESSION)!).role).toBe('POSTULANTE');
  });

  it.each([
    ['Unidad de Monitoreo', 'UN'],
    ['Unidad de Negocios', 'UN'],
    ['Administrador del sistema', 'ADMIN'], // ADR-013: ya no colapsa a 'UN', tiene rol propio
    ['unidad de monitoreo', 'UN'] // case-insensitive
  ])('maps role "%s" to "%s"', (rolBackend, esperado) => {
    service.login('especialista', 'secreto').subscribe();
    httpMock.expectOne(`${environment.apiAuth}/login`).flush(buildRespuesta(buildUsuario({ roles: [rolBackend] })));

    expect(service.user()?.role).toBe(esperado);
  });

  it('returns false and does not set a user when the backend responds with an error envelope', () => {
    let resultado: LoginResult | undefined;
    service.login('pyataco', 'malo').subscribe(ok => (resultado = ok));

    httpMock.expectOne(`${environment.apiAuth}/login`).flush({ respuesta: 'ERROR', mensaje: 'Credenciales inválidas', datos: null });

    expect(resultado?.success).toBe(false);
    expect(resultado?.mensaje).toBe('Credenciales inválidas');
    expect(service.user()).toBeNull();
  });

  it('handles HTTP 400 error and returns the server error message', () => {
    let resultado: LoginResult | undefined;
    service.login('pyataco', 'bloqueado').subscribe(res => (resultado = res));

    httpMock.expectOne(`${environment.apiAuth}/login`).flush(
      { respuesta: 'ERROR', mensaje: 'Cuenta bloqueada por múltiples intentos fallidos. Intente más tarde.' },
      { status: 400, statusText: 'Bad Request' }
    );

    expect(resultado?.success).toBe(false);
    expect(resultado?.mensaje).toBe('Cuenta bloqueada por múltiples intentos fallidos. Intente más tarde.');
    expect(service.user()).toBeNull();
  });

  it('clears the stored session on logout', () => {
    service.login('pyataco', 'secreto').subscribe();
    httpMock.expectOne(`${environment.apiAuth}/login`).flush(buildRespuesta(buildUsuario()));

    service.logout();

    expect(service.user()).toBeNull();
    expect(service.isLoggedIn).toBe(false);
    expect(localStorage.getItem(STORAGE_KEYS.SAT_TOKEN)).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.SAT_USER_SESSION)).toBeNull();
  });

  it('restores a valid persisted session on construction', () => {
    const user = { id: '1', nombre: 'Piero Yataco', iniciales: 'PY', usuario: 'pyataco', email: 'p@x.com', sigla: 'PY', role: 'UN' as const };
    localStorage.setItem(STORAGE_KEYS.SAT_TOKEN, 'token-123');
    localStorage.setItem(STORAGE_KEYS.SAT_USER_SESSION, JSON.stringify(user));

    TestBed.resetTestingModule();
    configurar();

    expect(service.user()).toEqual(user);
    expect(service.getToken()).toBe('token-123');
  });

  it('discards a stale session left over from the old mapping (missing email / "undefined" in the name)', () => {
    const userRoto = { id: '1', nombre: 'undefined undefined', iniciales: '', usuario: 'pyataco', email: '', sigla: '', role: 'POSTULANTE' as const };
    localStorage.setItem(STORAGE_KEYS.SAT_TOKEN, 'token-viejo');
    localStorage.setItem(STORAGE_KEYS.SAT_USER_SESSION, JSON.stringify(userRoto));

    TestBed.resetTestingModule();
    configurar();

    expect(service.user()).toBeNull();
    expect(localStorage.getItem(STORAGE_KEYS.SAT_TOKEN)).toBeNull();
  });
});
