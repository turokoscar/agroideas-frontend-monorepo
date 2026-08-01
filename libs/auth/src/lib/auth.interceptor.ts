import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector, InjectionToken } from '@angular/core';
import { Router } from '@angular/router';
import { AlertService } from '@agroideas/feedback';
import { STORAGE_KEYS } from '@agroideas/utils';
import { catchError, throwError } from 'rxjs';

export interface AuthLogoutHandler {
    logout(): void;
}

export const AUTH_LOGOUT_HANDLER = new InjectionToken<AuthLogoutHandler>('AUTH_LOGOUT_HANDLER');
export const AUTH_TOKEN_KEY = new InjectionToken<string>('AUTH_TOKEN_KEY');

/** Ruta a la que se redirige al expirar la sesión. Las apps solo lo proveen si no usan '/login'. */
export const AUTH_LOGIN_ROUTE = new InjectionToken<string>('AUTH_LOGIN_ROUTE');

export const DEFAULT_LOGIN_ROUTE = '/login';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const injector = inject(Injector);
    const alertService = inject(AlertService);

    const loginRoute = inject(AUTH_LOGIN_ROUTE, { optional: true }) || DEFAULT_LOGIN_ROUTE;
    const tokenKey = inject(AUTH_TOKEN_KEY, { optional: true }) || STORAGE_KEYS.SAT_TOKEN;
    const token = localStorage.getItem(tokenKey);

    let request = req;
    if (token) {
        request = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
    }

    return next(request).pipe(
        catchError((error: HttpErrorResponse) => {
            const router = injector.get(Router);

            // Los guards de ruta solo se evalúan al navegar: si la sesión caduca mientras
            // el usuario está dentro de una pantalla, nada lo saca de ahí. Por eso el
            // interceptor redirige además de cerrar la sesión.
            // Se omite si ya estamos en el login (p. ej. un 401 por credenciales inválidas),
            // donde el propio formulario muestra el error.
            if (error.status === 401 && !estaEnRuta(router, loginRoute)) {
                alertService.show('Sesión Expirada', 'Su sesión ha caducado por seguridad. Por favor, ingrese sus credenciales nuevamente.', 'warning');

                const logoutHandler = injector.get(AUTH_LOGOUT_HANDLER);
                logoutHandler.logout();

                router.navigateByUrl(loginRoute);
            }
            return throwError(() => error);
        })
    );
};

function estaEnRuta(router: Router, ruta: string): boolean {
    return router.url.split(/[?#]/)[0] === ruta;
}
