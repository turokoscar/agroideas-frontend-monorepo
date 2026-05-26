import { ApplicationConfig, provideZoneChangeDetection, computed } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { appRoutes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';
import { AuthService } from './core/services/auth.service';
import { USER_PERMISSIONS_PROVIDER } from '@agroideas/security';
import { AUTH_LOGOUT_HANDLER } from '@agroideas/auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([jwtInterceptor])),
    provideAnimations(),
    {
      provide: USER_PERMISSIONS_PROVIDER,
      useFactory: () => ({
        permissions: of([]),
        userRoles: computed(() => []),
        initialized$: of(true)
      })
    },
    {
      provide: AUTH_LOGOUT_HANDLER,
      useFactory: (authService: AuthService) => ({
        logout: () => authService.logout()
      }),
      deps: [AuthService]
    }
  ],
};

