import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector, InjectionToken } from '@angular/core';
import { AlertService } from '@agroideas/feedback';
import { STORAGE_KEYS } from '@agroideas/utils';
import { catchError, throwError } from 'rxjs';

export interface AuthLogoutHandler {
    logout(): void;
}

export const AUTH_LOGOUT_HANDLER = new InjectionToken<AuthLogoutHandler>('AUTH_LOGOUT_HANDLER');
export const AUTH_TOKEN_KEY = new InjectionToken<string>('AUTH_TOKEN_KEY');

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const injector = inject(Injector);
    const alertService = inject(AlertService);
    
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
            if (error.status === 401) {
                alertService.show('Sesión Expirada', 'Su sesión ha caducado por seguridad. Por favor, ingrese sus credenciales nuevamente.', 'warning');

                const logoutHandler = injector.get(AUTH_LOGOUT_HANDLER);
                logoutHandler.logout();
            }
            return throwError(() => error);
        })
    );
};
