import { ApplicationConfig, provideZoneChangeDetection, ErrorHandler, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';

import { appRoutes } from './app.routes';
import { AuthService } from './core/services/auth.service';
import { authInterceptor, AUTH_LOGOUT_HANDLER } from '@agroideas/auth';
import { GlobalErrorHandler } from './core/error-handler';

registerLocaleData(localeEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    { provide: LOCALE_ID, useValue: 'es' },
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    {
      provide: AUTH_LOGOUT_HANDLER,
      useFactory: (authService: AuthService) => ({
        logout: () => authService.logout()
      }),
      deps: [AuthService]
    }
  ],
};
