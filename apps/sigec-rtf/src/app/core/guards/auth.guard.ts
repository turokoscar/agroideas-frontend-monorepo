import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn) {
    return true;
  }

  // Redirect to login
  router.navigate(['/login']);
  return false;
};

export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);
    const user = authService.user();

    if (user && allowedRoles.includes(user.role)) {
      return true;
    }

    // Unauthorized redirection
    if (!authService.isLoggedIn) {
      router.navigate(['/login']);
    } else {
      // Redirect to base screen depending on user's role
      if (user?.role === 'POSTULANTE') {
        router.navigate(['/rtf/dashboard']);
      } else if (user?.role === 'UR') {
        router.navigate(['/rtf/auditoria-regional']);
      } else {
        router.navigate(['/rtf/evaluacion-gabinete']);
      }
    }
    return false;
  };
};
