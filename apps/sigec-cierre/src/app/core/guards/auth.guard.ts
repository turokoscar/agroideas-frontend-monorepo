import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { CierreRol, tieneAlgunRol } from '../models/rol-cierre.model';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isLoggedIn ? true : router.createUrlTree(['/login']);
};

/**
 * Deja pasar si el usuario tiene alguno de los roles. Si no, lo envía a su página de inicio
 * (`rutaInicio`), que solo apunta a rutas que sí puede activar: así un rechazo nunca encadena
 * otro, que era el bucle de redirección anterior (ADR 0013, H-01).
 */
export const roleGuard = (permitidos: readonly CierreRol[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isLoggedIn) {
      return router.createUrlTree(['/login']);
    }
    return tieneAlgunRol(authService.roles(), permitidos)
      ? true
      : router.parseUrl(authService.inicio());
  };
};
