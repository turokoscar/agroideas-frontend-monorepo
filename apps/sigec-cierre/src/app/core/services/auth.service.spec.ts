import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { STORAGE_KEYS } from '@agroideas/utils';
import { SelLoginResponse, SelUsuarioDto } from '@agroideas/auth';
import { AuthService, AuthUser } from './auth.service';
import { environment } from '../../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const buildUsuario = (overrides: Partial<SelUsuarioDto> = {}): SelUsuarioDto => ({
    id: 7,
    dni: '12345678',
    nombres: 'Rosa',
    apellidoPaterno: 'Quispe',
    apellidoMaterno: 'Mamani',
    email: 'rquispe@agroideas.gob.pe',
    usuario: 'rquispe',
    telefono: null,
    sigla: 'RQ',
    foto: null,
    roles: [],
    ...overrides
  });

  const buildRespuesta = (usuario: SelUsuarioDto): SelLoginResponse => ({
    respuesta: 'OK',
    mensaje: 'OK',
    datos: { accessToken: 'token-123', refreshToken: 'refresh-123', expiresIn: 3600, user: usuario }
  });

  const sesionGuardada: AuthUser = {
    id: '7',
    nombre: 'Rosa Quispe Mamani',
    iniciales: 'RQ',
    usuario: 'rquispe',
    email: 'rquispe@agroideas.gob.pe',
    sigla: 'RQ',
    roles: ['UR']
  };

  function configurar() {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  }

  function iniciarSesion(roles: string[]) {
    let resultado: boolean | undefined;
    service.login('rquispe', 'clave').subscribe(ok => (resultado = ok));
    httpMock.expectOne(`${environment.apiAuth}/login`).flush(buildRespuesta(buildUsuario({ roles })));
    return resultado;
  }

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  describe('sin sesión previa', () => {
    beforeEach(() => {
      localStorage.clear();
      configurar();
    });

    it('arranca sin usuario', () => {
      expect(service.user()).toBeNull();
      expect(service.isLoggedIn).toBe(false);
      expect(service.inicio()).toBe('/sin-acceso');
    });

    it('guarda todos los roles reconocidos y el token', () => {
      expect(iniciarSesion(['Unidad de Monitoreo', 'Unidad de Negocios'])).toBe(true);

      expect(service.roles()).toEqual(['UN', 'USE']);
      expect(service.user()?.nombre).toBe('Rosa Quispe Mamani');
      expect(service.inicio()).toBe('/bandeja');
      expect(service.etiquetaRol()).toBe('Unidad de Negocios');
      expect(localStorage.getItem(STORAGE_KEYS.SAT_TOKEN)).toBe('token-123');
      expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.SAT_USER_SESSION) ?? '{}').roles).toEqual(['UN', 'USE']);
    });

    it('envía a la OA a su expediente', () => {
      iniciarSesion(['Postulante']);
      expect(service.inicio()).toBe('/mi-cierre');
    });

    it('autentica a un usuario sin roles del módulo, pero lo envía a "sin acceso"', () => {
      expect(iniciarSesion(['Analista Kardex'])).toBe(true);
      expect(service.roles()).toEqual([]);
      expect(service.inicio()).toBe('/sin-acceso');
    });

    it('devuelve false si la API responde ERROR', () => {
      let resultado: boolean | undefined;
      service.login('rquispe', 'mala').subscribe(ok => (resultado = ok));
      httpMock.expectOne(`${environment.apiAuth}/login`).flush({ respuesta: 'ERROR', mensaje: 'Credenciales inválidas', datos: null });

      expect(resultado).toBe(false);
      expect(service.isLoggedIn).toBe(false);
    });

    it('logout limpia la sesión', () => {
      iniciarSesion(['Unidad regional']);
      service.logout();

      expect(service.user()).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.SAT_TOKEN)).toBeNull();
      expect(localStorage.getItem(STORAGE_KEYS.SAT_USER_SESSION)).toBeNull();
    });
  });

  describe('con sesión guardada', () => {
    function guardar(sesion: unknown) {
      localStorage.clear();
      localStorage.setItem(STORAGE_KEYS.SAT_TOKEN, 'token-previo');
      localStorage.setItem(STORAGE_KEYS.SAT_USER_SESSION, JSON.stringify(sesion));
      configurar();
    }

    it('restaura una sesión con el formato actual', () => {
      guardar(sesionGuardada);
      expect(service.roles()).toEqual(['UR']);
      expect(service.isLoggedIn).toBe(true);
    });

    it('descarta la sesión anterior al ADR 0013 (un único "role" en lugar de "roles")', () => {
      const sesionAnterior: Record<string, unknown> = { ...sesionGuardada, role: 'UNIDAD DE NEGOCIOS' };
      delete sesionAnterior['roles'];
      guardar(sesionAnterior);

      expect(service.isLoggedIn).toBe(false);
      expect(localStorage.getItem(STORAGE_KEYS.SAT_TOKEN)).toBeNull();
    });

    it('descarta la sesión con el nombre roto ("undefined undefined")', () => {
      guardar({ ...sesionGuardada, nombre: 'undefined undefined' });
      expect(service.isLoggedIn).toBe(false);
    });
  });
});
