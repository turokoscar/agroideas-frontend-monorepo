import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, Injector } from '@angular/core';
import { AuthRepository } from './domain/repositories/auth.repository';
import { catchError, throwError } from 'rxjs';
import { AlertService } from './shared/services/alert.service';
import { STORAGE_KEYS } from './shared/utils/storage-keys';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const injector = inject(Injector);
    const alertService = inject(AlertService);
    
    // Acceso directo al token para evitar ciclo circular con AuthRepository durante su construcción
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);

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

                const authRepository = injector.get(AuthRepository);
                authRepository.logout();
            }
            return throwError(() => error);
        })
    );
};
