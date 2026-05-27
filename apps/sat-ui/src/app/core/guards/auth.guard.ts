import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn) {
    const userRole = authService.user()?.role;
    const expectedRoles = route.data?.['expectedRoles'] as string[];
    
    if (expectedRoles && (!userRole || !expectedRoles.includes(userRole))) {
      // Redirigir al panel correspondiente según su rol real
      return router.parseUrl(userRole === 'TECNICO' ? '/programaciones' : '/dashboard');
    }
    
    return true;
  }

  return router.parseUrl('/login');
};

