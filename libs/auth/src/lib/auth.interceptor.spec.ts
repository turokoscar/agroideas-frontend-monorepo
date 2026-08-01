import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AlertService } from '@agroideas/feedback';
import { STORAGE_KEYS } from '@agroideas/utils';
import {
    authInterceptor,
    AUTH_LOGIN_ROUTE,
    AUTH_LOGOUT_HANDLER,
    AuthLogoutHandler
} from './auth.interceptor';

describe('authInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;
    let logoutHandler: AuthLogoutHandler;
    let router: { url: string; navigateByUrl: jest.Mock };

    const configurar = (loginRoute?: string) => {
        logoutHandler = { logout: jest.fn() };
        router = { url: '/rtf/dashboard', navigateByUrl: jest.fn() };

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
                { provide: AUTH_LOGOUT_HANDLER, useValue: logoutHandler },
                { provide: Router, useValue: router },
                { provide: AlertService, useValue: { show: jest.fn() } },
                ...(loginRoute ? [{ provide: AUTH_LOGIN_ROUTE, useValue: loginRoute }] : [])
            ]
        });

        http = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
    };

    afterEach(() => {
        localStorage.clear();
        httpMock?.verify();
    });

    it('adjunta el token almacenado como Bearer', () => {
        configurar();
        localStorage.setItem(STORAGE_KEYS.SAT_TOKEN, 'token-123');

        http.get('/api/rtfs').subscribe();

        const req = httpMock.expectOne('/api/rtfs');
        expect(req.request.headers.get('Authorization')).toBe('Bearer token-123');
        req.flush({});
    });

    it('ante un 401 cierra la sesión y redirige al login', () => {
        configurar();

        http.get('/api/rtfs').subscribe({ error: () => undefined });
        httpMock.expectOne('/api/rtfs').flush('No autorizado', { status: 401, statusText: 'Unauthorized' });

        expect(logoutHandler.logout).toHaveBeenCalled();
        expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
    });

    it('respeta la ruta de login configurada por la app', () => {
        configurar('/ingresar');

        http.get('/api/rtfs').subscribe({ error: () => undefined });
        httpMock.expectOne('/api/rtfs').flush('No autorizado', { status: 401, statusText: 'Unauthorized' });

        expect(router.navigateByUrl).toHaveBeenCalledWith('/ingresar');
    });

    it('no redirige si el 401 ocurre estando ya en el login', () => {
        configurar();
        router.url = '/login?returnUrl=%2Frtf';

        http.post('/api/auth/login', {}).subscribe({ error: () => undefined });
        httpMock.expectOne('/api/auth/login').flush('Credenciales inválidas', { status: 401, statusText: 'Unauthorized' });

        expect(logoutHandler.logout).not.toHaveBeenCalled();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
    });

    it('no interviene ante errores distintos de 401', () => {
        configurar();

        http.get('/api/rtfs').subscribe({ error: () => undefined });
        httpMock.expectOne('/api/rtfs').flush('Error', { status: 500, statusText: 'Server Error' });

        expect(logoutHandler.logout).not.toHaveBeenCalled();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
    });
});
