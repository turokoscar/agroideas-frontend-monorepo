import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AlertService } from '@agroideas/feedback';
import { STORAGE_KEYS } from '@agroideas/utils';
import { AuthRepositoryImpl } from './auth.repository.impl';
import { environment } from '../../../environments/environment';

describe('AuthRepositoryImpl', () => {
    let httpMock: HttpTestingController;
    let alertService: jest.Mocked<Partial<AlertService>>;

    const encode = (obj: unknown) => btoa(JSON.stringify(obj));
    const buildToken = (claims: Record<string, unknown> = {}, expiresInSeconds: number | null = 3600): string => {
        const payload = {
            sub: '42',
            given_name: 'Ana',
            family_name: 'Torres',
            email: 'ana@test.com',
            role: 'ESPECIALISTA',
            ...(expiresInSeconds === null ? {} : { exp: Math.floor(Date.now() / 1000) + expiresInSeconds }),
            ...claims
        };
        return `${encode({ alg: 'none' })}.${encode(payload)}.signature`;
    };

    const createService = (): AuthRepositoryImpl => {
        TestBed.configureTestingModule({
            imports: [HttpClientTestingModule],
            providers: [AuthRepositoryImpl, { provide: AlertService, useValue: alertService }]
        });
        httpMock = TestBed.inject(HttpTestingController);
        return TestBed.inject(AuthRepositoryImpl);
    };

    beforeEach(() => {
        localStorage.clear();
        alertService = { show: jest.fn() };

        // jsdom navega de verdad al asignar location.href; se sustituye para poder
        // observar el redirect de logout() sin disparar una navegación real.
        Object.defineProperty(window, 'location', {
            value: { href: '' },
            writable: true,
            configurable: true
        });
    });

    afterEach(() => {
        httpMock?.verify();
        localStorage.clear();
    });

    describe('constructor state', () => {
        it('should start unauthenticated with no token, without calling the API', () => {
            const service = createService();

            expect(service.isAuthenticated$()).toBe(false);
            expect(service.user$()).toBeNull();
            expect(service.permissionsInitialized$()).toBe(true);
        });

        it('should start authenticated and skip the permissions fetch when they are already cached', () => {
            localStorage.setItem(STORAGE_KEYS.TOKEN, buildToken());
            localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(['ACCESO_APP']));

            const service = createService();

            expect(service.isAuthenticated$()).toBe(true);
            expect(service.userPermissions$()).toEqual(['ACCESO_APP']);
            expect(service.permissionsInitialized$()).toBe(true);
        });

        it('should auto-fetch permissions on boot when authenticated but none are cached', () => {
            localStorage.setItem(STORAGE_KEYS.TOKEN, buildToken());

            const service = createService();

            httpMock.expectOne(`${environment.apiEjecucion}/auth/permisos`).flush({ exitoso: true, datos: ['GESTION_CARTERA'] });

            expect(service.userPermissions$()).toEqual(['GESTION_CARTERA']);
            expect(service.permissionsInitialized$()).toBe(true);
        });
    });

    describe('getUser', () => {
        it('should return null when there is no token', () => {
            const service = createService();
            expect(service.getUser()).toBeNull();
        });

        it('should map the JWT claims to a User, preferring given_name and the first role', () => {
            const service = createService();
            localStorage.setItem(STORAGE_KEYS.TOKEN, buildToken({ role: ['ESPECIALISTA', 'ADMIN'] }));

            expect(service.getUser()).toEqual({
                id: 42,
                name: 'Ana',
                apellidoPaterno: 'Torres',
                email: 'ana@test.com',
                role: 'ESPECIALISTA',
                roles: ['ESPECIALISTA', 'ADMIN']
            });
        });

        it('should fall back through unique_name, name, and finally "Usuario" when given_name is missing', () => {
            const service = createService();

            localStorage.setItem(STORAGE_KEYS.TOKEN, buildToken({ given_name: undefined, unique_name: 'ana.torres' }));
            expect(service.getUser()?.name).toBe('ana.torres');

            localStorage.setItem(STORAGE_KEYS.TOKEN, buildToken({ given_name: undefined, unique_name: undefined, name: 'Ana T.' }));
            expect(service.getUser()?.name).toBe('Ana T.');

            localStorage.setItem(STORAGE_KEYS.TOKEN, buildToken({ given_name: undefined, unique_name: undefined, name: undefined, role: undefined }));
            expect(service.getUser()?.name).toBe('Usuario');
            expect(service.getUser()?.role).toBe('');
        });
    });

    describe('token expiration', () => {
        it('should report a token with a future exp as valid', () => {
            const service = createService();
            localStorage.setItem(STORAGE_KEYS.TOKEN, buildToken({}, 3600));

            expect(service.isTokenExpired()).toBe(false);
            expect(service.isAuthenticated()).toBe(true);
        });

        it('should report a token with a past exp as expired', () => {
            const service = createService();
            localStorage.setItem(STORAGE_KEYS.TOKEN, buildToken({}, -3600));

            expect(service.isTokenExpired()).toBe(true);
            expect(service.isAuthenticated()).toBe(false);
        });

        it('should report as expired a token without an exp claim', () => {
            const service = createService();
            localStorage.setItem(STORAGE_KEYS.TOKEN, buildToken({}, null));

            expect(service.isTokenExpired()).toBe(true);
        });
    });

    describe('storage round-trips', () => {
        it('should persist and read back the access token, refresh token, and permissions', () => {
            const service = createService();

            service.saveToken('access-token');
            expect(service.getToken()).toBe('access-token');

            service.saveRefreshToken('refresh-token');
            expect(service.getRefreshToken()).toBe('refresh-token');

            service.savePermissions(['ACCESO_APP', 'GESTION_CARTERA']);
            expect(service.getPermissionsFromStorage()).toEqual(['ACCESO_APP', 'GESTION_CARTERA']);
        });

        it('should default to an empty array when no permissions are stored', () => {
            const service = createService();
            expect(service.getPermissionsFromStorage()).toEqual([]);
        });
    });

    describe('login', () => {
        it('should save the tokens and load permissions on a successful login', () => {
            const service = createService();
            const token = buildToken();

            let result: { exitoso: boolean } | undefined;
            service.login({ usuario: 'ana', clave: '123' }).subscribe((res) => (result = res));

            httpMock.expectOne(`${environment.apiSeguridad}/auth/login`).flush({
                exitoso: true,
                datos: { accessToken: token, refreshToken: 'refresh-1', expiresIn: 3600 }
            });

            httpMock.expectOne(`${environment.apiEjecucion}/auth/permisos`).flush({ exitoso: true, datos: ['ACCESO_APP'] });
            httpMock.expectOne(`${environment.apiEjecucion}/auth/login-audit`).flush({});

            expect(service.getToken()).toBe(token);
            expect(service.getRefreshToken()).toBe('refresh-1');
            expect(service.isAuthenticated$()).toBe(true);
            expect(service.userPermissions$()).toEqual(['ACCESO_APP']);
            expect(result?.exitoso).toBe(true);
        });

        it('should not persist tokens or authenticate when the API reports failure', () => {
            const service = createService();

            let result: { exitoso: boolean } | undefined;
            service.login({ usuario: 'ana', clave: 'bad' }).subscribe((res) => (result = res));

            httpMock.expectOne(`${environment.apiSeguridad}/auth/login`).flush({ exitoso: false, mensaje: 'Credenciales inválidas' });

            expect(service.getToken()).toBeNull();
            expect(service.isAuthenticated$()).toBe(false);
            expect(result?.exitoso).toBe(false);
        });
    });

    describe('fetchPermissions', () => {
        it('should store the permissions returned by the API', () => {
            const service = createService();

            service.fetchPermissions().subscribe();

            httpMock.expectOne(`${environment.apiEjecucion}/auth/permisos`).flush({ exitoso: true, datos: ['KARDEX'] });

            expect(service.userPermissions$()).toEqual(['KARDEX']);
            expect(service.isLoadingPermissions$()).toBe(false);
            expect(service.permissionsInitialized$()).toBe(true);
        });

        it('should clear permissions and still mark them as initialized when the request fails', () => {
            const service = createService();

            service.fetchPermissions().subscribe();

            httpMock.expectOne(`${environment.apiEjecucion}/auth/permisos`).flush('error', { status: 500, statusText: 'Server Error' });

            expect(service.userPermissions$()).toEqual([]);
            expect(service.isLoadingPermissions$()).toBe(false);
            expect(service.permissionsInitialized$()).toBe(true);
        });
    });

    describe('logout', () => {
        it('should call the logout endpoint with the bearer token, then clear storage and redirect', () => {
            const service = createService();
            localStorage.setItem(STORAGE_KEYS.TOKEN, 'access-token');
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'refresh-token');
            localStorage.setItem(STORAGE_KEYS.PERMISSIONS, JSON.stringify(['ACCESO_APP']));

            service.logout();

            const req = httpMock.expectOne(`${environment.apiSeguridad}/auth/logout`);
            expect(req.request.headers.get('Authorization')).toBe('Bearer access-token');
            req.flush({});

            expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
            expect(localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN)).toBeNull();
            expect(localStorage.getItem(STORAGE_KEYS.PERMISSIONS)).toBeNull();
            expect(service.isAuthenticated$()).toBe(false);
            expect(service.user$()).toBeNull();
            expect(window.location.href).toBe('/login');
        });

        it('should skip the API call and still clear state when there is no token', () => {
            const service = createService();

            service.logout();

            expect(service.isAuthenticated$()).toBe(false);
            expect(window.location.href).toBe('/login');
        });
    });

    describe('refreshToken', () => {
        it('should short-circuit without an HTTP call when there is no refresh token', (done) => {
            const service = createService();

            service.refreshToken().subscribe((res) => {
                expect(res.exitoso).toBe(false);
                done();
            });
        });

        it('should save the new tokens on a successful refresh', () => {
            const service = createService();
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'old-refresh');
            const newToken = buildToken();

            let result: { exitoso?: boolean } | undefined;
            service.refreshToken().subscribe((res) => (result = res));

            const req = httpMock.expectOne(`${environment.apiSeguridad}/auth/refresh`);
            expect(req.request.body).toEqual({ refreshToken: 'old-refresh' });
            req.flush({ exitoso: true, datos: { accessToken: newToken, refreshToken: 'new-refresh' } });

            expect(service.getToken()).toBe(newToken);
            expect(service.getRefreshToken()).toBe('new-refresh');
            expect(result?.exitoso).toBe(true);
        });

        it('should return a failure result when the refresh call errors', () => {
            const service = createService();
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'old-refresh');

            let result: { exitoso?: boolean } | undefined;
            service.refreshToken().subscribe((res) => (result = res));

            httpMock.expectOne(`${environment.apiSeguridad}/auth/refresh`).flush('error', { status: 401, statusText: 'Unauthorized' });

            expect(result?.exitoso).toBe(false);
        });
    });

    describe('checkExpiration', () => {
        it('should do nothing when the token is not expired', () => {
            const service = createService();
            localStorage.setItem(STORAGE_KEYS.TOKEN, buildToken({}, 3600));

            service.checkExpiration();

            expect(alertService.show).not.toHaveBeenCalled();
        });

        it('should refresh the session when the token is expired but the refresh token is still valid', () => {
            const service = createService();
            localStorage.setItem(STORAGE_KEYS.TOKEN, buildToken({}, -3600));
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, buildToken({}, 3600));

            service.checkExpiration();

            httpMock.expectOne(`${environment.apiSeguridad}/auth/refresh`).flush({ exitoso: true, datos: { accessToken: buildToken() } });

            expect(service.isAuthenticated$()).toBe(true);
            expect(alertService.show).not.toHaveBeenCalled();
        });

        it('should treat a non-JWT refresh token as still valid and let the server decide', () => {
            const service = createService();
            localStorage.setItem(STORAGE_KEYS.TOKEN, buildToken({}, -3600));
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, 'opaque-refresh-token-not-a-jwt');

            service.checkExpiration();

            httpMock.expectOne(`${environment.apiSeguridad}/auth/refresh`).flush({ exitoso: true, datos: { accessToken: buildToken() } });

            expect(service.isAuthenticated$()).toBe(true);
            expect(alertService.show).not.toHaveBeenCalled();
        });

        it('should alert and log out when refreshing an expired session fails', () => {
            const service = createService();
            localStorage.setItem(STORAGE_KEYS.TOKEN, buildToken({}, -3600));
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, buildToken({}, 3600));

            service.checkExpiration();

            httpMock.expectOne(`${environment.apiSeguridad}/auth/refresh`).flush({ exitoso: false });
            httpMock.expectOne(`${environment.apiSeguridad}/auth/logout`).flush({});

            expect(alertService.show).toHaveBeenCalledWith('Sesión Finalizada', expect.any(String), 'info');
            expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
        });

        it('should alert and log out immediately when the refresh token is also expired', () => {
            const service = createService();
            localStorage.setItem(STORAGE_KEYS.TOKEN, buildToken({}, -3600));
            localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, buildToken({}, -3600));

            service.checkExpiration();

            httpMock.expectOne(`${environment.apiSeguridad}/auth/logout`).flush({});

            expect(alertService.show).toHaveBeenCalledWith('Sesión Finalizada', expect.any(String), 'info');
            expect(localStorage.getItem(STORAGE_KEYS.TOKEN)).toBeNull();
        });
    });
});
