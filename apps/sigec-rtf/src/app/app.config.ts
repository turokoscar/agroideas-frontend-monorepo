import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';

import { appRoutes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { authInterceptor, AUTH_LOGOUT_HANDLER } from '@agroideas/auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    {
      provide: AUTH_LOGOUT_HANDLER,
      useFactory: (authService: AuthService) => ({
        logout: () => authService.logout()
      }),
      deps: [AuthService]
    }
  ],
};
